const db = require('../database');
const { z } = require('zod');

// Validación con Zod (acepta texto para día de la semana)
const scheduleSchema = z.object({
  vendedor_id: z.coerce.number().int().positive(),
  horarios: z.array(
    z.object({
      dia_semana: z.enum([
        'domingo',
        'lunes',
        'martes',
        'miércoles',
        'jueves',
        'viernes',
        'sábado'
      ]),
      hora_inicio: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Formato TIME inválido'),
      hora_fin: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Formato TIME inválido')
    })
  )
});

// ========== CREATE ==========
async function createSchedule(req, res) {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Payload inválido', details: parsed.error.format() });
  }

  const { vendedor_id, horarios } = parsed.data;

  const conn = await db.promise().getConnection();
  try {
    if (horarios.length === 0) {
      return res.status(400).json({ error: 'Debe enviar al menos un horario.' });
    }

    const values = [];
    const placeholders = [];

    horarios.forEach(h => {
      placeholders.push('(?, ?, ?, ?)');
      values.push(vendedor_id, h.dia_semana, h.hora_inicio, h.hora_fin);
    });

    await conn.query(
      `INSERT INTO horarios_vendedor (vendedor_id, dia_semana, hora_inicio, hora_fin)
       VALUES ${placeholders.join(',')}`,
      values
    );

    conn.release();
    res.status(201).json({ message: 'Horarios creados con éxito.' });
  } catch (err) {
    conn.release();
    console.error(err);
    res.status(500).json({ error: 'Error al crear horarios.' });
  }
}

// ========== GET ==========
async function getSchedulesByVendor(req, res) {
  const { vendedorId } = req.params;

  const conn = await db.promise().getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT id, vendedor_id, dia_semana, hora_inicio, hora_fin
       FROM horarios_vendedor
       WHERE vendedor_id = ? && estado = 'activo'
    `,
      [vendedorId]
    );

    conn.release();
    res.json(rows);
  } catch (err) {
    conn.release();
    console.error(err);
    res.status(500).json({ error: 'Error al obtener horarios.' });
  }
}


// ========== UPDATE ==========
async function updateSchedules(req, res) {
  const { id } = req.params;
  const { dia_semana, hora_inicio, hora_fin } = req.body;

  const conn = await db.promise().getConnection();
  try {
    const [result] = await conn.query(
      `UPDATE horarios_vendedor
       SET dia_semana = ?, hora_inicio = ?, hora_fin = ?
       WHERE id = ?`,
      [dia_semana, hora_inicio, hora_fin, id]
    );
    conn.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Horario no encontrado.' });
    }

    res.json({ message: 'Horario actualizado' });
  } catch (err) {
    conn.release();
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar horario' });
  }
}

// ========== DELETE ==========
async function deleteSchedules(req, res) {
  const { id } = req.params; // id del horario

  const conn = await db.promise().getConnection();
  try {
    const [result] = await conn.query(
      `UPDATE horarios_vendedor
       SET estado = 'inactivo'
       WHERE id = ?`,
      [id]
    );
    conn.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'No se encontró el horario.' });
    }

    res.json({ message: 'Horario marcado como inactivo.' });
  } catch (err) {
    conn.release();
    console.error(err);
    res.status(500).json({ error: 'Error al marcar horario como inactivo.' });
  }
}


module.exports = {
  createSchedule,
  getSchedulesByVendor,
  updateSchedules,
  deleteSchedules
};
