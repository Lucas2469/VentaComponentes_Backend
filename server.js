// server.js
require('dotenv').config(); // Cargar variables de entorno PRIMERO

const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const port = process.env.PORT || 5000;
const db = require('./database');
const RatingNotificationService = require('./utils/ratingNotificationService');
const TokenCleanupService = require('./services/tokenCleanupService');

// Importar middleware de seguridad
const { 
    helmetConfig, 
    validateOrigin, 
    sanitizeInputs, 
    requestLogger, 
    corsErrorHandler,
    apiLimiter 
} = require('./middleware/security');

// Middleware de seguridad
app.use(helmetConfig);
app.use(requestLogger);
app.use(sanitizeInputs);
app.use(validateOrigin);

// Middleware básico
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configurado
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'];
app.use(cors({
    origin: function (origin, callback) {
        // Permitir requests sin origin (Postman, etc.) en desarrollo
        if (process.env.NODE_ENV === 'development' && !origin) {
            return callback(null, true);
        }
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting general
app.use('/api', apiLimiter);

// Archivos estáticos (imágenes)
app.use('/images', express.static(path.join(__dirname, 'images')));
// Servir frontend estático
app.use(express.static(path.join(__dirname, 'public')));

// Rutas
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const userRoutes = require('./routes/userRoutes');
const meetingPointRoutes = require('./routes/meetingPointsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Rutas de autenticación (sin protección adicional)
app.use('/api/auth', authRoutes);

// Core routes
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/puntosencuentro', meetingPointRoutes);
app.use('/api/notifications', notificationRoutes);

// Ad Products Routes
const AdProductRoutes = require('./routes/AdProductRoutes');
app.use('/api/ad-products', AdProductRoutes);

const scheduleRoutes = require('./routes/scheduleRoutes');
app.use('/api/schedules', scheduleRoutes);

const appointmentRoutes = require('./routes/AgendamientoRoutes');
app.use('/api/appointments', appointmentRoutes);

const calificacionRoutes = require('./routes/CalificacionRoutes');
app.use('/api/calificaciones-old', calificacionRoutes);

const ratingRoutes = require('./routes/ratingRoutes');
app.use('/api/ratings', ratingRoutes);

// Credit routes
const creditRoutes = require('./routes/creditRoutes');
app.use('/api/creditos', creditRoutes);

const packsRoutes = require('./routes/packsRoutes');
app.use('/api/packs', packsRoutes);

const statsRoutes = require('./routes/statsRoutes');
app.use('/api/stats', statsRoutes);

const categoryRoutes = require('./routes/categoryRoutes');
app.use('/api/categorias', categoryRoutes);

// Confirmación routes
try {
    const confirmacionRoutes = require('./routes/confirmacion.routes');
    app.use('/api/confirmacion', confirmacionRoutes);
} catch (e) {
    console.log('confirmacion.routes no encontrado, continuando...');
}

// Calificaciones routes (nueva versión mejorada)
try {
    const calificacionesRoutes = require('./routes/calificaciones.routes');
    app.use('/api/calificaciones', calificacionesRoutes);
} catch (e) {
    console.log('calificaciones.routes no encontrado, continuando...');
}

// Historial de créditos endpoint
app.get('/api/historial-creditos/:usuarioId', async (req, res) => {
    try {
        const { usuarioId } = req.params;

        if (!usuarioId || isNaN(usuarioId)) {
            return res.status(400).json({ error: 'ID de usuario inválido' });
        }

        const [results] = await db.query(`
            SELECT
                id,
                tipo_movimiento,
                cantidad,
                concepto,
                saldo_anterior,
                saldo_nuevo,
                fecha_movimiento
            FROM historial_creditos
            WHERE usuario_id = ?
            ORDER BY fecha_movimiento DESC
            LIMIT 100
        `, [usuarioId]);

        res.status(200).json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error al obtener historial de créditos:', error);
        res.status(500).json({ error: 'Error al obtener historial de créditos', details: error.message });
    }
});

// Productos por vendedor endpoint
app.get('/api/productos/vendedor/:vendedorId', async (req, res) => {
    try {
        const { vendedorId } = req.params;

        if (!vendedorId || isNaN(vendedorId)) {
            return res.status(400).json({ error: 'ID de vendedor inválido' });
        }

        const [results] = await db.query(`
            SELECT
                p.id,
                p.nombre,
                p.descripcion,
                p.precio,
                p.stock,
                p.estado,
                p.fecha_publicacion,
                p.fecha_expiracion,
                c.nombre as categoria_nombre
            FROM productos p
            JOIN categorias c ON p.categoria_id = c.id
            WHERE p.vendedor_id = ?
            ORDER BY p.fecha_publicacion DESC
        `, [vendedorId]);

        res.status(200).json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error al obtener productos del vendedor:', error);
        res.status(500).json({ error: 'Error al obtener productos del vendedor', details: error.message });
    }
});

// Ruta raíz - API info con fallback a archivo estático
app.get('/', (req, res) => {
    // Intentar servir el archivo estático primero
    const indexPath = path.join(__dirname, 'public', 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            // Si no existe el archivo, mostrar info de la API
            res.json({
                success: true,
                message: 'VentaComponentes Backend API funcionando correctamente',
                version: '1.0.0',
                endpoints: {
                    products: '/api/products',
                    users: '/api/users',
                    meetingPoints: '/api/puntosencuentro',
                    notifications: '/api/notifications',
                    adProducts: '/api/ad-products',
                    schedules: '/api/schedules',
                    appointments: '/api/appointments',
                    calificaciones: '/api/calificaciones',
                    credits: '/api/creditos',
                    packs: '/api/packs',
                    stats: '/api/stats',
                    images: '/images'
                }
            });
        }
    });
});


// Prueba de conexión (opcional, para depuración)
db.getConnection((err, connection) => {
  if (err) {
    console.error('Error al conectar a MySQL:', err);
  } else {
    console.log('Conexión a MySQL exitosa');
    connection.release();
  }
});

// Manejo de errores de CORS
app.use(corsErrorHandler);

// Manejo de errores generales
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    
    if (res.headersSent) {
        return next(err);
    }
    
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Servidor ejecutándose en puerto ${port}`);
    console.log(`🌐 API disponible en: http://localhost:${port}`);
    console.log(`🔐 Autenticación API: http://localhost:${port}/api/auth`);
    console.log(`📦 Productos API: http://localhost:${port}/api/products`);
    console.log(`👥 Usuarios API: http://localhost:${port}/api/users`);
    console.log(`💰 Créditos API: http://localhost:${port}/api/creditos`);
    console.log(`📊 Stats API: http://localhost:${port}/api/stats`);
    console.log(`⭐ Ratings API: http://localhost:${port}/api/ratings`);
    console.log(`⭐ Calificaciones API: http://localhost:${port}/api/calificaciones`);
    console.log(`🔒 Modo: ${process.env.NODE_ENV || 'development'}`);

    // Iniciar el servicio de notificaciones de calificación
    RatingNotificationService.startService();

    // Iniciar el servicio de limpieza de tokens expirados
    // Ejecuta cada 24 horas, limpia tokens con más de 30 días de antigüedad
    TokenCleanupService.start(24, 30);
});

module.exports = app;
