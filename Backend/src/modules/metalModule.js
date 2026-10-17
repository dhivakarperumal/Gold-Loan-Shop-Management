const { pool } = require('../config/db');

async function initializeMetalModule() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS metals (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      purity VARCHAR(50) NULL,
      description TEXT NULL,
      status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

async function listMetals() {
  const [metals] = await pool.query(
    `SELECT id, name, purity, description, status, created_at, updated_at
     FROM metals
     ORDER BY created_at DESC, id DESC`
  );
  return metals;
}

async function createMetal({ name, purity, description, status }) {
  const [result] = await pool.execute(
    `INSERT INTO metals (name, purity, description, status)
     VALUES (?, ?, ?, ?)`,
    [name, purity || null, description || null, status]
  );
  const [metals] = await pool.execute(
    `SELECT id, name, purity, description, status, created_at, updated_at
     FROM metals
     WHERE id = ?`,
    [result.insertId]
  );
  return metals[0];
}

async function updateMetal(id, { name, purity, description, status }) {
  await pool.execute(
    `UPDATE metals
     SET name = ?, purity = ?, description = ?, status = ?
     WHERE id = ?`,
    [name, purity || null, description || null, status, id]
  );
  const [metals] = await pool.execute(
    `SELECT id, name, purity, description, status, created_at, updated_at
     FROM metals
     WHERE id = ?`,
    [id]
  );
  return metals[0] || null;
}

async function deleteMetal(id) {
  const [result] = await pool.execute('DELETE FROM metals WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  createMetal,
  deleteMetal,
  initializeMetalModule,
  listMetals,
  updateMetal
};
