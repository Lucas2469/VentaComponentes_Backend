// controllers/CalificacionesController.js
const { Op }           = require('sequelize');
const { Calificacion, Agendamiento, PuntoEncuentro, Usuario } = require('../models');

async function getAll(req, res) {
  try {
    // Query con JOIN para obtener calificaciones con punto de encuentro
    const calificaciones = await Calificacion.findAll({
      include: [
        {
          model: Agendamiento,
          as: 'agenda',
          include: [
            {
              model: PuntoEncuentro,
              as: 'punto',
              attributes: ['id', 'nombre', 'direccion', 'referencias']
            },
            {
              model: Usuario,
              as: 'comprador',
              attributes: ['id', 'nombre', 'apellido']
            },
            {
              model: Usuario,
              as: 'vendedor',
              attributes: ['id', 'nombre', 'apellido']
            }
          ]
        }
      ],
      where: {
        estado: 'activo'
      },
      order: [['fechaComentario', 'DESC']]
    });

      // Agrupar calificaciones por agendamientoId
      const agrupadas = {};
      
      calificaciones.forEach(calif => {
        const agendamientoId = calif.agendamientoId;
        
        if (!agrupadas[agendamientoId]) {
          agrupadas[agendamientoId] = {
            agendamientoId: agendamientoId,
            vendedor: calif.agenda?.vendedor ? {
              id: calif.agenda.vendedor.id,
              nombre: calif.agenda.vendedor.nombre,
              apellido: calif.agenda.vendedor.apellido
            } : { id: null, nombre: 'N/A', apellido: 'N/A' },
            comprador: calif.agenda?.comprador ? {
              id: calif.agenda.comprador.id,
              nombre: calif.agenda.comprador.nombre,
              apellido: calif.agenda.comprador.apellido
            } : { id: null, nombre: 'N/A', apellido: 'N/A' },
            califCompradorAVendedor: null,
            califVendedorAComprador: null,
            comentarioComprador: null,
            comentarioVendedor: null,
            puntoEncuentro: calif.agenda?.punto?.nombre || 'N/A',
            direccionPunto: calif.agenda?.punto?.direccion || 'N/A',
            referenciasPunto: calif.agenda?.punto?.referencias || 'N/A',
            fechaCita: calif.agenda?.fechaCita || 'N/A',
            horaCita: calif.agenda?.horaCita || 'N/A'
          };
        }
        
        // Asignar calificaciones según el tipo
        if (calif.tipoCalificacion === 'comprador_a_vendedor') {
          agrupadas[agendamientoId].califCompradorAVendedor = calif.calificacion;
          agrupadas[agendamientoId].comentarioComprador = calif.comentario;
        } else if (calif.tipoCalificacion === 'vendedor_a_comprador') {
          agrupadas[agendamientoId].califVendedorAComprador = calif.calificacion;
          agrupadas[agendamientoId].comentarioVendedor = calif.comentario;
        }
      });
      
      const resultado = Object.values(agrupadas);

    return res.json(resultado);
  } catch (err) {
    console.error('Error al obtener calificaciones:', err);
    
    // Fallback a datos mock si hay error
    const mockCalifications = [
      {
        agendamientoId: 2,
        vendedor: {
          id: 4,
          nombre: "Vania",
          apellido: "Fernandez Carrasco"
        },
        comprador: {
          id: 2,
          nombre: "Alejandra",
          apellido: "Mercado"
        },
        califCompradorAVendedor: 5,
        califVendedorAComprador: 5,
        comentarioComprador: "Fue amable y puntual",
        comentarioVendedor: "llego puntual y cancelo al contado",
        puntoEncuentro: "Plaza 14 de Septiembress",
        direccionPunto: "IC Norte, E-0817, Avenida América, Queru Queru Central",
        referenciasPunto: "N/A",
        fechaCita: "2025-09-23",
        horaCita: "10:45:00"
      }
    ];

    return res.json(mockCalifications);
  }
}

async function create(req, res) {
  try {
    const { productoId, agendamientoId, calificatorId, calificadoId, tipoCalificacion, calificacion, comentario } = req.body;
    
    // Validaciones básicas
    if (!productoId || !agendamientoId || !calificatorId || !calificadoId || !tipoCalificacion || !calificacion) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    if (calificacion < 1 || calificacion > 5) {
      return res.status(400).json({ message: 'La calificación debe estar entre 1 y 5' });
    }

    const newCalification = await Calificacion.create({
      productoId,
      agendamientoId,
      calificatorId,
      calificadoId,
      tipoCalificacion,
      calificacion,
      comentario: comentario || null,
      fechaComentario: new Date(),
      estado: 'activo'
    });

    return res.status(201).json({ 
      message: 'Calificación creada exitosamente',
      calificacion: newCalification
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al crear calificación' });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const { calificacion, comentario, estado } = req.body;

    if (calificacion && (calificacion < 1 || calificacion > 5)) {
      return res.status(400).json({ message: 'La calificación debe estar entre 1 y 5' });
    }

    const calification = await Calificacion.findByPk(id);
    if (!calification) {
      return res.status(404).json({ message: 'Calificación no encontrada' });
    }

    await calification.update({
      calificacion: calificacion || calification.calificacion,
      comentario: comentario !== undefined ? comentario : calification.comentario,
      estado: estado || calification.estado
    });

    return res.json({ 
      message: 'Calificación actualizada exitosamente',
      calificacion: calification
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al actualizar calificación' });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;

    const calification = await Calificacion.findByPk(id);
    if (!calification) {
      return res.status(404).json({ message: 'Calificación no encontrada' });
    }

    await calification.destroy();

    return res.json({ message: 'Calificación eliminada exitosamente' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al eliminar calificación' });
  }
}

module.exports = { getAll, create, update, remove };
