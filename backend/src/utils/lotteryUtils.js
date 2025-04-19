// backend/src/utils/lotteryUtils.js

/**
 * Genera los 5 números aleatorios para un boleto Golden Ticket.
 * Reglas: 3x(1-50), 1x(1-30), 1x(1-10)
 * @returns {Promise<number[]>} - Un array con los 5 números del boleto.
 */
async function generateTicketNumbers() {
    const num1 = Math.floor(Math.random() * 50) + 1; // 1 a 50
    const num2 = Math.floor(Math.random() * 50) + 1; // 1 a 50
    const num3 = Math.floor(Math.random() * 50) + 1; // 1 a 50
    const num4 = Math.floor(Math.random() * 30) + 1; // 1 a 30
    const num5 = Math.floor(Math.random() * 10) + 1; // 1 a 10
    return [num1, num2, num3, num4, num5];
  }
  
  module.exports = {
      generateTicketNumbers
  };