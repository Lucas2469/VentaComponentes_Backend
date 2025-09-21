const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
const db = require('./database'); // Asegúrate de que apunte a db.js en minúsculas

// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000', // Allow frontend origin
}));

// Routes

const meetingPointRoutes = require('./routes/meetingPointsRoutes');
app.use('/api/puntosencuentro', meetingPointRoutes);

const AdProductRoutes = require('./routes/AdProductRoutes');
app.use('/api/ad-products', AdProductRoutes);

const scheduleRoutes = require('./routes/scheduleRoutes');
app.use('/api/schedules', scheduleRoutes);

const appointmentRoutes = require('./routes/AgendamientoRoutes');
app.use('/api/appointments', appointmentRoutes);

app.get('/', (req, res) => {
  res.send('Hello from VentaComponentes Backend!');
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
  console.log(`Server running on port ${port}`);
});