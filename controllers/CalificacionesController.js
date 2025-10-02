// controllers/CalificacionesController.js
const { Op }           = require('sequelize');
const Calificacion     = require('../models/Calificacion');
const Agendamiento     = require('../models/Agendamiento');
const PuntoEncuentro   = require('../models/PuntoEncuentro');
const Usuario          = require('../models/Usuario');

async function getAll(req, res) {
  try {
    // Traemos todo con los JOINs necesarios
    const results = await Calificacion.findAll({
      include: [
        {
          model: Agendamiento,
          as: 'agenda',
          attributes: ['fechaCita', 'horaCita'],
          include: [
            {
              model: PuntoEncuentro,
              as: 'punto',
              attributes: ['nombre']
            }
          ]
        },
        {
          model: Usuario,
          as: 'calificador',
          attributes: ['nombre', 'apellido']
        },
        {
          model: Usuario,
          as: 'calificado',
          attributes: ['nombre', 'apellido']
        }
      ],
      order: [['fechaComentario', 'DESC']]
    });

    // Mapeo a la forma solicitada
    const mapped = results.map(item => ({
      vendedor: {
        nombre:   item.calificador.nombre,
        apellido: item.calificador.apellido
      },
      comprador: {
        nombre:   item.calificado.nombre,
        apellido: item.calificado.apellido
      },
      califCompradorAVendedor: item.tipoCalificacion === 'comprador_a_vendedor'
        ? item.calificacion
        : null,
      califVendedorAComprador: item.tipoCalificacion === 'vendedor_a_comprador'
        ? item.calificacion
        : null,
      fechaCita:       item.agenda.fechaCita,
      horaCita:        item.agenda.horaCita,
      puntoEncuentro:  item.agenda.punto.nombre,
      comentarioComprador: item.tipoCalificacion === 'comprador_a_vendedor'
        ? item.comentario
        : null,
      comentarioVendedor: item.tipoCalificacion === 'vendedor_a_comprador'
        ? item.comentario
        : null
    }));

    return res.json(mapped);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al obtener calificaciones' });
  }
}

module.exports = { getAll };
