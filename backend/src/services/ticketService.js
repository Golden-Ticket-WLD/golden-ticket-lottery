// backend/src/services/ticketService.js

const { Ticket } = require('../models'); // Importa el modelo Sequelize de Ticket
const { generateTicketNumbers } = require('../utils/lotteryUtils'); // Importa la función para generar números
const { Op } = require('sequelize'); // Para operadores de consulta si los necesitaras

/**
 * Emite un boleto real después de verificar el pago y lo guarda en la BD.
 * @param {string} nullifierHash - El hash nulo único del usuario verificado.
 * @param {string} transactionHash - El hash de la transacción de pago verificada.
 * @param {string} drawWeek - La semana del sorteo para la que se emite el boleto (ej: '2024-W30').
 * @returns {Promise<Ticket>} - El objeto del ticket creado en la BD.
 * @throws {Error} - Si hay un error al guardar en la BD (ej: txHash duplicado).
 */
async function issueRealTicket(nullifierHash, transactionHash, drawWeek) {
    const numbers = await generateTicketNumbers(); // Obtiene los 5 números aleatorios
    console.log(`Generando ticket para ${nullifierHash}, semana ${drawWeek}, tx ${transactionHash} con números: ${numbers.join('-')}`);

    try {
        // Intenta crear el registro en la tabla Tickets
        const newTicket = await Ticket.create({
            nullifierHash: nullifierHash,
            drawWeek: drawWeek,
            numbers: numbers, // Sequelize maneja la serialización a JSONB
            purchaseTime: new Date(),
            transactionHash: transactionHash // Este campo tiene constraint UNIQUE en la BD
        });
        console.log(`--> TICKET GUARDADO EN BD: ID=${newTicket.id}, Semana=${newTicket.drawWeek}`);
        return newTicket; // Devuelve el objeto del ticket recién creado
    } catch (error) {
         console.error(`Error al guardar ticket en BD para tx ${transactionHash}:`, error);
         // Si el error es por la restricción UNIQUE de transactionHash, es un intento de doble gasto
         if (error.name === 'SequelizeUniqueConstraintError') {
             throw new Error(`Intento de doble gasto: La transacción ${transactionHash} ya fue usada para un boleto.`);
         }
         // Lanza otros errores para que sean manejados más arriba
         throw new Error(`Error de base de datos al emitir el boleto: ${error.message}`);
    }
}

/**
 * Obtiene todos los boletos comprados por un usuario para una semana específica.
 * @param {string} nullifierHash - El hash nulo del usuario.
 * @param {string} week - La semana del sorteo (ej: '2024-W30').
 * @returns {Promise<Ticket[]>} - Un array de objetos Ticket.
 */
async function getUserTickets(nullifierHash, week) {
    console.log(`Buscando tickets para ${nullifierHash} en la semana ${week}`);
    try {
        const tickets = await Ticket.findAll({
            where: {
                nullifierHash: nullifierHash,
                drawWeek: week
            },
            order: [['purchaseTime', 'ASC']] // Ordenar por fecha de compra
        });
        console.log(` -> Encontrados ${tickets.length} tickets.`);
        return tickets;
    } catch (error) {
        console.error(`Error al buscar tickets de usuario ${nullifierHash} para semana ${week}:`, error);
        throw new Error(`Error de base de datos al buscar tickets: ${error.message}`); // Relanzar
    }
}

/**
 * Obtiene TODOS los boletos para una semana de sorteo específica.
 * Usado por el servicio de sorteo para determinar los ganadores.
 * @param {string} drawWeek - La semana del sorteo (ej: '2024-W30').
 * @returns {Promise<Ticket[]>} - Un array con todos los objetos Ticket de esa semana.
 */
async function getTicketsForWeek(drawWeek) {
     console.log(`Buscando TODOS los tickets para la semana ${drawWeek}`);
    try {
        const tickets = await Ticket.findAll({
            where: { drawWeek: drawWeek }
        });
         console.log(` -> Encontrados ${tickets.length} tickets en total para la semana ${drawWeek}.`);
        return tickets;
    } catch (error) {
        console.error(`Error al buscar todos los tickets para semana ${drawWeek}:`, error);
        throw new Error(`Error de base de datos al buscar tickets de la semana: ${error.message}`); // Relanzar
    }
}

// Exportar las funciones que serán usadas por otros módulos
module.exports = {
    issueRealTicket,
    getUserTickets,
    getTicketsForWeek
};