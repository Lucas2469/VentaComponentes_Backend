// models/Notificacion.js
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('./index');

class Notificacion extends Model {}

Notificacion.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  usuarioId:    { type: DataTypes.INTEGER.UNSIGNED, allowNull:false, field: 'usuario_id' },
  remitenteId:  { type: DataTypes.INTEGER.UNSIGNED, allowNull:false, field: 'remitente_id' },
  titulo:       { type: DataTypes.STRING(100), allowNull:false },
  mensaje:      { type: DataTypes.TEXT, allowNull:false },
  tipoNotificacion: { type: DataTypes.STRING(50), allowNull:false, field: 'tipo_notificacion' },
  estado:       { type: DataTypes.ENUM('no_vista','vista'), defaultValue: 'no_vista' },
  prioridad:    { type: DataTypes.STRING(20), defaultValue: 'normal' },
  fechaCreacion:{ type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'fecha_creacion' }
}, {
  sequelize,
  tableName: 'notificaciones',
  timestamps: false
});

module.exports = Notificacion;
