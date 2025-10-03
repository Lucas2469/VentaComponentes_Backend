// controllers/packsController.js
const path = require('path');
const fs = require('fs');
const db = require('../database');

// GET  /api/packs            → lista todos los paquetes
exports.getAllPacks = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM packs_creditos WHERE estado = ?', ['activo']);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener paquetes' });
  }
};

// GET  /api/packs/:id        → obtiene un paquete por ID
exports.getPackById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM packs_creditos WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Paquete no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el paquete' });
  }
};

// POST /api/packs            → crea un paquete (form-data con file 'qr_imagen')
exports.createPack = async (req, res) => {
  const { nombre, cantidad_creditos, precio } = req.body;
  let qr_imagen_url = null;

  if (req.file) {
    // construye la URL pública
    qr_imagen_url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  }

  try {
    const [result] = await db.query(
      `INSERT INTO packs_creditos 
        (nombre, cantidad_creditos, precio, qr_imagen_url, estado, fecha_creacion)
       VALUES (?, ?, ?, ?, 'activo', NOW())`,
      [nombre, cantidad_creditos, precio, qr_imagen_url]
    );
    res.status(201).json({ id: result.insertId, nombre, cantidad_creditos, precio, qr_imagen_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el paquete' });
  }
};

// PUT  /api/packs/:id        → actualiza un paquete, opcionalmente reemplaza QR
exports.updatePack = async (req, res) => {
  const { id } = req.params;
  const { nombre, cantidad_creditos, precio } = req.body;
  let qr_imagen_url = req.body.qr_imagen_url; // si no suben archivo, pueden reenviar URL existente

  if (req.file) {
    // borra la imagen anterior (opcional)
    // const old = await db.query('SELECT qr_imagen_url FROM packs_creditos WHERE id = ?', [id]);
    // if (old[0][0].qr_imagen_url) fs.unlinkSync(path.join(__dirname, '../public', old[0][0].qr_imagen_url));
    qr_imagen_url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  }

  try {
    const [result] = await db.query(
      `UPDATE packs_creditos SET 
         nombre = ?, cantidad_creditos = ?, precio = ?, qr_imagen_url = ?
       WHERE id = ?`,
      [nombre, cantidad_creditos, precio, qr_imagen_url, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Paquete no encontrado' });
    res.json({ message: 'Paquete actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el paquete' });
  }
};

// DELETE /api/packs/:id      → borrado lógico (marca estado = 'inactivo')
exports.deletePack = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query(
      'UPDATE packs_creditos SET estado = "inactivo" WHERE id = ?',
      [id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Paquete no encontrado' });
    res.json({ message: 'Paquete desactivado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar el paquete' });
  }
};
