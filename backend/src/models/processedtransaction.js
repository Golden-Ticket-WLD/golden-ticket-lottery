'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ProcessedTransaction extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  ProcessedTransaction.init({
    transactionHash: DataTypes.STRING,
    ticketId: DataTypes.INTEGER,
    processedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'ProcessedTransaction',
  });
  return ProcessedTransaction;
};