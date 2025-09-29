// server.js
require('dotenv').config(); // Cargar variables de entorno PRIMERO

const express = require('express');
const cors = require('cors');
const path = require('path'); 
const app = express();
const port = process.env.PORT || 5000;
const db = require('./database');

// Middleware global
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuración CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

//archivos estáticos (imágenes)
app.use('/images', express.static(path.join(__dirname, 'images')));

// Rutas
const productRoutes = require('./routes/productRoutes');
const userRoutes = require('./routes/userRoutes');   
const meetingPointRoutes = require('./routes/meetingPointsRoutes');

app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/puntosencuentro', meetingPointRoutes);

// Nuevas rutas de Anett
const AdProductRoutes = require('./routes/AdProductRoutes');
app.use('/api/ad-products', AdProductRoutes);

const scheduleRoutes = require('./routes/scheduleRoutes');
app.use('/api/schedules', scheduleRoutes);

const appointmentRoutes = require('./routes/AgendamientoRoutes');
app.use('/api/appointments', appointmentRoutes);

const categoryRoutes = require('./routes/categoryRoutes');
app.use('/api/categorias', categoryRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'VentaComponentes Backend API funcionando correctamente',
        version: '1.0.0',
        endpoints: {
            products: '/api/products',
            users: '/api/users',
            meetingPoints: '/api/puntosencuentro',
            adProducts: '/api/ad-products',
            schedules: '/api/schedules',
            appointments: '/api/appointments',
            images: '/images'
        }
    });
});

// Middleware de manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
    });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint no encontrado'
    });
});

// Prueba de conexión a la base de datos
db.getConnection()
    .then(() => {
        console.log('✅ Conexión a MySQL exitosa');
        console.log('📊 Base de datos:', process.env.DB_NAME);
    })
    .catch(err => {
        console.error('❌ Error al conectar a MySQL:', err.message);
        process.exit(1);
    });

// Iniciar servidor
app.listen(port, () => {
    console.log(`🚀 Servidor ejecutándose en puerto ${port}`);
    console.log(`🌐 API disponible en: http://localhost:${port}`);
    console.log(`📦 Productos API: http://localhost:${port}/api/products`);
    console.log(`👥 Usuarios API: http://localhost:${port}/api/users`);
});

module.exports = app;