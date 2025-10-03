// controllers/usuariosController.js
const { Usuario } = require('../models');

async function getAll(req, res) {
  try {
    const usuarios = await Usuario.findAll({
      attributes: ['id', 'nombre', 'apellido', 'email', 'telefono'],
      order: [['nombre', 'ASC']]
    });

    return res.json(usuarios);
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    return res.status(500).json({ message: 'Error al obtener usuarios' });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findByPk(id, {
      attributes: ['id', 'nombre', 'apellido', 'email', 'telefono']
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    return res.json(usuario);
  } catch (err) {
    console.error('Error al obtener usuario:', err);
    return res.status(500).json({ message: 'Error al obtener usuario' });
  }
}

module.exports = { getAll, getById };
