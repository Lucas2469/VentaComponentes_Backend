const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configurar Cloudinary con variables de entorno
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Verificar que las credenciales estén configuradas
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn('⚠️ Advertencia: Credenciales de Cloudinary no configuradas. Algunos uploads pueden fallar.');
}

// Filtro para solo imágenes
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes JPG/PNG/WEBP'), false);
  }
};

// ============================================
// PRODUCTOS - Storage para imágenes de productos
// ============================================
const storageProducts = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'electromarket/products',
    resource_type: 'auto',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    quality: 'auto:eco', // Optimización automática
    fetch_format: 'auto'  // Mejor compresión
  }
});

const uploadProducts = multer({
  storage: storageProducts,
  fileFilter: imageFileFilter,
  limits: { fileSize: 8 * 1024 * 1024 } // 8MB max
});

// ============================================
// PACKS - Storage para códigos QR de packs
// ============================================
const storagePacks = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'electromarket/packs',
    resource_type: 'auto',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    quality: 'auto:eco'
  }
});

const uploadPacks = multer({
  storage: storagePacks,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// ============================================
// PAGOS - Storage para comprobantes de pago
// ============================================
const storagePayments = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'electromarket/payments',
    resource_type: 'auto',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    quality: 'auto:eco'
  }
});

const uploadPayments = multer({
  storage: storagePayments,
  fileFilter: imageFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

module.exports = {
  cloudinary,
  uploadProducts,
  uploadPacks,
  uploadPayments
};
