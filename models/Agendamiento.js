// models/Agendamiento.js
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('./index');

class Agendamiento extends Model {}

Agendamiento.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  compradorId:   { type: DataTypes.INTEGER.UNSIGNED, allowNull:false, field: 'comprador_id' },
  vendedorId:    { type: DataTypes.INTEGER.UNSIGNED, allowNull:false, field: 'vendedor_id' },
  productoId:    { type: DataTypes.INTEGER.UNSIGNED, allowNull:false, field: 'producto_id' },
  puntoEncuentroId: { type: DataTypes.INTEGER.UNSIGNED, allowNull:true, field: 'punto_encuentro_id' },
  fechaCita:     { type: DataTypes.DATEONLY, allowNull:false, field: 'fecha_cita' },
  horaCita:      { type: DataTypes.TIME, allowNull:false, field: 'hora_cita' },
  estado:        { type: DataTypes.ENUM('agendado','confirmado','cancelado','completado'), defaultValue:'agendado' },
  fechaConfirmacion: { type: DataTypes.DATE, allowNull: true, field: 'fecha_confirmacion' },
  fechaActualizacion: { type: DataTypes.DATE, allowNull: true, field: 'fecha_actualizacion' }
}, {
  sequelize,
  tableName: 'agendamientos',
  timestamps: false
});

module.exports = Agendamiento;
