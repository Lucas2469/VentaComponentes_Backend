// models/PuntoEncuentro.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class PuntoEncuentro extends Model {}

PuntoEncuentro.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  direccion: { type: DataTypes.TEXT, allowNull: true },
  latitud: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  longitud: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  estado: { type: DataTypes.ENUM('activo', 'inactivo'), defaultValue: 'activo' }
}, {
  sequelize,
  tableName: 'puntos_encuentro',
  timestamps: false
});

module.exports = PuntoEncuentro;
