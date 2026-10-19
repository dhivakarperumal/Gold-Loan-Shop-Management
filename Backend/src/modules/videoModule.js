const { pool } = require('../config/db');

async function initializeVideoModule() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS videos (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      video_id VARCHAR(500) NOT NULL,
      thumbnail VARCHAR(500) NULL,
      type ENUM('youtube', 'custom') NOT NULL DEFAULT 'youtube',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      user_id INT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_videos_active_created (active, created_at),
      INDEX idx_videos_created_at (created_at)
    )
  `);
}

function mapVideo(row) {
  if (!row) return null;
  return {
    ...row,
    id: Number(row.id),
    videoId: row.video_id,
    active: Boolean(row.active)
  };
}

async function listVideos() {
  const [rows] = await pool.query(
    `SELECT id, title, video_id, thumbnail, type, active, user_id, created_at, updated_at
     FROM videos ORDER BY created_at DESC, id DESC`
  );
  return rows.map(mapVideo);
}

async function getVideoById(id) {
  const [rows] = await pool.execute(
    `SELECT id, title, video_id, thumbnail, type, active, user_id, created_at, updated_at
     FROM videos WHERE id = ?`,
    [id]
  );
  return mapVideo(rows[0]);
}

async function createVideo(video) {
  const [result] = await pool.execute(
    `INSERT INTO videos (title, video_id, thumbnail, type, active, user_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [video.title, video.video_id, video.thumbnail, video.type, video.active, video.user_id]
  );
  return getVideoById(result.insertId);
}

async function updateVideo(id, video) {
  const [result] = await pool.execute(
    `UPDATE videos SET title = ?, video_id = ?, thumbnail = ?, type = ?, active = ?, user_id = ?
     WHERE id = ?`,
    [video.title, video.video_id, video.thumbnail, video.type, video.active, video.user_id, id]
  );
  return result.affectedRows > 0 ? getVideoById(id) : null;
}

async function deleteVideo(id) {
  const [result] = await pool.execute('DELETE FROM videos WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  createVideo,
  deleteVideo,
  getVideoById,
  initializeVideoModule,
  listVideos,
  updateVideo
};
