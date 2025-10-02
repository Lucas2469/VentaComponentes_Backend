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

/**
 * Obtener agendamientos donde el usuario es vendedor
 */
async function getAgendamientosByVendedor(vendedorId, estado = null) {
  const connection = await db.getConnection();

  try {
    let query = `
      SELECT
        a.*,
        p.nombre as producto_nombre,
        p.precio as producto_precio,
        CONCAT(u_comprador.nombre, ' ', u_comprador.apellido) as comprador_nombre,
        u_comprador.telefono as comprador_telefono,
        pe.nombre as punto_encuentro_nombre,
        pe.direccion as punto_encuentro_direccion,
        pe.referencias as punto_encuentro_referencias
      FROM agendamientos a
      JOIN productos p ON a.producto_id = p.id
      JOIN usuarios u_comprador ON a.comprador_id = u_comprador.id
      JOIN puntos_encuentro pe ON a.punto_encuentro_id = pe.id
      WHERE a.vendedor_id = ?
    `;

    const params = [vendedorId];

    if (estado) {
      query += ' AND a.estado = ?';
      params.push(estado);
    }

    query += ' ORDER BY a.fecha_cita DESC, a.hora_cita DESC';

    const [agendamientos] = await connection.query(query, params);

    return agendamientos;
  } catch (error) {
    console.error('Error al obtener agendamientos del vendedor:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Obtener agendamientos donde el usuario es comprador
 */
async function getAgendamientosByComprador(compradorId, estado = null) {
  const connection = await db.getConnection();

  try {
    let query = `
      SELECT
        a.*,
        p.nombre as producto_nombre,
        p.precio as producto_precio,
        CONCAT(u_vendedor.nombre, ' ', u_vendedor.apellido) as vendedor_nombre,
        u_vendedor.telefono as vendedor_telefono,
        pe.nombre as punto_encuentro_nombre,
        pe.direccion as punto_encuentro_direccion,
        pe.referencias as punto_encuentro_referencias
      FROM agendamientos a
      JOIN productos p ON a.producto_id = p.id
      JOIN usuarios u_vendedor ON a.vendedor_id = u_vendedor.id
      JOIN puntos_encuentro pe ON a.punto_encuentro_id = pe.id
      WHERE a.comprador_id = ?
    `;

    const params = [compradorId];

    if (estado) {
      query += ' AND a.estado = ?';
      params.push(estado);
    }

    query += ' ORDER BY a.fecha_cita DESC, a.hora_cita DESC';

    const [agendamientos] = await connection.query(query, params);

    return agendamientos;
  } catch (error) {
    console.error('Error al obtener agendamientos del comprador:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Actualizar estado de agendamiento (para rechazar o completar)
async function actualizarEstadoAgendamiento(agendamientoId, nuevoEstado, datosAdicionales = {}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Obtener datos del agendamiento y comprador
    const [agendamiento] = await connection.query(`
      SELECT a.*, p.nombre as producto_nombre, p.vendedor_id,
             CONCAT(u.nombre, ' ', u.apellido) as comprador_nombre
      FROM agendamientos a
      JOIN productos p ON a.producto_id = p.id
      JOIN usuarios u ON a.comprador_id = u.id
      WHERE a.id = ?
    `, [agendamientoId]);

    if (agendamiento.length === 0) {
      await connection.rollback();
      return { success: false, error: 'Agendamiento no encontrado' };
    }

    const agendamientoData = agendamiento[0];

    // Preparar campos a actualizar
    let campos = ['estado = ?', 'fecha_actualizacion = NOW()'];
    let valores = [nuevoEstado];

    // Agregar campos adicionales si existen
    if (datosAdicionales.motivo_cancelacion) {
      campos.push('motivo_cancelacion = ?');
      valores.push(datosAdicionales.motivo_cancelacion);
    }

    if (nuevoEstado === 'completado') {
      campos.push('fecha_completado = NOW()');
    }

    // Ejecutar la actualización
    await connection.query(`
      UPDATE agendamientos
      SET ${campos.join(', ')}
      WHERE id = ?
    `, [...valores, agendamientoId]);

    // Crear notificación al comprador
    let mensajeNotificacion = '';
    let tipoNotificacion = 'agendamiento';

    if (nuevoEstado === 'cancelado') {
      mensajeNotificacion = `Tu cita para el producto "${agendamientoData.producto_nombre}" ha sido rechazada por el vendedor.`;
      if (datosAdicionales.motivo_cancelacion) {
        mensajeNotificacion += ` Motivo: ${datosAdicionales.motivo_cancelacion}`;
      }
    } else if (nuevoEstado === 'completado') {
      mensajeNotificacion = `La transacción del producto "${agendamientoData.producto_nombre}" se ha completado exitosamente. ¡No olvides calificar tu experiencia!`;
    }

    if (mensajeNotificacion) {
      await connection.query(`
        INSERT INTO notificaciones (usuario_id, remitente_id, titulo, mensaje, tipo_notificacion)
        VALUES (?, ?, ?, ?, ?)
      `, [
        agendamientoData.comprador_id,
        agendamientoData.vendedor_id,
        nuevoEstado === 'cancelado' ? 'Cita rechazada' : 'Transacción completada',
        mensajeNotificacion,
        tipoNotificacion
      ]);
    }

    await connection.commit();

    return {
      success: true,
      message: `Agendamiento ${nuevoEstado} exitosamente`,
      data: { id: agendamientoId, estado: nuevoEstado }
    };

  } catch (error) {
    await connection.rollback();
    console.error('Error al actualizar estado del agendamiento:', error);
    return { success: false, error: `Error al actualizar agendamiento: ${error.message}` };
  } finally {
    connection.release();
  }
}

module.exports = {
  crearAgendamiento,
  getAgendamientosByVendedor,
  getAgendamientosByComprador,
  actualizarEstadoAgendamiento
};