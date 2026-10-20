const { pool } = require('../config/db');
const { insertTransaction } = require('./fundModule');

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
      discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      gst_amount DECIMAL(12,2) NOT NULL,
      total_amount DECIMAL(12,2) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const [discountColumns] = await pool.query("SHOW COLUMNS FROM billings LIKE 'discount_amount'");
  if (discountColumns.length === 0) {
    await pool.query('ALTER TABLE billings ADD COLUMN discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER sub_total');
  }
  const [paidColumns] = await pool.query("SHOW COLUMNS FROM billings LIKE 'paid_amount'");
  if (paidColumns.length === 0) {
    await pool.query('ALTER TABLE billings ADD COLUMN paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER total_amount');
  }
  const [balanceColumns] = await pool.query("SHOW COLUMNS FROM billings LIKE 'balance_due'");
  if (balanceColumns.length === 0) {
    await pool.query('ALTER TABLE billings ADD COLUMN balance_due DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER paid_amount');
    await pool.query('UPDATE billings SET balance_due = total_amount');
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS billing_payments (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      billing_id BIGINT UNSIGNED NOT NULL,
      account_id BIGINT UNSIGNED NOT NULL,
      payment_kind ENUM('PAYMENT', 'REFUND') NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      payment_method VARCHAR(40) NOT NULL,
      reference_number VARCHAR(100) NULL,
      payment_date DATETIME NOT NULL,
      idempotency_key VARCHAR(150) NOT NULL,
      created_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_billing_payments_bill FOREIGN KEY (billing_id)
        REFERENCES billings(id) ON DELETE RESTRICT,
      CONSTRAINT fk_billing_payments_account FOREIGN KEY (account_id)
        REFERENCES fund_accounts(id) ON DELETE RESTRICT,
      UNIQUE KEY uq_billing_payment_idempotency (idempotency_key),
      INDEX idx_billing_payments_bill (billing_id, payment_date, id)
    )
  `);
}

async function listBillings() {
  const [rows] = await pool.query(`
    SELECT id, invoice_no, customers, products, exchanges, payment_type,
      sub_total, discount_amount, gst_amount, total_amount, paid_amount, balance_due, created_at
    FROM billings
    ORDER BY created_at DESC, id DESC
  `);
  return rows;
}

async function getBillingById(id) {
  const [rows] = await pool.execute(
    `SELECT id, invoice_no, customers, products, exchanges, payment_type,
      sub_total, discount_amount, gst_amount, total_amount, paid_amount, balance_due, created_at
     FROM billings WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function getBillingProductsByIds(productIds) {
  if (productIds.length === 0) return [];
  const placeholders = productIds.map(() => '?').join(', ');
  const [rows] = await pool.execute(
    `SELECT id, name, category, purity, gross_weight, net_gold_weight, making_charge_type, making_charge,
      gold_rate_per_gram, gold_value, mrp, offer_type, offer_price, applied_discount, tax_amount,
      final_selling_price, status
     FROM products
     WHERE id IN (${placeholders})`,
    productIds
  );
  return rows;
}

async function createBilling(billing) {
  const [result] = await pool.execute(
    `INSERT INTO billings
      (invoice_no, customers, products, exchanges, payment_type, sub_total, discount_amount, gst_amount, total_amount, paid_amount, balance_due)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      billing.invoice_no,
      JSON.stringify(billing.customers),
      JSON.stringify(billing.products),
      JSON.stringify(billing.exchanges),
      billing.payment_type,
      billing.sub_total,
      billing.discount_amount,
      billing.gst_amount,
      billing.total_amount,
      billing.total_amount
    ]
  );
  return getBillingById(result.insertId);
}

async function updateBilling(id, billing) {
  await pool.execute(
    `UPDATE billings
     SET customers = ?, products = ?, exchanges = ?, payment_type = ?,
       sub_total = ?, discount_amount = ?, gst_amount = ?, total_amount = ?,
       balance_due = GREATEST(? - paid_amount, 0)
     WHERE id = ?`,
    [
      JSON.stringify(billing.customers),
      JSON.stringify(billing.products),
      JSON.stringify(billing.exchanges),
      billing.payment_type,
      billing.sub_total,
      billing.discount_amount,
      billing.gst_amount,
      billing.total_amount,
      billing.total_amount,
      id
    ]
  );
  return getBillingById(id);
}

async function recordBillingPayment(id, payment) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [bills] = await connection.execute(
      'SELECT id, invoice_no, customers, total_amount, paid_amount FROM billings WHERE id = ? FOR UPDATE',
      [id]
    );
    if (!bills.length) {
      const error = new Error('Bill not found');
      error.code = 'BILL_NOT_FOUND';
      throw error;
    }
    const [accounts] = await connection.execute(
      'SELECT id, is_active FROM fund_accounts WHERE id = ? FOR UPDATE',
      [payment.account_id]
    );
    if (!accounts.length || !accounts[0].is_active) {
      const error = new Error('Select an active fund account');
      error.code = 'FUND_ACCOUNT_NOT_FOUND';
      throw error;
    }
    const bill = bills[0];
    const currentPaid = Number(bill.paid_amount);
    if (payment.payment_kind === 'REFUND' && Number(payment.amount) > currentPaid) {
      const error = new Error('Refund cannot exceed the amount collected for this bill');
      error.code = 'REFUND_EXCEEDS_PAID';
      throw error;
    }
    if (payment.payment_kind === 'REFUND') {
      const [balanceRows] = await connection.execute(
        `SELECT a.opening_balance + COALESCE(SUM(CASE
          WHEN t.status = 'POSTED' AND t.transaction_type IN ('FUND_ADDED', 'CREDIT', 'TRANSFER_IN') THEN t.amount
          WHEN t.status = 'POSTED' AND t.transaction_type IN ('DEBIT', 'TRANSFER_OUT') THEN -t.amount ELSE 0
        END), 0) AS balance
         FROM fund_accounts a LEFT JOIN fund_transactions t ON t.account_id = a.id
         WHERE a.id = ? GROUP BY a.id`,
        [payment.account_id]
      );
      if (Number(balanceRows[0].balance) < Number(payment.amount)) {
        const error = new Error('The selected account does not have enough available funds for this refund');
        error.code = 'INSUFFICIENT_FUNDS';
        throw error;
      }
    }
    await connection.execute(
      `INSERT INTO billing_payments
        (billing_id, account_id, payment_kind, amount, payment_method, reference_number,
         payment_date, idempotency_key, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, payment.account_id, payment.payment_kind, payment.amount, payment.payment_method,
        payment.reference_number || null, payment.payment_date, payment.idempotency_key,
        payment.created_by || null
      ]
    );
    const customerData = typeof bill.customers === 'string' ? JSON.parse(bill.customers) : bill.customers;
    const customerName = Array.isArray(customerData) ? customerData.map((customer) => customer.name).join(', ') : '';
    await insertTransaction(connection, {
      account_id: payment.account_id,
      transaction_type: payment.payment_kind === 'PAYMENT' ? 'CREDIT' : 'DEBIT',
      category: payment.payment_kind === 'PAYMENT' ? 'Gold Sales Billing Collection' : 'Customer Refund',
      transaction_date: payment.payment_date,
      amount: payment.amount,
      party_name: customerName,
      related_reference: bill.invoice_no,
      payment_method: payment.payment_method,
      reference_number: payment.reference_number,
      description: payment.payment_kind === 'PAYMENT' ? 'Billing collection' : 'Refund against original bill',
      idempotency_key: payment.idempotency_key,
      created_by: payment.created_by
    });
    const paidAmount = currentPaid + (payment.payment_kind === 'PAYMENT' ? Number(payment.amount) : -Number(payment.amount));
    await connection.execute(
      'UPDATE billings SET paid_amount = ?, balance_due = GREATEST(total_amount - ?, 0) WHERE id = ?',
      [paidAmount.toFixed(2), paidAmount.toFixed(2), id]
    );
    await connection.commit();
    return getBillingById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteBilling(id) {
  const [result] = await pool.execute('DELETE FROM billings WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  createBilling,
  deleteBilling,
  getBillingById,
  getBillingProductsByIds,
  initializeBillingModule,
  listBillings,
  recordBillingPayment,
  updateBilling
};
