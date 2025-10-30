const db = require('../database');

// Crear una nueva calificación
const createRating = async (req, res) => {
  const {
    producto_id,
    agendamiento_id,
    calificador_id,
    calificado_id,
    tipo_calificacion,
    calificacion,
    comentario
  } = req.body;

  try {
    // Validar que la calificación esté entre 1 y 5
    if (!calificacion || calificacion < 1 || calificacion > 5) {
      return res.status(400).json({
        message: 'La calificación debe estar entre 1 y 5'
      });
    }

    // Validar tipo de calificación
    if (!['comprador_a_vendedor', 'vendedor_a_comprador'].includes(tipo_calificacion)) {
      return res.status(400).json({
        message: 'Tipo de calificación inválido'
      });
    }

    // Verificar que el agendamiento existe y está confirmado
    const [agendamiento] = await db.execute(
      'SELECT * FROM agendamientos WHERE id = ? AND estado IN ("confirmado", "completado")',
      [agendamiento_id]
    );

    if (agendamiento.length === 0) {
      return res.status(404).json({
        message: 'Agendamiento no encontrado o no está confirmado'
      });
    }

    const agendamientoData = agendamiento[0];

    // Verificar que el usuario puede calificar (es parte del agendamiento)
    const isValidRater = (
      (tipo_calificacion === 'comprador_a_vendedor' && calificador_id === agendamientoData.comprador_id) ||
      (tipo_calificacion === 'vendedor_a_comprador' && calificador_id === agendamientoData.vendedor_id)
    );

    if (!isValidRater) {
      return res.status(403).json({
        message: 'No tienes permisos para crear esta calificación'
      });
    }

    // Verificar que no haya calificado anteriormente
    const [existingRating] = await db.execute(
      'SELECT id FROM calificaciones WHERE agendamiento_id = ? AND calificador_id = ? AND tipo_calificacion = ?',
      [agendamiento_id, calificador_id, tipo_calificacion]
    );

    if (existingRating.length > 0) {
      return res.status(400).json({
        message: 'Ya has calificado en este agendamiento'
      });
    }

    // Verificar que han pasado al menos 0 minutos desde la hora del encuentro (MODO PRUEBAS)
    const fechaHoraEncuentro = new Date(`${agendamientoData.fecha_cita}T${agendamientoData.hora_cita}`);
    const tiempoEspera = 0 * 60 * 1000; // 0 minutos para pruebas
    const ahoraMs = Date.now();
    const encuentroMs = fechaHoraEncuentro.getTime();

    if (ahoraMs < (encuentroMs + tiempoEspera)) {
      const minutosRestantes = Math.ceil((encuentroMs + tiempoEspera - ahoraMs) / (60 * 1000));
      return res.status(400).json({
        message: `Debes esperar ${minutosRestantes} minutos más después del encuentro para poder calificar`
      });
    }

    // Crear la calificación
    const [result] = await db.execute(
      `INSERT INTO calificaciones
       (producto_id, agendamiento_id, calificador_id, calificado_id, tipo_calificacion, calificacion, comentario, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'activo')`,
      [producto_id, agendamiento_id, calificador_id, calificado_id, tipo_calificacion, calificacion, comentario || null]
    );

    // Verificar si ambos usuarios ya calificaron para marcar como completado
    const [allRatings] = await db.execute(
      'SELECT COUNT(*) as count FROM calificaciones WHERE agendamiento_id = ? AND estado = "activo"',
      [agendamiento_id]
    );

    // Si ya hay al menos una calificación, marcar el agendamiento como completado
    if (allRatings[0].count >= 1) {
      await db.execute(
        'UPDATE agendamientos SET estado = "completado", fecha_completado = CURRENT_TIMESTAMP WHERE id = ?',
        [agendamiento_id]
      );
    }

    // Actualizar calificación promedio del usuario calificado
    await updateUserAverageRating(calificado_id);

    // Verificar si ambos usuarios han calificado y completar agendamiento si es necesario
    await checkAndCompleteAppointment(agendamiento_id);

    // Obtener datos del calificador para la notificación
    console.log(`🔍 Buscando datos del calificador ID: ${calificador_id}`);
    const [calificadorData] = await db.execute(
      'SELECT nombre, apellido FROM usuarios WHERE id = ?',
      [calificador_id]
    );
    console.log(`📋 Datos del calificador encontrados:`, calificadorData);

    // Crear notificación automática para el usuario calificado
    console.log(`🎯 Intentando crear notificación para usuario calificado ID: ${calificado_id}`);
    if (calificadorData.length > 0) {
      const calificadorNombre = `${calificadorData[0].nombre} ${calificadorData[0].apellido}`;
      const estrellas = '⭐'.repeat(calificacion);
      const tipoTexto = tipo_calificacion === 'comprador_a_vendedor' ? 'como vendedor' : 'como comprador';

      const tituloNotificacion = `Nueva calificación recibida: ${estrellas}`;
      const mensajeNotificacion = `${calificadorNombre} te ha calificado con ${calificacion} estrella${calificacion !== 1 ? 's' : ''} ${tipoTexto}${comentario ? ': "' + comentario + '"' : ''}`;

      await db.execute(
        `INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo_notificacion, fecha_creacion, estado)
         VALUES (?, ?, ?, 'calificacion', NOW(), 'no_vista')`,
        [calificado_id, tituloNotificacion, mensajeNotificacion]
      );

      console.log(`✅ Notificación de calificación creada para usuario ${calificado_id}: ${tituloNotificacion}`);
    }

    // Obtener la calificación creada
    const [newRating] = await db.execute(
      'SELECT * FROM calificaciones WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Calificación creada exitosamente',
      rating: newRating[0]
    });

  } catch (error) {
    console.error('Error creating rating:', error);
    res.status(500).json({
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener calificaciones de un agendamiento
const getRatingsByAppointment = async (req, res) => {
  const { agendamientoId } = req.params;

  try {
    const [ratings] = await db.execute(
      `SELECT c.*,
              calificador.nombre as calificador_nombre,
              calificador.apellido as calificador_apellido,
              calificado.nombre as calificado_nombre,
              calificado.apellido as calificado_apellido
       FROM calificaciones c
       JOIN usuarios calificador ON c.calificador_id = calificador.id
       JOIN usuarios calificado ON c.calificado_id = calificado.id
       WHERE c.agendamiento_id = ? AND c.estado = 'activo'
       ORDER BY c.fecha_comentario DESC`,
      [agendamientoId]
    );

    res.json(ratings);
  } catch (error) {
    console.error('Error fetching ratings:', error);
    res.status(500).json({
      message: 'Error al obtener calificaciones',
      error: error.message
    });
  }
};

// Obtener calificaciones con detalles del agendamiento (para las páginas de citas)
const getRatingsWithAppointmentDetails = async (req, res) => {
  const { agendamientoId } = req.params;

  try {
    const [ratingsData] = await db.execute(
      `SELECT
         a.id as agendamiento_id,
         a.producto_id,
         p.nombre as producto_nombre,
         a.comprador_id,
         CONCAT(comprador.nombre, ' ', comprador.apellido) as comprador_nombre,
         comprador.calificacion_promedio as comprador_promedio,
         a.vendedor_id,
         CONCAT(vendedor.nombre, ' ', vendedor.apellido) as vendedor_nombre,
         vendedor.calificacion_promedio as vendedor_promedio,
         a.fecha_cita,
         a.hora_cita,
         a.estado,

         -- Calificación del comprador al vendedor
         cv.calificacion as calificacion_comprador_a_vendedor,
         cv.comentario as comentario_comprador_a_vendedor,
         cv.fecha_comentario as fecha_calificacion_comprador,

         -- Calificación del vendedor al comprador
         vc.calificacion as calificacion_vendedor_a_comprador,
         vc.comentario as comentario_vendedor_a_comprador,
         vc.fecha_comentario as fecha_calificacion_vendedor

       FROM agendamientos a
       JOIN productos p ON a.producto_id = p.id
       JOIN usuarios comprador ON a.comprador_id = comprador.id
       JOIN usuarios vendedor ON a.vendedor_id = vendedor.id
       LEFT JOIN calificaciones cv ON a.id = cv.agendamiento_id
         AND cv.tipo_calificacion = 'comprador_a_vendedor'
         AND cv.estado = 'activo'
       LEFT JOIN calificaciones vc ON a.id = vc.agendamiento_id
         AND vc.tipo_calificacion = 'vendedor_a_comprador'
         AND vc.estado = 'activo'
       WHERE a.id = ?`,
      [agendamientoId]
    );

    if (ratingsData.length === 0) {
      return res.status(404).json({
        message: 'Agendamiento no encontrado'
      });
    }

    const appointmentData = ratingsData[0];

    // Estructurar la respuesta
    const result = {
      agendamiento: {
        id: appointmentData.agendamiento_id,
        producto_id: appointmentData.producto_id,
        producto_nombre: appointmentData.producto_nombre,
        fecha_cita: appointmentData.fecha_cita,
        hora_cita: appointmentData.hora_cita,
        estado: appointmentData.estado
      },
      comprador: {
        id: appointmentData.comprador_id,
        nombre: appointmentData.comprador_nombre,
        calificacion_promedio: appointmentData.comprador_promedio
      },
      vendedor: {
        id: appointmentData.vendedor_id,
        nombre: appointmentData.vendedor_nombre,
        calificacion_promedio: appointmentData.vendedor_promedio
      },
      calificaciones: {
        comprador_a_vendedor: appointmentData.calificacion_comprador_a_vendedor ? {
          calificacion: appointmentData.calificacion_comprador_a_vendedor,
          comentario: appointmentData.comentario_comprador_a_vendedor,
          fecha: appointmentData.fecha_calificacion_comprador
        } : null,
        vendedor_a_comprador: appointmentData.calificacion_vendedor_a_comprador ? {
          calificacion: appointmentData.calificacion_vendedor_a_comprador,
          comentario: appointmentData.comentario_vendedor_a_comprador,
          fecha: appointmentData.fecha_calificacion_vendedor
        } : null
      }
    };

    res.json(result);

  } catch (error) {
    console.error('Error fetching appointment ratings:', error);
    res.status(500).json({
      message: 'Error al obtener detalles de calificaciones',
      error: error.message
    });
  }
};

// Obtener calificaciones pendientes para un usuario
const getPendingRatings = async (req, res) => {
  const { userId } = req.params;

  try {
    console.log(`\n🔍 [getPendingRatings] Buscando calificaciones pendientes para usuario: ${userId}`);

    // Primero, verificar cuántas citas confirmadas tiene este usuario
    // IMPORTANTE: Convertir NOW() a UTC-4 (Bolivia) para comparación correcta de timezone
    const [confirmadas] = await db.execute(
      `SELECT a.id, a.fecha_cita, a.hora_cita, a.estado, a.comprador_id, a.vendedor_id,
              TIMESTAMPDIFF(MINUTE, CONCAT(a.fecha_cita, ' ', a.hora_cita), CONVERT_TZ(NOW(), '+00:00', '-04:00')) as minutes_since
       FROM agendamientos a
       WHERE a.estado IN ('confirmado', 'completado')
         AND (a.comprador_id = ? OR a.vendedor_id = ?)`,
      [userId, userId]
    );

    console.log(`📋 Citas confirmadas/completadas para usuario ${userId}:`, confirmadas.length);
    if (confirmadas.length > 0) {
      confirmadas.forEach(c => {
        console.log(`   - ID: ${c.id}, Estado: ${c.estado}, Fecha: ${c.fecha_cita}, Hora: ${c.hora_cita}, Minutos pasados: ${c.minutes_since}`);
      });
    }

    // Buscar agendamientos confirmados donde el usuario puede calificar
    // y han pasado al menos 0 minutos desde el encuentro (para testing)
    const [pendingRatings] = await db.execute(
      `SELECT
         a.id as agendamiento_id,
         a.producto_id,
         p.nombre as producto_nombre,
         a.comprador_id,
         CONCAT(comprador.nombre, ' ', comprador.apellido) as comprador_nombre,
         a.vendedor_id,
         CONCAT(vendedor.nombre, ' ', vendedor.apellido) as vendedor_nombre,
         a.fecha_cita,
         a.hora_cita,
         TIMESTAMPDIFF(MINUTE, CONCAT(a.fecha_cita, ' ', a.hora_cita), CONVERT_TZ(NOW(), '+00:00', '-04:00')) as minutes_since_meeting,

         -- Verificar si puede calificar como vendedor (si es el vendedor y no ha calificado al comprador)
         CASE
           WHEN a.vendedor_id = ? AND NOT EXISTS (
             SELECT 1 FROM calificaciones
             WHERE agendamiento_id = a.id
             AND calificador_id = ?
             AND tipo_calificacion = 'vendedor_a_comprador'
             AND estado = 'activo'
           ) THEN 1
           ELSE 0
         END as can_rate_buyer,

         -- Verificar si puede calificar como comprador (si es el comprador y no ha calificado al vendedor)
         CASE
           WHEN a.comprador_id = ? AND NOT EXISTS (
             SELECT 1 FROM calificaciones
             WHERE agendamiento_id = a.id
             AND calificador_id = ?
             AND tipo_calificacion = 'comprador_a_vendedor'
             AND estado = 'activo'
           ) THEN 1
           ELSE 0
         END as can_rate_vendor

       FROM agendamientos a
       JOIN productos p ON a.producto_id = p.id
       JOIN usuarios comprador ON a.comprador_id = comprador.id
       JOIN usuarios vendedor ON a.vendedor_id = vendedor.id
       WHERE a.estado IN ('confirmado', 'completado')
         AND (a.comprador_id = ? OR a.vendedor_id = ?)
         AND TIMESTAMPDIFF(MINUTE, CONCAT(a.fecha_cita, ' ', a.hora_cita), CONVERT_TZ(NOW(), '+00:00', '-04:00')) >= 0
       HAVING can_rate_buyer = 1 OR can_rate_vendor = 1
       ORDER BY a.fecha_cita DESC, a.hora_cita DESC`,
      [userId, userId, userId, userId, userId, userId]
    );

    console.log(`✅ Calificaciones pendientes encontradas: ${pendingRatings.length}`);
    if (pendingRatings.length > 0) {
      pendingRatings.forEach(p => {
        console.log(`   - ID: ${p.agendamiento_id}, Producto: ${p.producto_nombre}, can_rate_buyer: ${p.can_rate_buyer}, can_rate_vendor: ${p.can_rate_vendor}`);
      });
    }

    res.json(pendingRatings);
  } catch (error) {
    console.error('Error fetching pending ratings:', error);
    res.status(500).json({
      message: 'Error al obtener calificaciones pendientes',
      error: error.message
    });
  }
};

// Verificar si un usuario puede calificar
const canUserRate = async (req, res) => {
  const { agendamientoId, userId, tipoCalificacion } = req.params;

  try {
    // Verificar que el agendamiento existe y está confirmado
    const [agendamiento] = await db.execute(
      'SELECT * FROM agendamientos WHERE id = ? AND estado = "confirmado"',
      [agendamientoId]
    );

    if (agendamiento.length === 0) {
      return res.json({ canRate: false, reason: 'Agendamiento no encontrado o no confirmado' });
    }

    const agendamientoData = agendamiento[0];

    // Verificar que el usuario es parte del agendamiento
    const isPartOfAppointment = (
      userId == agendamientoData.comprador_id || userId == agendamientoData.vendedor_id
    );

    if (!isPartOfAppointment) {
      return res.json({ canRate: false, reason: 'No eres parte de este agendamiento' });
    }

    // Verificar que el tipo de calificación es válido para este usuario
    const isValidType = (
      (tipoCalificacion === 'comprador_a_vendedor' && userId == agendamientoData.comprador_id) ||
      (tipoCalificacion === 'vendedor_a_comprador' && userId == agendamientoData.vendedor_id)
    );

    if (!isValidType) {
      return res.json({ canRate: false, reason: 'Tipo de calificación inválido para tu rol' });
    }

    // Verificar que no haya calificado anteriormente
    const [existingRating] = await db.execute(
      'SELECT id FROM calificaciones WHERE agendamiento_id = ? AND calificador_id = ? AND tipo_calificacion = ?',
      [agendamientoId, userId, tipoCalificacion]
    );

    if (existingRating.length > 0) {
      return res.json({ canRate: false, reason: 'Ya has calificado en este agendamiento' });
    }

    // Verificar que han pasado al menos 0 minutos (MODO PRUEBAS)
    const fechaHoraEncuentro = new Date(`${agendamientoData.fecha_cita}T${agendamientoData.hora_cita}`);
    const tiempoEspera = 0 * 60 * 1000; // 0 minutos para pruebas
    const ahoraMs = Date.now();
    const encuentroMs = fechaHoraEncuentro.getTime();

    if (ahoraMs < (encuentroMs + tiempoEspera)) {
      const minutosRestantes = Math.ceil((encuentroMs + tiempoEspera - ahoraMs) / (60 * 1000));
      return res.json({
        canRate: false,
        reason: `Debes esperar ${minutosRestantes} minutos más después del encuentro`
      });
    }

    res.json({ canRate: true });

  } catch (error) {
    console.error('Error checking rating permission:', error);
    res.status(500).json({
      message: 'Error al verificar permisos de calificación',
      error: error.message
    });
  }
};

// Obtener calificaciones de un usuario
const getUserRatings = async (req, res) => {
  const { userId } = req.params;

  try {
    const [ratings] = await db.execute(
      `SELECT c.*,
              p.nombre as producto_nombre,
              calificador.nombre as calificador_nombre,
              calificador.apellido as calificador_apellido
       FROM calificaciones c
       JOIN productos p ON c.producto_id = p.id
       JOIN usuarios calificador ON c.calificador_id = calificador.id
       WHERE c.calificado_id = ? AND c.estado = 'activo'
       ORDER BY c.fecha_comentario DESC`,
      [userId]
    );

    res.json(ratings);
  } catch (error) {
    console.error('Error fetching user ratings:', error);
    res.status(500).json({
      message: 'Error al obtener calificaciones del usuario',
      error: error.message
    });
  }
};

// Verificar alertas de calificaciones pendientes
const checkPendingRatingsAlert = async (req, res) => {
  const { userId } = req.params;

  try {
    const [pendingRatings] = await db.execute(
      `SELECT
         COUNT(*) as total_pending,
         MAX(TIMESTAMPDIFF(MINUTE, CONCAT(a.fecha_cita, ' ', a.hora_cita), CONVERT_TZ(NOW(), '+00:00', '-04:00'))) as oldest_minutes
       FROM agendamientos a
       WHERE a.estado IN ('confirmado', 'completado')
         AND (a.comprador_id = ? OR a.vendedor_id = ?)
         AND TIMESTAMPDIFF(MINUTE, CONCAT(a.fecha_cita, ' ', a.hora_cita), CONVERT_TZ(NOW(), '+00:00', '-04:00')) >= 0
         AND (
           (a.vendedor_id = ? AND NOT EXISTS (
             SELECT 1 FROM calificaciones
             WHERE agendamiento_id = a.id
             AND calificador_id = ?
             AND tipo_calificacion = 'vendedor_a_comprador'
             AND estado = 'activo'
           ))
           OR
           (a.comprador_id = ? AND NOT EXISTS (
             SELECT 1 FROM calificaciones
             WHERE agendamiento_id = a.id
             AND calificador_id = ?
             AND tipo_calificacion = 'comprador_a_vendedor'
             AND estado = 'activo'
           ))
         )`,
      [userId, userId, userId, userId, userId, userId]
    );

    const result = pendingRatings[0];

    res.json({
      hasPendingRatings: result.total_pending > 0,
      count: result.total_pending || 0,
      oldestMinutes: result.oldest_minutes || 0
    });

  } catch (error) {
    console.error('Error checking pending ratings alert:', error);
    res.status(500).json({
      message: 'Error al verificar alertas de calificaciones',
      error: error.message
    });
  }
};

// Función helper para actualizar el promedio de calificaciones de un usuario
// Función para verificar si ambos usuarios han calificado y completar agendamiento
const checkAndCompleteAppointment = async (agendamientoId) => {
  try {
    // Verificar si existen ambas calificaciones
    const [ratingsCheck] = await db.execute(
      `SELECT
         COUNT(CASE WHEN tipo_calificacion = 'comprador_a_vendedor' THEN 1 END) as comprador_califico,
         COUNT(CASE WHEN tipo_calificacion = 'vendedor_a_comprador' THEN 1 END) as vendedor_califico
       FROM calificaciones
       WHERE agendamiento_id = ? AND estado = 'activo'`,
      [agendamientoId]
    );

    const { comprador_califico, vendedor_califico } = ratingsCheck[0];

    // Si ambos han calificado, marcar agendamiento como completado
    if (comprador_califico > 0 && vendedor_califico > 0) {
      await db.execute(
        `UPDATE agendamientos
         SET estado = 'completado', fecha_completado = NOW(), fecha_actualizacion = NOW()
         WHERE id = ? AND estado = 'confirmado'`,
        [agendamientoId]
      );

      console.log(`✅ Agendamiento ${agendamientoId} completado automáticamente - ambos usuarios han calificado`);
    }
  } catch (error) {
    console.error('Error checking appointment completion:', error);
  }
};

const updateUserAverageRating = async (userId) => {
  try {
    const [averageResult] = await db.execute(
      `SELECT
         AVG(calificacion) as promedio,
         COUNT(*) as total_calificaciones
       FROM calificaciones
       WHERE calificado_id = ? AND estado = 'activo'`,
      [userId]
    );

    const promedio = averageResult[0].promedio || 0;
    const totalCalificaciones = averageResult[0].total_calificaciones || 0;

    // Actualizar el promedio en la tabla usuarios
    await db.execute(
      'UPDATE usuarios SET calificacion_promedio = ? WHERE id = ?',
      [promedio, userId]
    );

    console.log(`✅ Promedio actualizado para usuario ${userId}: ${parseFloat(promedio).toFixed(2)} (${totalCalificaciones} calificaciones)`);

  } catch (error) {
    console.error('Error actualizando promedio de calificaciones:', error);
  }
};

module.exports = {
  createRating,
  getRatingsByAppointment,
  getRatingsWithAppointmentDetails,
  getPendingRatings,
  canUserRate,
  getUserRatings,
  checkPendingRatingsAlert
};