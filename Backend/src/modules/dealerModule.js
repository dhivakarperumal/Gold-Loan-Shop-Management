const crypto = require('node:crypto');
const { pool } = require('../config/db');

const DEFAULT_CATEGORIES = [
  'Gold Supplier', 'Bullion Dealer', 'Jewellery Wholesaler', 'Goldsmith',
  'Job Worker', 'Old-Gold Dealer', 'Refiner', 'Manufacturer'
];

async function initializeDealerModule() {
  const schemas = [
    `CREATE TABLE IF NOT EXISTS dealer_categories (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS dealer_sequences (
      sequence_name VARCHAR(32) NOT NULL PRIMARY KEY,
      next_value BIGINT UNSIGNED NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS dealers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      dealer_code VARCHAR(32) NOT NULL UNIQUE,
      category_id INT UNSIGNED NOT NULL,
      name VARCHAR(200) NOT NULL,
      contact_person VARCHAR(150) NOT NULL,
      email VARCHAR(254) NULL,
      phone VARCHAR(32) NOT NULL,
      alternate_phone VARCHAR(32) NULL,
      gstin VARCHAR(15) NULL,
      pan VARCHAR(10) NULL,
      billing_address JSON NULL,
      shipping_address JSON NULL,
      opening_balance_side ENUM('payable','receivable') NOT NULL DEFAULT 'payable',
      credit_limit DECIMAL(16,2) NOT NULL DEFAULT 0,
      payment_terms_days SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      bank_details JSON NULL,
      status ENUM('Active','Inactive','On Hold') NOT NULL DEFAULT 'Active',
      notes TEXT NULL,
      created_by INT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_dealers_category FOREIGN KEY (category_id) REFERENCES dealer_categories(id),
      CONSTRAINT fk_dealers_user FOREIGN KEY (created_by) REFERENCES users(user_id),
      INDEX idx_dealers_name (name),
      INDEX idx_dealers_status_category (status, category_id),
      INDEX idx_dealers_gstin (gstin)
    )`,
    `CREATE TABLE IF NOT EXISTS dealer_audit_log (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      dealer_id BIGINT UNSIGNED NOT NULL,
      actor_id INT UNSIGNED NOT NULL,
      action VARCHAR(40) NOT NULL,
      before_data JSON NULL,
      after_data JSON NULL,
      reason VARCHAR(500) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_dealer_audit_dealer FOREIGN KEY (dealer_id) REFERENCES dealers(id),
      CONSTRAINT fk_dealer_audit_user FOREIGN KEY (actor_id) REFERENCES users(user_id),
      INDEX idx_dealer_audit (dealer_id, created_at)
    )`,
    `CREATE TABLE IF NOT EXISTS dealer_documents (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      dealer_id BIGINT UNSIGNED NOT NULL,
      document_type VARCHAR(60) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      stored_name CHAR(36) NOT NULL UNIQUE,
      mime_type VARCHAR(100) NOT NULL,
      uploaded_by INT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_dealer_document_dealer FOREIGN KEY (dealer_id) REFERENCES dealers(id),
      CONSTRAINT fk_dealer_document_user FOREIGN KEY (uploaded_by) REFERENCES users(user_id),
      INDEX idx_dealer_documents (dealer_id, created_at)
    )`,
    `CREATE TABLE IF NOT EXISTS dealer_purchases (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      document_number VARCHAR(40) NOT NULL UNIQUE,
      dealer_id BIGINT UNSIGNED NOT NULL,
      document_type ENUM('invoice','purchase_return','debit_note','credit_note','old_gold') NOT NULL,
      supplier_invoice_number VARCHAR(80) NULL,
      linked_document_id BIGINT UNSIGNED NULL,
      document_date DATE NOT NULL,
      due_date DATE NULL,
      rate_batch_id CHAR(36) NULL,
      gold_rate_date DATE NULL,
      subtotal DECIMAL(16,2) NOT NULL,
      tax_total DECIMAL(16,2) NOT NULL,
      total DECIMAL(16,2) NOT NULL,
      paid_amount DECIMAL(16,2) NOT NULL DEFAULT 0,
      notes VARCHAR(1000) NULL,
      posted_by INT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_dealer_purchase_dealer FOREIGN KEY (dealer_id) REFERENCES dealers(id),
      CONSTRAINT fk_dealer_purchase_user FOREIGN KEY (posted_by) REFERENCES users(user_id),
      CONSTRAINT uq_dealer_supplier_invoice UNIQUE (dealer_id, supplier_invoice_number),
      INDEX idx_dealer_purchase_due (dealer_id, due_date, document_type),
      INDEX idx_dealer_purchase_date (document_date, document_type)
    )`,
    `CREATE TABLE IF NOT EXISTS dealer_purchase_lines (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      purchase_id BIGINT UNSIGNED NOT NULL,
      description VARCHAR(255) NOT NULL,
      metal_type ENUM('Gold','Silver','Other') NOT NULL DEFAULT 'Gold',
      purity VARCHAR(12) NULL,
      quantity DECIMAL(14,3) NOT NULL DEFAULT 1,
      net_weight DECIMAL(14,3) NOT NULL DEFAULT 0,
      rate_per_gram DECIMAL(16,2) NOT NULL DEFAULT 0,
      rate_source ENUM('Global','Negotiated','Non-metal') NOT NULL,
      metal_value DECIMAL(16,2) NOT NULL,
      making_charge DECIMAL(16,2) NOT NULL DEFAULT 0,
      wastage_charge DECIMAL(16,2) NOT NULL DEFAULT 0,
      stone_charge DECIMAL(16,2) NOT NULL DEFAULT 0,
      discount DECIMAL(16,2) NOT NULL DEFAULT 0,
      tax_rate DECIMAL(7,3) NOT NULL DEFAULT 0,
      tax_type ENUM('IGST','CGST_SGST','NONE') NOT NULL DEFAULT 'NONE',
      tax_amount DECIMAL(16,2) NOT NULL DEFAULT 0,
      line_total DECIMAL(16,2) NOT NULL,
      CONSTRAINT fk_dealer_purchase_line FOREIGN KEY (purchase_id) REFERENCES dealer_purchases(id),
      INDEX idx_dealer_purchase_lines (purchase_id)
    )`,
    `CREATE TABLE IF NOT EXISTS dealer_financial_ledger (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      dealer_id BIGINT UNSIGNED NOT NULL,
      entry_number VARCHAR(40) NOT NULL UNIQUE,
      entry_type VARCHAR(40) NOT NULL,
      source_type VARCHAR(40) NOT NULL,
      source_id BIGINT UNSIGNED NULL,
      payable_delta DECIMAL(16,2) NOT NULL DEFAULT 0,
      receivable_delta DECIMAL(16,2) NOT NULL DEFAULT 0,
      description VARCHAR(500) NOT NULL,
      posted_by INT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_dealer_ledger_dealer FOREIGN KEY (dealer_id) REFERENCES dealers(id),
      CONSTRAINT fk_dealer_ledger_user FOREIGN KEY (posted_by) REFERENCES users(user_id),
      INDEX idx_dealer_financial_ledger (dealer_id, created_at, id)
    )`,
    `CREATE TABLE IF NOT EXISTS dealer_payments (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      payment_number VARCHAR(40) NOT NULL UNIQUE,
      dealer_id BIGINT UNSIGNED NOT NULL,
      idempotency_key VARCHAR(100) NOT NULL UNIQUE,
      payment_date DATE NOT NULL,
      amount DECIMAL(16,2) NOT NULL,
      method ENUM('Bank','UPI','Cheque','Cash') NOT NULL,
      reference VARCHAR(120) NULL,
      notes VARCHAR(500) NULL,
      posted_by INT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_dealer_payment_dealer FOREIGN KEY (dealer_id) REFERENCES dealers(id),
      CONSTRAINT fk_dealer_payment_user FOREIGN KEY (posted_by) REFERENCES users(user_id),
      INDEX idx_dealer_payment_date (dealer_id, payment_date)
    )`,
    `CREATE TABLE IF NOT EXISTS dealer_payment_allocations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      payment_id BIGINT UNSIGNED NOT NULL,
      purchase_id BIGINT UNSIGNED NOT NULL,
      amount DECIMAL(16,2) NOT NULL,
      CONSTRAINT fk_dealer_payment_allocation FOREIGN KEY (payment_id) REFERENCES dealer_payments(id),
      CONSTRAINT fk_dealer_allocation_purchase FOREIGN KEY (purchase_id) REFERENCES dealer_purchases(id),
      UNIQUE KEY uq_dealer_payment_purchase (payment_id, purchase_id)
    )`,
    `CREATE TABLE IF NOT EXISTS dealer_payment_reversals (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      payment_id BIGINT UNSIGNED NOT NULL UNIQUE,
      reason VARCHAR(500) NOT NULL,
      reversed_by INT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_dealer_payment_reversal_payment FOREIGN KEY (payment_id) REFERENCES dealer_payments(id),
      CONSTRAINT fk_dealer_payment_reversal_user FOREIGN KEY (reversed_by) REFERENCES users(user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS dealer_metal_ledger (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      dealer_id BIGINT UNSIGNED NOT NULL,
      entry_number VARCHAR(40) NOT NULL UNIQUE,
      source_type VARCHAR(40) NOT NULL,
      source_id BIGINT UNSIGNED NULL,
      metal_type ENUM('Gold','Silver') NOT NULL,
      purity VARCHAR(12) NOT NULL,
      movement ENUM('opening','issued','received','adjustment') NOT NULL,
      weight_delta DECIMAL(14,3) NOT NULL,
      fine_gold_delta DECIMAL(14,3) NOT NULL,
      reconciliation_status ENUM('Not Required','Pending','Approved') NOT NULL DEFAULT 'Not Required',
      description VARCHAR(500) NOT NULL,
      posted_by INT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_dealer_metal_dealer FOREIGN KEY (dealer_id) REFERENCES dealers(id),
      CONSTRAINT fk_dealer_metal_user FOREIGN KEY (posted_by) REFERENCES users(user_id),
      INDEX idx_dealer_metal_ledger (dealer_id, created_at, id, metal_type, purity)
    )`,
    `CREATE TABLE IF NOT EXISTS dealer_jobs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      job_number VARCHAR(40) NOT NULL UNIQUE,
      dealer_id BIGINT UNSIGNED NOT NULL,
      description VARCHAR(500) NOT NULL,
      due_date DATE NULL,
      labour_charge DECIMAL(16,2) NOT NULL DEFAULT 0,
      approved_wastage DECIMAL(14,3) NOT NULL DEFAULT 0,
      status ENUM('Open','Issued','Partially Received','Received','Reconciled','Cancelled') NOT NULL DEFAULT 'Open',
      created_by INT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_dealer_job_dealer FOREIGN KEY (dealer_id) REFERENCES dealers(id),
      CONSTRAINT fk_dealer_job_user FOREIGN KEY (created_by) REFERENCES users(user_id),
      INDEX idx_dealer_jobs (dealer_id, status, due_date)
    )`,
    `CREATE TABLE IF NOT EXISTS dealer_job_issues (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      job_id BIGINT UNSIGNED NOT NULL,
      metal_type ENUM('Gold','Silver') NOT NULL,
      purity VARCHAR(12) NOT NULL,
      weight DECIMAL(14,3) NOT NULL,
      fine_gold_weight DECIMAL(14,3) NOT NULL,
      issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      posted_by INT UNSIGNED NOT NULL,
      CONSTRAINT fk_dealer_job_issue FOREIGN KEY (job_id) REFERENCES dealer_jobs(id),
      CONSTRAINT fk_dealer_job_issue_user FOREIGN KEY (posted_by) REFERENCES users(user_id),
      INDEX idx_dealer_job_issues (job_id)
    )`,
    `CREATE TABLE IF NOT EXISTS dealer_job_receipts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      job_id BIGINT UNSIGNED NOT NULL,
      receipt_number VARCHAR(40) NOT NULL UNIQUE,
      receipt_type ENUM('finished','scrap','dust') NOT NULL,
      metal_type ENUM('Gold','Silver') NOT NULL,
      purity VARCHAR(12) NOT NULL,
      weight DECIMAL(14,3) NOT NULL,
      fine_gold_weight DECIMAL(14,3) NOT NULL,
      labour_charge DECIMAL(16,2) NOT NULL DEFAULT 0,
      received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      posted_by INT UNSIGNED NOT NULL,
      CONSTRAINT fk_dealer_job_receipt FOREIGN KEY (job_id) REFERENCES dealer_jobs(id),
      CONSTRAINT fk_dealer_job_receipt_user FOREIGN KEY (posted_by) REFERENCES users(user_id),
      INDEX idx_dealer_job_receipts (job_id)
    )`,
    `CREATE TABLE IF NOT EXISTS dealer_job_reconciliations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      job_id BIGINT UNSIGNED NOT NULL UNIQUE,
      issued_fine_weight DECIMAL(14,3) NOT NULL,
      returned_fine_weight DECIMAL(14,3) NOT NULL,
      approved_loss DECIMAL(14,3) NOT NULL DEFAULT 0,
      variance DECIMAL(14,3) NOT NULL,
      status ENUM('Pending','Approved') NOT NULL,
      approval_reason VARCHAR(500) NULL,
      approved_by INT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      approved_at TIMESTAMP NULL,
      CONSTRAINT fk_dealer_job_reconciliation FOREIGN KEY (job_id) REFERENCES dealer_jobs(id),
      CONSTRAINT fk_dealer_job_approver FOREIGN KEY (approved_by) REFERENCES users(user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS dealer_old_gold_receipts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      receipt_number VARCHAR(40) NOT NULL UNIQUE,
      dealer_id BIGINT UNSIGNED NOT NULL,
      linked_purchase_id BIGINT UNSIGNED NULL,
      gross_weight DECIMAL(14,3) NOT NULL,
      stone_weight DECIMAL(14,3) NOT NULL DEFAULT 0,
      net_weight DECIMAL(14,3) NOT NULL,
      tested_purity VARCHAR(12) NOT NULL,
      fine_gold_weight DECIMAL(14,3) NOT NULL,
      agreed_rate DECIMAL(16,2) NOT NULL,
      rate_batch_id CHAR(36) NULL,
      gold_rate_date DATE NULL,
      settlement_amount DECIMAL(16,2) NOT NULL,
      rate_source ENUM('Global','Negotiated') NOT NULL,
      received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      received_by INT UNSIGNED NOT NULL,
      CONSTRAINT fk_dealer_old_gold_dealer FOREIGN KEY (dealer_id) REFERENCES dealers(id),
      CONSTRAINT fk_dealer_old_gold_user FOREIGN KEY (received_by) REFERENCES users(user_id),
      INDEX idx_dealer_old_gold (dealer_id, received_at)
    )`,
    `CREATE TABLE IF NOT EXISTS dealer_refining_receipts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      refining_number VARCHAR(40) NOT NULL UNIQUE,
      dealer_id BIGINT UNSIGNED NOT NULL,
      old_gold_receipt_id BIGINT UNSIGNED NOT NULL,
      recovered_metal_type ENUM('Gold','Silver') NOT NULL DEFAULT 'Gold',
      recovered_purity VARCHAR(12) NOT NULL,
      recovered_weight DECIMAL(14,3) NOT NULL,
      fine_gold_weight DECIMAL(14,3) NOT NULL,
      refining_charges DECIMAL(16,2) NOT NULL DEFAULT 0,
      recovery_variance DECIMAL(14,3) NOT NULL,
      received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      received_by INT UNSIGNED NOT NULL,
      CONSTRAINT fk_dealer_refining_dealer FOREIGN KEY (dealer_id) REFERENCES dealers(id),
      CONSTRAINT fk_dealer_refining_old_gold FOREIGN KEY (old_gold_receipt_id) REFERENCES dealer_old_gold_receipts(id),
      CONSTRAINT fk_dealer_refining_user FOREIGN KEY (received_by) REFERENCES users(user_id),
      INDEX idx_dealer_refining (dealer_id, received_at)
    )`
  ];
  for (const schema of schemas) await pool.query(schema);
  const [oldGoldColumns] = await pool.query('SHOW COLUMNS FROM dealer_old_gold_receipts');
  if (!oldGoldColumns.some((column) => column.Field === 'rate_batch_id')) {
    await pool.query('ALTER TABLE dealer_old_gold_receipts ADD COLUMN rate_batch_id CHAR(36) NULL AFTER agreed_rate');
  }
  if (!oldGoldColumns.some((column) => column.Field === 'gold_rate_date')) {
    await pool.query('ALTER TABLE dealer_old_gold_receipts ADD COLUMN gold_rate_date DATE NULL AFTER rate_batch_id');
  }
  for (const name of DEFAULT_CATEGORIES) {
    await pool.execute('INSERT IGNORE INTO dealer_categories (name) VALUES (?)', [name]);
  }
  await pool.execute(
    `INSERT IGNORE INTO dealer_sequences (sequence_name, next_value) VALUES
      ('dealer', 1), ('document', 1), ('payment', 1), ('metal', 1), ('job', 1),
      ('job_receipt', 1), ('old_gold', 1), ('refining', 1)`
  );
}

