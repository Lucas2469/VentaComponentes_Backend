// controllers/packsController.js
const path = require('path');
const fs = require('fs').promises;
const db = require('../database');

// Preferir acceso directo a DB pero mantener compatibilidad
const Packs = {
  getAllActive: async () => {
    const [rows] = await db.query('SELECT * FROM packs_creditos WHERE estado = ?', ['activo']);
    return rows;
  },
  getById: async (id) => {
    const [rows] = await db.query('SELECT * FROM packs_creditos WHERE id = ?', [id]);
    return rows[0] || null;
  },
  insert: async ({ nombre, cantidad_creditos, precio, qr_imagen_url, descripcion }) => {
    const [result] = await db.query(
      `INSERT INTO packs_creditos
        (nombre, cantidad_creditos, precio, qr_imagen_url, estado, fecha_creacion, descripcion)
       VALUES (?, ?, ?, ?, 'activo', NOW(), ?)`,
      [nombre, cantidad_creditos, precio, qr_imagen_url, descripcion]
    );
    return result.insertId;
  },
  update: async (id, { nombre, cantidad_creditos, precio, qr_imagen_url, descripcion }) => {
    const [result] = await db.query(
      `UPDATE packs_creditos SET
         nombre = ?, cantidad_creditos = ?, precio = ?, qr_imagen_url = ?, descripcion = ?
       WHERE id = ?`,
      [nombre, cantidad_creditos, precio, qr_imagen_url, descripcion, id]
    );
    return result.affectedRows > 0;
  },
  softDelete: async (id) => {
    const [result] = await db.query(
      'UPDATE packs_creditos SET estado = "inactivo" WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
};

const PUBLIC_SUBDIR = "/images/imagesPacks";
const FS_DIR = path.join(__dirname, "..", PUBLIC_SUBDIR.replace(/^\//, ""));

const fsPathFromUrl = (url) => path.join(FS_DIR, path.basename(url || ""));

// GET /api/packs
exports.getAllPacks = async (req, res) => {
  try {
    const rows = await Packs.getAllActive();
    res.json(rows);
  } catch (err) {
    console.error("Error obteniendo packs:", err);
    res.status(500).json({ error: "Error obteniendo packs" });
  }
};

// GET /api/packs/:id
exports.getPackById = async (req, res) => {
  try {
    const pack = await Packs.getById(req.params.id);
    if (!pack) return res.status(404).json({ error: "Paquete no encontrado" });
    res.json(pack);
  } catch (err) {
    console.error("getPackById:", err);
    res.status(500).json({ error: "Error al obtener el paquete" });
  }
};

// POST /api/packs
exports.createPack = async (req, res) => {
  try {
    const { nombre, cantidad_creditos, precio, descripcion } = req.body;
    const cant = Number(cantidad_creditos);
    const price = Number(precio);

    if (!nombre || !Number.isFinite(cant) || !Number.isFinite(price)) {
      return res.status(400).json({ error: "Nombre, créditos y precio son obligatorios" });
    }

    let qr_imagen_url = null;

    // Con upload.fields(), los archivos están en req.files (objeto)
    const uploadedFile = req.files?.qr?.[0] || req.files?.qr_imagen?.[0] || req.file;

    if (uploadedFile) {
      // Usar siempre el sistema estandarizado /images/imagesPacks/
      qr_imagen_url = `${PUBLIC_SUBDIR}/${uploadedFile.filename}`;
    }

    if (!qr_imagen_url) {
      return res.status(400).json({ error: "El código QR es obligatorio" });
    }

    const insertId = await Packs.insert({
      nombre,
      cantidad_creditos: cant,
      precio: price,
      qr_imagen_url,
      descripcion: descripcion || null
    });

    res.status(201).json({
      id: insertId,
      nombre,
      cantidad_creditos: cant,
      precio: price,
      qr_imagen_url,
      descripcion
    });
  } catch (err) {
    console.error("createPack:", err);
    res.status(500).json({ error: "Error al crear el paquete" });
  }
};

// PUT /api/packs/:id
exports.updatePack = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, cantidad_creditos, precio, descripcion } = req.body;
    const cant = Number(cantidad_creditos);
    const price = Number(precio);

    if (!nombre || !Number.isFinite(cant) || !Number.isFinite(price)) {
      return res.status(400).json({ error: "Nombre, créditos y precio son obligatorios" });
    }

    const existing = await Packs.getById(id);
    if (!existing) return res.status(404).json({ error: "Paquete no encontrado" });

    let qr_imagen_url = existing.qr_imagen_url;

    // Con upload.fields(), los archivos están en req.files (objeto)
    const uploadedFile = req.files?.qr?.[0] || req.files?.qr_imagen?.[0] || req.file;

    if (uploadedFile) {
      // Eliminar imagen anterior si existe
      if (existing.qr_imagen_url) {
        try {
          await fs.unlink(fsPathFromUrl(existing.qr_imagen_url));
        } catch (e) {
          console.warn("No se pudo eliminar el QR anterior:", e.message);
        }
      }

      // Construir nueva URL usando sistema estandarizado
      qr_imagen_url = `${PUBLIC_SUBDIR}/${uploadedFile.filename}`;
    }

    const ok = await Packs.update(id, {
      nombre,
      cantidad_creditos: cant,
      precio: price,
      qr_imagen_url,
      descripcion: (descripcion !== undefined ? descripcion : existing.descripcion) || null
    });

    if (!ok) return res.status(404).json({ error: "Paquete no encontrado" });

    res.json({
      id,
      nombre,
      cantidad_creditos: cant,
      precio: price,
      qr_imagen_url,
      descripcion
    });
  } catch (err) {
    console.error("updatePack:", err);
    res.status(500).json({ error: "Error al actualizar el paquete" });
  }
};

// DELETE /api/packs/:id
exports.deletePack = async (req, res) => {
  try {
    const { id } = req.params;
    const ok = await Packs.softDelete(id);
    if (!ok) return res.status(404).json({ error: "Paquete no encontrado" });
    res.json({ message: "Paquete desactivado" });
  } catch (err) {
    console.error("deletePack:", err);
    res.status(500).json({ error: "Error al eliminar el paquete" });
  }
};
