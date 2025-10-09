const NotificationModel = require('../models/notificationModel');
// const WebSocketService = require('../services/websocketService'); // Deshabilitado (requiere socket.io)
const { successResponse, errorResponse } = require('../utils/responseUtils');

/**
 * Controlador de notificaciones
 */
class NotificationController {
    
    /**
     * Obtener notificaciones del usuario autenticado
     * GET /api/notifications
     */
    static async getUserNotifications(req, res) {
        try {
            const userId = req.user.id;
            const filters = {
                leida: req.query.leida !== undefined ? req.query.leida === 'true' : undefined,
                tipo: req.query.tipo,
                prioridad: req.query.prioridad,
                limit: req.query.limit || 50
            };

            const notifications = await NotificationModel.getUserNotifications(userId, filters);

            return successResponse(res, {
                notifications,
                total: notifications.length
            }, 'Notificaciones obtenidas exitosamente');

        } catch (error) {
            console.error('Error getting notifications:', error);
            return errorResponse(res, 'Error al obtener notificaciones', 500);
        }
    }

    /**
     * Obtener conteo de notificaciones no leídas
     * GET /api/notifications/unread-count
     */
    static async getUnreadCount(req, res) {
        try {
            const userId = req.user.id;
            const count = await NotificationModel.countUnread(userId);

            return successResponse(res, { count }, 'Conteo obtenido exitosamente');

        } catch (error) {
            console.error('Error getting unread count:', error);
            return errorResponse(res, 'Error al obtener conteo', 500);
        }
    }

    /**
     * Marcar notificación como leída
     * PUT /api/notifications/:id/read
     */
    static async markAsRead(req, res) {
        try {
            const notificationId = req.params.id;
            const userId = req.user.id;

            const success = await NotificationModel.markAsRead(notificationId, userId);

            if (!success) {
                return errorResponse(res, 'Notificación no encontrada o ya leída', 404);
            }

            return successResponse(res, null, 'Notificación marcada como leída');

        } catch (error) {
            console.error('Error marking notification as read:', error);
            return errorResponse(res, 'Error al marcar notificación', 500);
        }
    }

    /**
     * Marcar todas las notificaciones como leídas
     * PUT /api/notifications/mark-all-read
     */
    static async markAllAsRead(req, res) {
        try {
            const userId = req.user.id;
            const count = await NotificationModel.markAllAsRead(userId);

            return successResponse(res, { count }, `${count} notificaciones marcadas como leídas`);

        } catch (error) {
            console.error('Error marking all as read:', error);
            return errorResponse(res, 'Error al marcar notificaciones', 500);
        }
    }

    /**
     * Eliminar notificación
     * DELETE /api/notifications/:id
     */
    static async deleteNotification(req, res) {
        try {
            const notificationId = req.params.id;
            const userId = req.user.id;

            const success = await NotificationModel.deleteNotification(notificationId, userId);

            if (!success) {
                return errorResponse(res, 'Notificación no encontrada', 404);
            }

            return successResponse(res, null, 'Notificación eliminada exitosamente');

        } catch (error) {
            console.error('Error deleting notification:', error);
            return errorResponse(res, 'Error al eliminar notificación', 500);
        }
    }

    /**
     * Eliminar todas las notificaciones leídas
     * DELETE /api/notifications/read
     */
    static async deleteAllRead(req, res) {
        try {
            const userId = req.user.id;
            const count = await NotificationModel.deleteAllRead(userId);

            return successResponse(res, { count }, `${count} notificaciones eliminadas`);

        } catch (error) {
            console.error('Error deleting read notifications:', error);
            return errorResponse(res, 'Error al eliminar notificaciones', 500);
        }
    }