function parseJson(value) {
  if (value == null) return null;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return null; }
}

function mapDealer(row) {
  if (!row) return null;
  return {
    ...row,
    id: Number(row.id),
    category_id: Number(row.category_id),
    billing_address: parseJson(row.billing_address),
    shipping_address: parseJson(row.shipping_address),
    bank_details: parseJson(row.bank_details),
    payable_balance: Number(row.payable_balance || 0),
    receivable_balance: Number(row.receivable_balance || 0),
    credit_limit: Number(row.credit_limit || 0),
    purchase_count: Number(row.purchase_count || 0)
  };
}

const DEALER_SELECT = `
  SELECT d.*, c.name AS category_name,
    COALESCE((SELECT SUM(l.payable_delta) FROM dealer_financial_ledger l WHERE l.dealer_id = d.id), 0) AS payable_balance,
    COALESCE((SELECT SUM(l.receivable_delta) FROM dealer_financial_ledger l WHERE l.dealer_id = d.id), 0) AS receivable_balance,
    (SELECT COUNT(*) FROM dealer_purchases p WHERE p.dealer_id = d.id AND p.document_type = 'invoice') AS purchase_count
  FROM dealers d JOIN dealer_categories c ON c.id = d.category_id
`;

async function nextNumber(connection, sequenceName, prefix) {
  const [rows] = await connection.execute(
    'SELECT next_value FROM dealer_sequences WHERE sequence_name = ? FOR UPDATE',
    [sequenceName]
  );
  if (!rows.length) throw new Error(`Dealer sequence ${sequenceName} is not initialized`);
  const number = Number(rows[0].next_value);
  await connection.execute('UPDATE dealer_sequences SET next_value = next_value + 1 WHERE sequence_name = ?', [sequenceName]);
  return `${prefix}-${String(number).padStart(8, '0')}`;
}

