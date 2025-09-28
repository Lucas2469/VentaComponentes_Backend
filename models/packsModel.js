// models/packsModel.js
const db = require("../database");

exports.getAllActive = async () => {
  const [rows] = await db.query(
    `SELECT id, nombre, cantidad_creditos, precio, qr_imagen_url, estado, fecha_creacion, descripcion
       FROM packs_creditos
      WHERE estado = 'activo'
      ORDER BY fecha_creacion DESC`
  );
  return rows;
};

exports.getById = async (id) => {
  const [rows] = await db.query(
    `SELECT id, nombre, cantidad_creditos, precio, qr_imagen_url, estado, fecha_creacion, descripcion
       FROM packs_creditos
      WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
};

exports.insert = async ({ nombre, cantidad_creditos, precio, qr_imagen_url, descripcion }) => {
  const [result] = await db.query(
    `INSERT INTO packs_creditos
       (nombre, cantidad_creditos, precio, qr_imagen_url, estado, fecha_creacion, descripcion)
     VALUES (?, ?, ?, ?, 'activo', NOW(), ?)`,
    [nombre, cantidad_creditos, precio, qr_imagen_url, descripcion]
  );
  return result.insertId;
};

exports.update = async (id, { nombre, cantidad_creditos, precio, qr_imagen_url, descripcion }) => {
  const [res] = await db.query(
    `UPDATE packs_creditos
        SET nombre = ?,
            cantidad_creditos = ?,
            precio = ?,
            qr_imagen_url = ?,
            descripcion = ?
      WHERE id = ?`,
    [nombre, cantidad_creditos, precio, qr_imagen_url, descripcion, id]
  );
  return res.affectedRows > 0;
};

exports.softDelete = async (id) => {
  const [res] = await db.query(
    `UPDATE packs_creditos
        SET estado = 'inactivo'
      WHERE id = ?`,
    [id]
  );
  return res.affectedRows > 0;
};
