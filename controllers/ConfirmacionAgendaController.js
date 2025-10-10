const db = require('../database');
const { formatFechaCitaISOToES, formatHoraCitaToHM } = require('../utils/formatters');

async function confirmar(req, res) {
  const id = Number(req.params.id);
  const actorUserId = req.user?.id || Number(req.body.actorUserId);

  if (!id) return res.status(400).json({ message: 'ID inválido' });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Obtener agendamiento con datos del vendedor y producto
    const [agendamientos] = await connection.query(
      `SELECT a.*,
              CONCAT(v.nombre, ' ', v.apellido) as vendedor_nombre,
              p.nombre as producto_nombre
       FROM agendamientos a
       JOIN usuarios v ON a.vendedor_id = v.id
       JOIN productos p ON a.producto_id = p.id
       WHERE a.id = ? FOR UPDATE`,
      [id]
    );

    if (agendamientos.length === 0) {
      throw { status: 404, message: 'Agendamiento no existe' };
    }

    const ag = agendamientos[0];

    if (['confirmado', 'cancelado', 'completado'].includes(ag.estado)) {
      throw { status: 409, message: `Ya está en estado '${ag.estado}'` };
    }
    if (actorUserId !== ag.vendedor_id) {
      throw { status: 403, message: 'Solo el vendedor puede confirmar' };
    }

    // Obtener cantidad solicitada (por defecto 1 si no existe el campo)
    const cantidadSolicitada = ag.cantidad_solicitada || 1;

    // Descontar stock del producto
    await connection.query(
      `UPDATE productos
       SET stock = stock - ?
       WHERE id = ?`,
      [cantidadSolicitada, ag.producto_id]
    );

    // Verificar si el producto quedó agotado y actualizar su estado
    const [productosCheck] = await connection.query(
      'SELECT stock FROM productos WHERE id = ?',
      [ag.producto_id]
    );

    if (productosCheck.length > 0 && productosCheck[0].stock <= 0) {
      await connection.query(
        `UPDATE productos
         SET estado = 'agotado', stock = 0
         WHERE id = ?`,
        [ag.producto_id]
      );
    }

    // Actualizar agendamiento
    const [updateResult] = await connection.query(
      `UPDATE agendamientos
       SET estado = 'confirmado',
           fecha_confirmacion = NOW(),
           fecha_actualizacion = NOW()
       WHERE id = ?`,
      [id]
    );

    // Armar mensaje de notificación
    const fecha = formatFechaCitaISOToES(ag.fecha_cita);
    const hora = formatHoraCitaToHM(ag.hora_cita);
    const titulo = 'Agendamiento confirmado';
    const mensaje = `${ag.vendedor_nombre} ha confirmado la agenda del producto "${ag.producto_nombre}" el ${fecha} a las ${hora}.`;

    // Crear notificación
    const [notiResult] = await connection.query(
      `INSERT INTO notificaciones
       (usuario_id, remitente_id, titulo, mensaje, tipo_notificacion, estado, fecha_creacion)
       VALUES (?, ?, ?, ?, 'agendamiento', 'no_vista', NOW())`,
      [ag.comprador_id, ag.vendedor_id, titulo, mensaje]
    );

    await connection.commit();

    // Obtener el agendamiento actualizado
    const [updatedAg] = await connection.query(
      'SELECT * FROM agendamientos WHERE id = ?',
      [id]
    );

    return res.json({
      agendamiento: updatedAg[0],
      notificacion: {
        id: notiResult.insertId,
        usuario_id: ag.comprador_id,
        remitente_id: ag.vendedor_id,
        titulo,
        mensaje,
        tipo_notificacion: 'creditos'
      }
    });
  } catch (err) {
    await connection.rollback();
    const code = err.status || 500;
    return res.status(code).json({ message: err.message || 'Error interno' });
  } finally {
    connection.release();
  }
}

module.exports = { confirmar };
