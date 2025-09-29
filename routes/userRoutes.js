const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { 
    validateUserQuery, 
    validateUserId 
} = require('../middleware/validationMiddleware');

/**
 * Rutas para usuarios
 */

// Estadísticas (debe ir antes de las rutas con parámetros)
router.get('/stats', UserController.getUserStats);

// Top vendedores
router.get('/top-vendedores', UserController.getTopVendedores);

// Búsqueda de usuarios
router.get('/search', validateUserQuery, UserController.searchUsers);

// Obtener todos los usuarios con filtros y paginación
router.get('/', validateUserQuery, UserController.getAllUsers);

// Obtener usuarios por tipo
router.get('/type/:tipo', validateUserQuery, UserController.getUsersByType);

// Obtener usuario específico por ID
router.get('/:id', validateUserId, UserController.getUserById);

module.exports = router;