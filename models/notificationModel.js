const db = require('../database');

/**
 * Modelo para gestión de notificaciones
 */
class NotificationModel {

    /**
     * Crear una nueva notificación
     */
    static async createNotification(notificationData) {
        const {
            remitente_id,
            usuario_id,
            titulo,
            mensaje,
            tipo_notificacion = 'producto'
        } = notificationData;

        const query = `
            INSERT INTO notificaciones (
                remitente_id,
                usuario_id,
                titulo,
                mensaje,
                tipo_notificacion,
                estado,
                prioridad,
                fecha_creacion
            ) VALUES (?, ?, ?, ?, ?, 'no_vista', 'normal', NOW())
        `;

        try {
            const [result] = await db.execute(query, [
                remitente_id,
                usuario_id,
                titulo,
                mensaje,
                tipo_notificacion
            ]);

            return {
                id: result.insertId,
                success: true
            };
        } catch (error) {
            throw new Error(`Error al crear notificación: ${error.message}`);
        }
    }

    /**
     * Obtener notificaciones de un usuario
     */
    static async getNotificationsByUserId(userId, filters = {}) {
        let query = `
            SELECT
                n.*,
                ur.nombre as remitente_nombre,
                ur.apellido as remitente_apellido
            FROM notificaciones n
            LEFT JOIN usuarios ur ON n.remitente_id = ur.id
            WHERE n.usuario_id = ?
        `;

        const params = [userId];

        // Aplicar filtros opcionales
        if (filters.estado) {
            query += ` AND n.estado = ?`;
            params.push(filters.estado);
        }

        if (filters.tipo_notificacion) {
            query += ` AND n.tipo_notificacion = ?`;
            params.push(filters.tipo_notificacion);
        }

        // Ordenar por fecha (más recientes primero)
        query += ` ORDER BY n.fecha_creacion DESC`;

        // Paginación
        if (filters.limit) {
            const limit = parseInt(filters.limit, 10);
            const offset = filters.page ? (parseInt(filters.page, 10) - 1) * limit : 0;
            query += ` LIMIT ${limit} OFFSET ${offset}`;
        }

        try {
            const [rows] = await db.execute(query, params);
            return rows;
        } catch (error) {
            throw new Error(`Error al obtener notificaciones: ${error.message}`);
        }
    }

    /**
     * Marcar notificación como vista
     */
    static async markAsRead(notificationId, userId) {
        const query = `
            UPDATE notificaciones
            SET estado = 'vista', fecha_vista = NOW()
            WHERE id = ? AND usuario_id = ?
        `;

        try {
            const [result] = await db.execute(query, [notificationId, userId]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error al marcar notificación como vista: ${error.message}`);
        }
    }

    /**
     * Contar notificaciones no vistas
     */
    static async countUnreadNotifications(userId) {
        const query = `
            SELECT COUNT(*) as count
            FROM notificaciones
            WHERE usuario_id = ? AND estado = 'no_vista'
        `;

        try {
            const [rows] = await db.execute(query, [userId]);
            return rows[0].count;
        } catch (error) {
            throw new Error(`Error al contar notificaciones no vistas: ${error.message}`);
        }
    }

    /**
     * Eliminar notificación
     */
    static async deleteNotification(notificationId, userId) {
        const query = `
            DELETE FROM notificaciones
            WHERE id = ? AND usuario_id = ?
        `;

        try {
            const [result] = await db.execute(query, [notificationId, userId]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error al eliminar notificación: ${error.message}`);
        }
    }
}

module.exports = NotificationModel;