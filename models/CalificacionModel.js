const pool = require('../database');

// Crear nueva calificación
async function crearCalificacion(datosCalificacion) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const {
      producto_id,
      agendamiento_id,
      calificador_id,
      calificado_id,
      tipo_calificacion,
      calificacion,
      comentario
    } = datosCalificacion;

    // Verificar que no exista ya una calificación del mismo tipo para este agendamiento
    const [existente] = await connection.query(`
      SELECT id FROM calificaciones
      WHERE agendamiento_id = ? AND calificador_id = ? AND tipo_calificacion = ?
    `, [agendamiento_id, calificador_id, tipo_calificacion]);

    if (existente.length > 0) {
      await connection.rollback();
      return { success: false, error: 'Ya existe una calificación de este tipo para este agendamiento' };
    }

    // Crear la calificación
    const [result] = await connection.query(`
      INSERT INTO calificaciones (
        producto_id, agendamiento_id, calificador_id, calificado_id,
        tipo_calificacion, calificacion, comentario
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [producto_id, agendamiento_id, calificador_id, calificado_id, tipo_calificacion, calificacion, comentario]);

    const calificacionId = result.insertId;

    // Actualizar calificación promedio del usuario calificado
    await actualizarCalificacionPromedio(connection, calificado_id);

    await connection.commit();

    return {
      success: true,
      data: {
        id: calificacionId,
        producto_id,
        agendamiento_id,
        calificador_id,
        calificado_id,
        tipo_calificacion,
        calificacion,
        comentario
      }
    };

  } catch (error) {
    await connection.rollback();
    console.error('Error al crear calificación:', error);
    return { success: false, error: `Error al crear calificación: ${error.message}` };
  } finally {
    connection.release();
  }
}

// Función auxiliar para actualizar calificación promedio
async function actualizarCalificacionPromedio(connection, usuarioId) {
  const [promedio] = await connection.query(`
    SELECT AVG(calificacion) as promedio
    FROM calificaciones
    WHERE calificado_id = ? AND estado = 'activo'
  `, [usuarioId]);

  const nuevoPromedio = promedio[0].promedio || 0;

  await connection.query(`
    UPDATE usuarios
    SET calificacion_promedio = ?
    WHERE id = ?
  `, [nuevoPromedio, usuarioId]);
}

// Obtener calificaciones de un producto
async function obtenerCalificacionesPorProducto(productoId) {
  const connection = await pool.getConnection();

  try {
    const [calificaciones] = await connection.query(`
      SELECT
        c.*,
        CONCAT(u_calificador.nombre, ' ', u_calificador.apellido) as nombre_calificador,
        CONCAT(u_calificado.nombre, ' ', u_calificado.apellido) as nombre_calificado
      FROM calificaciones c
      JOIN usuarios u_calificador ON c.calificador_id = u_calificador.id
      JOIN usuarios u_calificado ON c.calificado_id = u_calificado.id
      WHERE c.producto_id = ? AND c.estado = 'activo'
      ORDER BY c.fecha_calificacion DESC
    `, [productoId]);

    return calificaciones;
  } catch (error) {
    console.error('Error al obtener calificaciones del producto:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Obtener calificaciones de un usuario (recibidas)
async function obtenerCalificacionesPorUsuario(usuarioId) {
  const connection = await pool.getConnection();

  try {
    const [calificaciones] = await connection.query(`
      SELECT
        c.*,
        CONCAT(u_calificador.nombre, ' ', u_calificador.apellido) as nombre_calificador,
        p.nombre as nombre_producto
      FROM calificaciones c
      JOIN usuarios u_calificador ON c.calificador_id = u_calificador.id
      JOIN productos p ON c.producto_id = p.id
      WHERE c.calificado_id = ? AND c.estado = 'activo'
      ORDER BY c.fecha_calificacion DESC
    `, [usuarioId]);

    return calificaciones;
  } catch (error) {
    console.error('Error al obtener calificaciones del usuario:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Verificar si ya existe una calificación
async function verificarCalificacionExistente(agendamientoId, calificadorId, tipoCalificacion) {
  const connection = await pool.getConnection();

  try {
    const [result] = await connection.query(`
      SELECT COUNT(*) as count
      FROM calificaciones
      WHERE agendamiento_id = ? AND calificador_id = ? AND tipo_calificacion = ?
    `, [agendamientoId, calificadorId, tipoCalificacion]);

    return result[0].count > 0;
  } catch (error) {
    console.error('Error al verificar calificación existente:', error);
    return false;
  } finally {
    connection.release();
  }
}

module.exports = {
  crearCalificacion,
  obtenerCalificacionesPorProducto,
  obtenerCalificacionesPorUsuario,
  verificarCalificacionExistente
};