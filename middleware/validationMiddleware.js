const { validationErrorResponse } = require('../utils/responseUtils');

/**
 * Middleware para validar parámetros de consulta de productos
 */
const validateProductQuery = (req, res, next) => {
    const errors = [];
    const { page, limit, category, minPrice, maxPrice, estado, search } = req.query;
    
    // Validar paginación
    if (page && (isNaN(page) || parseInt(page) < 1)) {
        errors.push('El parámetro "page" debe ser un número mayor a 0');
    }
    
    if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
        errors.push('El parámetro "limit" debe ser un número entre 1 y 100');
    }
    
    // Validar precios
    if (minPrice && (isNaN(minPrice) || parseFloat(minPrice) < 0)) {
        errors.push('El precio mínimo debe ser un número mayor o igual a 0');
    }
    
    if (maxPrice && (isNaN(maxPrice) || parseFloat(maxPrice) < 0)) {
        errors.push('El precio máximo debe ser un número mayor o igual a 0');
    }
    
    if (minPrice && maxPrice && parseFloat(minPrice) > parseFloat(maxPrice)) {
        errors.push('El precio mínimo no puede ser mayor al precio máximo');
    }
    
    // Validar categoría
    if (category && (isNaN(category) || parseInt(category) < 1)) {
        errors.push('La categoría debe ser un ID válido');
    }
    
    // Validar estado
    const validStates = ['activo', 'inactivo', 'agotado', 'expirado'];
    if (estado && !validStates.includes(estado)) {
        errors.push('El estado debe ser: activo, inactivo o agotado');
    }
    
    // Validar búsqueda
    if (search && search.trim().length < 2) {
        errors.push('El término de búsqueda debe tener al menos 2 caracteres');
    }
    
    if (errors.length > 0) {
        return validationErrorResponse(res, errors);
    }
    
    // Agregar parámetros validados al request
    req.queryParams = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 12,
        category: category ? parseInt(category) : null,
        minPrice: minPrice ? parseFloat(minPrice) : null,
        maxPrice: maxPrice ? parseFloat(maxPrice) : null,
        estado: estado || null, // No forzar estado por defecto
        search: search ? search.trim() : null
    };
    
    next();
};

/**
 * Middleware para validar ID de producto
 */
const validateProductId = (req, res, next) => {
    const { id } = req.params;
    
    if (!id || isNaN(id) || parseInt(id) < 1) {
        return validationErrorResponse(res, ['El ID del producto debe ser un número válido mayor a 0']);
    }
    
    req.productId = parseInt(id);
    next();
};

/**
 * Middleware para validar ID de categoría
 */
const validateCategoryId = (req, res, next) => {
    const { categoryId } = req.params;
    
    if (!categoryId || isNaN(categoryId) || parseInt(categoryId) < 1) {
        return validationErrorResponse(res, ['El ID de la categoría debe ser un número válido mayor a 0']);
    }
    
    req.categoryId = parseInt(categoryId);
    next();
};


/**
 * Middleware para validar parámetros de consulta de usuarios
 */
const validateUserQuery = (req, res, next) => {
    const errors = [];
    const { page, limit, estado, tipo_usuario, search } = req.query;
    
    // Validar paginación
    if (page && (isNaN(page) || parseInt(page) < 1)) {
        errors.push('El parámetro "page" debe ser un número mayor a 0');
    }
    
    if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
        errors.push('El parámetro "limit" debe ser un número entre 1 y 100');
    }
    
    // Validar estado
    const validStates = ['activo', 'suspendido', 'inactivo'];
    if (estado && !validStates.includes(estado)) {
        errors.push('El estado debe ser: activo, suspendido o inactivo');
    }
    
    // Validar tipo de usuario
    const validTypes = ['comprador', 'vendedor', 'admin'];
    if (tipo_usuario && !validTypes.includes(tipo_usuario)) {
        errors.push('El tipo de usuario debe ser: comprador, vendedor o admin');
    }
    
    // Validar búsqueda
    if (search && search.trim().length < 2) {
        errors.push('El término de búsqueda debe tener al menos 2 caracteres');
    }
    
    if (errors.length > 0) {
        return validationErrorResponse(res, errors);
    }
    
    // Agregar parámetros validados al request
    req.queryParams = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        estado: estado || null,
        tipo_usuario: tipo_usuario || null,
        search: search ? search.trim() : null
    };
    
    next();
};

/**
 * Middleware para validar ID de usuario
 */
const validateUserId = (req, res, next) => {
    const { id } = req.params;
    
    if (!id || isNaN(id) || parseInt(id) < 1) {
        return validationErrorResponse(res, ['El ID del usuario debe ser un número válido mayor a 0']);
    }
    
    req.userId = parseInt(id);
    next();
};

module.exports = {
    validateProductQuery,
    validateProductId,
    validateCategoryId,
    validateUserQuery,
    validateUserId
};