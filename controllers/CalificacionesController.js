// controllers/CalificacionesController.js
const db = require('../database');

async function getAll(req, res) {
  try {
    // Query SQL con JOINs para obtener todas las calificaciones
    const [results] = await db.query(`
      SELECT
        c.id,
        c.calificacion,
        c.comentario,
        c.tipo_calificacion,
        c.fecha_comentario,
        c.agendamiento_id,

        -- Datos del calificador
        u_calificador.id AS calificador_id,
        u_calificador.nombre AS calificador_nombre,
        u_calificador.apellido AS calificador_apellido,

        -- Datos del calificado
        u_calificado.id AS calificado_id,
        u_calificado.nombre AS calificado_nombre,
        u_calificado.apellido AS calificado_apellido,

        -- Datos del agendamiento
        a.fecha_cita,
        a.hora_cita,
        a.vendedor_id,
        a.comprador_id,

        -- Punto de encuentro
        pe.nombre AS punto_encuentro_nombre,
        pe.direccion AS punto_encuentro_direccion,
        pe.referencias AS punto_encuentro_referencias

      FROM calificaciones c
      JOIN agendamientos a ON c.agendamiento_id = a.id
      JOIN usuarios u_calificador ON c.calificador_id = u_calificador.id
      JOIN usuarios u_calificado ON c.calificado_id = u_calificado.id
      JOIN puntos_encuentro pe ON a.punto_encuentro_id = pe.id

      WHERE c.estado = 'activo'
      ORDER BY c.fecha_comentario DESC
    `);

    // Obtener datos completos de vendedor y comprador para cada agendamiento
    const [vendedoresCompradoresData] = await db.query(`
      SELECT DISTINCT
        a.id AS agendamiento_id,
        v.id AS vendedor_id,
        v.nombre AS vendedor_nombre,
        v.apellido AS vendedor_apellido,
        c.id AS comprador_id,
        c.nombre AS comprador_nombre,
        c.apellido AS comprador_apellido
      FROM agendamientos a
      JOIN usuarios v ON a.vendedor_id = v.id
      JOIN usuarios c ON a.comprador_id = c.id
      WHERE a.id IN (${results.map(r => r.agendamiento_id).join(',') || '0'})
    `);

    const vendedoresCompradoresMap = {};
    vendedoresCompradoresData.forEach(row => {
      vendedoresCompradoresMap[row.agendamiento_id] = {
        vendedor: {
          id: row.vendedor_id,
          nombre: row.vendedor_nombre,
          apellido: row.vendedor_apellido
        },
        comprador: {
          id: row.comprador_id,
          nombre: row.comprador_nombre,
          apellido: row.comprador_apellido
        }
      };
    });

    // Agrupar calificaciones por agendamiento_id (bidireccional)
    const agrupadas = {};

    results.forEach(item => {
      const agendamientoId = item.agendamiento_id;
      const usuarios = vendedoresCompradoresMap[agendamientoId] || {
        vendedor: { id: null, nombre: 'N/A', apellido: 'N/A' },
        comprador: { id: null, nombre: 'N/A', apellido: 'N/A' }
      };

      if (!agrupadas[agendamientoId]) {
        agrupadas[agendamientoId] = {
          agendamientoId: agendamientoId,
          vendedor: usuarios.vendedor,
          comprador: usuarios.comprador,
          califCompradorAVendedor: null,
          califVendedorAComprador: null,
          comentarioComprador: null,
          comentarioVendedor: null,
          fechaCita: item.fecha_cita,
          horaCita: item.hora_cita,
          puntoEncuentro: item.punto_encuentro_nombre || 'N/A',
          direccionPunto: item.punto_encuentro_direccion || 'N/A',
          referenciasPunto: item.punto_encuentro_referencias || 'N/A'
        };
      }

      // Asignar calificaciones según tipo
      if (item.tipo_calificacion === 'comprador_a_vendedor') {
        agrupadas[agendamientoId].califCompradorAVendedor = item.calificacion;
        agrupadas[agendamientoId].comentarioComprador = item.comentario;
      } else if (item.tipo_calificacion === 'vendedor_a_comprador') {
        agrupadas[agendamientoId].califVendedorAComprador = item.calificacion;
        agrupadas[agendamientoId].comentarioVendedor = item.comentario;
      }
    });

    const resultado = Object.values(agrupadas);

    return res.json(resultado);
  } catch (err) {
    console.error('Error al obtener calificaciones:', err);
    return res.status(500).json({ message: 'Error al obtener calificaciones' });
  }
}

/**
 * Obtener todas las calificaciones recibidas por un usuario específico
 */
async function getByUsuario(req, res) {
  try {
    const { usuarioId } = req.params;

    if (!usuarioId || isNaN(usuarioId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    const [results] = await db.query(`
      SELECT
        c.id,
        c.calificacion,
        c.comentario,
        c.tipo_calificacion,
        c.fecha_comentario AS fecha_creacion,
        c.agendamiento_id,

        -- Datos del calificador (quien dio la calificación)
        u_calificador.id AS calificador_id,
        u_calificador.nombre AS calificador_nombre,
        u_calificador.apellido AS calificador_apellido

      FROM calificaciones c
      JOIN usuarios u_calificador ON c.calificador_id = u_calificador.id

      WHERE c.calificado_id = ? AND c.estado = 'activo'
      ORDER BY c.fecha_comentario DESC
    `, [usuarioId]);

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (err) {
    console.error('Error al obtener calificaciones del usuario:', err);
    res.status(500).json({ error: 'Error al obtener calificaciones del usuario', details: err.message });
  }
}

module.exports = { getAll, getByUsuario };
