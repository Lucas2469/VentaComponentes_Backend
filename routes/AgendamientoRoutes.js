const express = require('express');
const router = express.Router();
const agendamientoController = require('../controllers/AgendamientoController');

// Crear agendamiento
router.post('/', agendamientoController.crearAgendamiento);

// Obtener agendamientos del vendedor
router.get('/vendedor/:vendedorId', agendamientoController.getAgendamientosVendedor);

// Obtener agendamientos del comprador
router.get('/comprador/:compradorId', agendamientoController.getAgendamientosComprador);

// Rechazar agendamiento
router.put('/:id/reject', agendamientoController.rechazarAgendamiento);

// Completar agendamiento
router.put('/:id/complete', agendamientoController.completarAgendamiento);

module.exports = router;