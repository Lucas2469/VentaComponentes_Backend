const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const port = process.env.PORT || 5000;
const db = require('./database'); // Asegúrate de que apunte a db.js en minúsculas

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: 'http://localhost:3000', // Allow frontend origin
}));

// Servir archivos estáticos (para uploads)
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Routes
const meetingPointRoutes = require('./routes/meetingPointsRoutes');
app.use('/api/puntosencuentro', meetingPointRoutes);

const categoryRoutes = require('./routes/categoryRoutes');
app.use('/api/categorias', categoryRoutes);

// Nuevas rutas
const calificacionesRoutes = require('./routes/calificaciones.routes');
app.use('/api/calificaciones', calificacionesRoutes);

const usuariosRoutes = require('./routes/usuariosRoutes');
app.use('/api/usuarios', usuariosRoutes);

// Comentamos estas rutas por ahora ya que los archivos no existen en routes
// const confirmacionRoutes = require('./routes/confirmacion.routes');
// app.use('/api/confirmacion', confirmacionRoutes);

// const notificationsRoutes = require('./routes/notifications.routes');
// app.use('/api/notifications', notificationsRoutes);

// const packsRoutes = require('./routes/packsRoutes');
// app.use('/api/packs', packsRoutes);

// const transactionsRoutes = require('./routes/transactionsRoutes');
// app.use('/api/transactions', transactionsRoutes);

app.get('/', (req, res) => {
  res.send('Hello from VentaComponentes Backend!');
});

// Prueba de conexión (opcional, para depuración)
db.getConnection()
  .then(() => console.log('Conexión a MySQL exitosa'))
  .catch(err => console.error('Error al conectar a MySQL:', err));

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});