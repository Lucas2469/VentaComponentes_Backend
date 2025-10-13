const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter, strictLimiter } = require('../middleware/security');

/**
 * Rutas de autenticación
 */

// POST /api/auth/login - Login de usuario
router.post('/login', authLimiter, AuthController.login);

// POST /api/auth/register - Registro de usuario
router.post('/register', authLimiter, AuthController.register);

// POST /api/auth/refresh - Renovar tokens
router.post('/refresh', AuthController.refreshToken);

// POST /api/auth/logout - Logout
router.post('/logout', authenticateToken, AuthController.logout);

// GET /api/auth/profile - Obtener perfil del usuario autenticado
router.get('/profile', authenticateToken, AuthController.getProfile);

// PUT /api/auth/change-password - Cambiar contraseña
router.put('/change-password', authenticateToken, strictLimiter, AuthController.changePassword);

// GET /api/auth/verify - Verificar si el token es válido
router.get('/verify', authenticateToken, AuthController.verifyToken);

// POST /api/auth/forgot-password - Solicitar recuperación de contraseña
router.post('/forgot-password', authLimiter, AuthController.forgotPassword);

// POST /api/auth/reset-password - Restablecer contraseña con token
router.post('/reset-password', authLimiter, AuthController.resetPassword);

module.exports = router;
