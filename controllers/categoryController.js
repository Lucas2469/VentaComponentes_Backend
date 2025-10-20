const categoryModel = require('../models/categoryModel');

// GET all categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await categoryModel.getAllCategories();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// siu
// GET category by ID
const getCategoryById = async (req, res) => {
  try {
    const category = await categoryModel.getCategoryById(req.params.id);
    res.json(category);
  } catch (err) {
    if (err.message === 'Category not found') {
      res.status(404).json({ error: err.message });
    } else {
         
      
      
      
      res.status(500).json({ error: err.message });
    }
  }
};

// POST create new category
const createCategory = async (req, res) => {
  try {
    const newCategory = await categoryModel.createCategory(req.body);
    res.status(201).json({ 
      message: 'Category created',
      category: newCategory
    });
  } catch (err) {
    if (err.message === 'Faltan campos obligatorios' || 
        err.message.includes('no puede exceder') || 
        err.message.includes('símbolos especiales')) {
      res.status(400).json({ error: err.message });
    } else {
      console.error('Error en createCategory:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

// PUT update category by ID
const updateCategory = async (req, res) => {
  try {
    const result = await categoryModel.updateCategory(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    if (err.message === 'Faltan campos obligatorios' || 
        err.message.includes('no puede exceder') || 
        err.message.includes('símbolos especiales')) {
      res.status(400).json({ error: err.message });
    } else if (err.message === 'Category not found') {
      res.status(404).json({ error: err.message });
    } else {
      console.error('Error en updateCategory:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

// DELETE category by ID
const deleteCategory = async (req, res) => {
  try {
    const result = await categoryModel.deleteCategory(req.params.id);
    res.json(result);
  } catch (err) {
    if (err.message === 'Category not found') {
      res.status(404).json({ error: err.message });
    } else {
      console.error('Error en deleteCategory:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};