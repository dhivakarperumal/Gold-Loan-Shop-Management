const { pool } = require('../config/db');

async function initializeEnquiryModule() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS enquiries (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      customer_name VARCHAR(150) NOT NULL,
      phone VARCHAR(32) NOT NULL,
      alternate_phone VARCHAR(32) NULL,
      email VARCHAR(254) NULL,
      address TEXT NULL,
      city VARCHAR(100) NULL,
      state VARCHAR(100) NULL,
      pincode VARCHAR(20) NULL,
      enquiry_type VARCHAR(50) NOT NULL,
      product_category VARCHAR(100) NULL,
      product_id INT UNSIGNED NULL,
      product_name VARCHAR(200) NULL,
      purity VARCHAR(20) NULL,
      quantity DECIMAL(12,3) NULL,
      weight DECIMAL(12,3) NULL,
      approx_budget DECIMAL(14,2) NULL,
      preferred_design VARCHAR(100) NULL,
      message TEXT NULL,
      status ENUM('New Enquiry', 'In Progress', 'Quotation Sent', 'Converted', 'Closed', 'Not Interested') NOT NULL DEFAULT 'New Enquiry',
      follow_up_date DATE NULL,
      follow_up_time TIME NULL,
      assigned_to VARCHAR(150) NULL,
      source VARCHAR(80) NULL,
      priority ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
      whatsapp_confirmation TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_enquiries_status_created (status, created_at),
      INDEX idx_enquiries_phone (phone),
      INDEX idx_enquiries_product (product_id)
    )
  `);
}

async function listEnquiries({ search, status, product, startDate, endDate, page, limit }) {
  const conditions = [];
  const values = [];
  if (search) {
    conditions.push('(customer_name LIKE ? OR phone LIKE ? OR email LIKE ? OR product_name LIKE ? OR message LIKE ?)');
    const term = `%${search}%`;
    values.push(term, term, term, term, term);
  }
  if (status) {
    conditions.push('status = ?');
    values.push(status);
  }
  if (product) {
    conditions.push('(product_category = ? OR enquiry_type = ?)');
    values.push(product, product);
  }
  if (startDate) {
    conditions.push('created_at >= ?');
    values.push(`${startDate} 00:00:00`);
  }
  if (endDate) {
    conditions.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)');
    values.push(endDate);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  const [rows] = await pool.execute(
    `SELECT * FROM enquiries ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );
  const [[countRow]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM enquiries ${where}`,
    values
  );
  const [[statsRow]] = await pool.query(`
    SELECT COUNT(*) AS total,
      COALESCE(SUM(status IN ('New Enquiry', 'In Progress', 'Quotation Sent')), 0) AS pending,
      COALESCE(SUM(status IN ('Converted', 'Quotation Sent')), 0) AS responded,
      COALESCE(SUM(status IN ('Closed', 'Not Interested')), 0) AS closed
    FROM enquiries
  `);
  return {
    enquiries: rows.map((row) => ({ ...row, id: Number(row.id), product_id: row.product_id == null ? null : Number(row.product_id), whatsapp_confirmation: Boolean(row.whatsapp_confirmation) })),
    pagination: { page, limit, total: Number(countRow.total), totalPages: Math.max(1, Math.ceil(Number(countRow.total) / limit)) },
    stats: Object.fromEntries(Object.entries(statsRow).map(([key, value]) => [key, Number(value)]))
  };
}

async function createEnquiry(enquiry) {
  const fields = [
    'customer_name', 'phone', 'alternate_phone', 'email', 'address', 'city', 'state', 'pincode',
    'enquiry_type', 'product_category', 'product_id', 'product_name', 'purity', 'quantity', 'weight',
    'approx_budget', 'preferred_design', 'message', 'status', 'follow_up_date', 'follow_up_time',
    'assigned_to', 'source', 'priority', 'whatsapp_confirmation'
  ];
  const [result] = await pool.execute(
    `INSERT INTO enquiries (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
    fields.map((field) => enquiry[field] ?? null)
  );
  const [rows] = await pool.execute('SELECT * FROM enquiries WHERE id = ?', [result.insertId]);
  return { ...rows[0], id: Number(rows[0].id), whatsapp_confirmation: Boolean(rows[0].whatsapp_confirmation) };
}

async function getEnquiry(id) {
  const [rows] = await pool.execute('SELECT * FROM enquiries WHERE id = ?', [id]);
  return rows[0] || null;
}

async function updateEnquiryStatus(id, status) {
  const [result] = await pool.execute('UPDATE enquiries SET status = ? WHERE id = ?', [status, id]);
  if (result.affectedRows) return true;
  return Boolean(await getEnquiry(id));
}

async function deleteEnquiry(id) {
  const [result] = await pool.execute('DELETE FROM enquiries WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { createEnquiry, deleteEnquiry, getEnquiry, initializeEnquiryModule, listEnquiries, updateEnquiryStatus };
