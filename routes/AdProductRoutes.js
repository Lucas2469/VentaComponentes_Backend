const express = require('express');
const router = express.Router();

const adProductController = require('../controllers/AdProductController');
const { uploadProducts } = require('../middleware/uploadCloudinary');

// === Rutas para productos publicados por vendedores ===

//otros
router.get('/categorias', adProductController.getCategorias);
router.get('/puntos-encuentro', adProductController.getPuntosEncuentro);
router.get('/vendedor/:id', adProductController.getCreditosDisponibles);


// POST crear producto con imágenes (1..6) - Usa Cloudinary
router.post('/', uploadProducts.array('images', 6), adProductController.createProduct);

// GET detalle de un producto por ID
router.get('/:id', adProductController.getProductById);

// GET listado de productos (paginado)
router.get('/', adProductController.listProducts);



module.exports = router;
