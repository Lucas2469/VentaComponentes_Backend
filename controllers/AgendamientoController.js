const AgendamientoModel = require('../models/AgendamientoModel');

async function crearAgendamiento(req, res) {
  try {
    const {
      producto_id,
      comprador_id,
      fecha_cita,
      hora_cita,
      cantidad_solicitada
    } = req.body;

    if (!producto_id || !comprador_id || !fecha_cita || !hora_cita || !cantidad_solicitada) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    const result = await AgendamientoModel.crearAgendamiento({
      producto_id,
      comprador_id,
      fecha_cita,
      hora_cita,
      cantidad_solicitada
    });

    if (result.error) return res.status(400).json({ error: result.error });

    res.status(201).json({ message: 'Agendamiento creado con éxito', agendamiento: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el agendamiento.' });
  }
}

module.exports = {
  crearAgendamiento
};
