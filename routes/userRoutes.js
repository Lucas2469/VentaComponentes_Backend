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

// Top compradores
router.get('/top-compradores', UserController.getTopCompradores);

// Búsqueda de usuarios
router.get('/search', validateUserQuery, UserController.searchUsers);

// Obtener todos los usuarios con filtros y paginación
router.get('/', validateUserQuery, UserController.getAllUsers);

// Obtener usuarios por tipo
router.get('/type/:tipo', validateUserQuery, UserController.getUsersByType);

// Obtener usuario específico por ID
router.get('/:id', validateUserId, UserController.getUserById);

// Actualizar perfil de usuario
router.put('/:id', validateUserId, UserController.updateProfile);

// Cambiar contraseña
router.put('/:id/change-password', validateUserId, UserController.changePassword);

// Middleware temporal para simular admin autenticado (SOLO PARA PRUEBAS)
const mockAdminAuth = (req, res, next) => {
    // TODO: Reemplazar con sistema de autenticación real
    req.currentUser = { id: 1, tipo_usuario: 'admin' }; // Admin del sistema
    next();
};

// Actualizar estado de usuario (solo admin)
router.put('/:id/status', validateUserId, mockAdminAuth, UserController.updateUserStatus);

module.exports = router;