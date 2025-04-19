// Dentro del archivo: backend/src/db/migrations/XXXXXXXXXXXXXX-create-draw.js

'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Draws', {
      id: { // Mantenemos un ID simple como PK
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      drawWeek: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true // Solo puede haber un resultado por semana
      },
      winningNumbers: {
        type: Sequelize.JSONB, // Guardar el array de números ganadores
        allowNull: true // Puede ser null si no hubo sorteo/tickets
      },
      results: {
        type: Sequelize.JSONB, // Guardar el objeto con ganadores de 1ro, 2do, 3ro
        allowNull: true
      },
      potWld: {
        type: Sequelize.DECIMAL(20, 8), // Tipo Decimal para precisión monetaria (ej. 20 dígitos totales, 8 decimales)
        allowNull: false,
        defaultValue: 0.0
      },
      drawTime: {
        allowNull: false,
        type: Sequelize.DATE
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Draws');
  }
};