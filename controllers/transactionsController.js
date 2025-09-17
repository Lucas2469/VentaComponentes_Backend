// controllers/transactionsController.js
const db = require('../database');

/**
 * Lista todas las transacciones con datos de usuario y paquete
 */
exports.getAllTransactions = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        t.id,
        CONCAT(u.nombre, ' ', u.apellido) AS usuario,
        p.nombre                         AS paquete,
        t.cantidad_creditos,
        t.monto_pagado,
        t.comprobante_pago_url,
        t.estado,
        DATE_FORMAT(t.fecha_compra,   '%d/%m/%Y') AS fecha_compra,
        DATE_FORMAT(t.fecha_revision,'%d/%m/%Y') AS fecha_revision,
        t.comentarios_admin
      FROM transacciones_creditos t
      JOIN usuarios       u ON u.id = t.usuario_id
      JOIN packs_creditos p ON p.id = t.pack_creditos_id
      ORDER BY t.fecha_compra DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error al cargar comprobantes:', err);
    res.status(500).json({ error: 'Error al cargar comprobantes' });
  }
};

/**
 * Aprueba una transacción (cambia estado a 'aprobado')
 * Se espera recibir en el body { admin_revisor_id: <ID del admin> }
 */
exports.approveTransaction = async (req, res) => {
  const { id } = req.params;
  const { admin_revisor_id } = req.body;

  if (!admin_revisor_id) {
    return res.status(400).json({ error: 'Se requiere admin_revisor_id' });
  }

  try {
    const [result] = await db.query(
      `
      UPDATE transacciones_creditos
         SET estado           = 'aprobada',
             fecha_revision   = NOW(),
             admin_revisor_id = ?,
             comentarios_admin= ''
       WHERE id = ?
      `,
      [admin_revisor_id, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Transacción no encontrada' });
    }

    res.json({ message: 'Transacción aprobada' });
  } catch (err) {
    console.error('Error al aprobar transacción:', err);
    res.status(500).json({ error: 'Error al aprobar transacción' });
  }
};

/**
 * Rechaza una transacción (cambia estado a 'rechazado')
 * Se espera recibir en el body { admin_revisor_id, comentarios_admin }
 */
exports.rejectTransaction = async (req, res) => {
  const { id } = req.params;
  const { admin_revisor_id, comentarios_admin } = req.body;

  if (!admin_revisor_id || !comentarios_admin) {
    return res.status(400).json({ error: 'Se requieren admin_revisor_id y comentarios_admin' });
  }

  try {
    const [result] = await db.query(
      `
      UPDATE transacciones_creditos
         SET estado           = 'rechazada',
             fecha_revision   = NOW(),
             admin_revisor_id = ?,
             comentarios_admin= ?
       WHERE id = ?
      `,
      [admin_revisor_id, comentarios_admin, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Transacción no encontrada' });
    }

    res.json({ message: 'Transacción rechazada' });
  } catch (err) {
    console.error('Error al rechazar transacción:', err);
    res.status(500).json({ error: 'Error al rechazar transacción' });
  }
};
