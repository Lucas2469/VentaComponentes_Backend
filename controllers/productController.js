const ProductModel = require('../models/productModel');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseUtils');

/**
 * Controlador para gestión de productos
 */
class ProductController {

    /**
     * Obtener todos los productos con filtros y paginación
     * GET /api/products
     */
    static async getAllProducts(req, res) {
        try {
            const filters = req.queryParams;

            // Obtener productos y total de registros en paralelo
            const [products, totalCount] = await Promise.all([
                ProductModel.getAllProducts(filters),
                ProductModel.countProducts(filters)
            ]);

            const pagination = {
                page: filters.page,
                limit: filters.limit,
                total: totalCount
            };

            return paginatedResponse(
                res,
                products,
                pagination,
                'Productos obtenidos exitosamente'
            );

        } catch (error) {
            console.error('Error en getAllProducts:', error);
            return errorResponse(res, 'Error al obtener productos', 500);
        }
    }

    /**
     * Obtener producto por ID
     * GET /api/products/:id
     */
    static async getProductById(req, res) {
        try {
            const productId = req.productId;

            const product = await ProductModel.getProductById(productId);

            if (!product) {
                return errorResponse(res, 'Producto no encontrado', 404);
            }

            // Obtener productos relacionados si el producto existe
            const relatedProducts = await ProductModel.getRelatedProducts(
                product.id,
                product.categoria_id,
                4
            );

            const response = {
                ...product,
                productos_relacionados: relatedProducts
            };

            return successResponse(res, response, 'Producto obtenido exitosamente');

        } catch (error) {
            console.error('Error en getProductById:', error);
            return errorResponse(res, 'Error al obtener el producto', 500);
        }
    }

    /**
     * Obtener productos por categoría
     * GET /api/products/category/:categoryId
     */
    static async getProductsByCategory(req, res) {
        try {
            const categoryId = req.categoryId;
            const filters = req.queryParams;

            // Obtener productos y total de registros en paralelo
            const [products, totalCount] = await Promise.all([
                ProductModel.getProductsByCategory(categoryId, filters),
                ProductModel.countProducts({ ...filters, category: categoryId })
            ]);

            const pagination = {
                page: filters.page,
                limit: filters.limit,
                total: totalCount
            };

            return paginatedResponse(
                res,
                products,
                pagination,
                `Productos de la categoría obtenidos exitosamente`
            );

        } catch (error) {
            console.error('Error en getProductsByCategory:', error);
            return errorResponse(res, 'Error al obtener productos por categoría', 500);
        }
    }

    /**
     * Buscar productos
     * GET /api/products/search?q=termino
     */
    static async searchProducts(req, res) {
        try {
            const { q } = req.query;

            if (!q || q.trim().length < 2) {
                return errorResponse(res, 'El término de búsqueda debe tener al menos 2 caracteres', 400);
            }

            const filters = {
                ...req.queryParams,
                search: q.trim()
            };

            const [products, totalCount] = await Promise.all([
                ProductModel.getAllProducts(filters),
                ProductModel.countProducts(filters)
            ]);

            const pagination = {
                page: filters.page,
                limit: filters.limit,
                total: totalCount
            };

            return paginatedResponse(
                res,
                products,
                pagination,
                `Resultados de búsqueda para "${q}"`
            );

        } catch (error) {
            console.error('Error en searchProducts:', error);
            return errorResponse(res, 'Error al buscar productos', 500);
        }
    }

    /**
     * Obtener estadísticas de productos
     * GET /api/products/stats
     */
    static async getProductStats(req, res) {
        try {
            const stats = await ProductModel.getProductStats();

            return successResponse(res, stats, 'Estadísticas obtenidas exitosamente');

        } catch (error) {
            console.error('Error en getProductStats:', error);
            return errorResponse(res, 'Error al obtener estadísticas', 500);
        }
    }

    /**
     * Verificar disponibilidad de producto
     * GET /api/products/:id/availability
     */
    static async checkProductAvailability(req, res) {
        try {
            const productId = req.productId;

            const product = await ProductModel.getProductById(productId);

            if (!product) {
                return errorResponse(res, 'Producto no encontrado', 404);
            }

            const availability = {
                id: product.id,
                nombre: product.nombre,
                disponible: product.estado === 'activo' && product.stock > 0,
                stock: product.stock,
                estado: product.estado,
                precio: product.precio
            };

            return successResponse(res, availability, 'Disponibilidad verificada');

        } catch (error) {
            console.error('Error en checkProductAvailability:', error);
            return errorResponse(res, 'Error al verificar disponibilidad', 500);
        }
    }

    /**
     * Actualizar estado de producto
     * PUT /api/products/:id/status
     */
    static async updateProductStatus(req, res) {
        try {
            const productId = req.productId;
            const { estado } = req.body;

            // Validar que el estado sea válido
            const validStates = ['activo', 'inactivo', 'expirado', 'agotado'];
            if (!estado || !validStates.includes(estado)) {
                return errorResponse(res, 'Estado inválido. Debe ser: ' + validStates.join(', '), 400);
            }

            // Verificar que el producto existe
            const existingProduct = await ProductModel.getProductById(productId);
            if (!existingProduct) {
                return errorResponse(res, 'Producto no encontrado', 404);
            }

            // Actualizar el estado
            const success = await ProductModel.updateProductStatus(productId, estado);

            if (!success) {
                return errorResponse(res, 'Error al actualizar el estado del producto', 500);
            }

            return successResponse(res, {
                id: productId,
                estado: estado,
                mensaje: `Producto ${estado === 'activo' ? 'activado' : 'desactivado'} exitosamente`
            }, 'Estado actualizado correctamente');

        } catch (error) {
            console.error('Error en updateProductStatus:', error);
            return errorResponse(res, 'Error al actualizar estado del producto', 500);
        }
    }
}

module.exports = ProductController;
