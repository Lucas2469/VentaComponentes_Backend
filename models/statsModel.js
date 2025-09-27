const db = require('../database');
// 1 usuarios activos hay donde su rol no sea admin
async function getActiveNonAdminUsersCount() {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM usuarios
     WHERE estado = 'activo' AND tipo_usuario <> 'admin'`
  );
  return rows[0]?.total ?? 0;
}
// 2 productos publicados activos
async function getActiveProductsCount() {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM productos
     WHERE estado = 'activo'`
  );
  return rows[0]?.total ?? 0;
}
// 3 registros en la tabla de agendamientos con estado completado
async function getCompletedAppointmentsCount() {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM agendamientos
     WHERE estado = 'completado'`
  );
  return rows[0]?.total ?? 0;
}
// 4 productos publicados los ultimos 7 dias, contando el dia de hoy
async function getProductsLast7DaysCount() {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM productos
     WHERE fecha_publicacion >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       AND fecha_publicacion <  DATE_ADD(CURDATE(), INTERVAL 1 DAY)`
  );
  return rows[0]?.total ?? 0;
}
// 5 solicitudes de credito por estado (aprobada-pendiente-rechazada) 
async function getCreditRequestsByStatus() {
  const [rows] = await db.query(
    `SELECT estado, COUNT(*) AS total
     FROM transacciones_creditos
     GROUP BY estado`
  );

  const base = { aprobada: 0, pendiente: 0, rechazada: 0 };
  for (const r of rows) {
    const key = (r.estado || '').toLowerCase();
    if (key in base) base[key] = Number(r.total) || 0;
  }
  return base;
}
// 6 ingresos por paquete (solo transacciones aprobadas)
async function getRevenueByPack() {
  const [rows] = await db.query(
    `SELECT p.nombre AS pack, COALESCE(SUM(t.monto_pagado),0) AS total
     FROM transacciones_creditos t
     JOIN packs_creditos p ON p.id = t.pack_creditos_id
     WHERE t.estado = 'aprobada'
     GROUP BY p.id, p.nombre
     ORDER BY total DESC`
  );
  return rows.map(r => ({ pack: r.pack, total: Number(r.total) || 0 }));
}

module.exports = {
  getActiveNonAdminUsersCount,
  getActiveProductsCount,
  getCompletedAppointmentsCount,
  getProductsLast7DaysCount,
  getCreditRequestsByStatus,
  getRevenueByPack,
};
