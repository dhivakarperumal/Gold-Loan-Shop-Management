const crypto = require('node:crypto');
const { pool } = require('../config/db');

const INTEREST_TYPES = [
  ['simple', 'Simple Interest'],
  ['compound', 'Compound Interest'],
  ['flat', 'Flat Rate Interest'],
  ['reducing_balance', 'Reducing Balance Interest'],
  ['daily', 'Daily Interest'],
  ['monthly', 'Monthly Interest'],
  ['annual', 'Annual Interest'],
  ['fixed', 'Fixed Interest Amount'],
  ['slab_based', 'Slab-Based Interest'],
  ['custom', 'Custom Interest']
];

async function initializeLoanModule() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS loans (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      loan_number VARCHAR(40) NOT NULL UNIQUE,
      customer_id BIGINT UNSIGNED NOT NULL,
      gold_pledge_number VARCHAR(60) NOT NULL,
      jewellery_type VARCHAR(100) NOT NULL,
      gold_purity VARCHAR(30) NOT NULL,
      gross_weight DECIMAL(12,3) NOT NULL,
      stone_weight DECIMAL(12,3) NOT NULL DEFAULT 0,
      net_gold_weight DECIMAL(12,3) NOT NULL,
      gold_valuation DECIMAL(14,2) NOT NULL,
      gold_rate_per_gram DECIMAL(14,2) NULL,
      gold_rate_date DATE NULL,
      principal_amount DECIMAL(14,2) NOT NULL,
      interest_type VARCHAR(30) NOT NULL,
      interest_rate DECIMAL(9,4) NOT NULL DEFAULT 0,
      fixed_interest_amount DECIMAL(14,2) NULL,
      interest_frequency VARCHAR(20) NOT NULL,
      custom_period_days SMALLINT UNSIGNED NULL,
      interest_calculation_start_date DATE NOT NULL,
      compounding_frequency VARCHAR(20) NULL,
      day_count_convention VARCHAR(20) NOT NULL DEFAULT 'actual_365',
      grace_period_days SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      late_payment_interest_rate DECIMAL(9,4) NULL,
      interest_free_days SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      minimum_interest_amount DECIMAL(14,2) NULL,
      maximum_interest_amount DECIMAL(14,2) NULL,
      processing_fee DECIMAL(14,2) NOT NULL DEFAULT 0,
      other_charges DECIMAL(14,2) NOT NULL DEFAULT 0,
      loan_date DATE NOT NULL,
      maturity_date DATE NOT NULL,
      payment_frequency VARCHAR(20) NOT NULL,
      loan_status VARCHAR(20) NOT NULL DEFAULT 'Active',
      notes TEXT NULL,
      gold_image_url VARCHAR(255) NULL,
      created_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_loans_customer FOREIGN KEY (customer_id)
        REFERENCES loan_customers(id) ON DELETE RESTRICT,
      INDEX idx_loans_customer_status (customer_id, loan_status),
      INDEX idx_loans_maturity_status (maturity_date, loan_status),
      UNIQUE KEY uq_loans_gold_pledge_number (gold_pledge_number)
    )
  `);
  const [loanColumns] = await pool.query('SHOW COLUMNS FROM loans');
  const existingColumns = new Set(loanColumns.map((column) => column.Field));
  const loanColumnMigrations = {
    fixed_interest_amount: 'DECIMAL(14,2) NULL AFTER interest_rate',
    custom_period_days: 'SMALLINT UNSIGNED NULL AFTER interest_frequency',
    gold_rate_per_gram: 'DECIMAL(14,2) NULL AFTER gold_valuation',
    gold_rate_date: 'DATE NULL AFTER gold_rate_per_gram',
    gold_image_url: 'VARCHAR(255) NULL AFTER notes'
  };
  for (const [column, definition] of Object.entries(loanColumnMigrations)) {
    if (!existingColumns.has(column)) {
      await pool.query(`ALTER TABLE loans ADD COLUMN \`${column}\` ${definition}`);
    }
  }
  const [pledgeIndex] = await pool.query("SHOW INDEX FROM loans WHERE Key_name = 'uq_loans_gold_pledge_number'");
  if (pledgeIndex.length === 0) {
    const [[{ duplicateCount }]] = await pool.query(`
      SELECT COUNT(*) AS duplicateCount FROM (
        SELECT gold_pledge_number FROM loans
        GROUP BY gold_pledge_number HAVING COUNT(*) > 1
      ) duplicates
    `);
    if (duplicateCount === 0) {
      await pool.query('ALTER TABLE loans ADD UNIQUE KEY uq_loans_gold_pledge_number (gold_pledge_number)');
    } else {
      console.warn('Skipped unique gold pledge number index migration because duplicate existing values need manual review.');
    }
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS interest_types (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      type_key VARCHAR(30) NOT NULL UNIQUE,
      label VARCHAR(80) NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  for (const [typeKey, label] of INTEREST_TYPES) {
    await pool.execute(
      `INSERT INTO interest_types (type_key, label) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE label = VALUES(label)`,
      [typeKey, label]
    );
  }
}

async function listInterestTypes() {
  const [rows] = await pool.query(
    'SELECT type_key, label, enabled FROM interest_types ORDER BY id'
  );
  return rows;
}

async function setInterestTypeEnabled(typeKey, enabled) {
  const [result] = await pool.execute(
    'UPDATE interest_types SET enabled = ? WHERE type_key = ?',
    [enabled, typeKey]
  );
  return result.affectedRows > 0;
}

async function listLoans() {
  const [rows] = await pool.query(`
    SELECT l.*, c.customer_code, c.full_name AS customer_name, c.mobile AS customer_mobile
    FROM loans l JOIN loan_customers c ON c.id = l.customer_id
    ORDER BY l.created_at DESC, l.id DESC
  `);
  return rows;
}

async function getLoanById(id) {
  const [rows] = await pool.execute(
    `SELECT l.*, c.customer_code, c.full_name AS customer_name, c.mobile AS customer_mobile,
      c.address AS customer_address, c.city AS customer_city, c.district AS customer_district,
      c.kyc_status AS customer_kyc_status
     FROM loans l JOIN loan_customers c ON c.id = l.customer_id
     WHERE l.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function listLoansForCustomer(customerId) {
  const [rows] = await pool.execute(
    `SELECT id, loan_number, customer_id, gold_pledge_number, principal_amount, interest_type,
      interest_rate, loan_date, maturity_date, loan_status, created_at
     FROM loans WHERE customer_id = ? ORDER BY created_at DESC, id DESC`,
    [customerId]
  );
  return rows;
}

async function createLoan(loan) {
  const connection = await pool.getConnection();
  let loanId;
  try {
    await connection.beginTransaction();
    const [customers] = await connection.execute(
      'SELECT id FROM loan_customers WHERE id = ? FOR UPDATE',
      [loan.customer_id]
    );
    if (!customers.length) {
      const error = new Error('Selected customer does not exist');
      error.code = 'CUSTOMER_NOT_FOUND';
      throw error;
    }
    const [types] = await connection.execute(
      'SELECT enabled FROM interest_types WHERE type_key = ? FOR UPDATE',
      [loan.interest_type]
    );
    if (!types.length || !types[0].enabled) {
      const error = new Error('Selected interest type is unavailable');
      error.code = 'INTEREST_TYPE_UNAVAILABLE';
      throw error;
    }
    const fields = Object.keys(loan).filter((field) => field !== 'customer_id');
    const columns = ['loan_number', 'gold_pledge_number', 'customer_id', ...fields];
    const temporaryNumber = `TEMP-${crypto.randomUUID()}`;
    const temporaryPledgeNumber = `TEMP-PLEDGE-${crypto.randomUUID()}`;
    const [result] = await connection.execute(
      `INSERT INTO loans (${columns.map((field) => `\`${field}\``).join(', ')})
       VALUES (${columns.map(() => '?').join(', ')})`,
      [temporaryNumber, temporaryPledgeNumber, loan.customer_id, ...fields.map((field) => loan[field])]
    );
    loanId = result.insertId;
    const loanNumber = `GL-${loan.loan_date.replaceAll('-', '')}-${String(loanId).padStart(6, '0')}`;
    const pledgeNumber = `GP-${loan.loan_date.replaceAll('-', '')}-${String(loanId).padStart(6, '0')}`;
    await connection.execute(
      'UPDATE loans SET loan_number = ?, gold_pledge_number = ? WHERE id = ?',
      [loanNumber, pledgeNumber, loanId]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return getLoanById(loanId);
}

async function updateLoan(id, loan) {
  const existingLoan = await getLoanById(id);
  if (!existingLoan) return null;
  const fields = Object.keys(loan);
  await pool.execute(
    `UPDATE loans SET ${fields.map((field) => `\`${field}\` = ?`).join(', ')} WHERE id = ?`,
    [...fields.map((field) => loan[field]), id]
  );
  return getLoanById(id);
}

async function deleteLoan(id) {
  const [result] = await pool.execute('DELETE FROM loans WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function setInterestType(typeKey, enabled) {
  if (!INTEREST_TYPES.some(([key]) => key === typeKey)) return false;
  return setInterestTypeEnabled(typeKey, enabled);
}

module.exports = {
  createLoan,
  deleteLoan,
  getLoanById,
  initializeLoanModule,
  listInterestTypes,
  listLoans,
  listLoansForCustomer,
  setInterestType,
  updateLoan
};
