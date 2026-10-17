const { pool } = require('../config/db');

async function initializeMetalModule() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS metals (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      purity VARCHAR(50) NULL,
      description TEXT NULL,
      image LONGTEXT NULL,
      status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  const [imageColumns] = await pool.query("SHOW COLUMNS FROM metals LIKE 'image'");
  if (imageColumns.length === 0) {
    await pool.query('ALTER TABLE metals ADD COLUMN image LONGTEXT NULL AFTER description');
  }
}

async function listMetals() {
  const [metals] = await pool.query(
    `SELECT id, name, purity, description, image, status, created_at, updated_at
     FROM metals
     ORDER BY created_at DESC, id DESC`
  );
  return metals;
}

async function getMetalById(id) {
  const [metals] = await pool.execute(
    `SELECT id, name, purity, description, image, status
     FROM metals
     WHERE id = ?`,
    [id]
  );
  return metals[0] || null;
}

async function createMetal({ name, purity, description, image, status }) {
  const [result] = await pool.execute(
    `INSERT INTO metals (name, purity, description, image, status)
     VALUES (?, ?, ?, ?, ?)`,
    [name, purity || null, description || null, image || null, status]
  );
  const [metals] = await pool.execute(
    `SELECT id, name, purity, description, image, status, created_at, updated_at
     FROM metals
     WHERE id = ?`,
    [result.insertId]
  );
  return metals[0];
}

async function updateMetal(id, { name, purity, description, image, status }) {
  await pool.execute(
    `UPDATE metals
     SET name = ?, purity = ?, description = ?, image = ?, status = ?
     WHERE id = ?`,
    [name, purity || null, description || null, image || null, status, id]
  );
  const [metals] = await pool.execute(
    `SELECT id, name, purity, description, image, status, created_at, updated_at
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
  getMetalById,
  initializeMetalModule,
  listMetals,
  updateMetal
};
