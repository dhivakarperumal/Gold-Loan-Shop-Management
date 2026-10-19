const { pool } = require('../config/db');

async function initializeBillingModule() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS billings (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      invoice_no VARCHAR(50) NOT NULL UNIQUE,
      customers JSON NOT NULL,
      products JSON NOT NULL,
      exchanges JSON NOT NULL,
      payment_type ENUM('FULL_PAYMENT', 'EXCHANGE_GOLD') NOT NULL,
      sub_total DECIMAL(12,2) NOT NULL,
      gst_amount DECIMAL(12,2) NOT NULL,
      total_amount DECIMAL(12,2) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function listBillings() {
  const [rows] = await pool.query(`
    SELECT id, invoice_no, customers, products, exchanges, payment_type,
      sub_total, gst_amount, total_amount, created_at
    FROM billings
    ORDER BY created_at DESC, id DESC
  `);
  return rows;
}

async function getBillingProductsByIds(productIds) {
  if (productIds.length === 0) return [];
  const placeholders = productIds.map(() => '?').join(', ');
  const [rows] = await pool.execute(
    `SELECT id, name, category, purity, mrp, offer_price, final_selling_price, status
     FROM products
     WHERE id IN (${placeholders})`,
    productIds
  );
  return rows;
}

async function createBilling(billing) {
  const [result] = await pool.execute(
    `INSERT INTO billings
      (invoice_no, customers, products, exchanges, payment_type, sub_total, gst_amount, total_amount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      billing.invoice_no,
      JSON.stringify(billing.customers),
      JSON.stringify(billing.products),
      JSON.stringify(billing.exchanges),
      billing.payment_type,
      billing.sub_total,
      billing.gst_amount,
      billing.total_amount
    ]
  );
  const [rows] = await pool.execute(
    `SELECT id, invoice_no, customers, products, exchanges, payment_type,
      sub_total, gst_amount, total_amount, created_at
     FROM billings WHERE id = ?`,
    [result.insertId]
  );
  return rows[0];
}

module.exports = {
  createBilling,
  getBillingProductsByIds,
  initializeBillingModule,
  listBillings
};
