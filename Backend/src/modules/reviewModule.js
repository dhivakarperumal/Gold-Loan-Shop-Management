const { pool } = require('../config/db');

async function initializeReviewModule() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      product_id INT UNSIGNED NULL,
      user_name VARCHAR(150) NOT NULL,
      user_email VARCHAR(254) NULL,
      rating TINYINT UNSIGNED NOT NULL,
      comment TEXT NOT NULL,
      review_image VARCHAR(500) NULL,
      status ENUM('Pending', 'Published', 'Flagged') NOT NULL DEFAULT 'Pending',
      admin_reply TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_reviews_status_rating (status, rating),
      INDEX idx_reviews_product (product_id),
      INDEX idx_reviews_created (created_at)
    )
  `);
}

async function listReviews({ status, rating, search }) {
  const conditions = [];
  const values = [];
  if (status) {
    conditions.push('r.status = ?');
    values.push(status);
  }
  if (rating) {
    conditions.push('r.rating = ?');
    values.push(rating);
  }
  if (search) {
    conditions.push('(r.user_name LIKE ? OR r.user_email LIKE ? OR r.comment LIKE ? OR p.name LIKE ?)');
    const term = `%${search}%`;
    values.push(term, term, term, term);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [reviews] = await pool.execute(
    `SELECT r.id, r.product_id, r.user_name, r.user_email, r.rating, r.comment,
       r.review_image, r.status, r.admin_reply, r.created_at, r.updated_at,
       p.name AS product_name
     FROM reviews r
     LEFT JOIN products p ON p.id = r.product_id
     ${where}
     ORDER BY r.created_at DESC, r.id DESC`,
    values
  );
  const [[stats]] = await pool.query(`
    SELECT COUNT(*) AS total_reviews,
      COALESCE(ROUND(AVG(rating), 1), 0) AS average_rating,
      COALESCE(SUM(status = 'Pending'), 0) AS pending_count
    FROM reviews
  `);
  return {
    reviews: reviews.map((review) => ({ ...review, id: Number(review.id) })),
    stats: {
      total_reviews: Number(stats.total_reviews),
      average_rating: Number(stats.average_rating),
      pending_count: Number(stats.pending_count)
    }
  };
}

async function createReview(review) {
  const [result] = await pool.execute(
    `INSERT INTO reviews (product_id, user_name, user_email, rating, comment, review_image, status)
     VALUES (?, ?, ?, ?, ?, ?, 'Pending')`,
    [review.product_id, review.user_name, review.user_email, review.rating, review.comment, review.review_image]
  );
  const [rows] = await pool.execute(
    `SELECT r.id, r.product_id, r.user_name, r.user_email, r.rating, r.comment,
       r.review_image, r.status, r.admin_reply, r.created_at, r.updated_at, p.name AS product_name
     FROM reviews r LEFT JOIN products p ON p.id = r.product_id WHERE r.id = ?`,
    [result.insertId]
  );
  return { ...rows[0], id: Number(rows[0].id) };
}

async function productExists(id) {
  const [rows] = await pool.execute('SELECT id FROM products WHERE id = ?', [id]);
  return rows.length > 0;
}

async function updateReviewStatus(id, status) {
  const [result] = await pool.execute('UPDATE reviews SET status = ? WHERE id = ?', [status, id]);
  if (result.affectedRows > 0) return true;
  const [rows] = await pool.execute('SELECT id FROM reviews WHERE id = ?', [id]);
  return rows.length > 0;
}

async function updateReviewReply(id, reply) {
  const [result] = await pool.execute('UPDATE reviews SET admin_reply = ? WHERE id = ?', [reply, id]);
  if (result.affectedRows > 0) return true;
  const [rows] = await pool.execute('SELECT id FROM reviews WHERE id = ?', [id]);
  return rows.length > 0;
}

async function deleteReview(id) {
  const [result] = await pool.execute('DELETE FROM reviews WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function getReviewById(id) {
  const [rows] = await pool.execute('SELECT id, review_image FROM reviews WHERE id = ?', [id]);
  return rows[0] || null;
}

async function reviewImageInUse(image, exceptId) {
  if (!image) return false;
  const [rows] = await pool.execute(
    'SELECT id FROM reviews WHERE review_image = ? AND id != ? LIMIT 1',
    [image, exceptId]
  );
  return rows.length > 0;
}

module.exports = {
  createReview,
  deleteReview,
  getReviewById,
  initializeReviewModule,
  listReviews,
  productExists,
  reviewImageInUse,
  updateReviewReply,
  updateReviewStatus
};
