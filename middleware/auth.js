const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const { errorResponse } = require('../utils/responseUtils');

/**
 * Middleware de autenticación JWT
 * Verifica el token JWT y agrega el usuario a req.user
 */
const authenticateToken = async (req, res, next) => {
    try {
        // Obtener el token del header Authorization
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return errorResponse(res, 'Token de acceso requerido', 401);
        }

        // Verificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Obtener el usuario de la base de datos
        const user = await UserModel.getUserById(decoded.userId);
        
        if (!user) {
            return errorResponse(res, 'Usuario no encontrado', 401);
        }

        if (user.estado !== 'activo') {
            return errorResponse(res, 'Usuario inactivo', 401);
        }

        // Agregar el usuario a la request
        req.user = user;
        req.userId = user.id;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return errorResponse(res, 'Token inválido', 401);
        } else if (error.name === 'TokenExpiredError') {
            return errorResponse(res, 'Token expirado', 401);
        } else {
            console.error('Error en autenticación:', error);
            return errorResponse(res, 'Error de autenticación', 500);
        }
    }
};

/**
 * Middleware opcional de autenticación
 * No falla si no hay token, pero agrega el usuario si existe
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await UserModel.getUserById(decoded.userId);
            
            if (user && user.estado === 'activo') {
                req.user = user;
                req.userId = user.id;
            }
        }
        
        next();
    } catch (error) {
        // En caso de error, continuar sin autenticación
        next();
    }
};

/**
 * Middleware para verificar roles específicos
 * @param {string|array} roles - Rol o array de roles permitidos
 */
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return errorResponse(res, 'Autenticación requerida', 401);
        }

        const userRole = req.user.tipo_usuario;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (!allowedRoles.includes(userRole)) {
            return errorResponse(res, 'Permisos insuficientes', 403);
        }

        next();
    };
};

/**
 * Middleware para verificar que el usuario es admin
 */
const requireAdmin = requireRole('admin');

/**
 * Middleware para verificar que el usuario es vendedor o admin
 */
const requireVendorOrAdmin = requireRole(['vendedor', 'admin']);

/**
 * Middleware para verificar que el usuario puede acceder a un recurso
 * Solo el propietario o un admin pueden acceder
 */
const requireOwnershipOrAdmin = (resourceUserIdField = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            return errorResponse(res, 'Autenticación requerida', 401);
        }

        const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
        const currentUserId = req.user.id;

        // Admin puede acceder a todo
        if (req.user.tipo_usuario === 'admin') {
            return next();
        }

        // Solo el propietario puede acceder
        if (parseInt(resourceUserId) === parseInt(currentUserId)) {
            return next();
        }

        return errorResponse(res, 'No tienes permisos para acceder a este recurso', 403);
    };
};

/**
 * Middleware para verificar que el usuario no puede hacer acciones sobre sí mismo
 * Útil para evitar auto-agendamientos, etc.
 */
const preventSelfAction = (targetUserIdField = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            return errorResponse(res, 'Autenticación requerida', 401);
        }

        const targetUserId = req.params[targetUserIdField] || req.body[targetUserIdField];
        const currentUserId = req.user.id;

        if (parseInt(targetUserId) === parseInt(currentUserId)) {
            return errorResponse(res, 'No puedes realizar esta acción sobre ti mismo', 400);
        }

        next();
    };
};

/**
 * Middleware para verificar que el usuario es el vendedor del producto
 */
const requireProductOwnership = async (req, res, next) => {
    try {
        if (!req.user) {
            return errorResponse(res, 'Autenticación requerida', 401);
        }

        const productId = req.params.productId || req.params.id;
        const db = require('../database');

        const [rows] = await db.execute(
            'SELECT vendedor_id FROM productos WHERE id = ?',
            [productId]
        );

        if (rows.length === 0) {
            return errorResponse(res, 'Producto no encontrado', 404);
        }

        const product = rows[0];
        const currentUserId = req.user.id;

        // Admin puede acceder a todo
        if (req.user.tipo_usuario === 'admin') {
            return next();
        }

        // Solo el vendedor del producto puede acceder
        if (parseInt(product.vendedor_id) === parseInt(currentUserId)) {
            return next();
        }

        return errorResponse(res, 'No tienes permisos para acceder a este producto', 403);

    } catch (error) {
        console.error('Error verificando propiedad del producto:', error);
        return errorResponse(res, 'Error verificando permisos', 500);
    }
};

module.exports = {
    authenticateToken,
    optionalAuth,
    requireRole,
    requireAdmin,
    requireVendorOrAdmin,
    requireOwnershipOrAdmin,
    preventSelfAction,
    requireProductOwnership
};
