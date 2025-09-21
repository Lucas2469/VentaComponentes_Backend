const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',      // Cambia si tu DB está en otro host (ej. '127.0.0.1')
  user: 'root',           // Cambia por tu usuario de MySQL
  password: 'univalle2024', // Cambia por tu contraseña de MySQL
  database: 'electromarket', // Nombre de la base de datos
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool.promise(); 