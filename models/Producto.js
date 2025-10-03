// models/Producto.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Producto extends Model {}

Producto.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: true },
  precio: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  categoriaId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'categoria_id' },
  vendedorId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'vendedor_id' },
  estado: { type: DataTypes.ENUM('activo', 'inactivo', 'vendido'), defaultValue: 'activo' },
  fechaCreacion: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'fecha_creacion' }
}, {
  sequelize,
  tableName: 'productos',
  timestamps: false
});

module.exports = Producto;
