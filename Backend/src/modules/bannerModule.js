const { pool } = require('../config/db');

async function initializeBannerModule() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS banners (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(200) NOT NULL DEFAULT '',
      subtitle VARCHAR(300) NOT NULL DEFAULT '',
      description TEXT NULL,
      image VARCHAR(500) NOT NULL,
      mobile_image VARCHAR(500) NULL,
      link VARCHAR(1000) NOT NULL DEFAULT '',
      type ENUM('hero', 'offer') NOT NULL DEFAULT 'hero',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      user_id BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_banners_type_active (type, active),
      INDEX idx_banners_created_at (created_at)
    )
  `);
}

async function listBanners() {
  const [rows] = await pool.query(`
    SELECT id, title, subtitle, description, image, mobile_image, link, type, active, user_id,
      created_at, updated_at
    FROM banners
    ORDER BY created_at DESC, id DESC
  `);
  return rows.map((banner) => ({ ...banner, active: Boolean(banner.active) }));
}

async function listActiveBanners() {
  const [rows] = await pool.query(`
    SELECT id, title, subtitle, description, image, mobile_image, link, type, active
    FROM banners
    WHERE active = TRUE
    ORDER BY created_at DESC, id DESC
  `);
  return rows.map((banner) => ({ ...banner, active: Boolean(banner.active) }));
}

async function createBanner(banner) {
  const [result] = await pool.execute(
    `INSERT INTO banners (title, subtitle, description, image, mobile_image, link, type, active, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      banner.title,
      banner.subtitle,
      banner.description,
      banner.image,
      banner.mobile_image,
      banner.link,
      banner.type,
      banner.active,
      banner.user_id
    ]
  );
  const [rows] = await pool.execute('SELECT * FROM banners WHERE id = ?', [result.insertId]);
  return { ...rows[0], active: Boolean(rows[0].active) };
}

async function updateBanner(id, banner) {
  await pool.execute(
    `UPDATE banners
     SET title = ?, subtitle = ?, description = ?, image = ?, mobile_image = ?,
       link = ?, type = ?, active = ?, user_id = ?
     WHERE id = ?`,
    [
      banner.title,
      banner.subtitle,
      banner.description,
      banner.image,
      banner.mobile_image,
      banner.link,
      banner.type,
      banner.active,
      banner.user_id,
      id
    ]
  );
  const [rows] = await pool.execute('SELECT * FROM banners WHERE id = ?', [id]);
  return rows[0] ? { ...rows[0], active: Boolean(rows[0].active) } : null;
}

async function deleteBanner(id) {
  const [result] = await pool.execute('DELETE FROM banners WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function getBannerById(id) {
  const [rows] = await pool.execute('SELECT * FROM banners WHERE id = ?', [id]);
  return rows[0] ? { ...rows[0], active: Boolean(rows[0].active) } : null;
}

module.exports = {
  createBanner,
  deleteBanner,
  getBannerById,
  initializeBannerModule,
  listActiveBanners,
  listBanners,
  updateBanner
};