    /**
     * Crear notificación (solo admin o sistema)
     * POST /api/notifications
     */
    static async createNotification(req, res) {
        try {
            const { usuario_id, tipo, titulo, mensaje, datos, enlace, prioridad } = req.body;

            // Validaciones
            if (!usuario_id || !tipo || !titulo || !mensaje) {
                return errorResponse(res, 'Faltan campos requeridos', 400);
            }

            // Crear notificación en BD (WebSocket deshabilitado)
            const notificationId = await NotificationModel.createNotification({
                usuario_id,
                tipo,
                titulo,
                mensaje,
                datos,
                enlace,
                prioridad
            });

            return successResponse(res, { id: notificationId }, 'Notificación creada exitosamente', 201);

        } catch (error) {
            console.error('Error creating notification:', error);
            return errorResponse(res, 'Error al crear notificación', 500);
        }
    }

    /**
     * Crear notificación para múltiples usuarios
     * POST /api/notifications/bulk
     */
    static async createBulkNotifications(req, res) {
        try {
            const { usuario_ids, tipo, titulo, mensaje, datos, enlace, prioridad } = req.body;

            // Validaciones
            if (!usuario_ids || !Array.isArray(usuario_ids) || usuario_ids.length === 0) {
                return errorResponse(res, 'Se requiere un array de usuario_ids', 400);
            }

            if (!tipo || !titulo || !mensaje) {
                return errorResponse(res, 'Faltan campos requeridos', 400);
            }

            // Crear notificaciones en BD (WebSocket deshabilitado)
            const results = [];
            for (const userId of usuario_ids) {
                try {
                    const id = await NotificationModel.createNotification({
                        usuario_id: userId,
                        tipo,
                        titulo,
                        mensaje,
                        datos,
                        enlace,
                        prioridad
                    });
                    results.push({ success: true, userId, id });
                } catch (error) {
                    results.push({ success: false, userId, error: error.message });
                }
            }

            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            return successResponse(res, {
                total: results.length,
                successful,
                failed,
                results
            }, `Notificaciones enviadas: ${successful} exitosas, ${failed} fallidas`, 201);

        } catch (error) {
            console.error('Error creating bulk notifications:', error);
            return errorResponse(res, 'Error al crear notificaciones', 500);
        }
    }

    /**
     * Obtener estadísticas de notificaciones del usuario
     * GET /api/notifications/stats
     */
    static async getStats(req, res) {
        try {
            const userId = req.user.id;
            const stats = await NotificationModel.getUserNotificationStats(userId);

            return successResponse(res, stats, 'Estadísticas obtenidas exitosamente');

        } catch (error) {
            console.error('Error getting notification stats:', error);
            return errorResponse(res, 'Error al obtener estadísticas', 500);
        }
    }

    /**
     * Obtener estadísticas de WebSocket (solo admin)
     * GET /api/notifications/websocket-stats
     * DESHABILITADO - requiere socket.io
     */
    static async getWebSocketStats(req, res) {
        try {
            // const stats = WebSocketService.getStats();
            return errorResponse(res, 'WebSocket deshabilitado - requiere socket.io', 503);

            // return successResponse(res, stats, 'Estadísticas de WebSocket obtenidas');

        } catch (error) {
            console.error('Error getting WebSocket stats:', error);
            return errorResponse(res, 'Error al obtener estadísticas', 500);
        }
    }

    /**
     * Enviar notificación de prueba (solo admin en desarrollo)
     * POST /api/notifications/test
     */
    static async sendTestNotification(req, res) {
        try {
            if (process.env.NODE_ENV !== 'development') {
                return errorResponse(res, 'Solo disponible en desarrollo', 403);
            }

            const userId = req.user.id;

            // WebSocket deshabilitado - crear en BD directamente
            await NotificationModel.createNotification({
                usuario_id: userId,
                tipo: 'sistema',
                titulo: 'Notificación de Prueba',
                mensaje: 'Esta es una notificación de prueba del sistema en tiempo real.',
                datos: { test: true, timestamp: new Date().toISOString() },
                prioridad: 'media'
            });

            return successResponse(res, null, 'Notificación de prueba enviada');

        } catch (error) {
            console.error('Error sending test notification:', error);
            return errorResponse(res, 'Error al enviar notificación de prueba', 500);
        }
    }
}

module.exports = NotificationController;
