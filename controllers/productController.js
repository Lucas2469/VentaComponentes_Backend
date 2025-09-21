const express = require('express');
const router = express.Router();
const db = require('../database');

// ========== COMPRAR CRÉDITOS ==========
router.post('/comprar', async (req, res) => {
  try {
    const { usuario_id, pack_creditos_id, cantidad_creditos, monto_pagado, comprobante_pago_url } = req.body;

    if (!usuario_id || !pack_creditos_id || !cantidad_creditos || !monto_pagado || !comprobante_pago_url) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    const [result] = await db.query(
      `INSERT INTO transacciones_creditos 
        (usuario_id, pack_creditos_id, cantidad_creditos, monto_pagado, comprobante_pago_url) 
       VALUES (?, ?, ?, ?, ?)`,
      [usuario_id, pack_creditos_id, cantidad_creditos, monto_pagado, comprobante_pago_url]
    );

    res.status(201).json({ 
      message: "Solicitud de compra registrada correctamente",
      transaccion_id: result.insertId 
    });

  } catch (error) {
    console.error("Error en POST /comprar:", error);
    res.status(500).json({ error: "Error al registrar la compra" });
  }
});

module.exports = router;
