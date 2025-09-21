// controllers/packsController.js
const path = require("path");
const fs = require("fs").promises;

const Packs = require("../models/packsModel");

const PUBLIC_SUBDIR = "/images/imagesPacks";
const FS_DIR = path.join(__dirname, "..", "images", "imagesPacks");

const fsPathFromUrl = (url) =>
  path.join(FS_DIR, path.basename(url || ""));

// GET /api/packs → lista todos los paquetes activos
exports.getAllPacks = async (_req, res) => {
  try {
    const rows = await Packs.getAllActive();
    res.json(rows);
  } catch (err) {
    console.error("Error obteniendo packs:", err);
    res.status(500).json({ error: "Error obteniendo packs" });
  }
};

// GET /api/packs/:id → obtiene un paquete por ID
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

// POST /api/packs → crea un paquete
exports.createPack = async (req, res) => {
  try {
    const { nombre, cantidad_creditos, precio } = req.body;

    // Validaciones básicas
    const cant = Number(cantidad_creditos);
    const price = Number(precio);
    if (!nombre || !Number.isFinite(cant) || !Number.isFinite(price)) {
      return res
        .status(400)
        .json({ error: "Nombre, créditos y precio son obligatorios" });
    }

    const qr_imagen_url = req.file ? `${PUBLIC_SUBDIR}/${req.file.filename}` : null;

    const insertId = await Packs.insert(
      { nombre, cantidad_creditos: cant, precio: price, qr_imagen_url }
    );

    res.status(201).json({
      id: insertId,
      nombre,
      cantidad_creditos: cant,
      precio: price,
      qr_imagen_url,
    });
  } catch (err) {
    console.error("createPack:", err);
    res.status(500).json({ error: "Error al crear el paquete" });
  }
};

// PUT /api/packs/:id → actualiza un paquete
exports.updatePack = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, cantidad_creditos, precio } = req.body;

    const cant = Number(cantidad_creditos);
    const price = Number(precio);
    if (!nombre || !Number.isFinite(cant) || !Number.isFinite(price)) {
      return res
        .status(400)
        .json({ error: "Nombre, créditos y precio son obligatorios" });
    }

    const existing = await Packs.getById(id);
    if (!existing) return res.status(404).json({ error: "Paquete no encontrado" });

    let qr_imagen_url = existing.qr_imagen_url;

    // Si llega un nuevo archivo, borra el anterior (si existía) y reemplaza
    if (req.file) {
      if (existing.qr_imagen_url) {
        try {
          await fs.unlink(fsPathFromUrl(existing.qr_imagen_url));
        } catch (e) {
          // No detenemos el flujo si no se pudo borrar
          console.warn("No se pudo eliminar la imagen anterior:", e.message);
        }
      }
      qr_imagen_url = `${PUBLIC_SUBDIR}/${req.file.filename}`;
    }

    const ok = await Packs.update(id, {
      nombre,
      cantidad_creditos: cant,
      precio: price,
      qr_imagen_url,
    });

    if (!ok) return res.status(404).json({ error: "Paquete no encontrado" });

    res.json({ id, nombre, cantidad_creditos: cant, precio: price, qr_imagen_url });
  } catch (err) {
    console.error("updatePack:", err);
    res.status(500).json({ error: "Error al actualizar el paquete" });
  }
};

// DELETE /api/packs/:id → borrado lógico
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
