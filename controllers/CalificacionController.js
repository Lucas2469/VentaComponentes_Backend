const CalificacionModel = require('../models/CalificacionModel');

// Crear nueva calificación
async function crearCalificacion(req, res) {
  try {
    const {
      producto_id,
      agendamiento_id,
      calificador_id,
      calificado_id,
      tipo_calificacion,
      calificacion,
      comentario
    } = req.body;

    // Validar campos obligatorios
    if (!producto_id || !agendamiento_id || !calificador_id || !calificado_id || !tipo_calificacion || !calificacion) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios para crear la calificación.'
      });
    }

    // Validar rango de calificación
    if (calificacion < 1 || calificacion > 5) {
      return res.status(400).json({
        success: false,
        message: 'La calificación debe estar entre 1 y 5 estrellas.'
      });
    }

    // Validar tipo de calificación
    if (!['comprador_a_vendedor', 'vendedor_a_comprador'].includes(tipo_calificacion)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de calificación inválido.'
      });
    }

    const result = await CalificacionModel.crearCalificacion({
      producto_id,
      agendamiento_id,
      calificador_id,
      calificado_id,
      tipo_calificacion,
      calificacion,
      comentario: comentario || null
    });

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Calificación creada exitosamente',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Error al crear calificación'
      });
    }
  } catch (error) {
    console.error('Error al crear calificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

// Obtener calificaciones de un producto
async function obtenerCalificacionesProducto(req, res) {
  try {
    const { productoId } = req.params;

    const calificaciones = await CalificacionModel.obtenerCalificacionesPorProducto(productoId);

    res.json({
      success: true,
      data: calificaciones
    });
  } catch (error) {
    console.error('Error al obtener calificaciones del producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener calificaciones del producto'
    });
  }
}

// Obtener calificaciones de un usuario
async function obtenerCalificacionesUsuario(req, res) {
  try {
    const { usuarioId } = req.params;

    const calificaciones = await CalificacionModel.obtenerCalificacionesPorUsuario(usuarioId);

    res.json({
      success: true,
      data: calificaciones
    });
  } catch (error) {
    console.error('Error al obtener calificaciones del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener calificaciones del usuario'
    });
  }
}

// Verificar si un agendamiento ya fue calificado
async function verificarCalificacionExistente(req, res) {
  try {
    const { agendamientoId, calificadorId, tipoCalificacion } = req.params;

    const existe = await CalificacionModel.verificarCalificacionExistente(
      agendamientoId,
      calificadorId,
      tipoCalificacion
    );

    res.json({
      success: true,
      exists: existe
    });
  } catch (error) {
    console.error('Error al verificar calificación existente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar calificación'
    });
  }
}

module.exports = {
  crearCalificacion,
  obtenerCalificacionesProducto,
  obtenerCalificacionesUsuario,
  verificarCalificacionExistente
};