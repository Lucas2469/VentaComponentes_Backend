const db = require('../database');

async function crearAgendamiento({ producto_id, comprador_id, fecha_cita, hora_cita, cantidad_solicitada }) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Datos del producto y vendedor
    const [[producto]] = await conn.query(
      `SELECT p.id, p.vendedor_id, p.stock, p.estado, p.punto_encuentro_id,
              u.estado AS estado_vendedor
       FROM productos p
       JOIN usuarios u ON p.vendedor_id = u.id
       WHERE p.id = ?`, [producto_id]);

    if (!producto) {
      await conn.rollback(); conn.release();
      return { error: 'Producto no encontrado' };
    }

    if (producto.estado !== 'activo' || producto.estado_vendedor !== 'activo') {
      await conn.rollback(); conn.release();
      return { error: 'Producto o vendedor inactivo' };
    }

    if (producto.stock < cantidad_solicitada) {
      await conn.rollback(); conn.release();
      return { error: 'Stock insuficiente para la cantidad solicitada' };
    }

    // 2. Calcular el día de la semana tal como está en la BD (con acento y en minúsculas)
    const fechaObj = new Date(fecha_cita);
    const dia_semana = fechaObj
      .toLocaleDateString('es-ES', { weekday: 'long' })
      .toLowerCase(); // Ej: "lunes", "miércoles", "sábado"
      
    // 3. Validar horario del vendedor
    const [[horario]] = await conn.query(
      `SELECT * FROM horarios_vendedor
       WHERE vendedor_id = ? AND dia_semana = ? AND estado = 'activo'
         AND hora_inicio <= ? AND hora_fin >= ?
       LIMIT 1`,
       [producto.vendedor_id, dia_semana, hora_cita, hora_cita]);

    if (!horario) {
      await conn.rollback(); conn.release();
      return { error: 'La hora seleccionada no está dentro del horario del vendedor' };
    }

    // 4. Insertar agendamiento
    const [agendaResult] = await conn.query(
      `INSERT INTO agendamientos
        (producto_id, comprador_id, vendedor_id, punto_encuentro_id, fecha_cita, hora_cita, dia_semana, cantidad_solicitada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
       [producto_id, comprador_id, producto.vendedor_id, producto.punto_encuentro_id,
        fecha_cita, hora_cita, dia_semana, cantidad_solicitada]);

    const agendamiento_id = agendaResult.insertId;

    // 5. Crear notificación
    const [productoData] = await conn.query(`SELECT nombre FROM productos WHERE id = ?`, [producto_id]);
    const mensaje = `Tienes un nuevo agendamiento para el producto "${productoData[0].nombre}" el día ${fecha_cita} a las ${hora_cita}.`;

    await conn.query(
      `INSERT INTO notificaciones (usuario_id, remitente_id, titulo, mensaje, tipo_notificacion)
       VALUES (?, ?, ?, ?, 'agendamiento')`,
       [producto.vendedor_id, comprador_id, 'Nuevo Agendamiento', mensaje]);

    await conn.commit(); conn.release();

    return {
      id: agendamiento_id,
      producto_id, comprador_id,
      vendedor_id: producto.vendedor_id,
      punto_encuentro_id: producto.punto_encuentro_id,
      fecha_cita, hora_cita,
      dia_semana, cantidad_solicitada
    };
  } catch (err) {
    await conn.rollback(); conn.release();
    console.error(err);
    return { error: 'Error en la transacción' };
  }
}

module.exports = {
  crearAgendamiento
};
