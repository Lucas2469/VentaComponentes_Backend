// routes/creditRoutes.js
const express = require("express");
const router = express.Router();

const creditController = require("../controllers/creditController");
const { uploadPayments } = require("../middleware/uploadCloudinary");

// (Opcional) usar el controller de packs como alias de solo lectura aquí
const packsCtrl = require("../controllers/packsController");

/**
 * Cliente: registra compra con comprobante (sube imagen)
 * Body (multipart/form-data):
 *  - usuario_id
 *  - pack_creditos_id
 *  - monto_pagado (opcional si lo calculan)
 *  - comprobante_pago (file)
 */
router.post(
  "/comprar",
  uploadPayments.single("comprobante_pago"),
  creditController.comprarCreditos
);

/**
 * Admin: listar transacciones (opcional ?estado=pending|aprobada|rechazada)
 * GET /api/creditos/transacciones?estado=pendiente
 */
router.get("/transacciones", creditController.getTransacciones);

/**
 * Admin: actualizar estado
 * PUT /api/creditos/transacciones/:id
 * Body JSON:
 *  { accion: "aprobar",  admin_revisor_id?: number, comentarios_admin?: string }
 *  { accion: "rechazar", admin_revisor_id?: number, comentarios_admin: string }  // comentario requerido
 *
 * - "aprobar" suma créditos al usuario y marca fecha_revision/admin_revisor_id
 * - "rechazar" solo cambia estado y guarda motivo
 */
router.put("/transacciones/:id", creditController.actualizarEstado);

// Alias (solo lectura) para packs desde el módulo de créditos, si alguien ya consume este path
router.get("/packs", packsCtrl.getAllPacks);

// Manejo explícito de errores de multer (tipo/tamaño de archivo, etc.)
router.use((err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message });
  next();
});

module.exports = router;
