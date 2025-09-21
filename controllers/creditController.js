// controllers/creditController.js
const db = require("../database");

// POST /api/creditos/comprar  (cliente sube comprobante)
exports.comprarCreditos = async (req, res) => {
  try {
    const { usuario_id, pack_creditos_id, cantidad_creditos, monto_pagado } = req.body;

    if (!usuario_id || !pack_creditos_id) {
      return res.status(400).json({ error: "usuario_id y pack_creditos_id son obligatorios" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Debe subir un comprobante de pago" });
    }

    const comprobantePath = "/images/imagesPayments/" + req.file.filename;

    await db.query(
      `INSERT INTO transacciones_creditos
       (usuario_id, pack_creditos_id, cantidad_creditos, monto_pagado,
        comprobante_pago_url, estado, fecha_compra)
       VALUES (?, ?, ?, ?, ?, 'pendiente', NOW())`,
      [
        usuario_id,
        pack_creditos_id,
        cantidad_creditos || null,
        monto_pagado || null,
        comprobantePath,
      ]
    );

    res.status(201).json({ message: "Solicitud de compra registrada. En revisión." });
  } catch (err) {
    console.error("comprarCreditos error:", err);
    res.status(500).json({ error: "Error registrando la compra" });
  }
};

// GET /api/creditos/transacciones
exports.getTransacciones = async (req, res) => {
  const { estado } = req.query; // 'pendiente' | 'aprobada' | 'rechazada'
  try {
    let sql = `
      SELECT
        t.id                         AS tx_id,
        t.usuario_id,
        CONCAT_WS(' ', u.nombre, u.apellido) AS usuario,
        t.pack_creditos_id,
        p.nombre                     AS pack_nombre,
        p.cantidad_creditos          AS pack_creditos,
        t.cantidad_creditos          AS tx_creditos,
        t.monto_pagado,
        t.comprobante_pago_url,
        t.estado,
        t.fecha_compra,
        t.fecha_revision,
        t.admin_revisor_id,
        t.comentarios_admin
      FROM transacciones_creditos t
      LEFT JOIN usuarios u       ON u.id = t.usuario_id
      LEFT JOIN packs_creditos p ON p.id = t.pack_creditos_id
    `;
    const params = [];
    if (estado) { sql += " WHERE t.estado = ?"; params.push(estado); }
    sql += " ORDER BY t.fecha_compra DESC";

    const [rows] = await db.query(sql, params);

    const data = rows.map(r => ({
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

    res.json(data);
  } catch (err) {
    console.error("getTransacciones error:", err);
    res.status(500).json({ error: "Error obteniendo transacciones" });
  }
};

// PUT /api/creditos/transacciones/:id
// Body { accion: "aprobar"|"rechazar", admin_revisor_id?, comentarios_admin? }
exports.actualizarEstado = async (req, res) => {
  const { id } = req.params;
  const { accion, admin_revisor_id, comentarios_admin } = req.body;

  if (!["aprobar", "rechazar"].includes(accion)) {
    return res.status(400).json({ error: "Acción inválida" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Bloqueo de la transacción
    const [txRows] = await conn.query(
      `SELECT id, usuario_id, pack_creditos_id, cantidad_creditos, estado
         FROM transacciones_creditos
        WHERE id = ? FOR UPDATE`,
      [id]
    );
    if (!txRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: "Transacción no encontrada" });
    }
    const tx = txRows[0];
    if (tx.estado !== "pendiente") {
      await conn.rollback();
      return res.status(409).json({ error: "La transacción ya fue revisada" });
    }

    if (accion === "aprobar") {
      // Créditos: primero los de la transacción; si no, del pack
      let creditos = Number(tx.cantidad_creditos) || 0;
      if (!creditos) {
        const [pRows] = await conn.query(
          "SELECT cantidad_creditos FROM packs_creditos WHERE id = ?",
          [tx.pack_creditos_id]
        );
        if (!pRows.length) {
          await conn.rollback();
          return res.status(400).json({ error: "Pack asociado no existe" });
        }
        creditos = Number(pRows[0].cantidad_creditos) || 0;
      }

      // Sumar al saldo del usuario
      await conn.query(
        `UPDATE usuarios
            SET creditos_disponibles = IFNULL(creditos_disponibles,0) + ?
          WHERE id = ?`,
        [creditos, tx.usuario_id]
      );

      // Marcar como aprobada
      await conn.query(
        `UPDATE transacciones_creditos
            SET estado='aprobada',
                fecha_revision=NOW(),
                admin_revisor_id = ?,
                comentarios_admin = ?
          WHERE id = ?`,
        [admin_revisor_id || null, comentarios_admin || null, id]
      );

      await conn.commit();
      return res.json({
        message: "Transacción aprobada",
        id,
        estado: "aprobada",
        creditosSumados: creditos,
      });
    }

    // Rechazo: comentario obligatorio
    if (!comentarios_admin || !comentarios_admin.trim()) {
      await conn.rollback();
      return res.status(400).json({ error: "Motivo de rechazo es obligatorio" });
    }

    await conn.query(
      `UPDATE transacciones_creditos
          SET estado='rechazada',
              fecha_revision=NOW(),
              admin_revisor_id=?,
              comentarios_admin=?
        WHERE id=?`,
      [admin_revisor_id || null, comentarios_admin, id]
    );

    await conn.commit();
    return res.json({ message: "Transacción rechazada", id, estado: "rechazada" });
  } catch (err) {
    console.error("actualizarEstado error:", err);
    try { await conn.rollback(); } catch {}
    res.status(500).json({ error: "Error actualizando estado" });
  } finally {
    if (conn) conn.release();
  }
};
