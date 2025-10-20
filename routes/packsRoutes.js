// routes/packsRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  getAllPacks,
  getPackById,
  createPack,
  updatePack,
  deletePack
} = require('../controllers/packsController');

// Intentar usar el middleware existente primero, con fallback a configuración inline
let upload;

try {
  const uploadQr = require('../middleware/uploadQrCodes');
  upload = uploadQr;
  console.log('Usando middleware uploadQrCodes existente');
} catch (e) {
  console.log('uploadQrCodes no encontrado, usando configuración inline de multer');

  // Asegurar que exista el directorio estandarizado
  const imagesPacksDir = path.join(__dirname, '../images/imagesPacks');

  try {
    if (!fs.existsSync(imagesPacksDir)) {
      fs.mkdirSync(imagesPacksDir, { recursive: true });
    }
  } catch (err) {
    console.warn('No se pudo crear directorio:', err.message);
  }

  // Configuración de Multer usando directorio estandarizado
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, imagesPacksDir);
    },
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
      cb(null, unique);
    }
  });

  upload = multer({
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB máximo
    },
    fileFilter: (req, file, cb) => {
      // Permitir solo imágenes
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Solo se permiten archivos de imagen'), false);
      }
    }
  });
}

// Rutas con soporte para múltiples nombres de campo
router.get('/', getAllPacks);
router.get('/:id', getPackById);

// Crear - soportar tanto 'qr' como 'qr_imagen'
router.post('/', upload.fields([
  { name: 'qr', maxCount: 1 },
  { name: 'qr_imagen', maxCount: 1 }
]), createPack);

// Actualizar - soportar tanto 'qr' como 'qr_imagen' (opcional al editar)
router.put('/:id', upload.fields([
  { name: 'qr', maxCount: 1 },
  { name: 'qr_imagen', maxCount: 1 }
]), updatePack);

// Borrado lógico
router.delete('/:id', deletePack);

module.exports = router;
