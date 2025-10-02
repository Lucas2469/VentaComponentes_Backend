// controllers/CalificacionesController.js
const db = require('../database');

async function getAll(req, res) {
  try {
    // Query SQL equivalente al Sequelize con JOINs
    const [results] = await db.query(`
      SELECT
        c.id,
        c.calificacion,
        c.comentario,
        c.tipo_calificacion,
        c.fecha_comentario,

        -- Datos del calificador (vendedor o comprador)
        u_calificador.nombre AS calificador_nombre,
        u_calificador.apellido AS calificador_apellido,

        -- Datos del calificado (vendedor o comprador)
        u_calificado.nombre AS calificado_nombre,
        u_calificado.apellido AS calificado_apellido,

        -- Datos del agendamiento
        a.fecha_cita,
        a.hora_cita,

        -- Punto de encuentro
        pe.nombre AS punto_encuentro_nombre

      FROM calificaciones c
      JOIN agendamientos a ON c.agendamiento_id = a.id
      JOIN usuarios u_calificador ON c.calificador_id = u_calificador.id
      JOIN usuarios u_calificado ON c.calificado_id = u_calificado.id
      JOIN puntos_encuentro pe ON a.punto_encuentro_id = pe.id

      WHERE c.estado = 'activo'
      ORDER BY c.fecha_comentario DESC
    `);

    // Mapeo a la forma solicitada
    const mapped = results.map(item => ({
      vendedor: {
        nombre: item.tipo_calificacion === 'comprador_a_vendedor'
          ? item.calificado_nombre
          : item.calificador_nombre,
        apellido: item.tipo_calificacion === 'comprador_a_vendedor'
          ? item.calificado_apellido
          : item.calificador_apellido
      },
      comprador: {
        nombre: item.tipo_calificacion === 'comprador_a_vendedor'
          ? item.calificador_nombre
          : item.calificado_nombre,
        apellido: item.tipo_calificacion === 'comprador_a_vendedor'
          ? item.calificador_apellido
          : item.calificado_apellido
      },
      califCompradorAVendedor: item.tipo_calificacion === 'comprador_a_vendedor'
        ? item.calificacion
        : null,
      califVendedorAComprador: item.tipo_calificacion === 'vendedor_a_comprador'
        ? item.calificacion
        : null,
      fechaCita: item.fecha_cita,
      horaCita: item.hora_cita,
      puntoEncuentro: item.punto_encuentro_nombre,
      comentarioComprador: item.tipo_calificacion === 'comprador_a_vendedor'
        ? item.comentario
        : null,
      comentarioVendedor: item.tipo_calificacion === 'vendedor_a_comprador'
        ? item.comentario
        : null
    }));

    return res.json(mapped);
  } catch (err) {
    console.error('Error al obtener calificaciones:', err);
    return res.status(500).json({ message: 'Error al obtener calificaciones' });
  }
}

module.exports = { getAll };
