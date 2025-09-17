const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const port = process.env.PORT || 5000;
const db = require('./database');

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());

app.use(cors()); // permite cualquier origen

const meetingPointRoutes = require('./routes/meetingPointsRoutes');
app.use('/api/puntosencuentro', meetingPointRoutes);

const packsRoutes = require('./routes/packsRoutes');
app.use('/api/packs', packsRoutes);

const transactionsRoutes = require('./routes/transactionsRoutes');
app.use('/api/transactions', transactionsRoutes);

app.get('/', (req, res) => {
  res.send('Hello from VentaComponentes Backend!');
});

db.getConnection()
  .then(() => console.log('Conexión a MySQL exitosa'))
  .catch(err => console.error('Error al conectar a MySQL:', err));

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
