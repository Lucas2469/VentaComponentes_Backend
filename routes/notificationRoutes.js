const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

/**
 * Rutas de notificaciones
 * Todas las rutas requieren autenticación
 */

// Obtener notificaciones del usuario
router.get('/', authenticateToken, NotificationController.getUserNotifications);

// Obtener conteo de no leídas
router.get('/unread-count', authenticateToken, NotificationController.getUnreadCount);

// Obtener estadísticas del usuario
router.get('/stats', authenticateToken, NotificationController.getStats);

// Obtener estadísticas de WebSocket (admin)
router.get('/websocket-stats', authenticateToken, requireAdmin, NotificationController.getWebSocketStats);

// Marcar todas como leídas
router.put('/mark-all-read', authenticateToken, NotificationController.markAllAsRead);

// Marcar notificación como leída
router.put('/:id/read', authenticateToken, NotificationController.markAsRead);

// Eliminar notificaciones leídas
router.delete('/read', authenticateToken, NotificationController.deleteAllRead);

// Eliminar notificación específica
router.delete('/:id', authenticateToken, NotificationController.deleteNotification);

// Crear notificación (admin)
router.post('/', authenticateToken, requireAdmin, NotificationController.createNotification);

// Crear notificaciones en masa (admin)
router.post('/bulk', authenticateToken, requireAdmin, NotificationController.createBulkNotifications);

// Enviar notificación de prueba (desarrollo)
router.post('/test', authenticateToken, NotificationController.sendTestNotification);

module.exports = router;
