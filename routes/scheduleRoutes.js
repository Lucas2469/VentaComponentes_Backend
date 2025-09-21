const express = require('express');
const router = express.Router();

const {
  createSchedule,
  getSchedulesByVendor,
  updateSchedules,
  deleteSchedules
} = require('../controllers/scheduleController');

// Crear horarios
router.post('/', createSchedule);

// Obtener horarios de un vendedor
router.get('/:vendedorId', getSchedulesByVendor);

// Actualizar todos los horarios de un vendedor
router.put('/:id', updateSchedules);

// Eliminar todos los horarios de un vendedor
router.delete('/:id', deleteSchedules);

module.exports = router;
