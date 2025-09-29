const { sequelize } = require('../models');
const Agendamiento = require('../models/Agendamiento');
const Notificacion  = require('../models/Notificacion');
const { formatFechaCitaISOToES, formatHoraCitaToHM } = require('../utils/formatters');

async function confirmar(req, res) {
  const id = Number(req.params.id);
  const actorUserId = req.user?.id || Number(req.body.actorUserId);

  if (!id) return res.status(400).json({ message: 'ID inválido' });

  const t = await sequelize.transaction();
  try {
    // Bloqueo FOR UPDATE
    const ag = await Agendamiento.findByPk(id, { lock: t.LOCK.UPDATE, transaction: t });
    if (!ag) throw { status: 404, message: 'Agendamiento no existe' };

    if (['confirmado','cancelado','completado'].includes(ag.estado)) {
      throw { status: 409, message: `Ya está en estado '${ag.estado}'` };
    }
    if (actorUserId !== ag.vendedorId) {
      throw { status: 403, message: 'Solo el vendedor puede confirmar' };
    }

    // Actualizar campos
    ag.estado = 'confirmado';
    ag.fechaConfirmacion = sequelize.literal('NOW()');
    ag.fechaActualizacion = sequelize.literal('NOW()');
    await ag.save({ transaction: t });

    // Armar mensaje
    const fecha = formatFechaCitaISOToES(ag.fechaCita);
    const hora  = formatHoraCitaToHM(ag.horaCita);
    const titulo = 'Agendamiento confirmado';
    const mensaje = `${ag.vendedorId} ha confirmado la agenda del producto ${ag.productoId} el ${fecha} a las ${hora}.`;

    // Crear notificación
    const noti = await Notificacion.create({
      usuarioId: ag.compradorId,
      remitenteId: ag.vendedorId,
      titulo,
      mensaje,
      tipoNotificacion: 'Venta'
    }, { transaction: t });

    await t.commit();
    return res.json({ agendamiento: ag, notificacion: noti });
  } catch (err) {
    await t.rollback();
    const code = err.status || 500;
    return res.status(code).json({ message: err.message || 'Error interno' });
  }
}

module.exports = { confirmar };
