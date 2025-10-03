// models/Calificacion.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Calificacion extends Model {}

Calificacion.init({
  id:              { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  productoId:      { type: DataTypes.INTEGER.UNSIGNED, allowNull:false, field: 'producto_id' },
  agendamientoId:  { type: DataTypes.INTEGER.UNSIGNED, allowNull:false, field: 'agendamiento_id' },
  calificatorId:   { type: DataTypes.INTEGER.UNSIGNED, allowNull:false, field: 'calificador_id' },
  calificadoId:    { type: DataTypes.INTEGER.UNSIGNED, allowNull:false, field: 'calificado_id' },
  tipoCalificacion:{ type: DataTypes.STRING(50), allowNull:false, field: 'tipo_calificacion' },
  calificacion:    { type: DataTypes.INTEGER.UNSIGNED, allowNull:false },
  comentario:      { type: DataTypes.TEXT, allowNull: true },
  fechaComentario: { type: DataTypes.DATE, allowNull: false, field: 'fecha_comentario' },
  estado:          { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'activo' }
}, {
  sequelize,
  modelName: 'Calificacion',
  tableName: 'calificaciones',
  timestamps: false
});

module.exports = Calificacion;
