// routes/usuariosRoutes.js
const express = require('express');
const router = express.Router();
const { getAll, getById } = require('../controllers/usuariosController');

// GET /api/usuarios - Obtener todos los usuarios
router.get('/', getAll);

// GET /api/usuarios/:id - Obtener usuario por ID
router.get('/:id', getById);

module.exports = router;
