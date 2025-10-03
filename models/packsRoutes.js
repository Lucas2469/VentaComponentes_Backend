// routes/packsRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  getAllPacks,
  getPackById,
  createPack,
  updatePack,
  deletePack
} = require('../controllers/packsController');

// Configuración básica de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, unique);
  }
});
const upload = multer({ storage });

// Listar todos
router.get('/', getAllPacks);

// Obtener uno
router.get('/:id', getPackById);

// Crear (campo de file: 'qr_imagen')
router.post('/', upload.single('qr_imagen'), createPack);

// Actualizar
router.put('/:id', upload.single('qr_imagen'), updatePack);

// Borrado lógico
router.delete('/:id', deletePack);

module.exports = router;
