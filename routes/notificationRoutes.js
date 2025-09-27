const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');

/**
 * Rutas para notificaciones
 */

// Crear nueva notificación
router.post('/', NotificationController.createNotification);

// Obtener notificaciones de un usuario
router.get('/user/:userId', NotificationController.getNotificationsByUser);

// Contar notificaciones no vistas de un usuario
router.get('/user/:userId/unread-count', NotificationController.getUnreadCount);

// Marcar notificación como vista
router.put('/:id/read', NotificationController.markNotificationAsRead);

// Eliminar notificación
router.delete('/:id', NotificationController.deleteNotification);

module.exports = router;