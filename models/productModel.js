const db = require('../database');

/**
 * Modelo para gestión de productos
 */
class ProductModel {
    
    /**
     * Obtener todos los productos con filtros y paginación
     */
    static async getAllProducts(filters = {}) {
        let query = `
            SELECT 
                p.id,
                p.nombre,
                p.descripcion,
                p.precio,
                p.stock,
                p.especificaciones,
                p.estado,
                p.fecha_creacion,
                p.fecha_actualizacion,
                c.nombre as categoria_nombre,
                c.id as categoria_id,
                u.nombre as vendedor_nombre,
                u.apellido as vendedor_apellido,
                u.id as vendedor_id,
                u.calificacion_promedio as vendedor_calificacion,
                u.total_ventas as vendedor_total_ventas,
                (SELECT url_imagen 
                 FROM imagenes_productos ip 
                 WHERE ip.producto_id = p.id 
                 ORDER BY ip.orden_visualizacion ASC 
                 LIMIT 1) as imagen_principal,
                (SELECT COUNT(*) 
                 FROM imagenes_productos ip2 
                 WHERE ip2.producto_id = p.id) as total_imagenes
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            WHERE 1=1
        `;
        
        const params = [];
        
        // Aplicar filtros
        if (filters.estado) {
            query += ` AND p.estado = ?`;
            params.push(filters.estado);
        }
        
        if (filters.category) {
            query += ` AND p.categoria_id = ?`;
            params.push(filters.category);
        }
        
        if (filters.minPrice) {
            query += ` AND p.precio >= ?`;
            params.push(filters.minPrice);
        }
        
        if (filters.maxPrice) {
            query += ` AND p.precio <= ?`;
            params.push(filters.maxPrice);
        }
        
        if (filters.search) {
            query += ` AND (p.nombre LIKE ? OR p.descripcion LIKE ?)`;
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm);
        }
        
        // Ordenamiento
        query += ` ORDER BY p.fecha_creacion DESC`;
        
        // Paginación
        if (filters.limit) {
            const offset = (filters.page - 1) * filters.limit;
            query += ` LIMIT ? OFFSET ?`;
            params.push(filters.limit, offset);
        }
        
        try {
            const [rows] = await db.execute(query, params);
            return rows;
        } catch (error) {
            throw new Error(`Error al obtener productos: ${error.message}`);
        }
    }
    
    /**
     * Contar total de productos con filtros
     */
    static async countProducts(filters = {}) {
        let query = `
            SELECT COUNT(*) as total
            FROM productos p
            WHERE 1=1
        `;
        
        const params = [];
        
        if (filters.estado) {
            query += ` AND p.estado = ?`;
            params.push(filters.estado);
        }
        
        if (filters.category) {
            query += ` AND p.categoria_id = ?`;
            params.push(filters.category);
        }
        
        if (filters.minPrice) {
            query += ` AND p.precio >= ?`;
            params.push(filters.minPrice);
        }
        
        if (filters.maxPrice) {
            query += ` AND p.precio <= ?`;
            params.push(filters.maxPrice);
        }
        
        if (filters.search) {
            query += ` AND (p.nombre LIKE ? OR p.descripcion LIKE ?)`;
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm);
        }
        
        try {
            const [rows] = await db.execute(query, params);
            return rows[0].total;
        } catch (error) {
            throw new Error(`Error al contar productos: ${error.message}`);
        }
    }
    
    /**
     * Obtener producto por ID con todas sus imágenes
     */
    static async getProductById(productId) {
        const query = `
            SELECT 
                p.*,
                c.nombre as categoria_nombre,
                c.descripcion as categoria_descripcion,
                u.nombre as vendedor_nombre,
                u.apellido as vendedor_apellido,
                u.email as vendedor_email,
                u.telefono as vendedor_telefono,
                u.calificacion_promedio as vendedor_calificacion,
                u.total_ventas as vendedor_total_ventas,
                u.fecha_registro as vendedor_fecha_registro
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            WHERE p.id = ?
        `;
        
        try {
            const [rows] = await db.execute(query, [productId]);
            if (rows.length === 0) {
                return null;
            }
            
            const product = rows[0];
            
            // Obtener todas las imágenes del producto
            const imagesQuery = `
                SELECT id, url_imagen, orden_visualizacion, fecha_subida
                FROM imagenes_productos 
                WHERE producto_id = ? 
                ORDER BY orden_visualizacion ASC
            `;
            
            const [imageRows] = await db.execute(imagesQuery, [productId]);
            product.imagenes = imageRows;
            
            return product;
        } catch (error) {
            throw new Error(`Error al obtener producto: ${error.message}`);
        }
    }
    
    /**
     * Obtener productos por categoría
     */
    static async getProductsByCategory(categoryId, filters = {}) {
        const updatedFilters = { ...filters, category: categoryId };
        return await this.getAllProducts(updatedFilters);
    }
    
    /**
     * Obtener productos relacionados (misma categoría, excluyendo el actual)
     */
    static async getRelatedProducts(productId, categoryId, limit = 4) {
        const query = `
            SELECT 
                p.id,
                p.nombre,
                p.precio,
                p.stock,
                p.estado,
                (SELECT url_imagen 
                 FROM imagenes_productos ip 
                 WHERE ip.producto_id = p.id 
                 ORDER BY ip.orden_visualizacion ASC 
                 LIMIT 1) as imagen_principal
            FROM productos p
            WHERE p.categoria_id = ? 
                AND p.id != ? 
                AND p.estado = 'activo'
            ORDER BY p.fecha_creacion DESC
            LIMIT ?
        `;
        
        try {
            const [rows] = await db.execute(query, [categoryId, productId, limit]);
            return rows;
        } catch (error) {
            throw new Error(`Error al obtener productos relacionados: ${error.message}`);
        }
    }
    
    /**
     * Obtener estadísticas de productos
     */
    static async getProductStats() {
        const query = `
            SELECT 
                COUNT(*) as total_productos,
                COUNT(CASE WHEN estado = 'activo' THEN 1 END) as productos_activos,
                COUNT(CASE WHEN estado = 'inactivo' THEN 1 END) as productos_inactivos,
                COUNT(CASE WHEN estado = 'agotado' THEN 1 END) as productos_agotados,
                AVG(precio) as precio_promedio,
                MIN(precio) as precio_minimo,
                MAX(precio) as precio_maximo,
                SUM(stock) as stock_total
            FROM productos
        `;
        
        try {
            const [rows] = await db.execute(query);
            return rows[0];
        } catch (error) {
            throw new Error(`Error al obtener estadísticas: ${error.message}`);
        }
    }
    
    /**
     * Verificar si existe un producto
     */
    static async existsProduct(productId) {
        const query = 'SELECT id FROM productos WHERE id = ?';
        
        try {
            const [rows] = await db.execute(query, [productId]);
            return rows.length > 0;
        } catch (error) {
            throw new Error(`Error al verificar producto: ${error.message}`);
        }
    }
}

module.exports = ProductModel;