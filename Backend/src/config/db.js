const mysql = require('mysql2/promise');

const database = process.env.DB_NAME || 'gold_shop';
const connectionOptions = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || ''
};

const pool = mysql.createPool({
  ...connectionOptions,
  database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function initializeDatabase() {
  const connection = await mysql.createConnection(connectionOptions);
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${mysql.escapeId(database)}`);
  } finally {
    await connection.end();
  }

  await pool.query('SELECT 1');
}

module.exports = { pool, initializeDatabase };