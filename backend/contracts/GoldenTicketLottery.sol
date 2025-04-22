// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IWorldID.sol"; // Asume que esta es la interfaz correcta
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

/**
 * @title GoldenTicketLottery v2
 * @dev Lotería usando World ID y Chainlink VRF v2 para aleatoriedad segura.
 */
contract GoldenTicketLottery is Ownable, ReentrancyGuard, VRFConsumerBaseV2, ConfirmedOwner {
    // --- Eventos ---
    event TicketPurchased(address indexed buyer, uint256 ticketId);
    event WinnerDrawn(uint256 indexed requestId, address indexed winner, uint256 winningTicketId, uint256 randomNumber);
    event LotteryEndTimeUpdated(uint256 newEndTime);
    event FundsWithdrawn(address indexed recipient, uint256 amount);
    event RandomnessRequested(uint256 indexed requestId, address requester); // Añadido requester

    // --- World ID ---
    IWorldID internal immutable worldIdRouter;
    // ¡¡CAMBIAR POR TUS VALORES REALES DEL DEVELOPER PORTAL!!
    uint256 internal immutable i_appId; // = uint256(keccak256(abi.encodePacked("app_YOUR_APP_ID")));
    uint256 internal immutable i_actionId; // = uint256(keccak256(abi.encodePacked("your_action_id")));

    // --- Parámetros Lotería ---
    uint256 public immutable ticketPrice;
    uint256 public immutable maxTicketsPerUser;
    uint256 public lotteryEndTime; // Mutable

    // --- Estado Lotería ---
    address[] public s_ticketHolders; // Direcciones por ticket ID (índice)
    mapping(address => uint256) public s_userTicketCount;
    uint256 public s_totalTicketsSold;
    bool public s_winnerDrawn;
    address public s_winnerAddress;
    uint256 public s_winningTicketId;

    // --- Chainlink VRF v2 ---
    VRFCoordinatorV2Interface immutable i_vrfCoordinator;
    uint64 immutable i_subscriptionId;
    bytes32 immutable i_keyHash;
    uint32 constant CALLBACK_GAS_LIMIT = 150000; // Ajustable
    uint16 constant REQUEST_CONFIRMATIONS = 3;   // Mínimo recomendado
    uint32 constant NUM_WORDS = 1;

    uint256 public s_lastRequestId;
    bool public s_randomnessIsPending;
    uint256 public s_randomResult; // Solo guardamos un número

    // --- Errores ---
    error LotteryAlreadyEnded();
    error LotteryNotActiveOrNotEnded(); // Para solicitar sorteo
    error LotteryNotYetEnded(); // Para solicitar sorteo
    error MaxTicketsPerUserReached();
    error InvalidWorldIDProof();
    error NotEnoughFunds();
    error WinnerAlreadyDrawn();
    error NoTicketsSold();
    error WithdrawalFailed();
    error RandomnessRequestPending();
    error RandomnessRequestFailed(); // Si el requestId no coincide
    error OnlyCoordinatorCanFulfill(); // No necesario con VRFConsumerBaseV2
    error OnlySubscriptionOwnerCanRecoverTokens();

    /**
     * @param _worldIdRouter Dirección World ID Router.
     * @param _appIdString El App ID *string* de tu app.
     * @param _actionIdString El Action ID *string* que usarás.
     * @param _ticketPrice Precio ticket en Wei.
     * @param _maxTicketsPerUser Max tickets por persona.
     * @param _lotteryDurationSeconds Duración inicial en segundos.
     * @param _vrfCoordinator Dirección VRF Coordinator V2.
     * @param _subscriptionId Tu ID de suscripción VRF v2.
     * @param _keyHash Key Hash (gas lane).
     */
    constructor(
        address _worldIdRouter,
        string memory _appIdString,      // Recibir como string
        string memory _actionIdString,   // Recibir como string
        uint256 _ticketPrice,
        uint256 _maxTicketsPerUser,
        uint256 _lotteryDurationSeconds,
        address _vrfCoordinator,
        uint64 _subscriptionId,
        bytes32 _keyHash
    )
        VRFConsumerBaseV2(_vrfCoordinator)
        Ownable(msg.sender)
        ConfirmedOwner(msg.sender)
    {
        require(_ticketPrice > 0, "Price > 0");
        require(_maxTicketsPerUser > 0, "Max tickets > 0");
        require(_lotteryDurationSeconds > 0, "Duration > 0");
        require(_worldIdRouter != address(0), "Invalid World ID Router");
        require(_vrfCoordinator != address(0), "Invalid VRF Coordinator");
        require(bytes(_appIdString).length > 0, "App ID empty");
        require(bytes(_actionIdString).length > 0, "Action ID empty");


        worldIdRouter = IWorldID(_worldIdRouter);
        i_appId = uint256(keccak256(abi.encodePacked(_appIdString)));     // Hashear string
        i_actionId = uint256(keccak256(abi.encodePacked(_actionIdString))); // Hashear string
        ticketPrice = _ticketPrice;
        maxTicketsPerUser = _maxTicketsPerUser;
        lotteryEndTime = block.timestamp + _lotteryDurationSeconds;

        i_vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        i_subscriptionId = _subscriptionId;
        i_keyHash = _keyHash;

        emit LotteryEndTimeUpdated(lotteryEndTime);
    }

    /**
     * @dev Compra un ticket.
     */
    function purchaseTicket(
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external payable nonReentrant {
        if (block.timestamp >= lotteryEndTime) revert LotteryAlreadyEnded();
        if (msg.value != ticketPrice) revert NotEnoughFunds();
        address buyer = msg.sender;
        if (s_userTicketCount[buyer] >= maxTicketsPerUser) revert MaxTicketsPerUserReached();

        // Verificar con World ID usando dirección del comprador como signal
        uint256 signalHash = uint256(keccak256(abi.encodePacked(buyer)));
        _verifyProof(root, signalHash, nullifierHash, proof);

        s_userTicketCount[buyer]++;
        uint256 newTicketId = s_totalTicketsSold;
        s_ticketHolders.push(buyer);
        s_totalTicketsSold++;

        emit TicketPurchased(buyer, newTicketId);
    }

    /**
     * @dev Verifica proof World ID.
     */
    function _verifyProof(
        uint256 root, uint256 signalHash, uint256 nullifierHash, uint256[8] calldata proof
    ) internal view {
        try worldIdRouter.verifyProof(root, i_appId, signalHash, nullifierHash, i_actionId, proof) {}
        catch { revert InvalidWorldIDProof(); }
    }

    /**
     * @dev Inicia sorteo solicitando aleatoriedad (llamada externa).
     */
    function requestWinnerDrawing() external nonReentrant returns (uint256 requestId) {
        if (block.timestamp < lotteryEndTime) revert LotteryNotYetEnded();
        if (s_winnerDrawn) revert WinnerAlreadyDrawn();
        if (s_totalTicketsSold == 0) revert NoTicketsSold();
        if (s_randomnessIsPending) revert RandomnessRequestPending();

        console.log("Requesting randomness..."); // Solo para Hardhat node
        s_randomnessIsPending = true;
        requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash, i_subscriptionId, REQUEST_CONFIRMATIONS, CALLBACK_GAS_LIMIT, NUM_WORDS
        );
        s_lastRequestId = requestId;

        emit RandomnessRequested(requestId, msg.sender); // Guardar quién lo pidió
        return requestId;
    }

    /**
     * @dev Callback VRF. NO LLAMAR DIRECTAMENTE.
     */
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        // Solo procesar si es la solicitud pendiente correcta
        require(s_randomnessIsPending && _requestId == s_lastRequestId, "Invalid request");
        // La herencia ya valida msg.sender == COORDINATOR

        s_randomnessIsPending = false; // Resetear flag PRIMERO
        s_randomResult = _randomWords[0]; // Guardar resultado

        // Seleccionar ganador
        uint256 winnerIndex = s_randomResult % s_totalTicketsSold;
        s_winningTicketId = winnerIndex;
        s_winnerAddress = s_ticketHolders[winnerIndex];
        s_winnerDrawn = true;

        emit WinnerDrawn(_requestId, s_winnerAddress, s_winningTicketId, s_randomResult);
    }

    /**
     * @dev Retirar fondos por el Owner.
     */
    function withdrawFunds() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");
        (bool success, ) = owner().call{value: balance}(""); // Usar owner() de Ownable
        require(success, "Withdrawal failed");
        emit FundsWithdrawn(owner(), balance);
    }

    // --- Vistas ---
    function getWinner() external view returns (address) { return s_winnerAddress; }
    function isActive() external view returns (bool) { return block.timestamp < lotteryEndTime && !s_winnerDrawn; }
    function getTotalTicketsSold() external view returns (uint256) { return s_totalTicketsSold; }
    function getUserTicketCount(address user) external view returns(uint256) { return s_userTicketCount[user]; }

    // Fallbacks
    receive() external payable {}
    fallback() external payable {}
}