// backend/src/services/transactionVerificationService.js

const { ethers } = require('ethers');
const { ProcessedTransaction } = require('../models'); // Importa el modelo Sequelize

// --- Configuración y Constantes ---
const WLD_CONTRACT_ADDRESS = process.env.WLD_CONTRACT_ADDRESS;
const WLD_DECIMALS = 18; // WLD, como muchos ERC20, usa 18 decimales
const EXPECTED_RECEIVER = process.env.MY_WLD_RECEIVER_ADDRESS; // Tu dirección de recepción

// ABI muy simplificado solo para el evento Transfer de ERC20
// Necesitamos esto para que ethers.js pueda interpretar los logs de la transacción
const erc20Abi = [
    "event Transfer(address indexed from, address indexed to, uint256 value)"
];

// Inicializar el proveedor de ethers para hablar con la red Optimism
// Usamos JsonRpcProvider con la URL de tu archivo .env (Alchemy/Infura)
let provider;
try {
    if (!process.env.OPTIMISM_RPC_URL) {
        throw new Error('OPTIMISM_RPC_URL no está definida en .env');
    }
    provider = new ethers.JsonRpcProvider(process.env.OPTIMISM_RPC_URL);
    console.log("Proveedor Ethers inicializado para Optimism.");
} catch (error) {
    console.error("Error grave: No se pudo inicializar el proveedor Ethers. Verifica OPTIMISM_RPC_URL.", error);
    // Si no podemos conectar al RPC, la app no puede verificar pagos.
    // Podrías querer terminar el proceso o implementar un reintento/fallback.
    process.exit(1);
}

// Interfaz para interactuar con el contrato WLD (solo para parsear eventos)
let wldContractInterface;
if (WLD_CONTRACT_ADDRESS) {
    try {
        wldContractInterface = new ethers.Interface(erc20Abi);
    } catch(error) {
         console.error("Error grave: ABI del ERC20 inválida.", error);
         process.exit(1);
    }
} else {
    console.error("Error grave: WLD_CONTRACT_ADDRESS no está definida en .env");
    process.exit(1);
}

/**
 * Verifica si una transacción en Optimism fue un pago exitoso de WLD
 * a la dirección esperada y por la cantidad esperada.
 * @param {string} txHash - El hash de la transacción a verificar.
 * @param {string} expectedAmountString - La cantidad esperada como string (ej: "1").
 * @returns {Promise<boolean>} - True si el pago es válido, false en caso contrario.
 */
async function verifyWldPayment(txHash, expectedAmountString = "1") {
    if (!provider) {
        console.error("Error: El proveedor Ethers no está inicializado.");
        return false;
    }
    if (!EXPECTED_RECEIVER) {
        console.error("Error: MY_WLD_RECEIVER_ADDRESS no está definido en .env");
        return false;
    }

    console.log(`Verificando pago on-chain para Tx: ${txHash}`);

    try {
        // 1. Obtener el recibo de la transacción
        const txReceipt = await provider.getTransactionReceipt(txHash);

        // 2. Comprobar si la transacción existe y fue exitosa
        if (!txReceipt) {
            console.warn(`Recibo no encontrado para tx ${txHash}. Puede que aún no esté minada.`);
            return false; // Aún no confirmada o inválida
        }
        if (txReceipt.status !== 1) {
            console.warn(`Transacción ${txHash} falló on-chain (status: ${txReceipt.status}).`);
            return false; // La transacción falló
        }

        // 3. Calcular la cantidad esperada en la unidad más pequeña (Wei para ETH, similar para WLD)
        const expectedAmountWei = ethers.utils.parseUnits(expectedAmountString, WLD_DECIMALS);

        // 4. Buscar el evento Transfer correcto en los logs del recibo
        let validTransferFound = false;
        for (const log of txReceipt.logs) {
            // Solo nos interesan los logs emitidos por el contrato WLD
            if (log.address.toLowerCase() === WLD_CONTRACT_ADDRESS.toLowerCase()) {
                try {
                    // Intentar parsear el log usando la ABI de Transfer
                    const parsedLog = wldContractInterface.parseLog(log);

                    // Verificar si es el evento Transfer y si los datos coinciden
                    if (parsedLog.name === "Transfer") {
                        const { from, to, value } = parsedLog.args;
                        console.log(`  -> Evento Transfer encontrado: De ${from}, Para ${to}, Valor ${value}`);

                        // Comprobar destinatario y cantidad
                        if (to.toLowerCase() === EXPECTED_RECEIVER.toLowerCase() && value.eq(expectedAmountWei)) {
                            console.log(`  -> ¡Coincide! Destinatario y cantidad correctos.`);
                            validTransferFound = true;
                            break; // Encontramos el evento válido, no necesitamos seguir buscando
                        } else {
                            console.log(`  -> No coincide: Destinatario (${to}) o valor (${value}) incorrectos.`);
                        }
                    }
                } catch (parseError) {
                    // Ignorar logs del contrato WLD que no sean eventos Transfer (raro pero posible)
                    console.warn(`  -> Log del contrato WLD no pudo ser parseado como Transfer: ${log.logIndex}`);
                    continue;
                }
            }
        }

        if (!validTransferFound) {
            console.warn(`No se encontró un evento Transfer de ${expectedAmountString} WLD a ${EXPECTED_RECEIVER} en la tx ${txHash}.`);
            return false;
        }

        // Si llegamos aquí, la transacción fue exitosa Y contenía el evento Transfer esperado.
        console.log(`Verificación on-chain exitosa para tx ${txHash}.`);
        return true;

    } catch (error) {
        console.error(`Error durante la verificación on-chain de ${txHash}:`, error);
        return false; // Error durante la verificación
    }
}

/**
 * Verifica si una transacción ya ha sido registrada como procesada en la BD.
 * @param {string} txHash - El hash de la transacción a verificar.
 * @returns {Promise<boolean>} - True si ya fue procesada, false si no.
 */
async function hasTxBeenProcessed(txHash) {
    try {
        // Busca si existe un registro con ese transactionHash como clave primaria
        const existingTx = await ProcessedTransaction.findByPk(txHash);
        if (existingTx) {
            console.log(`Tx ${txHash} ya fue procesada previamente (Ticket ID: ${existingTx.ticketId}).`);
            return true; // Ya existe, ya fue procesada
        }
        return false; // No existe, no ha sido procesada
    } catch (error) {
        console.error(`Error consultando BD por tx procesada ${txHash}:`, error);
        // Es más seguro asumir que podría haber sido procesada si hay error de BD
        // O podrías querer reintentar. Por simplicidad, devolvemos true para evitar doble gasto en caso de error.
        return true;
    }
}

/**
 * Marca una transacción como procesada en la base de datos.
 * @param {string} txHash - El hash de la transacción a marcar.
 * @param {number} ticketId - El ID del ticket que se generó con esta transacción.
 * @returns {Promise<void>}
 */
async function markTxAsProcessed(txHash, ticketId) {
    try {
        await ProcessedTransaction.create({
            transactionHash: txHash,
            ticketId: ticketId,
            processedAt: new Date()
        });
        console.log(`Tx ${txHash} marcada como procesada para ticket ${ticketId} en la BD.`);
    } catch (error) {
         console.error(`Error marcando tx ${txHash} como procesada en la BD:`, error);
         // Podrías querer reintentar o lanzar un error más grave si esto falla,
         // porque podría llevar a un doble gasto si no se registra.
         throw error; // Relanzar para que el controlador lo maneje
    }
}

// Exportar las funciones necesarias
module.exports = {
    verifyWldPayment,
    hasTxBeenProcessed,
    markTxAsProcessed
};