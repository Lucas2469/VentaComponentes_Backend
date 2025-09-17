// database.js
require('dotenv').config();
const mysql = require('mysql2/promise');

const sslOption = process.env.SSL_MODE === 'Disabled'
  ? false
  : process.env.SSL_MODE === 'Required'
    ? { rejectUnauthorized: true }
    : { rejectUnauthorized: false };

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: sslOption,            // ← aquí usamos sslOption
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
