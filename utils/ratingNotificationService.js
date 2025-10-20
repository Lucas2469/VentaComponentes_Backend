const db = require('../database');

// Servicio para enviar notificaciones de recordatorio de calificación
class RatingNotificationService {

  // Verificar y enviar notificaciones para citas que necesitan calificación
  static async sendRatingReminders() {
    try {
      console.log('🔔 Verificando citas que necesitan calificación... (MODO PRUEBAS)');

      // Buscar agendamientos confirmados donde han pasado 0-5 minutos (MODO PRUEBAS)
      // y no se han enviado notificaciones de recordatorio
      const [appointmentsToNotify] = await db.execute(`
        SELECT
          a.id as agendamiento_id,
          a.producto_id,
          p.nombre as producto_nombre,
          a.comprador_id,
          CONCAT(comprador.nombre, ' ', comprador.apellido) as comprador_nombre,
          a.vendedor_id,
          CONCAT(vendedor.nombre, ' ', vendedor.apellido) as vendedor_nombre,
          a.fecha_cita,
          a.hora_cita,
          TIMESTAMPDIFF(MINUTE, CONCAT(a.fecha_cita, ' ', a.hora_cita), NOW()) as minutes_since_meeting
        FROM agendamientos a
        JOIN productos p ON a.producto_id = p.id
        JOIN usuarios comprador ON a.comprador_id = comprador.id
        JOIN usuarios vendedor ON a.vendedor_id = vendedor.id
        WHERE a.estado = 'confirmado'
          AND TIMESTAMPDIFF(MINUTE, CONCAT(a.fecha_cita, ' ', a.hora_cita), NOW()) BETWEEN 0 AND 5
          AND NOT EXISTS (
            SELECT 1 FROM notificaciones
            WHERE titulo LIKE '%calificar%'
            AND (usuario_id = a.comprador_id OR usuario_id = a.vendedor_id)
            AND DATE(fecha_creacion) = DATE(NOW())
            AND mensaje LIKE CONCAT('%', p.nombre, '%')
          )
      `);

      for (const appointment of appointmentsToNotify) {
        await this.createRatingNotifications(appointment);
      }

      console.log(`✅ Procesadas ${appointmentsToNotify.length} citas para notificaciones de calificación`);

    } catch (error) {
      console.error('❌ Error enviando recordatorios de calificación:', error);
    }
  }

  // Crear notificaciones para comprador y vendedor
  static async createRatingNotifications(appointment) {
    try {
      const {
        agendamiento_id,
        producto_nombre,
        comprador_id,
        comprador_nombre,
        vendedor_id,
        vendedor_nombre
      } = appointment;

      // Verificar qué usuarios pueden calificar
      const [vendorCanRate] = await db.execute(`
        SELECT COUNT(*) as can_rate FROM agendamientos a
        WHERE a.id = ?
        AND NOT EXISTS (
          SELECT 1 FROM calificaciones
          WHERE agendamiento_id = ?
          AND calificador_id = ?
          AND tipo_calificacion = 'vendedor_a_comprador'
          AND estado = 'activo'
        )
      `, [agendamiento_id, agendamiento_id, vendedor_id]);

      const [buyerCanRate] = await db.execute(`
        SELECT COUNT(*) as can_rate FROM agendamientos a
        WHERE a.id = ?
        AND NOT EXISTS (
          SELECT 1 FROM calificaciones
          WHERE agendamiento_id = ?
          AND calificador_id = ?
          AND tipo_calificacion = 'comprador_a_vendedor'
          AND estado = 'activo'
        )
      `, [agendamiento_id, agendamiento_id, comprador_id]);

      // Notificación para el vendedor si puede calificar al comprador
      if (vendorCanRate[0].can_rate > 0) {
        await db.execute(`
          INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo_notificacion, estado)
          VALUES (?, ?, ?, 'calificacion', 'no_vista')
        `, [
          vendedor_id,
          '⭐ ¡Es hora de calificar!',
          `Tu encuentro con ${comprador_nombre} para el producto "${producto_nombre}" ya terminó. ¡Comparte tu experiencia y califica al comprador! Tu opinión ayuda a mejorar la confianza en la comunidad.`
        ]);
      }

      // Notificación para el comprador si puede calificar al vendedor
      if (buyerCanRate[0].can_rate > 0) {
        await db.execute(`
          INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo_notificacion, estado)
          VALUES (?, ?, ?, 'calificacion', 'no_vista')
        `, [
          comprador_id,
          '⭐ ¡Es hora de calificar!',
          `Tu encuentro con ${vendedor_nombre} para el producto "${producto_nombre}" ya terminó. ¡Comparte tu experiencia y califica al vendedor! Tu opinión ayuda a otros compradores.`
        ]);
      }

      console.log(`📧 Notificaciones de calificación enviadas para agendamiento ${agendamiento_id}`);

    } catch (error) {
      console.error('Error creando notificaciones de calificación:', error);
    }
  }

