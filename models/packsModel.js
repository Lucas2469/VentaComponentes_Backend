// models/packsModel.js
const db = require("../database");

// Si te pasan una conexión (conn) úsala; si no, usa el pool (db)
const q = (conn) => conn || db;

exports.getAllActive = async (conn) => {
  const [rows] = await q(conn).query(
    "SELECT * FROM packs_creditos WHERE estado='activo' ORDER BY fecha_creacion DESC"
  );
  return rows;
};

exports.getById = async (id, conn) => {
  const [rows] = await q(conn).query(
    "SELECT * FROM packs_creditos WHERE id = ?",
    [id]
  );
  return rows[0] || null;
};

exports.insert = async ({ nombre, cantidad_creditos, precio, qr_imagen_url }, conn) => {
  const [res] = await q(conn).query(
    `INSERT INTO packs_creditos
     (nombre, cantidad_creditos, precio, qr_imagen_url, estado, fecha_creacion)
     VALUES (?, ?, ?, ?, 'activo', NOW())`,
    [nombre, cantidad_creditos, precio, qr_imagen_url]
  );
  return res.insertId;
};

exports.update = async (id, { nombre, cantidad_creditos, precio, qr_imagen_url }, conn) => {
  const [res] = await q(conn).query(
    `UPDATE packs_creditos
     SET nombre=?, cantidad_creditos=?, precio=?, qr_imagen_url=?
     WHERE id=?`,
    [nombre, cantidad_creditos, precio, qr_imagen_url, id]
  );
  return res.affectedRows > 0;
};

exports.softDelete = async (id, conn) => {
  const [res] = await q(conn).query(
    "UPDATE packs_creditos SET estado='inactivo' WHERE id=?",
    [id]
  );
  return res.affectedRows > 0;
};

exports.getCreditsOnly = async (packId, conn) => {
  const [rows] = await q(conn).query(
    "SELECT cantidad_creditos FROM packs_creditos WHERE id=?",
    [packId]
  );
  return rows[0]?.cantidad_creditos ?? null;
};