async function writeAudit(connection, dealerId, actorId, action, beforeData, afterData, reason = null) {
  await connection.execute(
    `INSERT INTO dealer_audit_log (dealer_id, actor_id, action, before_data, after_data, reason)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [dealerId, actorId, action, beforeData ? JSON.stringify(beforeData) : null,
      afterData ? JSON.stringify(afterData) : null, reason]
  );
}

async function writeFinancialLedger(connection, { dealerId, type, sourceType, sourceId = null, payableDelta = 0, receivableDelta = 0, description, userId }) {
  const entryNumber = await nextNumber(connection, 'document', 'DL');
  await connection.execute(
    `INSERT INTO dealer_financial_ledger
      (dealer_id, entry_number, entry_type, source_type, source_id, payable_delta, receivable_delta, description, posted_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [dealerId, entryNumber, type, sourceType, sourceId, payableDelta, receivableDelta, description, userId]
  );
}

async function writeMetalLedger(connection, { dealerId, sourceType, sourceId = null, metalType, purity, movement, weightDelta, fineGoldDelta, status = 'Not Required', description, userId }) {
  const entryNumber = await nextNumber(connection, 'metal', 'ML');
  await connection.execute(
    `INSERT INTO dealer_metal_ledger
      (dealer_id, entry_number, source_type, source_id, metal_type, purity, movement, weight_delta, fine_gold_delta, reconciliation_status, description, posted_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [dealerId, entryNumber, sourceType, sourceId, metalType, purity, movement, weightDelta, fineGoldDelta, status, description, userId]
  );
}

async function listDealerCategories() {
  const [rows] = await pool.query('SELECT id, name, active FROM dealer_categories ORDER BY name');
  return rows.map((row) => ({ ...row, id: Number(row.id), active: Boolean(row.active) }));
}

async function createDealerCategory(name) {
  const [result] = await pool.execute('INSERT INTO dealer_categories (name) VALUES (?)', [name]);
  return { id: Number(result.insertId), name, active: true };
}

async function createDealer(input, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [categories] = await connection.execute('SELECT id FROM dealer_categories WHERE id = ? AND active = TRUE FOR UPDATE', [input.category_id]);
    if (!categories.length) throw Object.assign(new Error('Select an active dealer category'), { code: 'INVALID_CATEGORY' });
    const dealerCode = await nextNumber(connection, 'dealer', 'DLR');
    const [result] = await connection.execute(
      `INSERT INTO dealers
        (dealer_code, category_id, name, contact_person, email, phone, alternate_phone, gstin, pan,
         billing_address, shipping_address, opening_balance_side, credit_limit, payment_terms_days,
         bank_details, status, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [dealerCode, input.category_id, input.name, input.contact_person, input.email, input.phone,
        input.alternate_phone, input.gstin, input.pan, JSON.stringify(input.billing_address),
        JSON.stringify(input.shipping_address), input.opening_balance_side, input.credit_limit,
        input.payment_terms_days, JSON.stringify(input.bank_details), input.status, input.notes, userId]
    );
    const dealerId = result.insertId;
    if (input.opening_balance > 0) {
      await writeFinancialLedger(connection, {
        dealerId, type: 'Opening Balance', sourceType: 'opening', payableDelta: input.opening_balance_side === 'payable' ? input.opening_balance : 0,
        receivableDelta: input.opening_balance_side === 'receivable' ? input.opening_balance : 0,
        description: 'Dealer opening financial balance', userId
      });
    }
    for (const balance of input.opening_metal_balances) {
      const fine = balance.metal_type === 'Gold' ? balance.weight * Number(balance.purity) / 1000 : 0;
      await writeMetalLedger(connection, {
        dealerId, sourceType: 'opening', metalType: balance.metal_type, purity: balance.purity,
        movement: 'opening', weightDelta: balance.weight, fineGoldDelta: fine,
        description: 'Dealer opening metal balance', userId
      });
    }
    const [afterRows] = await connection.execute(`${DEALER_SELECT} WHERE d.id = ?`, [dealerId]);
    await writeAudit(connection, dealerId, userId, 'Created', null, afterRows[0]);
    await connection.commit();
    return mapDealer(afterRows[0]);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateDealer(id, input, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(`${DEALER_SELECT} WHERE d.id = ? FOR UPDATE`, [id]);
    if (!rows.length) {
      await connection.rollback();
      return null;
    }
    const before = rows[0];
    await connection.execute(
      `UPDATE dealers SET category_id = ?, name = ?, contact_person = ?, email = ?, phone = ?,
        alternate_phone = ?, gstin = ?, pan = ?, billing_address = ?, shipping_address = ?,
        credit_limit = ?, payment_terms_days = ?, bank_details = ?, status = ?, notes = ?
       WHERE id = ?`,
      [input.category_id, input.name, input.contact_person, input.email, input.phone, input.alternate_phone,
        input.gstin, input.pan, JSON.stringify(input.billing_address), JSON.stringify(input.shipping_address),
        input.credit_limit, input.payment_terms_days, JSON.stringify(input.bank_details), input.status, input.notes, id]
    );
    const [updatedRows] = await connection.execute(`${DEALER_SELECT} WHERE d.id = ?`, [id]);
    await writeAudit(connection, id, userId, 'Updated', before, updatedRows[0], input.audit_reason);
    await connection.commit();
    return mapDealer(updatedRows[0]);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function listDealers({ page, limit, search, status, categoryId }) {
  const clauses = [];
  const values = [];
  if (search) {
    clauses.push('(d.dealer_code LIKE ? OR d.name LIKE ? OR d.contact_person LIKE ? OR d.phone LIKE ? OR d.email LIKE ? OR d.gstin LIKE ?)');
    const term = `%${search}%`;
    values.push(term, term, term, term, term, term);
  }
  if (status) { clauses.push('d.status = ?'); values.push(status); }
  if (categoryId) { clauses.push('d.category_id = ?'); values.push(categoryId); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM dealers d ${where}`, values);
  const offset = (page - 1) * limit;
  const [rows] = await pool.execute(
    `${DEALER_SELECT} ${where} ORDER BY d.created_at DESC, d.id DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );
  return { dealers: rows.map(mapDealer), pagination: { page, limit, total: Number(total), totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

async function getDealerById(id, connection = pool) {
  const [rows] = await connection.execute(`${DEALER_SELECT} WHERE d.id = ?`, [id]);
  return mapDealer(rows[0]);
}

async function getDealerAudit(id) {
  const [rows] = await pool.execute(
    `SELECT a.id, a.action, a.before_data, a.after_data, a.reason, a.created_at, u.username AS actor
     FROM dealer_audit_log a JOIN users u ON u.user_id = a.actor_id
     WHERE a.dealer_id = ? ORDER BY a.created_at DESC, a.id DESC`,
    [id]
  );
  return rows.map((row) => ({ ...row, before_data: parseJson(row.before_data), after_data: parseJson(row.after_data) }));
}

async function listDealerDocuments(dealerId) {
  const [rows] = await pool.execute(
    `SELECT id, dealer_id, document_type, original_name, mime_type, uploaded_by, created_at
     FROM dealer_documents WHERE dealer_id = ? ORDER BY created_at DESC, id DESC`,
    [dealerId]
  );
  return rows.map((row) => ({ ...row, id: Number(row.id), dealer_id: Number(row.dealer_id) }));
}

async function addDealerDocument({ dealerId, documentType, originalName, storedName, mimeType, userId }) {
  const [result] = await pool.execute(
    `INSERT INTO dealer_documents (dealer_id, document_type, original_name, stored_name, mime_type, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [dealerId, documentType, originalName, storedName, mimeType, userId]
  );
  return Number(result.insertId);
}

async function getDealerDocument(documentId) {
  const [rows] = await pool.execute('SELECT * FROM dealer_documents WHERE id = ?', [documentId]);
  return rows[0] || null;
}

async function deleteDealerDocument(documentId) {
  const [result] = await pool.execute('DELETE FROM dealer_documents WHERE id = ?', [documentId]);
  return result.affectedRows > 0;
}

async function getDealerSummary() {
  const [[dealers]] = await pool.query(`SELECT COUNT(*) AS total,
    SUM(status = 'Active') AS active FROM dealers`);
  const [[financial]] = await pool.query(`SELECT
    COALESCE(SUM(payable_delta), 0) AS payables,
    COALESCE(SUM(receivable_delta), 0) AS receivables
    FROM dealer_financial_ledger`);
  const [[overdue]] = await pool.query(`SELECT COUNT(*) AS count, COALESCE(SUM(p.total - p.paid_amount), 0) AS amount
    FROM dealer_purchases p WHERE p.document_type = 'invoice' AND p.due_date < CURDATE() AND p.total > p.paid_amount`);
  const [[jobs]] = await pool.query("SELECT COUNT(*) AS count FROM dealer_jobs WHERE status NOT IN ('Reconciled','Cancelled')");
  const [[periodPurchases]] = await pool.query(`SELECT COALESCE(SUM(total), 0) AS total
    FROM dealer_purchases WHERE document_type = 'invoice'
      AND document_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`);
  const [metal] = await pool.query(`SELECT metal_type, purity, ROUND(SUM(weight_delta), 3) AS weight,
    ROUND(SUM(fine_gold_delta), 3) AS fine_gold_weight
    FROM dealer_metal_ledger GROUP BY metal_type, purity HAVING ABS(SUM(weight_delta)) > 0.0005`);
  return {
    dealers: { total: Number(dealers.total || 0), active: Number(dealers.active || 0) },
    payables: Number(financial.payables || 0),
    receivables: Number(financial.receivables || 0),
    overdue: { count: Number(overdue.count || 0), amount: Number(overdue.amount || 0) },
    purchases_this_month: Number(periodPurchases.total || 0),
    pending_jobs: Number(jobs.count || 0),
    metal_outstanding: metal.map((row) => ({ ...row, weight: Number(row.weight), fine_gold_weight: Number(row.fine_gold_weight) }))
  };
}

async function getCurrentRate(metalType, purity, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT batch_id, rate_date, rate_per_gram
     FROM gold_rates
     WHERE status = 'Active' AND effective_from <= UTC_TIMESTAMP()
       AND metal_type = ? AND purity = ?
     ORDER BY effective_from DESC, created_at DESC, id DESC LIMIT 1`,
    [metalType, purity]
  );
  return rows[0] || null;
}

function money(value) { return Math.round((value + Number.EPSILON) * 100) / 100; }

function calculatePurchaseLines(lines, rates) {
  const normalized = [];
  let subtotal = 0;
  let taxTotal = 0;
  for (const line of lines) {
    const quantity = Number(line.quantity ?? 1);
    const weight = Number(line.net_weight ?? 0);
    const metalType = line.metal_type || 'Gold';
    const purity = String(line.purity || '');
    let rate = Number(line.rate_per_gram ?? 0);
    let rateSource = 'Non-metal';
    if (metalType !== 'Other') {
      if (line.negotiated_rate === true) {
        rateSource = 'Negotiated';
        if (!(rate > 0)) throw Object.assign(new Error('Negotiated rate must be positive'), { code: 'INVALID_LINE' });
      }
      else {
        const currentRate = rates.get(`${metalType}:${purity}`);
        if (!currentRate) throw Object.assign(new Error(`No active ${metalType} ${purity} rate is configured`), { code: 'RATE_NOT_FOUND' });
        rate = Number(currentRate.rate_per_gram);
        rateSource = 'Global';
      }
    }
    const unitRate = metalType === 'Other' ? Number(line.unit_price ?? rate) : rate;
    const making = Number(line.making_charge || 0);
    const wastage = Number(line.wastage_charge || 0);
    const stone = Number(line.stone_charge || 0);
    const discount = Number(line.discount || 0);
    const taxRate = Number(line.tax_rate || 0);
    const taxType = line.tax_type || 'NONE';
    if (!line.description || line.description.trim().length > 255
      || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1000000
      || !Number.isFinite(weight) || weight < 0 || weight > 1000000
      || (metalType !== 'Other' && weight <= 0)
      || (metalType !== 'Other' && (!/^\d{3}$/.test(purity) || Number(purity) < 1 || Number(purity) > 1000))
      || !Number.isFinite(unitRate) || unitRate < 0 || unitRate > 100000000
      || [making, wastage, stone, discount, taxRate].some((value) => !Number.isFinite(value) || value < 0)
      || taxRate > 100 || !['IGST','CGST_SGST','NONE'].includes(taxType)) {
      throw Object.assign(new Error('Purchase line contains invalid quantity, rate, charges, discount, or tax values'), { code: 'INVALID_LINE' });
    }
    const metalValue = money(metalType === 'Other' ? quantity * unitRate : weight * unitRate);
    const taxable = money(metalValue + making + wastage + stone - discount);
    if (taxable < 0) throw Object.assign(new Error('Line discount cannot exceed the taxable amount'), { code: 'INVALID_LINE' });
    const tax = taxType === 'NONE' ? 0 : money(taxable * taxRate / 100);
    const total = money(taxable + tax);
    subtotal = money(subtotal + taxable);
    taxTotal = money(taxTotal + tax);
    normalized.push({
      description: line.description.trim(), metal_type: metalType, purity: purity || null,
      quantity, net_weight: weight, rate_per_gram: unitRate, rate_source: rateSource,
      metal_value: metalValue, making_charge: making, wastage_charge: wastage,
      stone_charge: stone, discount, tax_rate: taxRate, tax_type: taxType,
      tax_amount: tax, line_total: total
    });
  }
  if (!normalized.length) throw Object.assign(new Error('Add at least one purchase line'), { code: 'INVALID_LINE' });
  return { lines: normalized, subtotal, tax_total: taxTotal, total: money(subtotal + taxTotal) };
}

async function createPurchase(input, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const dealer = await getDealerById(input.dealer_id, connection);
    if (!dealer || dealer.status !== 'Active') throw Object.assign(new Error('Active dealer not found'), { code: 'DEALER_NOT_FOUND' });
    if (input.document_type === 'invoice' && input.supplier_invoice_number) {
      const [duplicate] = await connection.execute(
        'SELECT id FROM dealer_purchases WHERE dealer_id = ? AND supplier_invoice_number = ? FOR UPDATE',
        [input.dealer_id, input.supplier_invoice_number]
      );
      if (duplicate.length) throw Object.assign(new Error('This supplier invoice number is already recorded for this dealer'), { code: 'DUPLICATE_INVOICE' });
    }
    const rateRows = await Promise.all(
      [...new Set(input.lines.filter((line) => (line.metal_type || 'Gold') !== 'Other')
        .map((line) => `${line.metal_type || 'Gold'}:${line.purity}`))]
        .map(async (key) => {
          const [metalType, purity] = key.split(':');
          return [key, await getCurrentRate(metalType, purity, connection)];
        })
    );
    const rates = new Map(rateRows.filter(([, rate]) => rate).map(([key, rate]) => [key, rate]));
    const totals = calculatePurchaseLines(input.lines, rates);
    let dueDate = input.due_date;
    if (!dueDate && input.document_type === 'invoice' && Number(dealer.payment_terms_days) > 0) {
      const calculatedDue = new Date(`${input.document_date}T00:00:00.000Z`);
      calculatedDue.setUTCDate(calculatedDue.getUTCDate() + Number(dealer.payment_terms_days));
      dueDate = calculatedDue.toISOString().slice(0, 10);
    }
    if (input.document_type === 'invoice' && Number(dealer.credit_limit) > 0) {
      const [[balance]] = await connection.execute(
        'SELECT COALESCE(SUM(payable_delta), 0) AS payable FROM dealer_financial_ledger WHERE dealer_id = ?',
        [input.dealer_id]
      );
      if (Number(balance.payable) + totals.total > Number(dealer.credit_limit)) {
        throw Object.assign(new Error('Purchase would exceed this dealer credit limit'), { code: 'CREDIT_LIMIT' });
      }
    }
    if (input.document_type !== 'invoice') {
      if (!input.linked_document_id) throw Object.assign(new Error('Returns and adjustment notes must link to an original invoice'), { code: 'LINKED_INVOICE_REQUIRED' });
      const [linkedRows] = await connection.execute(
        `SELECT id, total,
          (SELECT COALESCE(SUM(adjustment.total), 0) FROM dealer_purchases adjustment
           WHERE adjustment.linked_document_id = dealer_purchases.id) AS adjusted_total
         FROM dealer_purchases WHERE id = ? AND dealer_id = ? AND document_type = 'invoice' FOR UPDATE`,
        [input.linked_document_id, input.dealer_id]
      );
      if (!linkedRows.length) throw Object.assign(new Error('Linked supplier invoice was not found for this dealer'), { code: 'INVALID_LINKED_INVOICE' });
      if (totals.total > Number(linkedRows[0].total) - Number(linkedRows[0].adjusted_total) + 0.005) {
        throw Object.assign(new Error('Linked adjustments cannot exceed the original supplier invoice total'), { code: 'INVALID_LINKED_INVOICE' });
      }
    }
    const documentNumber = await nextNumber(connection, 'document', 'PUR');
    const [result] = await connection.execute(
      `INSERT INTO dealer_purchases
        (document_number, dealer_id, document_type, supplier_invoice_number, linked_document_id,
         document_date, due_date, rate_batch_id, gold_rate_date, subtotal, tax_total, total, notes, posted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [documentNumber, input.dealer_id, input.document_type, input.supplier_invoice_number, input.linked_document_id,
        input.document_date, dueDate || null, rateRows.find(([, rate]) => rate)?.[1]?.batch_id || null,
        rateRows.find(([, rate]) => rate)?.[1]?.rate_date || null, totals.subtotal, totals.tax_total,
        totals.total, input.notes, userId]
    );
    for (const line of totals.lines) {
      await connection.execute(
        `INSERT INTO dealer_purchase_lines
          (purchase_id, description, metal_type, purity, quantity, net_weight, rate_per_gram, rate_source,
           metal_value, making_charge, wastage_charge, stone_charge, discount, tax_rate, tax_type, tax_amount, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [result.insertId, line.description, line.metal_type, line.purity, line.quantity, line.net_weight,
          line.rate_per_gram, line.rate_source, line.metal_value, line.making_charge, line.wastage_charge,
          line.stone_charge, line.discount, line.tax_rate, line.tax_type, line.tax_amount, line.line_total]
      );
    }
    const payableDelta = input.document_type === 'invoice' || input.document_type === 'credit_note'
      ? totals.total : -totals.total;
    await writeFinancialLedger(connection, {
      dealerId: input.dealer_id, type: input.document_type, sourceType: 'purchase', sourceId: result.insertId,
      payableDelta, description: `${input.document_type} ${documentNumber}`, userId
    });
    await connection.commit();
    return getPurchaseById(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getPurchaseById(id, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT p.*, d.dealer_code, d.name AS dealer_name
     FROM dealer_purchases p JOIN dealers d ON d.id = p.dealer_id WHERE p.id = ?`,
    [id]
  );
  if (!rows.length) return null;
  const [lines] = await connection.execute('SELECT * FROM dealer_purchase_lines WHERE purchase_id = ? ORDER BY id', [id]);
  return {
    ...rows[0],
    id: Number(rows[0].id),
    dealer_id: Number(rows[0].dealer_id),
    total: Number(rows[0].total),
    paid_amount: Number(rows[0].paid_amount),
    lines
  };
}

async function listPurchases({ dealerId, page, limit, search, overdue }) {
  const clauses = ["p.document_type IN ('invoice','purchase_return','debit_note','credit_note','old_gold')"];
  const values = [];
  if (dealerId) { clauses.push('p.dealer_id = ?'); values.push(dealerId); }
  if (search) { clauses.push('(p.document_number LIKE ? OR p.supplier_invoice_number LIKE ? OR d.name LIKE ?)'); const term = `%${search}%`; values.push(term, term, term); }
  if (overdue) clauses.push("p.document_type = 'invoice' AND p.due_date < CURDATE() AND p.total > p.paid_amount");
  const where = `WHERE ${clauses.join(' AND ')}`;
  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM dealer_purchases p JOIN dealers d ON d.id = p.dealer_id ${where}`,
    values
  );
  const offset = (page - 1) * limit;
  const [rows] = await pool.execute(
    `SELECT p.*, d.dealer_code, d.name AS dealer_name,
      GREATEST(p.total - p.paid_amount, 0) AS outstanding
     FROM dealer_purchases p JOIN dealers d ON d.id = p.dealer_id
     ${where} ORDER BY p.document_date DESC, p.id DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );
  return { purchases: rows.map((row) => ({ ...row, id: Number(row.id), dealer_id: Number(row.dealer_id), total: Number(row.total), paid_amount: Number(row.paid_amount), outstanding: Number(row.outstanding) })), pagination: { page, limit, total: Number(total), totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

async function postPayment(input, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [prior] = await connection.execute('SELECT * FROM dealer_payments WHERE idempotency_key = ? FOR UPDATE', [input.idempotency_key]);
    if (prior.length) {
      const payment = prior[0];
      if (Number(payment.dealer_id) !== input.dealer_id || Number(payment.amount) !== input.amount) {
        throw Object.assign(new Error('Idempotency key has already been used for a different payment'), { code: 'IDEMPOTENCY_CONFLICT' });
      }
      await connection.commit();
      return { ...payment, duplicate: true };
    }
    const [dealerRows] = await connection.execute('SELECT id FROM dealers WHERE id = ? AND status = "Active" FOR UPDATE', [input.dealer_id]);
    if (!dealerRows.length) throw Object.assign(new Error('Active dealer not found'), { code: 'DEALER_NOT_FOUND' });
    const allocations = [];
    let allocatedTotal = 0;
    const seen = new Set();
    for (const allocation of input.allocations) {
      if (seen.has(allocation.purchase_id)) throw Object.assign(new Error('An invoice can only appear once in allocations'), { code: 'INVALID_ALLOCATION' });
      seen.add(allocation.purchase_id);
      const [purchaseRows] = await connection.execute(
        `SELECT id, total, paid_amount FROM dealer_purchases
         WHERE id = ? AND dealer_id = ? AND document_type = 'invoice' FOR UPDATE`,
        [allocation.purchase_id, input.dealer_id]
      );
      if (!purchaseRows.length) throw Object.assign(new Error(`Invoice ${allocation.purchase_id} was not found for this dealer`), { code: 'INVALID_ALLOCATION' });
      const amount = money(allocation.amount);
      const due = money(Number(purchaseRows[0].total) - Number(purchaseRows[0].paid_amount));
      if (amount <= 0 || amount > due) throw Object.assign(new Error('Allocation must be positive and no greater than the invoice outstanding amount'), { code: 'INVALID_ALLOCATION' });
      allocatedTotal = money(allocatedTotal + amount);
      allocations.push({ purchase_id: allocation.purchase_id, amount });
    }
    if (allocatedTotal > input.amount) throw Object.assign(new Error('Invoice allocations cannot exceed payment amount'), { code: 'INVALID_ALLOCATION' });
    const paymentNumber = await nextNumber(connection, 'payment', 'PAY');
    const [result] = await connection.execute(
      `INSERT INTO dealer_payments
        (payment_number, dealer_id, idempotency_key, payment_date, amount, method, reference, notes, posted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [paymentNumber, input.dealer_id, input.idempotency_key, input.payment_date, input.amount,
        input.method, input.reference, input.notes, userId]
    );
    for (const allocation of allocations) {
      await connection.execute('INSERT INTO dealer_payment_allocations (payment_id, purchase_id, amount) VALUES (?, ?, ?)', [result.insertId, allocation.purchase_id, allocation.amount]);
      await connection.execute('UPDATE dealer_purchases SET paid_amount = paid_amount + ? WHERE id = ?', [allocation.amount, allocation.purchase_id]);
    }
    await writeFinancialLedger(connection, {
      dealerId: input.dealer_id, type: 'Payment', sourceType: 'payment', sourceId: result.insertId,
      payableDelta: -allocatedTotal, receivableDelta: money(input.amount - allocatedTotal),
      description: `${input.method} payment ${paymentNumber}${input.reference ? ` (${input.reference})` : ''}`, userId
    });
    await connection.commit();
    return { id: Number(result.insertId), payment_number: paymentNumber, dealer_id: input.dealer_id, amount: input.amount, allocated_amount: allocatedTotal, advance_amount: money(input.amount - allocatedTotal), duplicate: false };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function reversePayment(paymentId, reason, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [payments] = await connection.execute('SELECT * FROM dealer_payments WHERE id = ? FOR UPDATE', [paymentId]);
    if (!payments.length) throw Object.assign(new Error('Payment was not found'), { code: 'PAYMENT_NOT_FOUND' });
    const [existing] = await connection.execute('SELECT id FROM dealer_payment_reversals WHERE payment_id = ? FOR UPDATE', [paymentId]);
    if (existing.length) throw Object.assign(new Error('Payment has already been reversed'), { code: 'PAYMENT_ALREADY_REVERSED' });
    const payment = payments[0];
    const [allocations] = await connection.execute(
      'SELECT purchase_id, amount FROM dealer_payment_allocations WHERE payment_id = ? FOR UPDATE',
      [paymentId]
    );
    let allocatedTotal = 0;
    for (const allocation of allocations) {
      const amount = Number(allocation.amount);
      const [result] = await connection.execute(
        'UPDATE dealer_purchases SET paid_amount = paid_amount - ? WHERE id = ? AND paid_amount >= ?',
        [amount, allocation.purchase_id, amount]
      );
      if (result.affectedRows !== 1) {
        throw Object.assign(new Error('Invoice allocation cannot be reversed because its paid balance has changed'), { code: 'INVALID_ALLOCATION' });
      }
      allocatedTotal = money(allocatedTotal + amount);
    }
    const [reversal] = await connection.execute(
      'INSERT INTO dealer_payment_reversals (payment_id, reason, reversed_by) VALUES (?, ?, ?)',
      [paymentId, reason, userId]
    );
    const advanceAmount = money(Number(payment.amount) - allocatedTotal);
    await writeFinancialLedger(connection, {
      dealerId: payment.dealer_id, type: 'Payment Reversal', sourceType: 'payment_reversal',
      sourceId: reversal.insertId, payableDelta: allocatedTotal, receivableDelta: -advanceAmount,
      description: `Reversal of ${payment.payment_number}: ${reason}`, userId
    });
    await connection.commit();
    return { id: Number(reversal.insertId), payment_id: Number(paymentId), payment_number: payment.payment_number, reversed: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function createJob(input, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [dealer] = await connection.execute("SELECT id FROM dealers WHERE id = ? AND status = 'Active' FOR UPDATE", [input.dealer_id]);
    if (!dealer.length) throw Object.assign(new Error('Active dealer not found'), { code: 'DEALER_NOT_FOUND' });
    const jobNumber = await nextNumber(connection, 'job', 'JOB');
    const [result] = await connection.execute(
      `INSERT INTO dealer_jobs (job_number, dealer_id, description, due_date, labour_charge, approved_wastage, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [jobNumber, input.dealer_id, input.description, input.due_date, input.labour_charge, input.approved_wastage, userId]
    );
    await connection.commit();
    return { id: Number(result.insertId), job_number: jobNumber, dealer_id: input.dealer_id, status: 'Open' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

async function issueJob(input, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [jobs] = await connection.execute('SELECT * FROM dealer_jobs WHERE id = ? FOR UPDATE', [input.job_id]);
    if (!jobs.length || !['Open','Issued'].includes(jobs[0].status)) throw Object.assign(new Error('Only an open or issued job can receive an issue voucher'), { code: 'JOB_NOT_OPEN' });
    const line = input;
    const fine = line.metal_type === 'Gold' ? line.weight * Number(line.purity) / 1000 : 0;
    await connection.execute(
      `INSERT INTO dealer_job_issues (job_id, metal_type, purity, weight, fine_gold_weight, posted_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [input.job_id, line.metal_type, line.purity, line.weight, fine, userId]
    );
    await writeMetalLedger(connection, {
      dealerId: jobs[0].dealer_id, sourceType: 'job_issue', sourceId: input.job_id,
      metalType: line.metal_type, purity: line.purity, movement: 'issued',
      weightDelta: line.weight, fineGoldDelta: fine, status: 'Pending',
      description: `Metal issued to job ${jobs[0].job_number}`, userId
    });
    await connection.execute("UPDATE dealer_jobs SET status = 'Issued' WHERE id = ?", [input.job_id]);
    await connection.commit();
    return { job_id: Number(input.job_id), issued_weight: line.weight, fine_gold_weight: fine };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

async function receiveJob(input, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [jobs] = await connection.execute('SELECT * FROM dealer_jobs WHERE id = ? FOR UPDATE', [input.job_id]);
    if (!jobs.length || !['Issued','Partially Received'].includes(jobs[0].status)) throw Object.assign(new Error('Job must have issued metal before a receipt can be posted'), { code: 'JOB_NOT_ISSUED' });
    const fine = input.metal_type === 'Gold' ? input.weight * Number(input.purity) / 1000 : 0;
    const receiptNumber = await nextNumber(connection, 'job_receipt', 'JRC');
    await connection.execute(
      `INSERT INTO dealer_job_receipts
        (job_id, receipt_number, receipt_type, metal_type, purity, weight, fine_gold_weight, labour_charge, posted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [input.job_id, receiptNumber, input.receipt_type, input.metal_type, input.purity, input.weight, fine, input.labour_charge, userId]
    );
    await writeMetalLedger(connection, {
      dealerId: jobs[0].dealer_id, sourceType: 'job_receipt', sourceId: input.job_id,
      metalType: input.metal_type, purity: input.purity, movement: 'received',
      weightDelta: -input.weight, fineGoldDelta: -fine, status: 'Pending',
      description: `${input.receipt_type} returned for job ${jobs[0].job_number}`, userId
    });
    await connection.execute("UPDATE dealer_jobs SET status = 'Partially Received' WHERE id = ?", [input.job_id]);
    await connection.commit();
    return { receipt_number: receiptNumber, job_id: Number(input.job_id), fine_gold_weight: fine };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

async function reconcileJob(jobId, input, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [jobs] = await connection.execute('SELECT * FROM dealer_jobs WHERE id = ? FOR UPDATE', [jobId]);
    if (!jobs.length) throw Object.assign(new Error('Job not found'), { code: 'JOB_NOT_FOUND' });
    if (['Reconciled','Cancelled'].includes(jobs[0].status)) throw Object.assign(new Error('Job is already closed'), { code: 'JOB_CLOSED' });
    const [[issue]] = await connection.execute('SELECT COALESCE(SUM(fine_gold_weight),0) AS total FROM dealer_job_issues WHERE job_id = ?', [jobId]);
    const [[returned]] = await connection.execute('SELECT COALESCE(SUM(fine_gold_weight),0) AS total FROM dealer_job_receipts WHERE job_id = ?', [jobId]);
    const [[receiptLabour]] = await connection.execute('SELECT COALESCE(SUM(labour_charge),0) AS total FROM dealer_job_receipts WHERE job_id = ?', [jobId]);
    const issuedFine = Number(issue.total);
    const returnedFine = Number(returned.total);
    const approvedLoss = Number(input.approved_loss || 0);
    const variance = Math.round((issuedFine - returnedFine - approvedLoss) * 1000) / 1000;
    const withinApprovedTolerance = Math.abs(variance) <= 0.005 && approvedLoss <= Number(jobs[0].approved_wastage) + 0.005;
    if (!withinApprovedTolerance && !input.reason) {
      await connection.rollback();
      return { error: 'APPROVAL_REQUIRED', issued_fine_weight: issuedFine, returned_fine_weight: returnedFine, variance };
    }
    if (approvedLoss > Number(jobs[0].approved_wastage) + 0.005) {
      throw Object.assign(new Error('Approved process loss exceeds the job order allowance'), { code: 'LOSS_EXCEEDED' });
    }
    const status = withinApprovedTolerance ? 'Approved' : 'Pending';
    await connection.execute(
      `INSERT INTO dealer_job_reconciliations
        (job_id, issued_fine_weight, returned_fine_weight, approved_loss, variance, status, approval_reason, approved_by, approved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [jobId, issuedFine, returnedFine, approvedLoss, variance, status, input.reason || null,
        status === 'Approved' ? userId : null, status === 'Approved' ? new Date() : null]
    );
    if (status === 'Approved') {
      await connection.execute("UPDATE dealer_jobs SET status = 'Reconciled' WHERE id = ?", [jobId]);
      await connection.execute("UPDATE dealer_metal_ledger SET reconciliation_status = 'Approved' WHERE source_type IN ('job_issue','job_receipt') AND source_id = ?", [jobId]);
      const totalLabour = Number(jobs[0].labour_charge) + Number(receiptLabour.total);
      if (totalLabour > 0) {
        await writeFinancialLedger(connection, {
          dealerId: jobs[0].dealer_id, type: 'Job Work Labour', sourceType: 'job', sourceId: jobId,
          payableDelta: totalLabour, description: `Approved labour for job ${jobs[0].job_number}`, userId
        });
      }
    }
    await connection.commit();
    return { job_id: Number(jobId), issued_fine_weight: issuedFine, returned_fine_weight: returnedFine, approved_loss: approvedLoss, variance, status };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

async function approveJobReconciliation(jobId, reason, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT j.*, r.issued_fine_weight, r.returned_fine_weight, r.approved_loss, r.variance, r.status AS reconciliation_status
       FROM dealer_jobs j JOIN dealer_job_reconciliations r ON r.job_id = j.id
       WHERE j.id = ? FOR UPDATE`,
      [jobId]
    );
    if (!rows.length) throw Object.assign(new Error('Pending reconciliation was not found'), { code: 'JOB_NOT_FOUND' });
    const job = rows[0];
    if (job.reconciliation_status !== 'Pending') {
      throw Object.assign(new Error('Reconciliation is not awaiting approval'), { code: 'JOB_CLOSED' });
    }
    if (Number(job.approved_loss) > Number(job.approved_wastage) + 0.005) {
      throw Object.assign(new Error('Approved process loss exceeds the job order allowance'), { code: 'LOSS_EXCEEDED' });
    }
    await connection.execute(
      `UPDATE dealer_job_reconciliations SET status = 'Approved', approval_reason = ?,
       approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE job_id = ?`,
      [reason, userId, jobId]
    );
    await connection.execute("UPDATE dealer_jobs SET status = 'Reconciled' WHERE id = ?", [jobId]);
    await connection.execute(
      "UPDATE dealer_metal_ledger SET reconciliation_status = 'Approved' WHERE source_type IN ('job_issue','job_receipt') AND source_id = ?",
      [jobId]
    );
    const remainingFineVariance = Number(job.variance);
    if (Math.abs(remainingFineVariance) > 0.005) {
      await writeMetalLedger(connection, {
        dealerId: job.dealer_id, sourceType: 'job_reconciliation', sourceId: jobId,
        metalType: 'Gold', purity: '999', movement: 'adjustment',
        weightDelta: -remainingFineVariance / 0.999, fineGoldDelta: -remainingFineVariance,
        status: 'Approved', description: `Authorized fine-gold reconciliation adjustment for ${job.job_number}: ${reason}`, userId
      });
    }
    const [[receiptLabour]] = await connection.execute(
      'SELECT COALESCE(SUM(labour_charge),0) AS total FROM dealer_job_receipts WHERE job_id = ?',
      [jobId]
    );
    const totalLabour = Number(job.labour_charge) + Number(receiptLabour.total);
    if (totalLabour > 0) {
      await writeFinancialLedger(connection, {
        dealerId: job.dealer_id, type: 'Job Work Labour', sourceType: 'job', sourceId: jobId,
        payableDelta: totalLabour, description: `Approved labour for job ${job.job_number}`, userId
      });
    }
    await connection.commit();
    return { job_id: Number(jobId), status: 'Approved', variance: remainingFineVariance };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

async function createOldGoldReceipt(input, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [dealerRows] = await connection.execute("SELECT id FROM dealers WHERE id = ? AND status = 'Active' FOR UPDATE", [input.dealer_id]);
    if (!dealerRows.length) throw Object.assign(new Error('Active dealer not found'), { code: 'DEALER_NOT_FOUND' });
    const receiptNumber = await nextNumber(connection, 'old_gold', 'OGR');
    const fine = input.net_weight * Number(input.tested_purity) / 1000;
    const settlementAmount = money(input.net_weight * input.agreed_rate);
    const [result] = await connection.execute(
      `INSERT INTO dealer_old_gold_receipts
        (receipt_number, dealer_id, gross_weight, stone_weight, net_weight, tested_purity,
           fine_gold_weight, agreed_rate, rate_batch_id, gold_rate_date, settlement_amount, rate_source, received_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [receiptNumber, input.dealer_id, input.gross_weight, input.stone_weight, input.net_weight,
          input.tested_purity, fine, input.agreed_rate, input.rate_batch_id || null, input.gold_rate_date || null,
          settlementAmount, input.rate_source, userId]
    );
    await writeMetalLedger(connection, {
      dealerId: input.dealer_id, sourceType: 'old_gold', sourceId: result.insertId,
      metalType: 'Gold', purity: input.tested_purity, movement: 'received',
      weightDelta: -input.net_weight, fineGoldDelta: -fine,
      description: `Old-gold receipt ${receiptNumber}`, userId
    });
    await writeFinancialLedger(connection, {
      dealerId: input.dealer_id, type: 'Old Gold Settlement', sourceType: 'old_gold',
      sourceId: result.insertId, payableDelta: settlementAmount,
      description: `Settlement for old-gold receipt ${receiptNumber}`, userId
    });
    await connection.commit();
    return { id: Number(result.insertId), receipt_number: receiptNumber, fine_gold_weight: fine, settlement_amount: settlementAmount, rate_source: input.rate_source };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

async function createRefiningReceipt(input, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [oldRows] = await connection.execute('SELECT * FROM dealer_old_gold_receipts WHERE id = ? FOR UPDATE', [input.old_gold_receipt_id]);
    if (!oldRows.length || Number(oldRows[0].dealer_id) !== input.dealer_id) {
      throw Object.assign(new Error('Linked old-gold receipt was not found for this dealer'), { code: 'OLD_GOLD_NOT_FOUND' });
    }
    const [[recoveredBefore]] = await connection.execute(
      'SELECT COALESCE(SUM(fine_gold_weight), 0) AS total FROM dealer_refining_receipts WHERE old_gold_receipt_id = ?',
      [input.old_gold_receipt_id]
    );
    const refiningNumber = await nextNumber(connection, 'refining', 'REF');
    const fine = input.recovered_metal_type === 'Gold'
      ? input.recovered_weight * Number(input.recovered_purity) / 1000 : 0;
    if (fine + Number(recoveredBefore.total) > Number(oldRows[0].fine_gold_weight) + 0.005) {
      throw Object.assign(new Error('Recovered fine gold cannot exceed the linked old-gold receipt'), { code: 'RECOVERY_EXCEEDS_SOURCE' });
    }
    const variance = Math.round((Number(oldRows[0].fine_gold_weight) - fine) * 1000) / 1000;
    const [result] = await connection.execute(
      `INSERT INTO dealer_refining_receipts
        (refining_number, dealer_id, old_gold_receipt_id, recovered_metal_type, recovered_purity,
         recovered_weight, fine_gold_weight, refining_charges, recovery_variance, received_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [refiningNumber, input.dealer_id, input.old_gold_receipt_id, input.recovered_metal_type,
        input.recovered_purity, input.recovered_weight, fine, input.refining_charges, variance, userId]
    );
    if (Number(input.refining_charges) > 0) {
      await writeFinancialLedger(connection, {
        dealerId: input.dealer_id, type: 'Refining Charge', sourceType: 'refining',
        sourceId: result.insertId, payableDelta: Number(input.refining_charges),
        description: `Refining charges ${refiningNumber}`, userId
      });
    }
    await connection.commit();
    return { id: Number(result.insertId), refining_number: refiningNumber, fine_gold_weight: fine, recovery_variance: variance };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

async function getDealerStatement(dealerId, { from, to }) {
  const clauses = [];
  const values = [];
  if (from) { clauses.push('created_at >= ?'); values.push(`${from} 00:00:00`); }
  if (to) { clauses.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)'); values.push(to); }
  const dateFilter = clauses.length ? `AND ${clauses.join(' AND ')}` : '';
  const [financial] = await pool.execute(
    `WITH ledger AS (
       SELECT id, entry_number, entry_type, source_type, source_id, payable_delta, receivable_delta,
         description, created_at,
         SUM(payable_delta) OVER (ORDER BY created_at, id) AS payable_balance,
         SUM(receivable_delta) OVER (ORDER BY created_at, id) AS receivable_balance
       FROM dealer_financial_ledger WHERE dealer_id = ?
     )
     SELECT ledger.*,
       CASE WHEN ledger.source_type = 'payment' AND EXISTS (
         SELECT 1 FROM dealer_payment_reversals reversal WHERE reversal.payment_id = ledger.source_id
       ) THEN TRUE ELSE FALSE END AS is_reversed
     FROM ledger WHERE 1 = 1 ${dateFilter} ORDER BY created_at, id`,
    [dealerId, ...values]
  );
  const [metal] = await pool.execute(
    `WITH ledger AS (
       SELECT id, entry_number, source_type, source_id, metal_type, purity, movement, weight_delta,
         fine_gold_delta, reconciliation_status, description, created_at,
         SUM(weight_delta) OVER (PARTITION BY metal_type, purity ORDER BY created_at, id) AS closing_weight
       FROM dealer_metal_ledger WHERE dealer_id = ?
     )
     SELECT * FROM ledger WHERE 1 = 1 ${dateFilter} ORDER BY created_at, id`,
    [dealerId, ...values]
  );
  return {
    financial: financial.map((row) => ({ ...row, payable_delta: Number(row.payable_delta), receivable_delta: Number(row.receivable_delta), payable_balance: Number(row.payable_balance), receivable_balance: Number(row.receivable_balance) })),
    metal: metal.map((row) => ({ ...row, weight_delta: Number(row.weight_delta), fine_gold_delta: Number(row.fine_gold_delta), closing_weight: Number(row.closing_weight) }))
  };
}

async function listDealerTransactions(dealerId, page = 1, limit = 100) {
  const offset = (page - 1) * limit;
  const [rows] = await pool.execute(
    `SELECT 'purchase' AS source, id, document_number AS reference, document_type AS type, total AS amount, document_date AS transaction_date, created_at
       FROM dealer_purchases WHERE dealer_id = ?
     UNION ALL
     SELECT 'payment', id, payment_number, method, amount, payment_date, created_at
       FROM dealer_payments WHERE dealer_id = ?
     UNION ALL
     SELECT 'job', id, job_number, status, labour_charge, DATE(created_at), created_at
       FROM dealer_jobs WHERE dealer_id = ?
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [dealerId, dealerId, dealerId, limit, offset]
  );
  return rows;
}

async function listOutstandingInvoices(dealerId) {
  const [rows] = await pool.execute(
    `SELECT id, document_number, supplier_invoice_number, document_date, due_date, total, paid_amount,
      GREATEST(total - paid_amount, 0) AS outstanding
     FROM dealer_purchases
     WHERE dealer_id = ? AND document_type = 'invoice' AND total > paid_amount
     ORDER BY due_date, document_date`,
    [dealerId]
  );
  return rows.map((row) => ({ ...row, id: Number(row.id), total: Number(row.total), paid_amount: Number(row.paid_amount), outstanding: Number(row.outstanding) }));
}

async function listJobs({ dealerId, status, page, limit }) {
  const clauses = [];
  const values = [];
  if (dealerId) { clauses.push('j.dealer_id = ?'); values.push(dealerId); }
  if (status) { clauses.push('j.status = ?'); values.push(status); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM dealer_jobs j ${where}`,
    values
  );
  const offset = (page - 1) * limit;
  const [rows] = await pool.execute(
    `SELECT j.*, d.dealer_code, d.name AS dealer_name,
       COALESCE((SELECT SUM(i.fine_gold_weight) FROM dealer_job_issues i WHERE i.job_id = j.id),0) AS issued_fine_weight,
       COALESCE((SELECT SUM(r.fine_gold_weight) FROM dealer_job_receipts r WHERE r.job_id = j.id),0) AS returned_fine_weight,
       rec.variance AS reconciliation_variance, rec.status AS reconciliation_status
     FROM dealer_jobs j JOIN dealers d ON d.id = j.dealer_id
     LEFT JOIN dealer_job_reconciliations rec ON rec.job_id = j.id
     ${where} ORDER BY j.created_at DESC, j.id DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );
  const jobs = rows.map((row) => ({
    ...row, id: Number(row.id), dealer_id: Number(row.dealer_id),
    labour_charge: Number(row.labour_charge), approved_wastage: Number(row.approved_wastage),
    issued_fine_weight: Number(row.issued_fine_weight), returned_fine_weight: Number(row.returned_fine_weight),
    reconciliation_variance: row.reconciliation_variance == null ? null : Number(row.reconciliation_variance)
  }));
  return { jobs, pagination: { page, limit, total: Number(total), totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

async function listOldGoldReceipts({ dealerId, page, limit }) {
  const where = dealerId ? 'WHERE r.dealer_id = ?' : '';
  const values = dealerId ? [dealerId] : [];
  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM dealer_old_gold_receipts r ${where}`, values
  );
  const [rows] = await pool.execute(
    `SELECT r.id, r.receipt_number, r.dealer_id, d.dealer_code, d.name AS dealer_name,
       r.gross_weight, r.stone_weight, r.net_weight, r.tested_purity, r.fine_gold_weight,
       r.agreed_rate, r.rate_batch_id, r.gold_rate_date, r.settlement_amount, r.rate_source, r.received_at,
       COALESCE((SELECT SUM(x.fine_gold_weight) FROM dealer_refining_receipts x WHERE x.old_gold_receipt_id = r.id), 0) AS recovered_fine_gold
     FROM dealer_old_gold_receipts r JOIN dealers d ON d.id = r.dealer_id ${where}
     ORDER BY r.received_at DESC, r.id DESC LIMIT ? OFFSET ?`,
    [...values, limit, (page - 1) * limit]
  );
  const receipts = rows.map((row) => Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      ['id', 'dealer_id'].includes(key) ? Number(value) : value
    ])
  ));
  return { receipts, pagination: { page, limit, total: Number(total), totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

module.exports = {
  calculatePurchaseLines,
  createDealer,
  createJob,
  createOldGoldReceipt,
  approveJobReconciliation,
  createPurchase,
  createRefiningReceipt,
  addDealerDocument,
  createDealerCategory,
  deleteDealerDocument,
  getCurrentRate,
  getDealerAudit,
  getDealerById,
  getDealerDocument,
  getDealerStatement,
  getDealerSummary,
  initializeDealerModule,
  issueJob,
  listDealerCategories,
  listDealerDocuments,
  listJobs,
  listOldGoldReceipts,
  listDealerTransactions,
  listDealers,
  listOutstandingInvoices,
  listPurchases,
  nextNumber,
  postPayment,
  reversePayment,
  receiveJob,
  reconcileJob,
  updateDealer
};
