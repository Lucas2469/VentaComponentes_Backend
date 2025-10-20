const db = require('../database');

/**
 * Modelo para gestión de notificaciones
 */
class NotificationModel {
    
    /**
     * Crear una nueva notificación
     * @param {object} notificationData - Datos de la notificación
     * @returns {Promise<number>} - ID de la notificación creada
     */
    static async createNotification(notificationData) {
        try {
            const query = `
                INSERT INTO notificaciones
                (usuario_id, remitente_id, tipo_notificacion, titulo, mensaje, datos, enlace, prioridad)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                notificationData.usuario_id,
                notificationData.remitente_id || null,
                notificationData.tipo || notificationData.tipo_notificacion || 'sistema',
                notificationData.titulo,
                notificationData.mensaje,
                notificationData.datos ? JSON.stringify(notificationData.datos) : null,
                notificationData.enlace || null,
                notificationData.prioridad || 'normal'
            ];

            const [result] = await db.execute(query, params);
            return result.insertId;

        } catch (error) {
            console.error('Error creating notification:', error);
            throw new Error(`Error al crear notificación: ${error.message}`);
        }
    }

    /**
     * Obtener notificaciones de un usuario
     * @param {number} usuarioId - ID del usuario
     * @param {object} filters - Filtros opcionales
     * @returns {Promise<Array>} - Lista de notificaciones
     */
    static async getUserNotifications(usuarioId, filters = {}) {
        try {
            let query = `
                SELECT
                    id,
                    usuario_id,
                    remitente_id,
                    tipo_notificacion,
                    titulo,
                    mensaje,
                    datos,
                    estado,
                    fecha_creacion,
                    fecha_vista,
                    enlace,
                    prioridad
                FROM notificaciones
                WHERE usuario_id = ?
            `;

            const params = [usuarioId];

            // Filtro por leída/no leída (mapear estado)
            if (filters.leida !== undefined) {
                const estado = filters.leida ? 'vista' : 'no_vista';
                query += ` AND estado = ?`;
                params.push(estado);
            }

            // Filtro por tipo
            if (filters.tipo || filters.tipo_notificacion) {
                query += ` AND tipo_notificacion = ?`;
                params.push(filters.tipo || filters.tipo_notificacion);
            }

            // Filtro por prioridad
            if (filters.prioridad) {
                query += ` AND prioridad = ?`;
                params.push(filters.prioridad);
            }

            // Ordenar por fecha más reciente
            query += ` ORDER BY fecha_creacion DESC`;

            // Limit (no usar placeholder para LIMIT, insertar directamente)
            const limit = parseInt(filters.limit) || 50;
            query += ` LIMIT ${limit}`;

            const [rows] = await db.execute(query, params);

            // Parsear JSON en datos y mapear estado a leida
            return rows.map(row => ({
                ...row,
                datos: row.datos ? JSON.parse(row.datos) : null,
                leida: row.estado === 'vista',
                fecha_lectura: row.fecha_vista
            }));

        } catch (error) {
            console.error('Error getting user notifications:', error);
            throw new Error(`Error al obtener notificaciones: ${error.message}`);
        }
    }

    /**
     * Marcar notificación como leída
     * @param {number} notificationId - ID de la notificación
     * @param {number} usuarioId - ID del usuario (para seguridad)
     * @returns {Promise<boolean>} - true si se marcó correctamente
     */
    static async markAsRead(notificationId, usuarioId) {
        try {
            const query = `
                UPDATE notificaciones
                SET estado = 'vista',
                    fecha_vista = NOW()
                WHERE id = ?
                    AND usuario_id = ?
                    AND estado = 'no_vista'
            `;

            const [result] = await db.execute(query, [notificationId, usuarioId]);
            return result.affectedRows > 0;

        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw new Error(`Error al marcar notificación como leída: ${error.message}`);
        }
    }

    /**
     * Marcar todas las notificaciones como leídas
     * @param {number} usuarioId - ID del usuario
     * @returns {Promise<number>} - Cantidad de notificaciones marcadas
     */
    static async markAllAsRead(usuarioId) {
        try {
            const query = `
                UPDATE notificaciones
                SET estado = 'vista',
                    fecha_vista = NOW()
                WHERE usuario_id = ?
                    AND estado = 'no_vista'
            `;

            const [result] = await db.execute(query, [usuarioId]);
            return result.affectedRows;

        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw new Error(`Error al marcar todas las notificaciones: ${error.message}`);
        }
    }

    /**
     * Eliminar notificación
     * @param {number} notificationId - ID de la notificación
     * @param {number} usuarioId - ID del usuario (para seguridad)
     * @returns {Promise<boolean>} - true si se eliminó
     */
    static async deleteNotification(notificationId, usuarioId) {
        try {
            const query = `
                DELETE FROM notificaciones
                WHERE id = ?
                    AND usuario_id = ?
            `;

            const [result] = await db.execute(query, [notificationId, usuarioId]);
            return result.affectedRows > 0;

        } catch (error) {
            console.error('Error deleting notification:', error);
            throw new Error(`Error al eliminar notificación: ${error.message}`);
        }
    }

    /**
     * Eliminar todas las notificaciones leídas de un usuario
     * @param {number} usuarioId - ID del usuario
     * @returns {Promise<number>} - Cantidad de notificaciones eliminadas
     */
    static async deleteAllRead(usuarioId) {
        try {
            const query = `
                DELETE FROM notificaciones
                WHERE usuario_id = ?
                    AND estado = 'vista'
            `;

            const [result] = await db.execute(query, [usuarioId]);
            return result.affectedRows;

        } catch (error) {
            console.error('Error deleting read notifications:', error);
            throw new Error(`Error al eliminar notificaciones leídas: ${error.message}`);
        }
    }

    /**
     * Contar notificaciones no leídas
     * @param {number} usuarioId - ID del usuario
     * @returns {Promise<number>} - Cantidad de notificaciones no leídas
     */
    static async countUnread(usuarioId) {
        try {
            const query = `
                SELECT COUNT(*) as total
                FROM notificaciones
                WHERE usuario_id = ?
                    AND estado = 'no_vista'
            `;

            const [rows] = await db.execute(query, [usuarioId]);
            return rows[0].total;

        } catch (error) {
            console.error('Error counting unread notifications:', error);
            throw new Error(`Error al contar notificaciones: ${error.message}`);
        }
    }

    /**
     * Obtener notificación por ID
     * @param {number} notificationId - ID de la notificación
     * @param {number} usuarioId - ID del usuario (para seguridad)
     * @returns {Promise<object|null>} - Notificación o null
     */
    static async getNotificationById(notificationId, usuarioId) {
        try {
            const query = `
                SELECT
                    id,
                    usuario_id,
                    remitente_id,
                    tipo_notificacion,
                    titulo,
                    mensaje,
                    datos,
                    estado,
                    fecha_creacion,
                    fecha_vista,
                    enlace,
                    prioridad
                FROM notificaciones
                WHERE id = ?
                    AND usuario_id = ?
            `;

            const [rows] = await db.execute(query, [notificationId, usuarioId]);

            if (rows.length === 0) {
                return null;
            }

            const notification = rows[0];
            return {
                ...notification,
                datos: notification.datos ? JSON.parse(notification.datos) : null,
                leida: notification.estado === 'vista',
                fecha_lectura: notification.fecha_vista
            };

        } catch (error) {
            console.error('Error getting notification by ID:', error);
            throw new Error(`Error al obtener notificación: ${error.message}`);
        }
    }

    /**
     * Limpiar notificaciones antiguas (ejecutar periódicamente)
     * @param {number} daysOld - Eliminar notificaciones con más de X días
     * @returns {Promise<number>} - Cantidad de notificaciones eliminadas
     */
    static async cleanupOldNotifications(daysOld = 30) {
        try {
            const query = `
                DELETE FROM notificaciones
                WHERE fecha_creacion < DATE_SUB(NOW(), INTERVAL ? DAY)
                    AND estado = 'vista'
            `;

            const [result] = await db.execute(query, [daysOld]);

            if (result.affectedRows > 0) {
                console.log(`✅ Limpiadas ${result.affectedRows} notificaciones antiguas`);
            }

            return result.affectedRows;

        } catch (error) {
            console.error('Error cleaning up old notifications:', error);
            throw new Error(`Error al limpiar notificaciones antiguas: ${error.message}`);
        }
    }

    /**
     * Obtener estadísticas de notificaciones de un usuario
     * @param {number} usuarioId - ID del usuario
     * @returns {Promise<object>} - Estadísticas
     */
    static async getUserNotificationStats(usuarioId) {
        try {
            const query = `
                SELECT
                    COUNT(*) as total,
                    COUNT(CASE WHEN estado = 'no_vista' THEN 1 END) as no_leidas,
                    COUNT(CASE WHEN estado = 'vista' THEN 1 END) as leidas,
                    COUNT(CASE WHEN prioridad = 'urgente' THEN 1 END) as urgentes,
                    COUNT(CASE WHEN prioridad = 'alta' THEN 1 END) as altas
                FROM notificaciones
                WHERE usuario_id = ?
            `;

            const [rows] = await db.execute(query, [usuarioId]);
            return rows[0];

        } catch (error) {
            console.error('Error getting notification stats:', error);
            throw new Error(`Error al obtener estadísticas: ${error.message}`);
        }
    }
}

module.exports = NotificationModel;
