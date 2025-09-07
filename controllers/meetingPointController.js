const db = require('../database');

// GET all meeting points
exports.getAllMeetingPoints = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM puntos_encuentro');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET meeting point by ID
exports.getMeetingPointById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM puntos_encuentro WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Meeting point not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST create new meeting point
exports.createMeetingPoint = async (req, res) => {
  const { coordenadas_lat, coordenadas_lng, nombre, zona, estado, direccion, referencias } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO puntos_encuentro (coordenadas_lat, coordenadas_lng, nombre, zona, estado, direccion, referencias) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [coordenadas_lat, coordenadas_lng, nombre, zona, estado, direccion, referencias]
    );
    res.status(201).json({ id: result[0].insertId, message: 'Meeting point created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT update meeting point by ID
exports.updateMeetingPoint = async (req, res) => {
  const { coordenadas_lat, coordenadas_lng, nombre, zona, estado, direccion, referencias } = req.body;
  try {
    const result = await db.query(
      'UPDATE puntos_encuentro SET coordenadas_lat = ?, coordenadas_lng = ?, nombre = ?, zona = ?, estado = ?, direccion = ?, referencias = ? WHERE id = ?',
      [coordenadas_lat, coordenadas_lng, nombre, zona, estado, direccion, referencias, req.params.id]
    );
    if (result[0].affectedRows === 0) {
      return res.status(404).json({ error: 'Meeting point not found' });
    }
    res.json({ message: 'Meeting point updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE (soft delete) meeting point by ID
exports.deleteMeetingPoint = async (req, res) => {
  try {
    const result = await db.query('UPDATE puntos_encuentro SET estado = "inactivo" WHERE id = ?', [req.params.id]);
    if (result[0].affectedRows === 0) {
      return res.status(404).json({ error: 'Meeting point not found' });
    }
    res.json({ message: 'Meeting point marked as inactive' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};