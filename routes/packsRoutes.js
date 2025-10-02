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

  // Asegurar que existan los directorios
  const uploadsDir = path.join(__dirname, '../public/uploads');
  const imagesPacksDir = path.join(__dirname, '../images/imagesPacks');

  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(imagesPacksDir)) {
      fs.mkdirSync(imagesPacksDir, { recursive: true });
    }
  } catch (err) {
    console.warn('No se pudieron crear directorios:', err.message);
  }

  // Configuración básica de Multer con soporte para ambos directorios
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Preferir el directorio uploads de David, con fallback al original
      const uploadPath = fs.existsSync(uploadsDir) ? uploadsDir : imagesPacksDir;
      cb(null, uploadPath);
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
router.post('/', (req, res, next) => {
  const uploadMiddleware = upload.single('qr_imagen') || upload.single('qr');
  uploadMiddleware(req, res, next);
}, createPack);

// Actualizar - soportar tanto 'qr' como 'qr_imagen'
router.put('/:id', (req, res, next) => {
  const uploadMiddleware = upload.single('qr_imagen') || upload.single('qr');
  uploadMiddleware(req, res, next);
}, updatePack);

// Borrado lógico
router.delete('/:id', deletePack);

module.exports = router;
