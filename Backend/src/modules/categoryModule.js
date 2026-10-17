const { pool } = require('../config/db');

async function initializeCategoryModule() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      catId VARCHAR(32) NOT NULL UNIQUE,
      name VARCHAR(150) NOT NULL,
      description TEXT NULL,
      subcategory JSON NOT NULL,
      images JSON NOT NULL,
      user_id INT UNSIGNED NULL,
      status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

async function listCategories() {
  const [categories] = await pool.query(
    `SELECT id, catId, name, description, subcategory, images, user_id, status, created_at, updated_at
     FROM categories
     ORDER BY created_at DESC, id DESC`
  );
  return categories;
}

async function createCategory({ catId, name, description, subcategory, images, userId }) {
  const [result] = await pool.execute(
    `INSERT INTO categories (catId, name, description, subcategory, images, user_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [catId, name, description || null, JSON.stringify(subcategory), JSON.stringify(images), userId]
  );
  const [categories] = await pool.execute(
    `SELECT id, catId, name, description, subcategory, images, user_id, status, created_at, updated_at
     FROM categories
     WHERE id = ?`,
    [result.insertId]
  );
  return categories[0];
}

async function updateCategory(catId, { name, description, subcategory, images, userId }) {
  await pool.execute(
    `UPDATE categories
     SET name = ?, description = ?, subcategory = ?, images = ?, user_id = ?
     WHERE catId = ?`,
    [name, description || null, JSON.stringify(subcategory), JSON.stringify(images), userId, catId]
  );

  const [categories] = await pool.execute(
    `SELECT id, catId, name, description, subcategory, images, user_id, status, created_at, updated_at
     FROM categories
     WHERE catId = ?`,
    [catId]
  );
  return categories[0] || null;
}

async function deleteCategory(catId) {
  const [result] = await pool.execute('DELETE FROM categories WHERE catId = ?', [catId]);
  return result.affectedRows > 0;
}

module.exports = {
  createCategory,
  deleteCategory,
  initializeCategoryModule,
  listCategories,
  updateCategory
};
