const AgendamientoModel = require('../models/AgendamientoModel');

async function crearAgendamiento(req, res) {
  try {
    const {
      producto_id,
      comprador_id,
      fecha_cita,
      hora_cita,
      cantidad_solicitada,
      precio_total
    } = req.body;

    if (!producto_id || !comprador_id || !fecha_cita || !hora_cita || !cantidad_solicitada || !precio_total) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    const result = await AgendamientoModel.crearAgendamiento({
      producto_id,
      comprador_id,
      fecha_cita,
      hora_cita,
      cantidad_solicitada,
      precio_total
    });

    if (result.error) return res.status(400).json({ error: result.error });

    res.status(201).json({ message: 'Agendamiento creado con éxito', agendamiento: result });
  } catch (err) {
    console.error('Error en controlador:', err);
    res.status(500).json({ error: 'Error al crear el agendamiento.', details: err.message });
  }
}

/**
 * Obtener agendamientos donde el usuario es el vendedor
 * GET /api/appointments/vendedor/:vendedorId
 */
async function getAgendamientosVendedor(req, res) {
  try {
    const { vendedorId } = req.params;
    const { estado } = req.query; // Filtro opcional por estado

    if (!vendedorId || isNaN(vendedorId)) {
      return res.status(400).json({ error: 'ID de vendedor inválido' });
    }

    const agendamientos = await AgendamientoModel.getAgendamientosByVendedor(parseInt(vendedorId), estado);

    res.status(200).json({
      success: true,
      data: agendamientos,
      message: 'Agendamientos del vendedor obtenidos exitosamente'
    });
  } catch (err) {
    console.error('Error al obtener agendamientos del vendedor:', err);
    res.status(500).json({ error: 'Error al obtener agendamientos del vendedor', details: err.message });
  }
}

/**
 * Obtener agendamientos donde el usuario es el comprador
 * GET /api/appointments/comprador/:compradorId
 */
async function getAgendamientosComprador(req, res) {
  try {
    const { compradorId } = req.params;
    const { estado } = req.query; // Filtro opcional por estado

    if (!compradorId || isNaN(compradorId)) {
      return res.status(400).json({ error: 'ID de comprador inválido' });
    }

    const agendamientos = await AgendamientoModel.getAgendamientosByComprador(parseInt(compradorId), estado);

    res.status(200).json({
      success: true,
      data: agendamientos,
      message: 'Agendamientos del comprador obtenidos exitosamente'
    });
  } catch (err) {
    console.error('Error al obtener agendamientos del comprador:', err);
    res.status(500).json({ error: 'Error al obtener agendamientos del comprador', details: err.message });
  }
}

// Rechazar agendamiento
async function rechazarAgendamiento(req, res) {
  try {
    const { id } = req.params;
    const { motivo_cancelacion } = req.body;

    if (!motivo_cancelacion || !motivo_cancelacion.trim()) {
      return res.status(400).json({ error: 'El motivo de cancelación es obligatorio.' });
    }

    const result = await AgendamientoModel.actualizarEstadoAgendamiento(id, 'cancelado', {
      motivo_cancelacion: motivo_cancelacion.trim()
    });

    if (result.success) {
      res.json({ success: true, message: 'Agendamiento rechazado exitosamente' });
    } else {
      res.status(400).json({ error: result.error || 'Error al rechazar agendamiento' });
    }
  } catch (error) {
    console.error('Error al rechazar agendamiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Completar agendamiento
async function completarAgendamiento(req, res) {
  try {
    const { id } = req.params;

    const result = await AgendamientoModel.actualizarEstadoAgendamiento(id, 'completado');

    if (result.success) {
      res.json({ success: true, message: 'Agendamiento completado exitosamente' });
    } else {
      res.status(400).json({ error: result.error || 'Error al completar agendamiento' });
    }
  } catch (error) {
    console.error('Error al completar agendamiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = {
  crearAgendamiento,
  getAgendamientosVendedor,
  getAgendamientosComprador,
  rechazarAgendamiento,
  completarAgendamiento
};

