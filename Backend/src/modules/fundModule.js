const { pool } = require('../config/db');
const { addDateRangeCondition } = require('../utils/dateRange');

async function initializeFundModule() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fund_accounts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      account_type ENUM('Cash', 'Bank Account', 'UPI', 'Other') NOT NULL DEFAULT 'Other',
      opening_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
      account_number VARCHAR(100) NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_fund_account_name (name)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fund_transactions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      account_id BIGINT UNSIGNED NOT NULL,
      transaction_type ENUM('FUND_ADDED', 'DEBIT', 'CREDIT', 'TRANSFER_IN', 'TRANSFER_OUT') NOT NULL,
      category VARCHAR(80) NOT NULL,
      transaction_date DATETIME NOT NULL,
      amount DECIMAL(14,2) NOT NULL,
      party_name VARCHAR(150) NULL,
      related_reference VARCHAR(100) NULL,
      payment_method VARCHAR(40) NOT NULL,
      reference_number VARCHAR(100) NULL,
      description TEXT NULL,
      receipt_url VARCHAR(255) NULL,
      transfer_id CHAR(36) NULL,
      idempotency_key VARCHAR(150) NULL,
      status ENUM('POSTED', 'VOID') NOT NULL DEFAULT 'POSTED',
      created_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_fund_transactions_account FOREIGN KEY (account_id)
        REFERENCES fund_accounts(id) ON DELETE RESTRICT,
      UNIQUE KEY uq_fund_transactions_idempotency (idempotency_key),
      INDEX idx_fund_transactions_date (transaction_date, id),
      INDEX idx_fund_transactions_account_date (account_id, transaction_date, id),
      INDEX idx_fund_transactions_category (category)
    )
  `);
  const [rows] = await pool.query('SELECT COUNT(*) AS account_count FROM fund_accounts');
  if (Number(rows[0].account_count) === 0) {
    await pool.query(`
      INSERT INTO fund_accounts (name, account_type) VALUES
        ('Shop Cash', 'Cash'),
        ('Main Bank Account', 'Bank Account'),
        ('Secondary Bank Account', 'Bank Account'),
        ('UPI Account', 'UPI'),
        ('Other Business Account', 'Other')
    `);
  }
}

async function listFundAccounts(connection = pool) {
  const [rows] = await connection.query(`
    SELECT a.id, a.name, a.account_type, a.opening_balance, a.account_number, a.is_active,
      COALESCE(SUM(CASE WHEN t.status = 'POSTED' AND t.transaction_type IN ('FUND_ADDED', 'CREDIT', 'TRANSFER_IN')
        THEN t.amount ELSE 0 END), 0) AS total_credit,
      COALESCE(SUM(CASE WHEN t.status = 'POSTED' AND t.transaction_type IN ('DEBIT', 'TRANSFER_OUT')
        THEN t.amount ELSE 0 END), 0) AS total_debit,
      a.opening_balance
        + COALESCE(SUM(CASE WHEN t.status = 'POSTED' AND t.transaction_type IN ('FUND_ADDED', 'CREDIT', 'TRANSFER_IN')
          THEN t.amount ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN t.status = 'POSTED' AND t.transaction_type IN ('DEBIT', 'TRANSFER_OUT')
          THEN t.amount ELSE 0 END), 0) AS current_balance
    FROM fund_accounts a
    LEFT JOIN fund_transactions t ON t.account_id = a.id
    GROUP BY a.id
    ORDER BY a.is_active DESC, a.name
  `);
  return rows;
}

async function createFundAccount(account) {
  const [result] = await pool.execute(
    `INSERT INTO fund_accounts (name, account_type, opening_balance, account_number)
     VALUES (?, ?, ?, ?)`,
    [account.name, account.account_type, account.opening_balance, account.account_number || null]
  );
  const [rows] = await pool.execute('SELECT * FROM fund_accounts WHERE id = ?', [result.insertId]);
  return rows[0];
}

async function getAccountBalance(connection, accountId, forUpdate = false) {
  const lockClause = forUpdate ? 'FOR UPDATE' : '';
  const [rows] = await connection.execute(
    `SELECT a.opening_balance + COALESCE(SUM(
       CASE
         WHEN t.status = 'POSTED' AND t.transaction_type IN ('FUND_ADDED', 'CREDIT', 'TRANSFER_IN') THEN t.amount
         WHEN t.status = 'POSTED' AND t.transaction_type IN ('DEBIT', 'TRANSFER_OUT') THEN -t.amount
         ELSE 0
       END
     ), 0) AS balance
     FROM fund_accounts a
     LEFT JOIN fund_transactions t ON t.account_id = a.id
     WHERE a.id = ? GROUP BY a.id ${lockClause}`,
    [accountId]
  );
  return rows[0] ? Number(rows[0].balance) : null;
}

async function insertTransaction(connection, entry) {
  const [result] = await connection.execute(
    `INSERT INTO fund_transactions (
      account_id, transaction_type, category, transaction_date, amount, party_name,
      related_reference, payment_method, reference_number, description, receipt_url,
      idempotency_key, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.account_id, entry.transaction_type, entry.category, entry.transaction_date, entry.amount,
      entry.party_name || null, entry.related_reference || null, entry.payment_method,
      entry.reference_number || null, entry.description || null, entry.receipt_url || null,
      entry.idempotency_key || null, entry.created_by || null
    ]
  );
  return result.insertId;
}

