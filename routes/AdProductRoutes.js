const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const adProductController = require('../controllers/AdProductController');

// === Multer config: ./images/imagesProducts ===
const uploadDir = path.join(__dirname, '..', 'images', 'imagesProducts');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ts = Date.now();
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `prod_${ts}_${Math.round(Math.random() * 1e6)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB por imagen
    files: 6                    // límite duro de 6 archivos
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Formato de imagen no permitido (jpg, jpeg, png, webp).'));
    }
    cb(null, true);
  }
});

// === Rutas para productos publicados por vendedores ===

//otros
router.get('/categorias', adProductController.getCategorias);
router.get('/puntos-encuentro', adProductController.getPuntosEncuentro);
router.get('/vendedor/:id', adProductController.getCreditosDisponibles);


// POST crear producto con imágenes (1..6)
router.post('/', upload.array('images', 6), adProductController.createProduct);

// GET detalle de un producto por ID
router.get('/:id', adProductController.getProductById);

// GET listado de productos (paginado)
router.get('/', adProductController.listProducts);



module.exports = router;
