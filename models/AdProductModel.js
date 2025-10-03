const Seller = require('../Entities/AdProduct');

async function getVendedorById(conn, id) {
  const [rows] = await conn.query(
    `SELECT id, nombre, apellido, creditos_disponibles, estado, tipo_usuario FROM usuarios WHERE id = ? FOR UPDATE`, [id]
  );
  return rows[0] ? new Seller(rows[0]) : null;
}

async function getCategoriaById(conn, id) {
  const [rows] = await conn.query(`SELECT id, estado FROM categorias WHERE id = ?`, [id]);
  return rows[0];
}

async function getPuntoEncuentroById(conn, id) {
  const [rows] = await conn.query(`SELECT id FROM puntos_encuentro WHERE id = ?`, [id]);
  return rows[0];
}

async function descontarCreditos(conn, vendedorId, nuevosCreditos) {
  await conn.query(`UPDATE usuarios SET creditos_disponibles = ? WHERE id = ?`, [nuevosCreditos, vendedorId]);
}

async function insertarProducto(conn, data, creditos_usados) {
  const [res] = await conn.query(
    `INSERT INTO productos (vendedor_id, categoria_id, punto_encuentro_id, nombre, descripcion, precio, stock, creditos_usados)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.vendedor_id, data.categoria_id, data.punto_encuentro_id, data.nombre, data.descripcion, data.precio, data.stock, creditos_usados]
  );
  return res.insertId;
}

async function insertarImagenTemporal(conn, productoId) {
  const [res] = await conn.query(`INSERT INTO imagenes_productos (producto_id, url_imagen) VALUES (?, ?)`, [productoId, 'temp']);
  return res.insertId;
}

async function actualizarUrlImagen(conn, imagenId, url) {
  await conn.query(`UPDATE imagenes_productos SET url_imagen = ? WHERE id = ?`, [url, imagenId]);
}

module.exports = {
  getVendedorById,
  getCategoriaById,
  getPuntoEncuentroById,
  descontarCreditos,
  insertarProducto,
  insertarImagenTemporal,
  actualizarUrlImagen
};