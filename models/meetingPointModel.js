const db = require('../database');

// GET all meeting points
const getAllMeetingPoints = async () => {
  try {
    const [rows] = await db.query('SELECT * FROM puntos_encuentro');
    return rows;
  } catch (err) {
    throw new Error(err.message);
  }
};

// GET meeting point by ID
const getMeetingPointById = async (id) => {
  try {
    const [rows] = await db.query('SELECT * FROM puntos_encuentro WHERE id = ?', [id]);
    if (rows.length === 0) {
      throw new Error('Meeting point not found');
    }
    return rows[0];
  } catch (err) {
    throw new Error(err.message);
  }
};

// POST create new meeting point
const createMeetingPoint = async (meetingPointData) => {
  const { coordenadas_lat, coordenadas_lng, nombre, estado, direccion, referencias } = meetingPointData;
  
  // Validación básica
  if (!coordenadas_lat || !coordenadas_lng || !nombre || !direccion) {
    throw new Error('Faltan campos obligatorios');
  }

  try {
    const [result] = await db.query(
      'INSERT INTO puntos_encuentro (coordenadas_lat, coordenadas_lng, nombre, estado, direccion, referencias) VALUES (?, ?, ?, ?, ?, ?)',
      [coordenadas_lat, coordenadas_lng, nombre, estado || 'activo', direccion, referencias || '']
    );
    
    return {
      id: result.insertId,
      coordenadas_lat,
      coordenadas_lng,
      nombre,
      estado: estado || 'activo',
      direccion,
      referencias: referencias || ''
    };
  } catch (err) {
    throw new Error('Error interno del servidor: ' + err.message);
  }
};

// PUT update meeting point by ID
const updateMeetingPoint = async (id, meetingPointData) => {
  const { coordenadas_lat, coordenadas_lng, nombre, estado, direccion, referencias } = meetingPointData;
  
  // Validación básica
  if (!coordenadas_lat || !coordenadas_lng || !nombre || !direccion) {
    throw new Error('Faltan campos obligatorios');
  }

  try {
    const [result] = await db.query(
      'UPDATE puntos_encuentro SET coordenadas_lat = ?, coordenadas_lng = ?, nombre = ?, estado = ?, direccion = ?, referencias = ? WHERE id = ?',
      [coordenadas_lat, coordenadas_lng, nombre, estado, direccion, referencias || '', id]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('Meeting point not found');
    }
    
    return { message: 'Meeting point updated' };
  } catch (err) {
    throw new Error('Error interno del servidor: ' + err.message);
  }
};

// DELETE (real delete) meeting point by ID
const deleteMeetingPoint = async (id) => {
  try {
    const [result] = await db.query('DELETE FROM puntos_encuentro WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      throw new Error('Meeting point not found');
    }
    
    return { message: 'Meeting point deleted successfully' };
  } catch (err) {
    throw new Error('Error interno del servidor: ' + err.message);
  }
};

module.exports = {
  getAllMeetingPoints,
  getMeetingPointById,
  createMeetingPoint,
  updateMeetingPoint,
  deleteMeetingPoint
};