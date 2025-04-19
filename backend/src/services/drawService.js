// backend/src/services/drawService.js

const { Draw, Ticket } = require('../models'); // Importa modelos Sequelize
const { getTicketsForWeek } = require('./ticketService'); // Necesitamos obtener los tickets
const { generateTicketNumbers } = require('../utils/lotteryUtils'); // Para generar números ganadores
const { getCurrentDrawWeek, getPreviousDrawWeek, isDrawTimePassed, TIMEZONE } = require('../utils/timeUtils');
const moment = require('moment-timezone');
const { sequelize } = require('../models'); // Importar instancia de sequelize para transacciones

// --- Constantes de Premios ---
const PRIZE_PERCENTAGES = {
    first: 0.60,  // 60%
    second: 0.25, // 25%
    third: 0.10   // 10%
    // Casa: 5% restante implícito
};
const WLD_PRICE_PER_TICKET = 1.0; // Asumimos 1 WLD por boleto

/**
 * Ejecuta el sorteo semanal:
 * 1. Obtiene la semana actual.
 * 2. Verifica si ya se hizo el sorteo para esa semana.
 * 3. Obtiene todos los tickets de esa semana.
 * 4. Calcula el pozo total.
 * 5. Genera los números ganadores.
 * 6. Compara cada ticket y determina los ganadores.
 * 7. Guarda los resultados en la tabla Draws.
 */
