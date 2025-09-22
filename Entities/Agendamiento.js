class Agendamiento {
  constructor({
    id, producto_id, comprador_id, vendedor_id, punto_encuentro_id,
    fecha_cita, hora_cita, dia_semana, estado, motivo_cancelacion,
    fecha_agendamiento, fecha_confirmacion, fecha_completado, fecha_actualizacion
  }) {
    Object.assign(this, {
      id, producto_id, comprador_id, vendedor_id, punto_encuentro_id,
      fecha_cita, hora_cita, dia_semana, estado, motivo_cancelacion,
      fecha_agendamiento, fecha_confirmacion, fecha_completado, fecha_actualizacion
    });
  }
}

module.exports = Agendamiento;