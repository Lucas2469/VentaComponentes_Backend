const Notificacion = require('../models/Notificacion');

async function crear(req, res) {
  const { usuarioId, remitenteId, titulo, mensaje, tipoNotificacion } = req.body;
  if (!usuarioId || !remitenteId || !titulo || !mensaje || !tipoNotificacion) {
    return res.status(400).json({ message: 'Faltan campos obligatorios' });
  }

  try {
    const noti = await Notificacion.create({
      usuarioId,
      remitenteId,
      titulo,
      mensaje,
      tipoNotificacion
    });
    return res.status(201).json({ notificacion: noti });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = { crear };
