'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Draw extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Draw.init({
    drawWeek: DataTypes.STRING,
    winningNumbers: DataTypes.JSONB,
    results: DataTypes.JSONB,
    potWld: DataTypes.DECIMAL,
    drawTime: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Draw',
  });
  return Draw;
};