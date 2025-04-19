// backend/src/controllers/lotteryController.js

// Importar los servicios que usaremos
const ticketService = require('../services/ticketService');
const drawService = require('../services/drawService');
const worldcoinService = require('../services/worldcoinService');
const transactionVerificationService = require('../services/transactionVerificationService');
const { getCurrentDrawWeek, getPreviousDrawWeek, isDrawTimePassed } = require('../utils/timeUtils');

/**
 * Controlador para verificar el proof de World ID.
 * Recibe el proof del frontend, lo envía al worldcoinService para verificar,
 * y devuelve el resultado (éxito + nullifierHash, o error).
 */
exports.verifyProof = async (req, res, next) => {
    // Extraer los datos necesarios del cuerpo de la petición (body)
    // El frontend debería enviar un objeto { proofResponse: { ...idkit result... } }
    const { proofResponse } = req.body;

    // Validación básica de la entrada
    if (!proofResponse || !proofResponse.merkle_root || !proofResponse.nullifier_hash || !proofResponse.proof) {
        console.warn("[verifyProof] Datos del proof incompletos recibidos.");
        // Devolver un error 400 (Bad Request) si faltan datos
        return res.status(400).json({ success: false, message: 'Datos del proof de World ID incompletos o inválidos.' });
    }

    console.log(`[verifyProof] Recibida solicitud de verificación para Nullifier: ${proofResponse.nullifier_hash.substring(0,10)}...`);

    try {
        // Llamar al servicio para verificar con la API de Worldcoin
        // Pasamos solo el objeto proof, la señal es opcional y se manejaría dentro del servicio si fuera necesaria.
        const verificationResult = await worldcoinService.verifyWorldIdProof(proofResponse);

        // Si la verificación en el servicio fue exitosa...
        if (verificationResult.success) {
            console.log(`[verifyProof] Verificación exitosa para Nullifier: ${verificationResult.nullifierHash}`);
            // Devolver éxito (200 OK) y el nullifierHash al frontend
            res.json({
                success: true,
                message: 'World ID verificado exitosamente.',
                nullifierHash: verificationResult.nullifierHash
            });
        } else {
            // Si la verificación falló (proof inválido, error de API, etc.)
            console.warn(`[verifyProof] Verificación fallida: ${verificationResult.error}`);
            // Devolver un error 400 (Bad Request) con el mensaje de error del servicio
            res.status(400).json({
                success: false,
                message: verificationResult.error || 'La verificación con World ID falló.'
            });
        }
    } catch (error) {
        // Si ocurre un error inesperado DENTRO de este controlador (no en el servicio)
        console.error("[verifyProof] Error inesperado en el controlador:", error);
        // Devolver un error 500 (Internal Server Error)
        res.status(500).json({ success: false, message: 'Error interno del servidor durante la verificación.' });
        // Opcionalmente, pasar al middleware de errores de Express: next(error);
    }
};

/**
 * Controlador para confirmar el pago on-chain y emitir el boleto.
 * Recibe el nullifierHash y txHash del frontend (después del callback de world://pay),
 * verifica la transacción en la blockchain, previene doble gasto,
 * y si todo es válido, llama al ticketService para emitir el boleto.
 */
