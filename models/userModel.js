const db = require('../database');

/**
 * Modelo para gestión de usuarios
 */
class UserModel {
    
    /**
     * Obtener todos los usuarios (sin datos sensibles)
     */
    static async getAllUsers(filters = {}) {
        let query = `
            SELECT 
                id,
                nombre,
                apellido,
                email,
                telefono,
                tipo_usuario,
                creditos_disponibles,
                estado,
                fecha_registro,
                fecha_ultima_actividad,
                calificacion_promedio,
                total_intercambios_vendedor,
                total_intercambios_comprador
            FROM usuarios 
            WHERE 1=1
        `;
        
        const params = [];
        
        // Aplicar filtros
        if (filters.estado) {
            query += ` AND estado = ?`;
            params.push(filters.estado);
        }
        
        if (filters.tipo_usuario) {
            query += ` AND tipo_usuario = ?`;
            params.push(filters.tipo_usuario);
        }
        
        if (filters.search) {
            query += ` AND (nombre LIKE ? OR apellido LIKE ? OR email LIKE ?)`;
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        // Ordenamiento
        query += ` ORDER BY fecha_registro DESC`;
        
        // Paginación: validar y forzar enteros
        if (filters.limit !== undefined && filters.limit !== null) {
            const parsedLimit = parseInt(filters.limit, 10);
            const parsedPage = parseInt(filters.page, 10) || 1;

            const limitNum = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
            const pageNum = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
            const offsetNum = (pageNum - 1) * limitNum;

            query += ` LIMIT ${limitNum} OFFSET ${offsetNum}`;
        }
        
        try {
            const [rows] = await db.execute(query, params);
            return rows;
        } catch (error) {
            throw new Error(`Error al obtener usuarios: ${error.message}`);
        }
    }
    
    /**
     * Contar total de usuarios con filtros
     */
    static async countUsers(filters = {}) {
        let query = `
            SELECT COUNT(*) as total
            FROM usuarios
            WHERE 1=1
        `;
        
        const params = [];
        
        if (filters.estado) {
            query += ` AND estado = ?`;
            params.push(filters.estado);
        }
        
        if (filters.tipo_usuario) {
            query += ` AND tipo_usuario = ?`;
            params.push(filters.tipo_usuario);
        }
        
        if (filters.search) {
            query += ` AND (nombre LIKE ? OR apellido LIKE ? OR email LIKE ?)`;
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        try {
            const [rows] = await db.execute(query, params);
            return rows[0].total;
        } catch (error) {
            throw new Error(`Error al contar usuarios: ${error.message}`);
        }
    }
    
    /**
     * Obtener usuario por ID
     */
    static async getUserById(userId) {
        const query = `
            SELECT 
                id,
                nombre,
                apellido,
                email,
                telefono,
                tipo_usuario,
                creditos_disponibles,
                estado,
                fecha_registro,
                fecha_ultima_actividad,
                calificacion_promedio,
                total_intercambios_vendedor,
                total_intercambios_comprador
            FROM usuarios 
            WHERE id = ?
        `;
        
        try {
            const [rows] = await db.execute(query, [userId]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            throw new Error(`Error al obtener usuario: ${error.message}`);
        }
    }
    
    /**
     * Obtener usuarios por tipo
     */
    static async getUsersByType(tipoUsuario, filters = {}) {
        const updatedFilters = { ...filters, tipo_usuario: tipoUsuario };
        return await this.getAllUsers(updatedFilters);
    }
    
    /**
     * Obtener estadísticas de usuarios
     */
    static async getUserStats() {
        const query = `
            SELECT 
                COUNT(*) as total_usuarios,
                COUNT(CASE WHEN tipo_usuario = 'comprador' THEN 1 END) as total_compradores,
                COUNT(CASE WHEN tipo_usuario = 'vendedor' THEN 1 END) as total_vendedores,
                COUNT(CASE WHEN tipo_usuario = 'admin' THEN 1 END) as total_admins,
                COUNT(CASE WHEN estado = 'activo' THEN 1 END) as usuarios_activos,
                COUNT(CASE WHEN estado = 'suspendido' THEN 1 END) as usuarios_suspendidos,
                COUNT(CASE WHEN estado = 'inactivo' THEN 1 END) as usuarios_inactivos,
                AVG(calificacion_promedio) as calificacion_promedio_general,
                SUM(total_intercambios_vendedor) as intercambios_vendedor_totales,
                SUM(total_intercambios_comprador) as intercambios_comprador_totales,
                SUM(creditos_disponibles) as creditos_totales_sistema
            FROM usuarios
        `;
        
        try {
            const [rows] = await db.execute(query);
            return rows[0];
        } catch (error) {
            throw new Error(`Error al obtener estadísticas de usuarios: ${error.message}`);
        }
    }
    
    /**
     * Obtener vendedores mejor calificados
     */
    static async getTopVendedores(limit = 10) {
        // Validar y forzar entero para limit
        const limitNum = Number.isFinite(parseInt(limit, 10)) && parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 10;

        const query = `
            SELECT
                id,
                nombre,
                apellido,
                email,
                tipo_usuario,
                calificacion_promedio,
                total_intercambios_vendedor,
                fecha_registro
            FROM usuarios
            WHERE tipo_usuario IN ('vendedor', 'admin')
                AND estado = 'activo'
                AND total_intercambios_vendedor > 0
            ORDER BY calificacion_promedio DESC, total_intercambios_vendedor DESC
            LIMIT ${limitNum}
        `;

        try {
            const [rows] = await db.execute(query);
            return rows;
        } catch (error) {
            throw new Error(`Error al obtener top vendedores: ${error.message}`);
        }
    }
    
    /**
     * Verificar si existe un usuario
     */
    static async existsUser(userId) {
        const query = 'SELECT id FROM usuarios WHERE id = ?';
        
        try {
            const [rows] = await db.execute(query, [userId]);
            return rows.length > 0;
        } catch (error) {
            throw new Error(`Error al verificar usuario: ${error.message}`);
        }
    }
}

module.exports = UserModel;