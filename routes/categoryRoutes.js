const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// GET all categories
router.get('/', categoryController.getAllCategories);

// GET category by ID
router.get('/:id', categoryController.getCategoryById);

// POST create new category
router.post('/', categoryController.createCategory);

// PUT update category by ID
router.put('/:id', categoryController.updateCategory);

// DELETE category by ID
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;