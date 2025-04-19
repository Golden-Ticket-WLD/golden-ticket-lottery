// Dentro del archivo: backend/src/db/migrations/XXXXXXXXXXXXXX-create-processed-transaction.js

'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ProcessedTransactions', {
      // Usaremos transactionHash como clave primaria aquí para máxima eficiencia
      // al verificar si una transacción ya existe. Sequelize no añade 'id' por defecto si defines una PK.
      transactionHash: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true // La hacemos clave primaria y única
      },
      ticketId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        // Opcional: Añadir referencia a la tabla Tickets si quieres integridad referencial
        // references: {
        //   model: 'Tickets', // Nombre de la tabla Tickets
        //   key: 'id',
        // },
        // onUpdate: 'CASCADE',
        // onDelete: 'SET NULL', // O 'CASCADE' si quieres borrar la tx procesada si se borra el ticket
      },
      processedAt: {
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
    await queryInterface.dropTable('ProcessedTransactions');
  }
};