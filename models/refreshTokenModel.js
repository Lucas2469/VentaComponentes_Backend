const db = require('../database');
const crypto = require('crypto');

/**
 * Modelo para gestión de Refresh Tokens
 * Permite almacenar, validar y revocar tokens de forma segura
 */
class RefreshTokenModel {
    
    /**
     * Almacenar un nuevo refresh token
     * @param {object} tokenData - Datos del token
     * @param {number} tokenData.usuarioId - ID del usuario
     * @param {string} tokenData.tokenId - UUID del token
     * @param {string} tokenData.refreshToken - Token completo para hashear
     * @param {Date} tokenData.expiresAt - Fecha de expiración
     * @param {string} tokenData.ipAddress - IP del cliente
     * @param {string} tokenData.userAgent - User agent del navegador
     * @returns {Promise<number>} - ID del token insertado
     */
    static async storeRefreshToken(tokenData) {
        try {
            // Generar hash del refresh token
            const tokenHash = crypto.createHash('sha256')
                .update(tokenData.refreshToken)
                .digest('hex');

            const query = `
                INSERT INTO refresh_tokens 
                (usuario_id, token_id, token_hash, expires_at, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            const params = [
                tokenData.usuarioId,
                tokenData.tokenId,
                tokenHash,
                tokenData.expiresAt,
                tokenData.ipAddress || null,
                tokenData.userAgent || null
            ];

            const [result] = await db.execute(query, params);
            return result.insertId;

        } catch (error) {
            console.error('Error storing refresh token:', error);
            throw new Error(`Error al almacenar refresh token: ${error.message}`);
        }
    }

    /**
     * Verificar si un refresh token es válido
     * @param {string} tokenId - UUID del token
     * @param {string} refreshToken - Token completo
     * @returns {Promise<object|null>} - Datos del token si es válido, null si no
     */
    static async verifyRefreshToken(tokenId, refreshToken) {
        try {
            // Generar hash del refresh token
            const tokenHash = crypto.createHash('sha256')
                .update(refreshToken)
                .digest('hex');

            const query = `
                SELECT 
                    rt.id,
                    rt.usuario_id,
                    rt.token_id,
                    rt.expires_at,
                    rt.revoked_at,
                    rt.revoked_reason,
                    u.estado as user_estado
                FROM refresh_tokens rt
                JOIN usuarios u ON rt.usuario_id = u.id
                WHERE rt.token_id = ? 
                    AND rt.token_hash = ?
            `;

            const [rows] = await db.execute(query, [tokenId, tokenHash]);

            if (rows.length === 0) {
                return null; // Token no encontrado
            }

            const tokenData = rows[0];

            // Verificar si el token fue revocado
            if (tokenData.revoked_at !== null) {
                return null; // Token revocado
            }

            // Verificar si el token expiró
            if (new Date(tokenData.expires_at) < new Date()) {
                return null; // Token expirado
            }

            // Verificar si el usuario está activo
            if (tokenData.user_estado !== 'activo') {
                return null; // Usuario inactivo
            }

            return tokenData;

        } catch (error) {
            console.error('Error verifying refresh token:', error);
            throw new Error(`Error al verificar refresh token: ${error.message}`);
        }
    }

    /**
     * Revocar un refresh token específico
     * @param {string} tokenId - UUID del token
     * @param {string} reason - Razón de revocación
     * @returns {Promise<boolean>} - true si se revocó, false si no
     */
    static async revokeRefreshToken(tokenId, reason = 'logout') {
        try {
            const query = `
                UPDATE refresh_tokens
                SET revoked_at = NOW(),
                    revoked_reason = ?
                WHERE token_id = ?
                    AND revoked_at IS NULL
            `;

            const [result] = await db.execute(query, [reason, tokenId]);
            return result.affectedRows > 0;

        } catch (error) {
            console.error('Error revoking refresh token:', error);
            throw new Error(`Error al revocar refresh token: ${error.message}`);
        }
    }

    /**
     * Revocar todos los refresh tokens de un usuario
     * @param {number} usuarioId - ID del usuario
     * @param {string} reason - Razón de revocación
     * @returns {Promise<number>} - Cantidad de tokens revocados
     */
    static async revokeAllUserTokens(usuarioId, reason = 'logout_all') {
        try {
            const query = `
                UPDATE refresh_tokens
                SET revoked_at = NOW(),
                    revoked_reason = ?
                WHERE usuario_id = ?
                    AND revoked_at IS NULL
            `;

            const [result] = await db.execute(query, [reason, usuarioId]);
            return result.affectedRows;

        } catch (error) {
            console.error('Error revoking all user tokens:', error);
            throw new Error(`Error al revocar tokens del usuario: ${error.message}`);
        }
    }

    /**
     * Limpiar tokens expirados (ejecutar periódicamente)
     * @param {number} daysOld - Eliminar tokens expirados hace más de X días
     * @returns {Promise<number>} - Cantidad de tokens eliminados
     */
    static async cleanupExpiredTokens(daysOld = 30) {
        try {
            const query = `
                DELETE FROM refresh_tokens
                WHERE expires_at < DATE_SUB(NOW(), INTERVAL ? DAY)
                    OR (revoked_at IS NOT NULL AND revoked_at < DATE_SUB(NOW(), INTERVAL ? DAY))
            `;

            const [result] = await db.execute(query, [daysOld, daysOld]);
            
            if (result.affectedRows > 0) {
                console.log(`✅ Limpiados ${result.affectedRows} refresh tokens expirados`);
            }

            return result.affectedRows;

        } catch (error) {
            console.error('Error cleaning up expired tokens:', error);
            throw new Error(`Error al limpiar tokens expirados: ${error.message}`);
        }
    }

    /**
     * Obtener todos los tokens activos de un usuario
     * @param {number} usuarioId - ID del usuario
     * @returns {Promise<Array>} - Lista de tokens activos
     */
    static async getUserActiveTokens(usuarioId) {
        try {
            const query = `
                SELECT 
                    id,
                    token_id,
                    created_at,
                    expires_at,
                    ip_address,
                    user_agent
                FROM refresh_tokens
                WHERE usuario_id = ?
                    AND revoked_at IS NULL
                    AND expires_at > NOW()
                ORDER BY created_at DESC
            `;

            const [rows] = await db.execute(query, [usuarioId]);
            return rows;

        } catch (error) {
            console.error('Error getting user active tokens:', error);
            throw new Error(`Error al obtener tokens activos: ${error.message}`);
        }
    }

    /**
     * Contar tokens activos por usuario
     * @param {number} usuarioId - ID del usuario
     * @returns {Promise<number>} - Cantidad de tokens activos
     */
    static async countUserActiveTokens(usuarioId) {
        try {
            const query = `
                SELECT COUNT(*) as total
                FROM refresh_tokens
                WHERE usuario_id = ?
                    AND revoked_at IS NULL
                    AND expires_at > NOW()
            `;

            const [rows] = await db.execute(query, [usuarioId]);
            return rows[0].total;

        } catch (error) {
            console.error('Error counting user active tokens:', error);
            throw new Error(`Error al contar tokens activos: ${error.message}`);
        }
    }

    /**
     * Obtener estadísticas de refresh tokens
     * @returns {Promise<object>} - Estadísticas generales
     */
    static async getTokenStats() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_tokens,
                    COUNT(CASE WHEN revoked_at IS NULL AND expires_at > NOW() THEN 1 END) as active_tokens,
                    COUNT(CASE WHEN revoked_at IS NOT NULL THEN 1 END) as revoked_tokens,
                    COUNT(CASE WHEN expires_at <= NOW() AND revoked_at IS NULL THEN 1 END) as expired_tokens,
                    COUNT(DISTINCT usuario_id) as users_with_tokens
                FROM refresh_tokens
            `;

            const [rows] = await db.execute(query);
            return rows[0];

        } catch (error) {
            console.error('Error getting token stats:', error);
            throw new Error(`Error al obtener estadísticas de tokens: ${error.message}`);
        }
    }

    /**
     * Rotar refresh token (revocar el anterior y permitir crear uno nuevo)
     * @param {string} oldTokenId - UUID del token anterior
     * @param {string} reason - Razón de rotación
     * @returns {Promise<boolean>} - true si se revocó correctamente
     */
    static async rotateRefreshToken(oldTokenId, reason = 'token_rotation') {
        try {
            return await this.revokeRefreshToken(oldTokenId, reason);
        } catch (error) {
            console.error('Error rotating refresh token:', error);
            throw new Error(`Error al rotar refresh token: ${error.message}`);
        }
    }
}

module.exports = RefreshTokenModel;

