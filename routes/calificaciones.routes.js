const router    = require('express').Router();
const { getAll } = require('../controllers/CalificacionesController');

// GET /api/calificaciones
router.get('/', getAll);

module.exports = router;
