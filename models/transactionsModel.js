// models/transactionsModel.js
const db = require("../database");
const q = (conn) => conn || db;

// Lista con joins y alias estables para el front
exports.listWithJoins = async (estado, conn) => {
  let sql = `
    SELECT
      t.id AS tx_id, t.usuario_id, t.pack_creditos_id,
      t.cantidad_creditos AS tx_creditos, t.monto_pagado,
      t.comprobante_pago_url, t.estado, t.fecha_compra,
      t.fecha_revision, t.admin_revisor_id, t.comentarios_admin,
      CONCAT_WS(' ', u.nombre, u.apellido) AS usuario,
      p.nombre AS pack_nombre, p.cantidad_creditos AS pack_creditos
    FROM transacciones_creditos t
    LEFT JOIN usuarios u ON u.id = t.usuario_id
    LEFT JOIN packs_creditos p ON p.id = t.pack_creditos_id
  `;
  const params = [];
  if (estado) { sql += " WHERE t.estado=?"; params.push(estado); }
  sql += " ORDER BY t.fecha_compra DESC";

  const [rows] = await q(conn).query(sql, params);
  return rows.map(r => ({
    id: r.tx_id,
    usuario_id: r.usuario_id,
    usuario: r.usuario || `Usuario #${r.usuario_id}`,
    pack_creditos_id: r.pack_creditos_id,
    pack_nombre: r.pack_nombre || "Pack",
    cantidad_creditos: r.tx_creditos ?? r.pack_creditos ?? null,
    monto_pagado: r.monto_pagado,
    comprobante_pago_url: r.comprobante_pago_url,
    estado: r.estado,
    fecha_compra: r.fecha_compra,
    fecha_revision: r.fecha_revision,
    admin_revisor_id: r.admin_revisor_id,
    comentarios_admin: r.comentarios_admin,
  }));
};

// Para transacciones críticas: bloquear fila
exports.getByIdForUpdate = async (id, conn) => {
  const [rows] = await q(conn).query(
    `SELECT id, usuario_id, pack_creditos_id, cantidad_creditos, estado
     FROM transacciones_creditos WHERE id=? FOR UPDATE`,
    [id]
  );
  return rows[0] || null;
};

exports.create = async (payload, conn) => {
  const {
    usuario_id, pack_creditos_id, cantidad_creditos,
    monto_pagado, comprobante_pago_url
  } = payload;

  const [res] = await q(conn).query(
    `INSERT INTO transacciones_creditos
     (usuario_id, pack_creditos_id, cantidad_creditos, monto_pagado,
      comprobante_pago_url, estado, fecha_compra)
     VALUES (?, ?, ?, ?, ?, 'pendiente', NOW())`,
    [usuario_id, pack_creditos_id, cantidad_creditos, monto_pagado, comprobante_pago_url]
  );
  return res.insertId;
};

exports.markApproved = async (id, adminId, comentarios, conn) => {
  const [res] = await q(conn).query(
    `UPDATE transacciones_creditos
     SET estado='aprobada', fecha_revision=NOW(),
         admin_revisor_id=?, comentarios_admin=?
     WHERE id=?`,
    [adminId || null, comentarios || null, id]
  );
  return res.affectedRows > 0;
};

exports.markRejected = async (id, adminId, comentarios, conn) => {
  const [res] = await q(conn).query(
    `UPDATE transacciones_creditos
     SET estado='rechazada', fecha_revision=NOW(),
         admin_revisor_id=?, comentarios_admin=?
     WHERE id=?`,
    [adminId || null, comentarios || null, id]
  );
  return res.affectedRows > 0;
};
