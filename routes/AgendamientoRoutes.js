const express = require('express');
const router = express.Router();
const agendamientoController = require('../controllers/AgendamientoController');

router.post('/', agendamientoController.crearAgendamiento);

module.exports = router;