exports.confirmPayment = async (req, res, next) => {
    // Extraer datos del cuerpo de la petición
    const { nullifierHash, txHash } = req.body;

    // Validación de entrada
    if (!nullifierHash || !txHash) {
        console.warn("[confirmPayment] Faltan nullifierHash o txHash.");
        return res.status(400).json({ success: false, message: 'Faltan datos requeridos (nullifierHash, txHash).' });
    }
    // Validación básica del formato del hash (puede ser más robusta)
    if (!txHash.startsWith('0x') || txHash.length !== 66) {
         console.warn(`[confirmPayment] Formato de txHash inválido: ${txHash}`);
         return res.status(400).json({ success: false, message: 'Formato de hash de transacción inválido.' });
    }

    console.log(`[confirmPayment] Recibida solicitud para confirmar Tx: ${txHash.substring(0,12)}... para Nullifier: ${nullifierHash.substring(0,10)}...`);

    try {
        // 1. Prevenir Doble Gasto (Chequeo Rápido Primero)
        const alreadyProcessed = await transactionVerificationService.hasTxBeenProcessed(txHash);
        if (alreadyProcessed) {
            console.warn(`[confirmPayment] Intento de reprocesar Tx ${txHash}.`);
            // Devolver 409 (Conflict) si la transacción ya fue usada
            return res.status(409).json({ success: false, message: 'Esta transacción ya fue utilizada para obtener un boleto.' });
        }

        // 2. Verificar el Pago On-chain
        // Asumimos que siempre se paga 1 WLD según la lógica del servicio
        const isValidPayment = await transactionVerificationService.verifyWldPayment(txHash, "1");
        if (!isValidPayment) {
            console.warn(`[confirmPayment] Verificación on-chain fallida para Tx ${txHash}.`);
            // Devolver 400 (Bad Request) si el pago no es válido en la blockchain
            return res.status(400).json({ success: false, message: 'El pago no pudo ser verificado en la blockchain o no cumple los requisitos (cantidad/destinatario).' });
        }
        console.log(`[confirmPayment] Verificación on-chain exitosa para Tx ${txHash}.`);

        // 3. (Opcional pero recomendado) Validar que el usuario no tenga ya boleto esta semana
        //    Esto depende de tus reglas (¿permitir múltiples boletos por usuario/semana?)
        //    Asumiendo 1 boleto por usuario/semana:
        const currentWeek = getCurrentDrawWeek();
        const userTicketsThisWeek = await ticketService.getUserTickets(nullifierHash, currentWeek);
        if (userTicketsThisWeek.length > 0) {
            console.warn(`[confirmPayment] El usuario ${nullifierHash.substring(0,10)}... ya tiene boleto para la semana ${currentWeek}.`);
            // Considera qué devolver aquí. ¿Error? ¿Éxito sin nuevo boleto?
            // Devolver 409 (Conflict) es razonable si la regla es 1 por semana.
            return res.status(409).json({ success: false, message: 'Ya has comprado un boleto para el sorteo de esta semana.' });
        }

        // 4. Emitir el Boleto (llamar al servicio para crear el registro en la BD)
        console.log(`[confirmPayment] Emitiendo boleto para ${nullifierHash.substring(0,10)}..., tx ${txHash.substring(0,12)}..., semana ${currentWeek}`);
        const ticket = await ticketService.issueRealTicket(nullifierHash, txHash, currentWeek);

        // 5. Marcar la Transacción como Procesada (¡Importante!)
        // Hacemos esto DESPUÉS de emitir el boleto con éxito.
        await transactionVerificationService.markTxAsProcessed(txHash, ticket.id); // Pasamos el ID del ticket creado

        console.log(`[confirmPayment] Boleto ${ticket.id} emitido y Tx ${txHash.substring(0,12)}... marcada como procesada.`);
        // Devolver 201 (Created) con la información del boleto
        res.status(201).json({ success: true, message: 'Pago confirmado y boleto emitido exitosamente.', ticket });

    } catch (error) {
        // Capturar errores de los servicios (ej: doble gasto detectado al guardar, error de BD)
        console.error("[confirmPayment] Error en el controlador:", error);
        // Devolver un error 500 (Internal Server Error) o uno más específico si es posible
        res.status(500).json({ success: false, message: error.message || 'Error interno del servidor al confirmar el pago.' });
        // next(error);
    }
};

/**
 * Controlador para obtener los boletos comprados por un usuario para la semana actual (o una específica).
 * Recibe el nullifierHash como query parameter.
 */
exports.getMyTickets = async (req, res, next) => {
    const { nullifierHash } = req.query; // Obtener de parámetros de la URL (?nullifierHash=...)
    // Obtener la semana actual o permitir que el frontend pida una semana específica (opcional)
    const week = req.query.week || getCurrentDrawWeek();

    if (!nullifierHash) {
        return res.status(400).json({ success: false, message: 'Falta el parámetro nullifierHash.' });
    }

    console.log(`[getMyTickets] Solicitud para Nullifier: ${nullifierHash.substring(0,10)}..., Semana: ${week}`);

    try {
        const tickets = await ticketService.getUserTickets(nullifierHash, week);
        // Devolver 200 OK con el array de tickets (puede estar vacío)
        res.json({ success: true, tickets });
    } catch (error) {
        console.error("[getMyTickets] Error en el controlador:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al obtener los boletos.' });
        // next(error);
    }
};

/**
 * Controlador para obtener los resultados del último sorteo completado.
 */
exports.getLatestResults = async (req, res, next) => {
    // Determinar cuál fue la última semana que *debería* tener resultados
    let targetWeek = getPreviousDrawWeek();
    console.log(`[getLatestResults] Buscando resultados para la semana objetivo: ${targetWeek}`);

    try {
        let results = await drawService.getDrawResults(targetWeek);

        // Si no hay resultados para la semana anterior Y ya pasó la hora del sorteo de la semana anterior,
        // podría indicar que no hubo participantes esa semana o un problema. Devolvemos 'no encontrado'.
        // Si aún no ha pasado la hora del sorteo de la semana anterior, no debería haber resultados aún.
        if (!results && isDrawTimePassed(targetWeek)) {
             console.log(`[getLatestResults] No se encontraron resultados para ${targetWeek}, y el tiempo del sorteo ya pasó.`);
             // Devolvemos 404 Not Found, pero con éxito=true para indicar que la petición se procesó
             return res.status(200).json({ success: true, results: null, message: `No se encontraron resultados para el sorteo de la semana ${targetWeek}.` });
        } else if (!results) {
            console.log(`[getLatestResults] Aún no hay resultados disponibles para ${targetWeek}.`);
            return res.status(200).json({ success: true, results: null, message: `Los resultados para el sorteo de la semana ${targetWeek} aún no están disponibles.` });
        }

        // Si encontramos resultados...
        console.log(`[getLatestResults] Resultados encontrados para ${targetWeek}.`);
         // Devolvemos 200 OK con los resultados encontrados
        res.json({ success: true, results });

    } catch (error) {
        console.error("[getLatestResults] Error en el controlador:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al obtener los resultados.' });
        // next(error);
    }
};