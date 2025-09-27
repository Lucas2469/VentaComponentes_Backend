const Stats = require('../models/statsModel');

async function getDashboardStats(req, res) {
  try {
    const [
      usuariosActivosNoAdmin,
      productosActivos,
      agendamientosCompletados,
      productosUltimos7Dias,
      solicitudesCreditosPorEstado,
      ingresosPorPaquete,
    ] = await Promise.all([
      Stats.getActiveNonAdminUsersCount(),
      Stats.getActiveProductsCount(),
      Stats.getCompletedAppointmentsCount(),
      Stats.getProductsLast7DaysCount(),
      Stats.getCreditRequestsByStatus(),
      Stats.getRevenueByPack(),
    ]);

    res.json({
      usuariosActivosNoAdmin,
      productosActivos,
      agendamientosCompletados,
      productosUltimos7Dias,
      solicitudesCreditosPorEstado,
      ingresosPorPaquete,
    });
  } catch (err) {
    console.error('[stats] error:', err);
    res.status(500).json({ message: 'Error obteniendo estadísticas' });
  }
}

module.exports = { getDashboardStats };
