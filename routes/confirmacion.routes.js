const router = require('express').Router();
const { confirmar } = require('../controllers/ConfirmacionAgendaController');

// POST /confirmacion/:id
router.post('/:id', confirmar);

module.exports = router;
