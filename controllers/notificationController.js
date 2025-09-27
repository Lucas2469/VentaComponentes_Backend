const NotificationModel = require('../models/notificationModel');
const { successResponse, errorResponse } = require('../utils/responseUtils');

/**
 * Controlador para gestión de notificaciones
 */
class NotificationController {

    /**
     * Crear una nueva notificación
     * POST /api/notifications
     */
    static async createNotification(req, res) {
        try {
            const { remitente_id, usuario_id, titulo, mensaje, tipo_notificacion } = req.body;

            // Validar campos requeridos
            if (!usuario_id || !titulo || !mensaje) {
                return errorResponse(res, 'Los campos usuario_id, titulo y mensaje son obligatorios', 400);
            }

            // Validar longitud de campos
            if (titulo.length > 100) {
                return errorResponse(res, 'El título no puede exceder 100 caracteres', 400);
            }

            if (mensaje.length > 500) {
                return errorResponse(res, 'El mensaje no puede exceder 500 caracteres', 400);
            }

            const notificationData = {
                remitente_id: remitente_id || null,
                usuario_id,
                titulo: titulo.trim(),
                mensaje: mensaje.trim(),
                tipo_notificacion: tipo_notificacion || 'producto'
            };

            const result = await NotificationModel.createNotification(notificationData);

            return successResponse(res, {
                id: result.id,
                mensaje: 'Notificación creada exitosamente'
            }, 'Notificación creada exitosamente', 201);

        } catch (error) {
            console.error('Error en createNotification:', error);
            return errorResponse(res, 'Error al crear la notificación', 500);
        }
    }

    /**
     * Obtener notificaciones de un usuario
     * GET /api/notifications/user/:userId
     */
    static async getNotificationsByUser(req, res) {
        try {
            const { userId } = req.params;
            const { estado, tipo_notificacion, page, limit } = req.query;

            if (!userId || isNaN(userId)) {
                return errorResponse(res, 'ID de usuario inválido', 400);
            }

            const filters = {
                estado,
                tipo_notificacion,
                page: page ? parseInt(page, 10) : null,
                limit: limit ? parseInt(limit, 10) : null
            };

            const notifications = await NotificationModel.getNotificationsByUserId(parseInt(userId), filters);

            return successResponse(res, notifications, 'Notificaciones obtenidas exitosamente');

        } catch (error) {
            console.error('Error en getNotificationsByUser:', error);
            return errorResponse(res, 'Error al obtener notificaciones', 500);
        }
    }

    /**
     * Marcar notificación como vista
     * PUT /api/notifications/:id/read
     */
    static async markNotificationAsRead(req, res) {
        try {
            const { id } = req.params;
            const { usuario_id } = req.body;

            if (!id || isNaN(id)) {
                return errorResponse(res, 'ID de notificación inválido', 400);
            }

            if (!usuario_id || isNaN(usuario_id)) {
                return errorResponse(res, 'ID de usuario inválido', 400);
            }

            const success = await NotificationModel.markAsRead(parseInt(id), parseInt(usuario_id));

            if (!success) {
                return errorResponse(res, 'Notificación no encontrada o no pertenece al usuario', 404);
            }

            return successResponse(res, { id: parseInt(id) }, 'Notificación marcada como vista');

        } catch (error) {
            console.error('Error en markNotificationAsRead:', error);
            return errorResponse(res, 'Error al marcar notificación como vista', 500);
        }
    }

    /**
     * Contar notificaciones no vistas
     * GET /api/notifications/user/:userId/unread-count
     */
    static async getUnreadCount(req, res) {
        try {
            const { userId } = req.params;

            if (!userId || isNaN(userId)) {
                return errorResponse(res, 'ID de usuario inválido', 400);
            }

            const count = await NotificationModel.countUnreadNotifications(parseInt(userId));

            return successResponse(res, { count }, 'Contador de notificaciones obtenido');

        } catch (error) {
            console.error('Error en getUnreadCount:', error);
            return errorResponse(res, 'Error al obtener contador de notificaciones', 500);
        }
    }

    /**
     * Eliminar notificación
     * DELETE /api/notifications/:id
     */
    static async deleteNotification(req, res) {
        try {
            const { id } = req.params;
            const { usuario_id } = req.body;

            if (!id || isNaN(id)) {
                return errorResponse(res, 'ID de notificación inválido', 400);
            }

            if (!usuario_id || isNaN(usuario_id)) {
                return errorResponse(res, 'ID de usuario inválido', 400);
            }

            const success = await NotificationModel.deleteNotification(parseInt(id), parseInt(usuario_id));

            if (!success) {
                return errorResponse(res, 'Notificación no encontrada o no pertenece al usuario', 404);
            }

            return successResponse(res, { id: parseInt(id) }, 'Notificación eliminada exitosamente');

        } catch (error) {
            console.error('Error en deleteNotification:', error);
            return errorResponse(res, 'Error al eliminar notificación', 500);
        }
    }
}

module.exports = NotificationController;