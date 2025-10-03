// models/Usuario.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Usuario extends Model {}

Usuario.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: { type: DataTypes.STRING(50), allowNull: false },
  apellido: { type: DataTypes.STRING(50), allowNull: false },
  email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  telefono: { type: DataTypes.STRING(20), allowNull: true },
  fechaCreacion: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'fecha_creacion' }
}, {
  sequelize,
  tableName: 'usuarios',
  timestamps: false
});

module.exports = Usuario;
