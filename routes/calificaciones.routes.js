const router    = require('express').Router();
const { getAll, create, update, remove } = require('../controllers/CalificacionesController');

// GET /api/calificaciones
router.get('/', getAll);

// POST /api/calificaciones
router.post('/', create);

// PUT /api/calificaciones/:id
router.put('/:id', update);

// DELETE /api/calificaciones/:id
router.delete('/:id', remove);

module.exports = router;
