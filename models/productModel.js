const db = require('../database');

/**
 * Modelo para gestión de productos
 */
class ProductModel {
    
    /**
     * Obtener todos los productos con filtros y paginación
     */
    // Reemplaza sólo la función getAllProducts en productModel.js
    static async getAllProducts(filters = {}) {
        let query = `
            SELECT
                p.id,
                p.nombre,
                p.descripcion,
                p.precio,
                p.stock,
                p.creditos_usados,
                p.fecha_publicacion,
                p.fecha_expiracion,
                p.estado,
                p.fecha_creacion,
                p.fecha_actualizacion,
                c.nombre as categoria_nombre,
                c.id as categoria_id,
                u.nombre as vendedor_nombre,
                u.apellido as vendedor_apellido,
                u.id as vendedor_id,
                u.calificacion_promedio as vendedor_calificacion,
                u.total_intercambios_vendedor as vendedor_total_intercambios,
                pe.nombre as punto_encuentro_nombre,
                pe.direccion as punto_encuentro_direccion,
                pe.id as punto_encuentro_id,
                (SELECT url_imagen
                FROM imagenes_productos ip
                WHERE ip.producto_id = p.id
                ORDER BY ip.fecha_subida ASC
                LIMIT 1) as imagen_principal,
                (SELECT COUNT(*)
                FROM imagenes_productos ip2
                WHERE ip2.producto_id = p.id) as total_imagenes
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            LEFT JOIN puntos_encuentro pe ON p.punto_encuentro_id = pe.id
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
        query += ` ORDER BY p.fecha_publicacion DESC`;

        // Paginación: validar y forzar enteros
        let limitNum = null;
        let offsetNum = null;
        if (filters.limit !== undefined && filters.limit !== null) {
            // Forzar enteros seguros
            const parsedLimit = parseInt(filters.limit, 10);
            const parsedPage = parseInt(filters.page, 10) || 1;

            // valores por defecto / límites razonables
            limitNum = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 12;
            const pageNum = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
            offsetNum = (pageNum - 1) * limitNum;

            // Agregar LIMIT y OFFSET directamente (valores ya validados)
            query += ` LIMIT ${limitNum} OFFSET ${offsetNum}`;
        }

        try {
            // debug: tipos de params antes de ejecutar
            console.log('SQL Query:', query);
            console.log('Parameters:', params);
            console.log('Param types:', params.map(p => typeof p));
            const [rows] = await db.execute(query, params);
            return rows;
        } catch (error) {
            console.log('SQL Error - Query:', query);
            console.log('SQL Error - Params:', params);
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
                u.total_intercambios_vendedor as vendedor_total_intercambios,
                u.fecha_registro as vendedor_fecha_registro,
                pe.nombre as punto_encuentro_nombre,
                pe.direccion as punto_encuentro_direccion,
                pe.referencias as punto_encuentro_referencias,
                pe.coordenadas_lat,
                pe.coordenadas_lng
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            LEFT JOIN puntos_encuentro pe ON p.punto_encuentro_id = pe.id
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
                SELECT id, url_imagen, fecha_subida
                FROM imagenes_productos
                WHERE producto_id = ?
                ORDER BY fecha_subida ASC
            `;
            
            const [imageRows] = await db.execute(imagesQuery, [productId]);
            product.imagenes = imageRows;

            // Obtener horarios del vendedor
            const horariosQuery = `
                SELECT
                    dia_semana,
                    TIME_FORMAT(hora_inicio, '%H:%i') as hora_inicio,
                    TIME_FORMAT(hora_fin, '%H:%i') as hora_fin,
                    estado
                FROM horarios_vendedor
                WHERE vendedor_id = ? AND estado = 'activo'
                ORDER BY FIELD(dia_semana, 'lunes','martes','miércoles','jueves','viernes','sábado','domingo')
            `;

            const [horariosRows] = await db.execute(horariosQuery, [product.vendedor_id]);
            product.horarios_vendedor = horariosRows;

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
        // Validar y forzar entero para limit
        const limitNum = Number.isFinite(parseInt(limit, 10)) && parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 4;

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
                 ORDER BY ip.fecha_subida ASC
                 LIMIT 1) as imagen_principal
            FROM productos p
            WHERE p.categoria_id = ?
                AND p.id != ?
                AND p.estado = 'activo'
            ORDER BY p.fecha_publicacion DESC
            LIMIT ${limitNum}
        `;

        try {
            const [rows] = await db.execute(query, [categoryId, productId]);
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
                COUNT(CASE WHEN estado = 'expirado' THEN 1 END) as productos_expirados,
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