async function performWeeklyDraw() {
    const drawWeek = getCurrentDrawWeek(); // Obtiene la semana actual 'YYYY-WNN'
    const drawTime = moment().tz(TIMEZONE).toDate(); // Hora actual del sorteo

    console.log(`[Sorteo] Iniciando proceso para la semana: ${drawWeek}`);

    // Usar una transacción de base de datos para asegurar atomicidad
    const transaction = await sequelize.transaction();

    try {
        // 1. Verificar si ya existe un sorteo para esta semana en la BD
        const existingDraw = await Draw.findOne({
            where: { drawWeek: drawWeek },
            transaction // Incluir en la transacción
        });

        if (existingDraw) {
            console.log(`[Sorteo] El sorteo para la semana ${drawWeek} ya fue realizado.`);
            await transaction.commit(); // Commit porque la operación fue una consulta exitosa
            return existingDraw; // Devolver el sorteo existente
        }

        // 2. Obtener todos los tickets comprados para esta semana
        const weeklyTickets = await getTicketsForWeek(drawWeek); // Esta función ya existe en ticketService

        // 3. Calcular Pozo Total
        const totalTickets = weeklyTickets.length;
        const totalPot = totalTickets * WLD_PRICE_PER_TICKET;
        console.log(`[Sorteo] Semana ${drawWeek}: ${totalTickets} boletos vendidos. Pozo total: ${totalPot} WLD.`);

        // Si no hay tickets, registrar un sorteo vacío y terminar
        if (totalTickets === 0) {
            console.log(`[Sorteo] No hay boletos para la semana ${drawWeek}. Registrando sorteo vacío.`);
            const emptyDraw = await Draw.create({
                drawWeek: drawWeek,
                winningNumbers: null, // Sin números ganadores
                results: { first: [], second: [], third: [] }, // Sin ganadores
                potWld: 0.0,
                drawTime: drawTime
            }, { transaction }); // Incluir en la transacción
            await transaction.commit(); // Guardar el sorteo vacío
            return emptyDraw;
        }

        // 4. Generar Números Ganadores
        const winningNumbers = await generateTicketNumbers();
        console.log(`[Sorteo] Números ganadores para ${drawWeek}: ${winningNumbers.join('-')}`);

        // 5. Determinar Ganadores
        const winners = { first: [], second: [], third: [] };
        for (const ticket of weeklyTickets) {
            const userNums = ticket.numbers; // Es un array [n1, n2, n3, n4, n5]

            // Comprobar 1er Puesto (5 aciertos exactos y en orden)
            if (userNums[0] === winningNumbers[0] && userNums[1] === winningNumbers[1] && userNums[2] === winningNumbers[2] && userNums[3] === winningNumbers[3] && userNums[4] === winningNumbers[4]) {
                winners.first.push({ ticketId: ticket.id, nullifierHash: ticket.nullifierHash, numbers: userNums });
                continue; // Si gana 1ro, no puede ganar otros premios con este boleto
            }
            // Comprobar 2do Puesto (4 primeros aciertos exactos y en orden)
            if (userNums[0] === winningNumbers[0] && userNums[1] === winningNumbers[1] && userNums[2] === winningNumbers[2] && userNums[3] === winningNumbers[3]) {
                winners.second.push({ ticketId: ticket.id, nullifierHash: ticket.nullifierHash, numbers: userNums });
                continue;
            }
            // Comprobar 3er Puesto (3 primeros aciertos exactos y en orden)
            if (userNums[0] === winningNumbers[0] && userNums[1] === winningNumbers[1] && userNums[2] === winningNumbers[2]) {
                winners.third.push({ ticketId: ticket.id, nullifierHash: ticket.nullifierHash, numbers: userNums });
            }
        }
        console.log(`[Sorteo] Ganadores encontrados: 1ro=${winners.first.length}, 2do=${winners.second.length}, 3ro=${winners.third.length}`);

        // 6. Calcular Premios por Ganador (si los hay)
        // Usamos toFixed(8) para mantener 8 decimales como en el tipo DECIMAL(20, 8)
        const prizeShare = {
            first: winners.first.length > 0 ? parseFloat((totalPot * PRIZE_PERCENTAGES.first / winners.first.length).toFixed(8)) : 0,
            second: winners.second.length > 0 ? parseFloat((totalPot * PRIZE_PERCENTAGES.second / winners.second.length).toFixed(8)) : 0,
            third: winners.third.length > 0 ? parseFloat((totalPot * PRIZE_PERCENTAGES.third / winners.third.length).toFixed(8)) : 0,
        };

        // 7. Estructurar Resultados para guardar en JSONB
        const resultsData = {
            first: winners.first.map(w => ({ ...w, prizeShare: prizeShare.first })),
            second: winners.second.map(w => ({ ...w, prizeShare: prizeShare.second })),
            third: winners.third.map(w => ({ ...w, prizeShare: prizeShare.third }))
        };

        // 8. Guardar el Resultado del Sorteo en la BD
        console.log(`[Sorteo] Guardando resultados para la semana ${drawWeek}...`);
        const newDraw = await Draw.create({
            drawWeek: drawWeek,
            winningNumbers: winningNumbers, // Guardar array de números ganadores
            results: resultsData,         // Guardar objeto con listas de ganadores y premios
            potWld: totalPot.toFixed(8),  // Guardar el pozo total con precisión
            drawTime: drawTime
        }, { transaction }); // Incluir en la transacción

        // Si todo fue bien, confirmar la transacción
        await transaction.commit();
        console.log(`[Sorteo] Resultados para ${drawWeek} guardados exitosamente. ID Sorteo: ${newDraw.id}`);
        return newDraw;

    } catch (error) {
        // Si algo falla, revertir la transacción
        console.error(`[Sorteo] ERROR durante el sorteo para la semana ${drawWeek}. Reversando transacción.`, error);
        await transaction.rollback();
        // Relanzar el error para que sea registrado por el cron job o el llamador
        throw error;
    }
}

/**
 * Obtiene los resultados del sorteo para una semana específica.
 * @param {string} week - La semana del sorteo (ej: '2024-W30').
 * @returns {Promise<Draw | null>} - El objeto Draw con los resultados, o null si no se encontró.
 */
async function getDrawResults(week) {
    console.log(`Buscando resultados del sorteo para la semana ${week}`);
    try {
        const draw = await Draw.findOne({
            where: { drawWeek: week }
        });
        if (draw) {
            console.log(` -> Resultados encontrados para ${week}.`);
        } else {
            console.log(` -> Resultados NO encontrados para ${week}.`);
        }
        return draw;
    } catch (error) {
        console.error(`Error al buscar resultados del sorteo para semana ${week}:`, error);
        throw new Error(`Error de base de datos al buscar resultados: ${error.message}`);
    }
}


module.exports = {
    performWeeklyDraw,
    getDrawResults
};