  // Verificar citas muy antiguas sin calificar (más de 24 horas)
  static async sendUrgentRatingReminders() {
    try {
      console.log('🚨 Verificando citas urgentes sin calificar...');

      const [urgentAppointments] = await db.execute(`
        SELECT
          a.id as agendamiento_id,
          a.producto_id,
          p.nombre as producto_nombre,
          a.comprador_id,
          CONCAT(comprador.nombre, ' ', comprador.apellido) as comprador_nombre,
          a.vendedor_id,
          CONCAT(vendedor.nombre, ' ', vendedor.apellido) as vendedor_nombre,
          TIMESTAMPDIFF(HOUR, CONCAT(a.fecha_cita, ' ', a.hora_cita), NOW()) as hours_since_meeting
        FROM agendamientos a
        JOIN productos p ON a.producto_id = p.id
        JOIN usuarios comprador ON a.comprador_id = comprador.id
        JOIN usuarios vendedor ON a.vendedor_id = vendedor.id
        WHERE a.estado = 'confirmado'
          AND TIMESTAMPDIFF(HOUR, CONCAT(a.fecha_cita, ' ', a.hora_cita), NOW()) >= 24
          AND (
            NOT EXISTS (
              SELECT 1 FROM calificaciones
              WHERE agendamiento_id = a.id
              AND calificador_id = a.comprador_id
              AND tipo_calificacion = 'comprador_a_vendedor'
              AND estado = 'activo'
            )
            OR
            NOT EXISTS (
              SELECT 1 FROM calificaciones
              WHERE agendamiento_id = a.id
              AND calificador_id = a.vendedor_id
              AND tipo_calificacion = 'vendedor_a_comprador'
              AND estado = 'activo'
            )
          )
      `);

      for (const appointment of urgentAppointments) {
        await this.createUrgentRatingNotifications(appointment);
      }

      console.log(`⚠️ Procesadas ${urgentAppointments.length} citas urgentes para calificación`);

    } catch (error) {
      console.error('❌ Error enviando recordatorios urgentes:', error);
    }
  }

  // Crear notificaciones urgentes
  static async createUrgentRatingNotifications(appointment) {
    try {
      const {
        agendamiento_id,
        producto_nombre,
        comprador_id,
        comprador_nombre,
        vendedor_id,
        vendedor_nombre,
        hours_since_meeting
      } = appointment;

      // Verificar qué usuarios aún no han calificado
      const [vendorCanRate] = await db.execute(`
        SELECT COUNT(*) as can_rate FROM agendamientos a
        WHERE a.id = ?
        AND NOT EXISTS (
          SELECT 1 FROM calificaciones
          WHERE agendamiento_id = ?
          AND calificador_id = ?
          AND tipo_calificacion = 'vendedor_a_comprador'
          AND estado = 'activo'
        )
      `, [agendamiento_id, agendamiento_id, vendedor_id]);

      const [buyerCanRate] = await db.execute(`
        SELECT COUNT(*) as can_rate FROM agendamientos a
        WHERE a.id = ?
        AND NOT EXISTS (
          SELECT 1 FROM calificaciones
          WHERE agendamiento_id = ?
          AND calificador_id = ?
          AND tipo_calificacion = 'comprador_a_vendedor'
          AND estado = 'activo'
        )
      `, [agendamiento_id, agendamiento_id, comprador_id]);

      // Notificación urgente para el vendedor
      if (vendorCanRate[0].can_rate > 0) {
        await db.execute(`
          INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo_notificacion, estado)
          VALUES (?, ?, ?, 'calificacion', 'no_vista')
        `, [
          vendedor_id,
          '🚨 Calificación pendiente',
          `Han pasado ${hours_since_meeting} horas desde tu encuentro con ${comprador_nombre} para el producto "${producto_nombre}". ¡No olvides calificar tu experiencia! Las calificaciones ayudan a construir confianza en la comunidad.`
        ]);
      }

      // Notificación urgente para el comprador
      if (buyerCanRate[0].can_rate > 0) {
        await db.execute(`
          INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo_notificacion, estado)
          VALUES (?, ?, ?, 'calificacion', 'no_vista')
        `, [
          comprador_id,
          '🚨 Calificación pendiente',
          `Han pasado ${hours_since_meeting} horas desde tu encuentro con ${vendedor_nombre} para el producto "${producto_nombre}". ¡No olvides calificar tu experiencia! Tu opinión es valiosa para otros compradores.`
        ]);
      }

      console.log(`🚨 Notificaciones urgentes enviadas para agendamiento ${agendamiento_id}`);

    } catch (error) {
      console.error('Error creando notificaciones urgentes:', error);
    }
  }

  // Iniciar el servicio con intervalos automáticos
  static startService() {
    console.log('🚀 Iniciando servicio de notificaciones de calificación...');

    // Verificar cada 5 minutos para notificaciones normales
    setInterval(() => {
      this.sendRatingReminders();
    }, 5 * 60 * 1000); // 5 minutos

    // Verificar cada hora para notificaciones urgentes
    setInterval(() => {
      this.sendUrgentRatingReminders();
    }, 60 * 60 * 1000); // 1 hora

    // Ejecutar inmediatamente al iniciar
    this.sendRatingReminders();
    this.sendUrgentRatingReminders();
  }
}

module.exports = RatingNotificationService;