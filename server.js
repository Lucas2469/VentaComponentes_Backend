const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
const db = require('./database');
const path = require("path");

// ================== MIDDLEWARE ==================
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000',
}));

// Middleware para servir imágenes
app.use("/images", express.static(path.join(__dirname, "images")));

// ================== ROUTES ==================
// Meeting Points
const meetingPointRoutes = require('./routes/meetingPointsRoutes');
app.use('/api/puntosencuentro', meetingPointRoutes);

// Créditos
const creditRoutes = require('./routes/creditRoutes');
app.use('/api/creditos', creditRoutes);

// PACKS
const packsRoutes = require('./routes/packsRoutes');
app.use('/api/packs', packsRoutes);
// ================== ROOT ==================
app.get('/', (req, res) => {
  res.send('Hello from VentaComponentes Backend!');
});

// ================== DB TEST ==================
db.getConnection()
  .then(() => console.log('✅ Conexión a MySQL exitosa'))
  .catch(err => console.error('❌ Error al conectar a MySQL:', err));

// ================== START SERVER ==================
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
