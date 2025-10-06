const router = require('express').Router();
const { getAll } = require('../controllers/CalificacionesController');

// GET /api/calificaciones - Obtener todas las calificaciones agrupadas por agendamiento
router.get('/', getAll);

module.exports = router;
