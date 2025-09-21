const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'db26921.public.databaseasp.net',
  user: 'db26921',
  password: 'G%j5kR3?P7-b',
  database: 'db26921',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool.promise();