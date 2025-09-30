const db = require('../database');

async function crearAgendamiento({ producto_id, comprador_id, fecha_cita, hora_cita, cantidad_solicitada, precio_total }) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    console.log('Iniciando transacción para agendamiento:', { producto_id, comprador_id, fecha_cita, hora_cita, cantidad_solicitada, precio_total });

    // 1. Validar que comprador_id y vendedor_id no sean el mismo
    const [[producto]] = await conn.query(
      `SELECT p.id, p.vendedor_id, p.stock, p.estado, p.punto_encuentro_id, p.nombre,
              u.estado AS estado_vendedor
       FROM productos p
       JOIN usuarios u ON p.vendedor_id = u.id
       WHERE p.id = ?`, [producto_id]);

    console.log('Producto encontrado:', producto);

    if (!producto) {
      await conn.rollback(); conn.release();
      return { error: 'Producto no encontrado' };
    }

    // ✅ VALIDACIÓN: Evitar autoagendamiento
    if (parseInt(comprador_id) === parseInt(producto.vendedor_id)) {
      await conn.rollback(); conn.release();
      return { error: 'No puedes agendarte con tu propio producto' };
    }

    if (producto.estado !== 'activo' || producto.estado_vendedor !== 'activo') {
      await conn.rollback(); conn.release();
      return { error: 'Producto o vendedor inactivo' };
    }

    // En el modelo de créditos, no validamos stock individual - se agenda el producto completo
    if (producto.stock <= 0) {
      await conn.rollback(); conn.release();
      return { error: 'Producto sin stock disponible' };
    }

    // 2. Obtener información del COMPRADOR (nombre y apellido)
    const [[comprador]] = await conn.query(
      `SELECT nombre, apellido FROM usuarios WHERE id = ?`,
      [comprador_id]
    );

    console.log('Comprador encontrado:', comprador);

    if (!comprador) {
      await conn.rollback(); conn.release();
      return { error: 'Comprador no encontrado' };
    }

    // 3. Calcular el día de la semana
    const fechaObjOriginal = new Date(fecha_cita + 'T00:00:00');
    const dia_semana = fechaObjOriginal.toLocaleDateString('es-ES', { weekday: 'long' }).toLowerCase();
    console.log('Fecha recibida:', fecha_cita);
    console.log('Fecha objeto:', fechaObjOriginal);
    console.log('Día de la semana calculado:', dia_semana);

    // 4. Validar horario del vendedor
    const [[horario]] = await conn.query(
      `SELECT * FROM horarios_vendedor
       WHERE vendedor_id = ? AND dia_semana = ? AND estado = 'activo'
         AND TIME(?) BETWEEN hora_inicio AND hora_fin
       LIMIT 1`,
       [producto.vendedor_id, dia_semana, hora_cita]);

    console.log('Hora recibida para comparación:', hora_cita);
    console.log('Horario encontrado:', horario);

    if (!horario) {
      await conn.rollback(); conn.release();
      return { error: `La hora seleccionada "${hora_cita}" no está dentro del horario del vendedor para ${dia_semana}` };
    }

    // 5. Obtener información del punto de encuentro para la notificación
    const [[puntoEncuentro]] = await conn.query(
      `SELECT nombre, direccion FROM puntos_encuentro WHERE id = ?`,
      [producto.punto_encuentro_id]
    );

    console.log('Punto de encuentro:', puntoEncuentro);

    // 6. Insertar agendamiento (sin cantidad_solicitada - modelo de créditos)
    const [agendaResult] = await conn.query(
      `INSERT INTO agendamientos
        (producto_id, comprador_id, vendedor_id, punto_encuentro_id, fecha_cita, hora_cita, dia_semana)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
       [producto_id, comprador_id, producto.vendedor_id, producto.punto_encuentro_id,
        fecha_cita, hora_cita, dia_semana]);

    const agendamiento_id = agendaResult.insertId;

    // 7. Crear notificación para el VENDEDOR con información completa incluyendo nombre del comprador
    const nombreComprador = `${comprador.nombre} ${comprador.apellido}`;
    const precioFormateado = new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB',
      minimumFractionDigits: 2
    }).format(precio_total);

    const mensaje = `${nombreComprador} está interesado en tu producto "${producto.nombre}" y ha agendado una cita para el día ${fecha_cita} a las ${hora_cita}.
📍 Punto de encuentro: ${puntoEncuentro ? puntoEncuentro.nombre : 'No especificado'}${puntoEncuentro && puntoEncuentro.direccion ? ` (${puntoEncuentro.direccion})` : ''}.
📦 Cantidad solicitada: ${cantidad_solicitada} unidad(es)
💰 Total del pedido: ${precioFormateado}`;

    await conn.query(
      `INSERT INTO notificaciones 
        (usuario_id, remitente_id, titulo, mensaje, tipo_notificacion, estado, prioridad)
       VALUES (?, ?, ?, ?, 'agendamiento', 'no_vista', 'normal')`,
       [producto.vendedor_id, comprador_id, 'Venta', mensaje]);

    console.log('Notificación creada para el vendedor ID:', producto.vendedor_id);

    await conn.commit(); 
    conn.release();
    
    console.log('Transacción completada, agendamiento ID:', agendamiento_id);

    return {
      id: agendamiento_id,
      producto_id,
      comprador_id,
      vendedor_id: producto.vendedor_id,
      punto_encuentro_id: producto.punto_encuentro_id,
      fecha_cita,
      hora_cita,
      dia_semana,
      nombre_comprador: nombreComprador
    };
  } catch (err) {
    await conn.rollback(); 
    conn.release();
    console.error('Error en la transacción:', err);
    return { error: `Error en la transacción: ${err.message}` };
  }
}

module.exports = {
  crearAgendamiento
};