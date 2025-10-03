const db = require('../database');

// GET all categories with product counts
const getAllCategories = async () => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, (
         SELECT COUNT(*) FROM productos p WHERE p.categoria_id = c.id
       ) AS product_count
       FROM categorias c`
    );
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

  // Validaciones de longitud y caracteres especiales
  if (nombre.length > 20) {
    throw new Error('El nombre no puede exceder 20 caracteres');
  }

  if (descripcion && descripcion.length > 70) {
    throw new Error('La descripción no puede exceder 70 caracteres');
  }

  // Validar que el nombre no contenga símbolos especiales
  const specialCharsRegex = /[!@#$%^&*()_+=\[\]{};':"\\|,.<>\/?~`]/;
  if (specialCharsRegex.test(nombre)) {
    throw new Error('El nombre no puede contener símbolos especiales');
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

  // Validaciones de longitud y caracteres especiales
  if (nombre.length > 20) {
    throw new Error('El nombre no puede exceder 20 caracteres');
  }

  if (descripcion && descripcion.length > 70) {
    throw new Error('La descripción no puede exceder 70 caracteres');
  }

  // Validar que el nombre no contenga símbolos especiales
  const specialCharsRegex = /[!@#$%^&*()_+=\[\]{};':"\\|,.<>\/?~`]/;
  if (specialCharsRegex.test(nombre)) {
    throw new Error('El nombre no puede contener símbolos especiales');
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