const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { 
    validateUserQuery, 
    validateUserId 
} = require('../middleware/validationMiddleware');
const { 
    authenticateToken, 
    requireAdmin, 
    requireOwnershipOrAdmin 
} = require('../middleware/auth');

/**
 * Rutas para usuarios
 */

// Rutas públicas (sin autenticación)
router.get('/stats', UserController.getUserStats);
router.get('/top-vendedores', UserController.getTopVendedores);
router.get('/top-compradores', UserController.getTopCompradores);

// Rutas que requieren autenticación de admin
router.get('/search', authenticateToken, requireAdmin, validateUserQuery, UserController.searchUsers);
router.get('/', authenticateToken, requireAdmin, validateUserQuery, UserController.getAllUsers);
router.get('/type/:tipo', authenticateToken, requireAdmin, validateUserQuery, UserController.getUsersByType);

// Rutas de perfil (usuario autenticado puede ver su propio perfil)
router.get('/:id', authenticateToken, requireOwnershipOrAdmin('id'), validateUserId, UserController.getUserById);
router.put('/:id', authenticateToken, requireOwnershipOrAdmin('id'), validateUserId, UserController.updateProfile);
router.put('/:id/change-password', authenticateToken, requireOwnershipOrAdmin('id'), validateUserId, UserController.changePassword);

// Rutas administrativas
router.put('/:id/status', authenticateToken, requireAdmin, validateUserId, UserController.updateUserStatus);

module.exports = router;