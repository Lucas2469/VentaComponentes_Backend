const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/productController');
const { 
    validateProductQuery, 
    validateProductId, 
    validateCategoryId 
} = require('../middleware/validationMiddleware');

/**
 * Rutas para productos
 */

// Estadísticas (debe ir antes de las rutas con parámetros)
router.get('/stats', ProductController.getProductStats);

// Búsqueda de productos
router.get('/search', validateProductQuery, ProductController.searchProducts);

// Obtener todos los productos con filtros y paginación
router.get('/', validateProductQuery, ProductController.getAllProducts);

// Obtener productos por categoría
router.get('/category/:categoryId', 
    validateCategoryId, 
    validateProductQuery, 
    ProductController.getProductsByCategory
);

// Obtener producto específico por ID
router.get('/:id', validateProductId, ProductController.getProductById);

// Verificar disponibilidad de producto
router.get('/:id/availability',
    validateProductId,
    ProductController.checkProductAvailability
);

// Actualizar estado de producto
router.put('/:id/status',
    validateProductId,
    ProductController.updateProductStatus
);

module.exports = router;