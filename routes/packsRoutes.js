// routes/packsRoutes.js
const express = require('express');
const router = express.Router();
const { uploadPacks } = require('../middleware/uploadCloudinary');
const {
  getAllPacks,
  getPackById,
  createPack,
  updatePack,
  deletePack
} = require('../controllers/packsController');

// Rutas para packs
router.get('/', getAllPacks);
router.get('/:id', getPackById);

// Crear - QR se sube a Cloudinary
router.post('/', uploadPacks.single('qr'), createPack);

// Actualizar - QR se sube a Cloudinary (opcional)
router.put('/:id', uploadPacks.single('qr'), updatePack);

// Borrado lógico
router.delete('/:id', deletePack);

module.exports = router;
