const express = require('express');
const cors    = require('cors');
const path    = require('path');
const app     = express();
const port    = process.env.PORT || 5000;
const db      = require('./database');

// Servir frontend estático
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON
app.use(express.json());

// CORS
app.use(cors());

// Rutas ya existentes
const meetingPointRoutes = require('./routes/meetingPointsRoutes');
app.use('/api/puntosencuentro', meetingPointRoutes);

const packsRoutes = require('./routes/packsRoutes');
app.use('/api/packs', packsRoutes);

const transactionsRoutes = require('./routes/transactionsRoutes');
app.use('/api/transactions', transactionsRoutes);

// **Nuevas rutas** para tu panel de confirmaciones y notificaciones
const confirmacionRoutes  = require('./routes/confirmacion.routes');
const notificationsRoutes = require('./routes/notifications.routes');

app.use('/api/confirmacion', confirmacionRoutes);
app.use('/api/notifications', notificationsRoutes);

// Ruta raíz (puede servir texto o redirigir al index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Conexión a la base de datos
db.getConnection()
  .then(() => console.log('Conexión a MySQL exitosa'))
  .catch(err => console.error('Error al conectar a MySQL:', err));

// Levantar servidor
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
