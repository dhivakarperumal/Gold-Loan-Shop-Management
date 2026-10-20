const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { addDateRangeCondition } = require('../utils/dateRange');

const USER_COLUMNS = `
  user_id,
  username,
  name,
  email,
  phone,
  role,
  status,
  created_at
`;

async function initializeAuthModule() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(150) NOT NULL,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(254) NOT NULL UNIQUE,
      phone VARCHAR(32) NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(32) NOT NULL DEFAULT 'user',
      status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  const [nameColumns] = await pool.query("SHOW COLUMNS FROM users LIKE 'name'");
  const nameLength = Number(String(nameColumns[0]?.Type || '').match(/^varchar\((\d+)\)$/i)?.[1] || 0);
  if (nameLength < 150) {
    await pool.query('ALTER TABLE users MODIFY COLUMN name VARCHAR(150) NOT NULL');
  }
  const [usernameColumns] = await pool.query("SHOW COLUMNS FROM users LIKE 'username'");
  const usernameLength = Number(String(usernameColumns[0]?.Type || '').match(/^varchar\((\d+)\)$/i)?.[1] || 0);
  if (usernameLength < 150) {
    await pool.query('ALTER TABLE users MODIFY COLUMN username VARCHAR(150) NOT NULL');
  }
  const [emailColumns] = await pool.query("SHOW COLUMNS FROM users LIKE 'email'");
  if (emailColumns[0]?.Null === 'NO') {
    await pool.query('ALTER TABLE users MODIFY COLUMN email VARCHAR(254) NULL');
  }
}

async function insertUser(connection, { username, name = username, email, phone, password, status, role = 'user' }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const [result] = await connection.execute(
    `INSERT INTO users (username, name, email, phone, password_hash, role, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [username, name, email, phone || null, passwordHash, role, status]
  );
  return result.insertId;
}

async function createUser({ username, email, phone, password, status, role = 'user' }) {
  const userId = await insertUser(pool, { username, email, phone, password, status, role });
  return getUserById(userId);
}

async function getUserById(userId) {
  const [users] = await pool.execute(
    `SELECT ${USER_COLUMNS} FROM users WHERE user_id = ?`,
    [userId]
  );
  return users[0] || null;
}

async function listUsers(dateRange = {}) {
  const conditions = [];
  const values = [];
  addDateRangeCondition(conditions, values, 'created_at', dateRange);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [users] = await pool.execute(
    `SELECT ${USER_COLUMNS} FROM users ${where} ORDER BY created_at DESC, user_id DESC`,
    values
  );
  return users;
}

async function updateUser(userId, { username, name, email, phone, role }) {
  await pool.execute(
    `UPDATE users
     SET username = ?, name = ?, email = ?, phone = ?, role = ?
     WHERE user_id = ?`,
    [username, name, email, phone || null, role, userId]
  );
  return getUserById(userId);
}

async function deleteUser(userId) {
  const [result] = await pool.execute(
    'DELETE FROM users WHERE user_id = ?',
    [userId]
  );
  return result.affectedRows > 0;
}

async function findUserForLogin(identifier) {
  const [users] = await pool.execute(
    `SELECT ${USER_COLUMNS}, password_hash
     FROM users
     WHERE email = ? OR phone = ? OR username = ?
     LIMIT 1`,
    [identifier, identifier, identifier]
  );
  return users[0] || null;
}

async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

function createAccessToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required to issue login tokens');

  return jwt.sign(
    { user_id: user.user_id, role: user.role },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '9d' }
  );
}

module.exports = {
  createAccessToken,
  createUser,
  deleteUser,
  findUserForLogin,
  getUserById,
  initializeAuthModule,
  insertUser,
  listUsers,
  updateUser,
  verifyPassword
};
