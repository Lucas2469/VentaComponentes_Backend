// models/index.js
const sequelize = require('../config/database');

// Importar modelos
const Usuario = require('./Usuario');
const Producto = require('./Producto');
const PuntoEncuentro = require('./PuntoEncuentro');
const Agendamiento = require('./Agendamiento');
const Calificacion = require('./Calificacion');
const Notificacion = require('./Notificacion');

// Definir relaciones
// Usuario - Agendamiento (como comprador)
Usuario.hasMany(Agendamiento, { foreignKey: 'compradorId', as: 'agendamientosComprador' });
Agendamiento.belongsTo(Usuario, { foreignKey: 'compradorId', as: 'comprador' });

// Usuario - Agendamiento (como vendedor)
Usuario.hasMany(Agendamiento, { foreignKey: 'vendedorId', as: 'agendamientosVendedor' });
Agendamiento.belongsTo(Usuario, { foreignKey: 'vendedorId', as: 'vendedor' });

// Producto - Agendamiento
Producto.hasMany(Agendamiento, { foreignKey: 'productoId', as: 'agendamientos' });
Agendamiento.belongsTo(Producto, { foreignKey: 'productoId', as: 'producto' });

// PuntoEncuentro - Agendamiento
PuntoEncuentro.hasMany(Agendamiento, { foreignKey: 'puntoEncuentroId', as: 'agendamientos' });
Agendamiento.belongsTo(PuntoEncuentro, { foreignKey: 'puntoEncuentroId', as: 'punto' });

// Agendamiento - Calificacion
Agendamiento.hasMany(Calificacion, { foreignKey: 'agendamientoId', as: 'calificaciones' });
Calificacion.belongsTo(Agendamiento, { foreignKey: 'agendamientoId', as: 'agenda' });

// Usuario - Calificacion (como calificador)
Usuario.hasMany(Calificacion, { foreignKey: 'calificatorId', as: 'calificacionesHechas' });
Calificacion.belongsTo(Usuario, { foreignKey: 'calificatorId', as: 'calificador' });

// Usuario - Calificacion (como calificado)
Usuario.hasMany(Calificacion, { foreignKey: 'calificadoId', as: 'calificacionesRecibidas' });
Calificacion.belongsTo(Usuario, { foreignKey: 'calificadoId', as: 'calificado' });

// Usuario - Notificacion (como destinatario)
Usuario.hasMany(Notificacion, { foreignKey: 'usuarioId', as: 'notificaciones' });
Notificacion.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });

// Usuario - Notificacion (como remitente)
Usuario.hasMany(Notificacion, { foreignKey: 'remitenteId', as: 'notificacionesEnviadas' });
Notificacion.belongsTo(Usuario, { foreignKey: 'remitenteId', as: 'remitente' });

module.exports = { 
  sequelize,
  Usuario,
  Producto,
  PuntoEncuentro,
  Agendamiento,
  Calificacion,
  Notificacion
};
