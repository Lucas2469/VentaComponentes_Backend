const router = require('express').Router();
const { getAll, getByUsuario } = require('../controllers/CalificacionesController');

// GET /api/calificaciones - Obtener todas las calificaciones agrupadas por agendamiento
router.get('/', getAll);

// GET /api/calificaciones/usuario/:usuarioId - Obtener calificaciones recibidas por un usuario
router.get('/usuario/:usuarioId', getByUsuario);

module.exports = router;
