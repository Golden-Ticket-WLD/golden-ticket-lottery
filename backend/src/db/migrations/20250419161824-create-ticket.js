// Dentro del archivo: backend/src/db/migrations/XXXXXXXXXXXXXX-create-ticket.js

'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Tickets', { // El nombre de la tabla suele ser el plural del modelo
      id: { // Sequelize añade 'id' por defecto, lo mantenemos como Primary Key
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nullifierHash: {
        type: Sequelize.STRING,
        allowNull: false, // No puede estar vacío
        // index: true, // Añadir índice ayuda a buscar rápido por nullifierHash
      },
      drawWeek: {
        type: Sequelize.STRING,
        allowNull: false, // No puede estar vacío
        // index: true, // Añadir índice ayuda a buscar rápido por semana
      },
      numbers: {
        type: Sequelize.JSONB, // Tipo JSON binario, eficiente en Postgres
        allowNull: false
      },
      purchaseTime: {
        allowNull: false,
        type: Sequelize.DATE
      },
      transactionHash: {
        type: Sequelize.STRING,
        allowNull: false, // ¡Importante! No puede estar vacío
        unique: true     // ¡MUY Importante! Asegura que cada tx se use solo una vez
      },
      createdAt: { // Sequelize añade estos campos automáticamente
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') // Valor por defecto
      },
      updatedAt: { // Sequelize añade estos campos automáticamente
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    // Añadir índices explícitamente (mejor rendimiento)
    await queryInterface.addIndex('Tickets', ['nullifierHash']);
    await queryInterface.addIndex('Tickets', ['drawWeek']);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Tickets');
  }
};