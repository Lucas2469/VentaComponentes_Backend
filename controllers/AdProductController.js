// controllers/AdProductController.js
const { z } = require('zod');
const db = require('../database');
const sellerModel = require('../models/AdProductModel');
const { cloudinary } = require('../middleware/uploadCloudinary');

const MIN_CREDITS = Number(process.env.MIN_CREDITS || 5);
const createProductSchema = z.object({
  vendedor_id: z.coerce.number().int().positive(),
  punto_encuentro_id: z.coerce.number().int().positive(),
  categoria_id: z.coerce.number().int().positive(),
  nombre: z.string().min(3).max(150),
  descripcion: z.string().min(5),
  precio: z.coerce.number().positive(),
  stock: z.coerce.number().int().positive(),
  especificaciones: z.union([z.string().transform(str => { try { return JSON.parse(str); } catch { return null; } }), z.record(z.any())]).nullable().optional(),
  orden: z.string().optional()
});

async function createProduct(req, res) {
  try {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.format() });
    const data = parsed.data;
    const creditosAUsar = data.stock;
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length < 1) return res.status(400).json({ error: 'Debes subir al menos 1 imagen.' });
    if (files.length > 6) return res.status(400).json({ error: 'Máximo 6 imágenes permitidas.' });

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const seller = await sellerModel.getVendedorById(conn, data.vendedor_id);
      if (!seller) throw new Error('Vendedor no encontrado.');
      if (seller.estado !== 'activo') throw new Error('El vendedor no está activo.');
      if (seller.creditos_disponibles < creditosAUsar) throw new Error(`Créditos insuficientes. Se requieren ${creditosAUsar}, tienes ${seller.creditos_disponibles}.`);

      // Calcular nuevos créditos después del descuento
      const nuevosCreditos = seller.creditos_disponibles - creditosAUsar;
      const categoria = await sellerModel.getCategoriaById(conn, data.categoria_id);
      if (!categoria || categoria.estado !== 'activo') throw new Error('Categoría inválida o inactiva.');
      const punto = await sellerModel.getPuntoEncuentroById(conn, data.punto_encuentro_id);
      if (!punto) throw new Error('Punto de encuentro inválido.');
      await sellerModel.descontarCreditos(conn, seller.id, nuevosCreditos);
      const productoId = await sellerModel.insertarProducto(conn, data, creditosAUsar);

      // Registrar egreso en historial_creditos
      await conn.query(
        `INSERT INTO historial_creditos
         (usuario_id, tipo_movimiento, cantidad, concepto, saldo_anterior, saldo_nuevo, referencia_tabla, referencia_id)
         VALUES (?, 'egreso', ?, ?, ?, ?, 'productos', ?)`,
        [
          seller.id,
          creditosAUsar,
          `Publicación de producto: ${data.nombre.substring(0, 50)}`,
          seller.creditos_disponibles,
          nuevosCreditos,
          productoId
        ]
      );

      // ✅ Procesar imágenes desde Cloudinary
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ordenVisual = i + 1;

        // 1. Insertar imagen con URL de Cloudinary
        const imagenId = await sellerModel.insertarImagenTemporal(conn, productoId);

        // 2. Usar la URL que Cloudinary proporciona en req.file.path
        // Cloudinary devuelve automáticamente la URL pública en file.path
        const cloudinaryUrl = file.path;

        // 3. Actualizar la URL en la base de datos
        await sellerModel.actualizarUrlImagen(conn, imagenId, cloudinaryUrl);

        console.log(`✅ Imagen ${ordenVisual} subida a Cloudinary: ${cloudinaryUrl}`);
      }

      await conn.commit();
      const [[producto]] = await conn.query(`SELECT * FROM productos WHERE id = ?`, [productoId]);
      const [imagenes] = await conn.query(`SELECT * FROM imagenes_productos WHERE producto_id = ?`, [productoId]);
      conn.release();
      return res.status(201).json({ message: 'Producto creado con éxito.', producto, imagenes, creditos_cobrados: creditosAUsar, creditos_restantes: seller.creditos_disponibles });
    } catch (err) {
      await conn.rollback(); conn.release(); console.error(err);
      return res.status(500).json({ error: err.message });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno.', details: err.message });
  }
}
async function getProductById(req, res) {
  // lógica simple para probar
  const { id } = req.params;
  const conn = await require('../database').getConnection();
  const [[producto]] = await conn.query(`SELECT * FROM productos WHERE id = ?`, [id]);
  const [imagenes] = await conn.query(`SELECT * FROM imagenes_productos WHERE producto_id = ?`, [id]);
  conn.release();
  res.json({ producto, imagenes });
}

async function listProducts(req, res) {
  const conn = await require('../database').getConnection();
  const [productos] = await conn.query(`SELECT * FROM productos ORDER BY id DESC LIMIT 100`);
  conn.release();
  res.json(productos);
}
// === Obtener categorías activas (solo id + nombre) ===
async function getCategorias(req, res) {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT id, nombre 
       FROM categorias 
       WHERE estado = 'activo'
       ORDER BY nombre ASC`
    );
    conn.release();
    res.json(rows);
   
  } catch (err) {
    conn.release();
    console.error(err);
    res.status(500).json({ error: 'Error al obtener categorías.' });
  }
}

// === Obtener puntos de encuentro activos (solo id + nombre) ===
async function getPuntosEncuentro(req, res) {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT id, nombre 
       FROM puntos_encuentro 
       WHERE estado = 'activo'
       ORDER BY nombre ASC`
    );
    conn.release();
    res.json(rows);
    
  } catch (err) {
    conn.release();
    console.error(err);
    res.status(500).json({ error: 'Error al obtener puntos de encuentro.' });
  }
}

// === Obtener créditos disponibles de un vendedor ===
async function getCreditosDisponibles(req, res) {
  const { id } = req.params; // vendedor_id
  const conn = await db.getConnection();
  try {
    const [[row]] = await conn.query(
      `SELECT creditos_disponibles 
       FROM usuarios 
       WHERE id = ?`,
      [id]
    );
    conn.release();

    if (!row) {
      return res.status(404).json({ error: 'Vendedor no encontrado.' });
    }

    res.json(row);
  } catch (err) {
    conn.release();
    console.error(err);
    res.status(500).json({ error: 'Error al obtener créditos del vendedor.' });
  }
}


module.exports = {
  createProduct,
  getProductById,
  listProducts,
  getCategorias,
  getPuntosEncuentro,
  getCreditosDisponibles,

};
