const express = require('express');
const router = express.Router();
const calificacionController = require('../controllers/CalificacionController');

// Crear nueva calificación
router.post('/', calificacionController.crearCalificacion);

// Obtener calificaciones de un producto
router.get('/producto/:productoId', calificacionController.obtenerCalificacionesProducto);

// Obtener calificaciones de un usuario
router.get('/usuario/:usuarioId', calificacionController.obtenerCalificacionesUsuario);

// Verificar si ya existe calificación
router.get('/check/:agendamientoId/:calificadorId/:tipoCalificacion', calificacionController.verificarCalificacionExistente);

module.exports = router;