async function createFundTransaction(entry) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [accounts] = await connection.execute(
      'SELECT id, is_active FROM fund_accounts WHERE id = ? FOR UPDATE',
      [entry.account_id]
    );
    if (!accounts.length || !accounts[0].is_active) {
      const error = new Error('Select an active fund account');
      error.code = 'FUND_ACCOUNT_NOT_FOUND';
      throw error;
    }
    if (entry.transaction_type === 'DEBIT') {
      const balance = await getAccountBalance(connection, entry.account_id);
      if (balance < Number(entry.amount)) {
        const error = new Error('The selected account does not have enough available funds');
        error.code = 'INSUFFICIENT_FUNDS';
        throw error;
      }
    }
    const id = await insertTransaction(connection, entry);
    await connection.commit();
    return getFundTransaction(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function transferFunds(transfer) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const ids = [transfer.source_account_id, transfer.destination_account_id].sort((a, b) => a - b);
    const [accounts] = await connection.query(
      `SELECT id, is_active FROM fund_accounts WHERE id IN (?, ?) ORDER BY id FOR UPDATE`,
      ids
    );
    if (accounts.length !== 2 || accounts.some((account) => !account.is_active)) {
      const error = new Error('Select two active fund accounts');
      error.code = 'FUND_ACCOUNT_NOT_FOUND';
      throw error;
    }
    const balance = await getAccountBalance(connection, transfer.source_account_id);
    if (balance < Number(transfer.amount)) {
      const error = new Error('The source account does not have enough available funds');
      error.code = 'INSUFFICIENT_FUNDS';
      throw error;
    }
    const transferId = transfer.transfer_id;
    const shared = {
      ...transfer,
      transaction_date: transfer.transaction_date,
      category: 'Internal Transfer',
      payment_method: transfer.payment_method,
      reference_number: transfer.reference_number,
      description: transfer.description,
      transfer_id: transferId
    };
    const [outResult] = await connection.execute(
      `INSERT INTO fund_transactions (
        account_id, transaction_type, category, transaction_date, amount, party_name,
        related_reference, payment_method, reference_number, description, transfer_id,
        idempotency_key, created_by
      ) VALUES (?, 'TRANSFER_OUT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [transfer.source_account_id, shared.category, shared.transaction_date, shared.amount,
        'Transfer to account', String(transfer.destination_account_id), shared.payment_method,
        shared.reference_number || null, shared.description || null, transferId,
        `transfer:${transfer.idempotency_key}:out`, transfer.created_by || null]
    );
    const [inResult] = await connection.execute(
      `INSERT INTO fund_transactions (
        account_id, transaction_type, category, transaction_date, amount, party_name,
        related_reference, payment_method, reference_number, description, transfer_id,
        idempotency_key, created_by
      ) VALUES (?, 'TRANSFER_IN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [transfer.destination_account_id, shared.category, shared.transaction_date, shared.amount,
        'Transfer from account', String(transfer.source_account_id), shared.payment_method,
        shared.reference_number || null, shared.description || null, transferId,
        `transfer:${transfer.idempotency_key}:in`, transfer.created_by || null]
    );
    await connection.commit();
    return { transfer_id: transferId, debit_transaction_id: outResult.insertId, credit_transaction_id: inResult.insertId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getFundTransaction(id) {
  const [rows] = await pool.execute(
    `SELECT t.*, a.name AS account_name
     FROM fund_transactions t JOIN fund_accounts a ON a.id = t.account_id WHERE t.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function listFundTransactions(filters) {
  const conditions = [];
  const values = [];
  addDateRangeCondition(conditions, values, 't.transaction_date', filters.dateRange || { startDate: filters.from, endDate: filters.to });
  if (filters.account_id) { conditions.push('t.account_id = ?'); values.push(filters.account_id); }
  if (filters.transaction_type && filters.transaction_type !== 'ALL') {
    conditions.push('t.transaction_type = ?'); values.push(filters.transaction_type);
  }
  if (filters.category) { conditions.push('t.category = ?'); values.push(filters.category); }
  if (filters.search) {
    conditions.push('(t.party_name LIKE ? OR t.reference_number LIKE ? OR t.related_reference LIKE ? OR t.description LIKE ?)');
    values.push(...Array(4).fill(`%${filters.search}%`));
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const page = Number(filters.page || 1);
  const pageSize = Number(filters.page_size || 20);
  const offset = (page - 1) * pageSize;
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM fund_transactions t ${where}`, values
  );
  const [rows] = await pool.execute(
    `SELECT t.*, a.name AS account_name,
       a.opening_balance + COALESCE((
         SELECT SUM(CASE
           WHEN prior.status = 'POSTED' AND prior.transaction_type IN ('FUND_ADDED', 'CREDIT', 'TRANSFER_IN') THEN prior.amount
           WHEN prior.status = 'POSTED' AND prior.transaction_type IN ('DEBIT', 'TRANSFER_OUT') THEN -prior.amount
           ELSE 0
         END)
         FROM fund_transactions prior
         WHERE prior.account_id = t.account_id
           AND (prior.transaction_date < t.transaction_date
             OR (prior.transaction_date = t.transaction_date AND prior.id <= t.id))
       ), 0) AS running_balance
     FROM fund_transactions t JOIN fund_accounts a ON a.id = t.account_id
     ${where} ORDER BY t.transaction_date DESC, t.id DESC LIMIT ? OFFSET ?`,
    [...values, pageSize, offset]
  );
  return { transactions: rows, total: Number(countRows[0].total), page, page_size: pageSize };
}

async function getFundSummary(dateRange = {}) {
  const accounts = await listFundAccounts();
  const conditions = [];
  const values = [];
  addDateRangeCondition(conditions, values, 'transaction_date', dateRange);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.execute(
    `SELECT
      COALESCE(SUM(CASE WHEN transaction_type = 'FUND_ADDED' AND status = 'POSTED' THEN amount ELSE 0 END), 0) AS fund_added,
      COALESCE(SUM(CASE WHEN transaction_type = 'DEBIT' AND status = 'POSTED' THEN amount ELSE 0 END), 0) AS total_debit,
      COALESCE(SUM(CASE WHEN transaction_type = 'CREDIT' AND status = 'POSTED' THEN amount ELSE 0 END), 0) AS total_credit,
      COALESCE(SUM(CASE WHEN category = 'Customer Gold Loan Disbursement' AND status = 'POSTED' THEN amount ELSE 0 END), 0) AS loan_disbursed,
      COALESCE(SUM(CASE WHEN category = 'Customer Loan Repayment' AND status = 'POSTED' THEN amount ELSE 0 END), 0) AS loan_repayment_received,
      COALESCE(SUM(CASE WHEN category = 'Gold Sales Billing Collection' AND status = 'POSTED' THEN amount ELSE 0 END), 0) AS billing_collection,
      COALESCE(SUM(CASE
        WHEN status = 'POSTED' AND transaction_type IN ('FUND_ADDED', 'CREDIT', 'TRANSFER_IN') THEN amount
        WHEN status = 'POSTED' AND transaction_type IN ('DEBIT', 'TRANSFER_OUT') THEN -amount
        ELSE 0
      END), 0) AS net_change
     FROM fund_transactions ${where}`,
    values
  );
  const [priorRows] = dateRange.startDate
    ? await pool.execute(
      `SELECT COALESCE(SUM(CASE
         WHEN transaction_type IN ('FUND_ADDED', 'CREDIT', 'TRANSFER_IN') THEN amount
         WHEN transaction_type IN ('DEBIT', 'TRANSFER_OUT') THEN -amount ELSE 0 END), 0) AS prior_net
       FROM fund_transactions WHERE status = 'POSTED' AND transaction_date < ?`,
      [`${dateRange.startDate} 00:00:00`]
    )
    : [[{ prior_net: 0 }]];
  const openingBalance = accounts.reduce((sum, account) => sum + Number(account.opening_balance), 0)
    + Number(priorRows[0].prior_net);
  const currentBalance = accounts.reduce((sum, account) => sum + Number(account.current_balance), 0);
  return {
    fund_added: rows[0].fund_added,
    total_debit: rows[0].total_debit,
    total_credit: rows[0].total_credit,
    loan_disbursed: rows[0].loan_disbursed,
    loan_repayment_received: rows[0].loan_repayment_received,
    billing_collection: rows[0].billing_collection,
    opening_balance: openingBalance,
    current_balance: currentBalance,
    closing_balance: openingBalance + Number(rows[0].net_change)
  };
}

module.exports = {
  createFundAccount,
  createFundTransaction,
  getFundSummary,
  getAccountBalance,
  insertTransaction,
  initializeFundModule,
  listFundAccounts,
  listFundTransactions,
  transferFunds
};
