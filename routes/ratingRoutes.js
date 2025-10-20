const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');

// Crear una nueva calificación
router.post('/', ratingController.createRating);

// Obtener calificaciones de un agendamiento específico
router.get('/appointment/:agendamientoId', ratingController.getRatingsByAppointment);

// Obtener calificaciones con detalles completos del agendamiento
router.get('/appointment-details/:agendamientoId', ratingController.getRatingsWithAppointmentDetails);

// Obtener calificaciones pendientes para un usuario
router.get('/pending/:userId', ratingController.getPendingRatings);

// Verificar si un usuario puede calificar
router.get('/can-rate/:agendamientoId/:userId/:tipoCalificacion', ratingController.canUserRate);

// Obtener calificaciones de un usuario (recibidas)
router.get('/user/:userId', ratingController.getUserRatings);

// Verificar alertas de calificaciones pendientes
router.get('/alert/:userId', ratingController.checkPendingRatingsAlert);

module.exports = router;