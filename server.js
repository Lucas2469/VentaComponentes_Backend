// server.js
require('dotenv').config(); // Cargar variables de entorno PRIMERO

const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const port = process.env.PORT || 5000;
const db = require('./database');
const RatingNotificationService = require('./utils/ratingNotificationService');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: 'http://localhost:3000', // Allow frontend origin
}));

// Archivos estáticos (imágenes)
app.use('/images', express.static(path.join(__dirname, 'images')));
// Servir frontend estático
app.use(express.static(path.join(__dirname, 'public')));

// Rutas
const productRoutes = require('./routes/productRoutes');
const userRoutes = require('./routes/userRoutes');
const meetingPointRoutes = require('./routes/meetingPointsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

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

// Start server
app.listen(port, () => {
    console.log(`🚀 Servidor ejecutándose en puerto ${port}`);
    console.log(`🌐 API disponible en: http://localhost:${port}`);
    console.log(`📦 Productos API: http://localhost:${port}/api/products`);
    console.log(`👥 Usuarios API: http://localhost:${port}/api/users`);
    console.log(`💰 Créditos API: http://localhost:${port}/api/creditos`);
    console.log(`📊 Stats API: http://localhost:${port}/api/stats`);
    console.log(`⭐ Ratings API: http://localhost:${port}/api/ratings`);
    console.log(`⭐ Calificaciones API: http://localhost:${port}/api/calificaciones`);

    // Iniciar el servicio de notificaciones de calificación
    RatingNotificationService.startService();
});

module.exports = app;
