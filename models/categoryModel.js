const db = require('../database');

// GET all categories
const getAllCategories = async () => {
  try {
    const [rows] = await db.query('SELECT * FROM categorias');
    return rows;
  } catch (err) {
    throw new Error(err.message);
  }
};

// GET category by ID
const getCategoryById = async (id) => {
  try {
    const [rows] = await db.query('SELECT * FROM categorias WHERE id = ?', [id]);
    if (rows.length === 0) {
      throw new Error('Category not found');
    }
    return rows[0];
  } catch (err) {
    throw new Error(err.message);
  }
};

// POST create new category
const createCategory = async (categoryData) => {
  const { nombre, descripcion, estado } = categoryData;
  
  // Validación básica
  if (!nombre) {
    throw new Error('Faltan campos obligatorios');
  }

  try {
    const [result] = await db.query(
      'INSERT INTO categorias (nombre, descripcion, estado) VALUES (?, ?, ?)',
      [nombre, descripcion || '', estado || 'activo']
    );
    
    return {
      id: result.insertId,
      nombre,
      descripcion: descripcion || '',
      estado: estado || 'activo',
      fecha_creacion: new Date().toISOString()
    };
  } catch (err) {
    throw new Error('Error interno del servidor: ' + err.message);
  }
};

// PUT update category by ID
const updateCategory = async (id, categoryData) => {
  const { nombre, descripcion, estado } = categoryData;
  
  // Validación básica
  if (!nombre) {
    throw new Error('Faltan campos obligatorios');
  }

  try {
    const [result] = await db.query(
      'UPDATE categorias SET nombre = ?, descripcion = ?, estado = ? WHERE id = ?',
      [nombre, descripcion || '', estado || 'activo', id]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('Category not found');
    }
    
    return { message: 'Category updated' };
  } catch (err) {
    throw new Error('Error interno del servidor: ' + err.message);
  }
};

// DELETE category by ID
const deleteCategory = async (id) => {
  try {
    const [result] = await db.query('DELETE FROM categorias WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      throw new Error('Category not found');
    }
    
    return { message: 'Category deleted successfully' };
  } catch (err) {
    throw new Error('Error interno del servidor: ' + err.message);
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};