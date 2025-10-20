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

    // Derivar valores obligatorios si no vienen
    const [[pack]] = await db.query(
      "SELECT cantidad_creditos, precio FROM packs_creditos WHERE id = ? AND estado='activo'",
      [pack_creditos_id]
    );
    if (!pack) return res.status(400).json({ error: "Pack no válido o inactivo" });

    const cant = Number(cantidad_creditos ?? pack.cantidad_creditos);
    const monto = Number(monto_pagado ?? pack.precio);

    const comprobantePath = "/images/imagesPayments/" + req.file.filename;

    // Obtener información del usuario para la notificación
    const [[usuario]] = await db.query(
      "SELECT nombre, apellido FROM usuarios WHERE id = ?",
      [usuario_id]
    );

    const nombreUsuario = usuario ? `${usuario.nombre} ${usuario.apellido}` : `Usuario #${usuario_id}`;
    const nombrePack = pack ? `${cant} créditos por Bs ${monto.toFixed(2)}` : `${cant} créditos`;

    await db.query(
      `INSERT INTO transacciones_creditos
       (usuario_id, pack_creditos_id, cantidad_creditos, monto_pagado,
        comprobante_pago_url, estado, fecha_compra)
       VALUES (?, ?, ?, ?, ?, 'pendiente', NOW())`,
      [usuario_id, pack_creditos_id, cant, monto, comprobantePath]
    );

    // Crear notificación para el administrador
    const mensaje = `${nombreUsuario} ha enviado una nueva solicitud de compra de créditos: ${nombrePack}. Revisa el comprobante de pago y aprueba o rechaza la solicitud.`;

    await db.query(
      `INSERT INTO notificaciones
        (usuario_id, remitente_id, titulo, mensaje, tipo_notificacion, estado, prioridad)
       VALUES (1, ?, 'Nueva solicitud de créditos', ?, 'creditos', 'no_vista', 'alta')`,
      [usuario_id, mensaje]
    );

    res.status(201).json({ message: "Solicitud de compra registrada. En revisión." });
  } catch (err) {
    console.error("comprarCreditos error:", err);
    res.status(500).json({ error: "Error registrando la compra" });
  }
};

// GET /api/creditos/transacciones
exports.getTransacciones = async (req, res) => {
  const { estado } = req.query;
  try {
    let sql = `
      SELECT
        t.id AS tx_id, t.usuario_id,
        CONCAT_WS(' ', u.nombre, u.apellido) AS usuario,
        t.pack_creditos_id, p.nombre AS pack_nombre,
        p.cantidad_creditos AS pack_creditos,
        t.cantidad_creditos AS tx_creditos,
        t.monto_pagado, t.comprobante_pago_url, t.estado,
        t.fecha_compra, t.fecha_revision,
        t.admin_revisor_id, t.comentarios_admin
      FROM transacciones_creditos t
      LEFT JOIN usuarios u ON u.id = t.usuario_id
      LEFT JOIN packs_creditos p ON p.id = t.pack_creditos_id
    `;
    const params = [];
    if (estado) { sql += " WHERE t.estado = ?"; params.push(estado); }
    sql += " ORDER BY t.fecha_compra DESC";

    const [rows] = await db.query(sql, params);
    res.json(rows.map(r => ({
      id: r.tx_id,
      usuario_id: r.usuario_id,
      usuario: r.usuario || `Usuario #${r.usuario_id}`,
      pack_creditos_id: r.pack_creditos_id,
      pack_nombre: r.pack_nombre || "Pack",
      cantidad_creditos: r.tx_creditos ?? r.pack_creditos,
      monto_pagado: r.monto_pagado,
      comprobante_pago_url: r.comprobante_pago_url,
      estado: r.estado,
      fecha_compra: r.fecha_compra,
      fecha_revision: r.fecha_revision,
      admin_revisor_id: r.admin_revisor_id,
      comentarios_admin: r.comentarios_admin,
    })));
  } catch (err) {
    console.error("getTransacciones error:", err);
    res.status(500).json({ error: "Error obteniendo transacciones" });
  }
};

// PUT /api/creditos/transacciones/:id  { accion: "aprobar"|"rechazar", admin_revisor_id?, comentarios_admin? }
exports.actualizarEstado = async (req, res) => {
  const { id } = req.params;
  const { accion, admin_revisor_id, comentarios_admin } = req.body;

  if (!["aprobar", "rechazar"].includes(accion)) {
    return res.status(400).json({ error: "Acción inválida" });
  }
  if (accion === "rechazar" && !comentarios_admin?.trim()) {
    return res.status(400).json({ error: "Motivo de rechazo es obligatorio" });
  }

  try {
    // Solo transiciones desde 'pendiente'
    const [result] = await db.query(
      `UPDATE transacciones_creditos
         SET estado = ?, fecha_revision = NOW(),
             admin_revisor_id = ?, comentarios_admin = ?
       WHERE id = ? AND estado = 'pendiente'`,
      [
        accion === "aprobar" ? "aprobada" : "rechazada",
        admin_revisor_id || null,
        comentarios_admin || null,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(409).json({ error: "No se pudo actualizar (ya revisada o no existe)" });
    }

    // Importante: NO sumar créditos aquí; lo hace el trigger al quedar 'aprobada'
    // (historial + notificación también). :contentReference[oaicite:3]{index=3} :contentReference[oaicite:4]{index=4}
    res.json({ message: "Estado actualizado", id, estado: accion === "aprobar" ? "aprobada" : "rechazada" });
  } catch (err) {
    console.error("actualizarEstado error:", err);
    res.status(500).json({ error: "Error actualizando estado" });
  }
};
