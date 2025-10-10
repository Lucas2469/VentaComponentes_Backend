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
        
        // Ordenamiento: Admin primero, luego por fecha de registro
        query += ` ORDER BY
            CASE tipo_usuario
                WHEN 'admin' THEN 1
                WHEN 'vendedor' THEN 2
                WHEN 'comprador' THEN 3
                ELSE 4
            END,
            fecha_registro DESC`;
        
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
            WHERE tipo_usuario IN ('vendedor')
                AND estado = 'activo'
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
     * Obtener compradores más activos
     */
    static async getTopCompradores(limit = 10) {
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
                total_intercambios_comprador,
                fecha_registro
            FROM usuarios
            WHERE tipo_usuario IN ('comprador')
                AND estado = 'activo'
            ORDER BY total_intercambios_comprador DESC, calificacion_promedio DESC
            LIMIT ${limitNum}
        `;

        try {
            const [rows] = await db.execute(query);
            return rows;
        } catch (error) {
            throw new Error(`Error al obtener top compradores: ${error.message}`);
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

    /**
     * Actualizar estado de usuario
     */
    static async updateUserStatus(userId, estado) {
        const query = `
            UPDATE usuarios
            SET estado = ?
            WHERE id = ? AND tipo_usuario != 'admin'
        `;

        try {
            const [result] = await db.execute(query, [estado, userId]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error al actualizar estado del usuario: ${error.message}`);
        }
    }

    /**
     * Actualizar datos de perfil de usuario
     */
    static async updateUser(userId, updateData) {
        const fields = [];
        const values = [];

        if (updateData.nombre !== undefined) {
            fields.push('nombre = ?');
            values.push(updateData.nombre);
        }
        if (updateData.apellido !== undefined) {
            fields.push('apellido = ?');
            values.push(updateData.apellido);
        }
        if (updateData.email !== undefined) {
            fields.push('email = ?');
            values.push(updateData.email);
        }
        if (updateData.telefono !== undefined) {
            fields.push('telefono = ?');
            values.push(updateData.telefono);
        }

        if (fields.length === 0) {
            return false;
        }

        values.push(userId);

        const query = `
            UPDATE usuarios
            SET ${fields.join(', ')}
            WHERE id = ?
        `;

        try {
            const [result] = await db.execute(query, values);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error al actualizar usuario: ${error.message}`);
        }
    }

    /**
     * Verificar contraseña usando bcrypt
     */
    static async verifyPassword(userId, password) {
        const query = `
            SELECT id, password_hash
            FROM usuarios
            WHERE id = ?
        `;

        try {
            const [rows] = await db.execute(query, [userId]);
            if (rows.length === 0) {
                return false;
            }
            
            const { verifyPassword } = require('../utils/authUtils');
            const isValid = await verifyPassword(password, rows[0].password_hash);
            return isValid;
        } catch (error) {
            throw new Error(`Error al verificar contraseña: ${error.message}`);
        }
    }

    /**
     * Verificar contraseña por email (para login)
     */
    static async verifyPasswordByEmail(email, password) {
        const query = `
            SELECT id, password_hash, email, nombre, apellido, telefono, tipo_usuario, estado,
                   creditos_disponibles, fecha_registro, calificacion_promedio,
                   total_intercambios_vendedor, total_intercambios_comprador
            FROM usuarios
            WHERE email = ?
        `;

        try {
            const [rows] = await db.execute(query, [email]);
            if (rows.length === 0) {
                return null;
            }
            
            const user = rows[0];
            const { verifyPassword } = require('../utils/authUtils');
            const isValid = await verifyPassword(password, user.password_hash);
            
            if (isValid) {
                // No devolver el hash de la contraseña
                delete user.password_hash;
                return user;
            }
            
            return null;
        } catch (error) {
            throw new Error(`Error al verificar contraseña: ${error.message}`);
        }
    }

    /**
     * Actualizar contraseña usando bcrypt
     */
    static async updatePassword(userId, newPassword) {
        const { hashPassword } = require('../utils/authUtils');
        
        try {
            const hashedPassword = await hashPassword(newPassword);
            
            const query = `
                UPDATE usuarios
                SET password_hash = ?
                WHERE id = ?
            `;

            const [result] = await db.execute(query, [hashedPassword, userId]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error al actualizar contraseña: ${error.message}`);
        }
    }

    /**
     * Crear nuevo usuario con contraseña hasheada
     */
    static async createUser(userData) {
        const { hashPassword, validateEmail, validatePasswordStrength } = require('../utils/authUtils');
        
        try {
            // Validar email
            if (!validateEmail(userData.email)) {
                throw new Error('Formato de email inválido');
            }
            
            // Validar contraseña
            const passwordValidation = validatePasswordStrength(userData.password);
            if (!passwordValidation.isValid) {
                throw new Error(`Contraseña inválida: ${passwordValidation.errors.join(', ')}`);
            }
            
            // Verificar que el email no exista
            const existingUser = await this.getUserByEmail(userData.email);
            if (existingUser) {
                throw new Error('El email ya está registrado');
            }
            
            // Hash de la contraseña
            const hashedPassword = await hashPassword(userData.password);
            
            const query = `
                INSERT INTO usuarios 
                (nombre, apellido, email, telefono, password_hash, tipo_usuario, creditos_disponibles, estado, fecha_registro)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'activo', NOW())
            `;
            
            const params = [
                userData.nombre,
                userData.apellido,
                userData.email,
                userData.telefono || null,
                hashedPassword,
                userData.tipo_usuario || 'comprador',
                userData.creditos_disponibles || 0
            ];
            
            const [result] = await db.execute(query, params);
            return result.insertId;
        } catch (error) {
            throw new Error(`Error al crear usuario: ${error.message}`);
        }
    }

    /**
     * Obtener usuario por email
     */
    static async getUserByEmail(email) {
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
            WHERE email = ?
        `;
        
        try {
            const [rows] = await db.execute(query, [email]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            throw new Error(`Error al obtener usuario por email: ${error.message}`);
        }
    }
}

module.exports = UserModel;