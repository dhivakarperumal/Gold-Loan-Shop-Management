const crypto = require('node:crypto');
const { pool } = require('../config/db');
const { getAccountBalance, insertTransaction } = require('./fundModule');

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
      metal_type ENUM('Gold', 'Silver', 'Platinum', 'Diamond') NOT NULL DEFAULT 'Gold',
      gold_purity VARCHAR(30) NOT NULL,
      gross_weight DECIMAL(12,3) NOT NULL,
      stone_weight DECIMAL(12,3) NOT NULL DEFAULT 0,
      net_gold_weight DECIMAL(12,3) NOT NULL,
      gold_valuation DECIMAL(14,2) NOT NULL,
      gold_rate_per_gram DECIMAL(14,2) NULL,
      rate_unit ENUM('gram', 'carat') NOT NULL DEFAULT 'gram',
      gold_rate_date DATE NULL,
      principal_amount DECIMAL(14,2) NOT NULL,
      outstanding_principal DECIMAL(14,2) NULL,
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
      release_status VARCHAR(30) NOT NULL DEFAULT 'Not Ready',
      gold_released_at DATETIME NULL,
      gold_released_to VARCHAR(150) NULL,
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
    outstanding_principal: 'DECIMAL(14,2) NULL AFTER principal_amount',
    release_status: "VARCHAR(30) NOT NULL DEFAULT 'Not Ready' AFTER loan_status",
    gold_released_at: 'DATETIME NULL AFTER release_status',
    gold_released_to: 'VARCHAR(150) NULL AFTER gold_released_at',
    fixed_interest_amount: 'DECIMAL(14,2) NULL AFTER interest_rate',
    custom_period_days: 'SMALLINT UNSIGNED NULL AFTER interest_frequency',
    gold_rate_per_gram: 'DECIMAL(14,2) NULL AFTER gold_valuation',
    metal_type: "ENUM('Gold', 'Silver', 'Platinum', 'Diamond') NOT NULL DEFAULT 'Gold' AFTER jewellery_type",
    rate_unit: "ENUM('gram', 'carat') NOT NULL DEFAULT 'gram' AFTER gold_rate_per_gram",
    gold_rate_date: 'DATE NULL AFTER gold_rate_per_gram',
    gold_image_url: 'VARCHAR(255) NULL AFTER notes'
  };
  for (const [column, definition] of Object.entries(loanColumnMigrations)) {
    if (!existingColumns.has(column)) {
      await pool.query(`ALTER TABLE loans ADD COLUMN \`${column}\` ${definition}`);
    }
  }
  await pool.query('UPDATE loans SET outstanding_principal = principal_amount WHERE outstanding_principal IS NULL');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS loan_renewals (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      loan_id BIGINT UNSIGNED NOT NULL,
      renewal_date DATE NOT NULL,
      period_start_date DATE NOT NULL,
      previous_maturity_date DATE NOT NULL,
      new_maturity_date DATE NULL,
      payment_amount DECIMAL(14,2) NOT NULL,
      interest_paid DECIMAL(14,2) NOT NULL,
      late_payment_fee DECIMAL(14,2) NOT NULL DEFAULT 0,
      principal_paid DECIMAL(14,2) NOT NULL,
      principal_before DECIMAL(14,2) NOT NULL,
      principal_after DECIMAL(14,2) NOT NULL,
      accrued_interest DECIMAL(14,2) NOT NULL,
      fund_account_id BIGINT UNSIGNED NULL,
      payment_method VARCHAR(40) NULL,
      reference_number VARCHAR(100) NULL,
      idempotency_key VARCHAR(150) NULL,
      created_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_loan_renewals_loan FOREIGN KEY (loan_id)
        REFERENCES loans(id) ON DELETE RESTRICT,
      INDEX idx_loan_renewals_loan_date (loan_id, renewal_date, id)
    )
  `);
  const [renewalColumns] = await pool.query('SHOW COLUMNS FROM loan_renewals');
  if (!renewalColumns.some((column) => column.Field === 'late_payment_fee')) {
    await pool.query('ALTER TABLE loan_renewals ADD COLUMN late_payment_fee DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER interest_paid');
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS loan_review_actions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      loan_id BIGINT UNSIGNED NOT NULL,
      action_type ENUM('notice_sent', 'suspended', 'reinstated') NOT NULL,
      notice_method VARCHAR(20) NULL,
      customer_message TEXT NULL,
      notes TEXT NOT NULL,
      created_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_loan_review_actions_loan FOREIGN KEY (loan_id)
        REFERENCES loans(id) ON DELETE RESTRICT,
      INDEX idx_loan_review_actions_loan_date (loan_id, created_at, id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS loan_gold_releases (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      loan_id BIGINT UNSIGNED NOT NULL UNIQUE,
      released_at DATETIME NOT NULL,
      released_to VARCHAR(150) NOT NULL,
      confirmed_customer_signature BOOLEAN NOT NULL,
      signed_document_url VARCHAR(255) NOT NULL,
      notes TEXT NULL,
      released_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_loan_gold_releases_loan FOREIGN KEY (loan_id)
        REFERENCES loans(id) ON DELETE RESTRICT
    )
  `);
  const [releaseColumns] = await pool.query('SHOW COLUMNS FROM loan_gold_releases');
  if (!releaseColumns.some((column) => column.Field === 'signed_document_url')) {
    await pool.query('ALTER TABLE loan_gold_releases ADD COLUMN signed_document_url VARCHAR(255) NULL AFTER confirmed_customer_signature');
  }
  await pool.query(`
    UPDATE loans l
    LEFT JOIN loan_gold_releases r ON r.loan_id = l.id
    SET l.release_status = IF(r.id IS NULL, 'Pending Release', 'Released'),
      l.loan_status = IF(r.id IS NULL, 'Active', 'Completed'),
      l.gold_released_at = r.released_at,
      l.gold_released_to = r.released_to
    WHERE l.outstanding_principal = 0
  `);
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

async function listGoldReleaseEligible() {
  const [rows] = await pool.query(`
    SELECT l.*, c.customer_code, c.full_name AS customer_name, c.mobile AS customer_mobile,
      c.address AS customer_address, c.city AS customer_city, c.district AS customer_district,
      c.state AS customer_state, c.pincode AS customer_pincode
    FROM loans l JOIN loan_customers c ON c.id = l.customer_id
    WHERE l.outstanding_principal = 0 AND l.release_status <> 'Released'
    ORDER BY l.updated_at DESC, l.id DESC
  `);
  return rows;
}

async function getGoldReleaseDetails(id) {
  const loan = await getLoanById(id);
  if (!loan) return null;
  const [releases] = await pool.execute(
    `SELECT id, released_at, released_to, confirmed_customer_signature, signed_document_url, notes, released_by
     FROM loan_gold_releases WHERE loan_id = ?`,
    [id]
  );
  return { loan, release: releases[0] || null };
}

async function releaseGold(id, releasedTo, notes, signedDocumentUrl, releasedBy) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [loans] = await connection.execute(
      'SELECT * FROM loans WHERE id = ? FOR UPDATE',
      [id]
    );
    if (!loans.length) {
      const error = new Error('Loan not found');
      error.code = 'LOAN_NOT_FOUND';
      throw error;
    }
    const loan = loans[0];
    if (loan.release_status === 'Released') {
      const error = new Error('Gold has already been released for this loan');
      error.code = 'GOLD_ALREADY_RELEASED';
      throw error;
    }
    if (Number(loan.outstanding_principal ?? loan.principal_amount) !== 0) {
      const error = new Error('The loan must be fully paid before gold can be released');
      error.code = 'LOAN_BALANCE_REMAINING';
      throw error;
    }
    const recipient = String(releasedTo || '').trim();
    if (!recipient || recipient.length > 150) {
      const error = new Error('Enter the name of the person receiving the gold');
      error.code = 'INVALID_RELEASE_RECIPIENT';
      throw error;
    }
    if (!signedDocumentUrl) {
      const error = new Error('Upload the signed gold release document before completing the release');
      error.code = 'SIGNED_RELEASE_DOCUMENT_REQUIRED';
      throw error;
    }
    const [[timeRow]] = await connection.query(
      'SELECT CURRENT_TIMESTAMP() AS released_at'
    );
    await connection.execute(
      `INSERT INTO loan_gold_releases
        (loan_id, released_at, released_to, confirmed_customer_signature, signed_document_url, notes, released_by)
       VALUES (?, ?, ?, TRUE, ?, ?, ?)`,
      [id, timeRow.released_at, recipient, signedDocumentUrl, notes ? String(notes).trim().slice(0, 2000) : null, releasedBy || null]
    );
    await connection.execute(
      `UPDATE loans SET loan_status = 'Completed', release_status = 'Released',
        gold_released_at = ?, gold_released_to = ? WHERE id = ?`,
      [timeRow.released_at, recipient, id]
    );
    const details = await getGoldReleaseDetailsFrom(connection, id);
    await connection.commit();
    return details;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getGoldReleaseDetailsFrom(connection, id) {
  const loan = await getLoanByIdFrom(connection, id);
  if (!loan) return null;
  const [releases] = await connection.execute(
    `SELECT id, released_at, released_to, confirmed_customer_signature, signed_document_url, notes, released_by
     FROM loan_gold_releases WHERE loan_id = ?`,
    [id]
  );
  return { loan, release: releases[0] || null };
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
    SELECT l.*, c.customer_code, c.full_name AS customer_name, c.mobile AS customer_mobile,
      c.address AS customer_address, c.city AS customer_city, c.district AS customer_district,
      c.state AS customer_state, c.pincode AS customer_pincode, c.email AS customer_email,
      c.alternate_mobile AS customer_alternate_mobile, c.date_of_birth AS customer_date_of_birth,
      c.gender AS customer_gender, c.occupation AS customer_occupation,
      c.kyc_status AS customer_kyc_status, c.guarantor_name, c.guarantor_mobile,
      c.guarantor_email, c.guarantor_relationship, c.guarantor_address
    FROM loans l JOIN loan_customers c ON c.id = l.customer_id
    ORDER BY l.created_at DESC, l.id DESC
  `);
  return rows;
}

function asDateString(value) {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  return String(value || '').slice(0, 10);
}

function dateAtUtc(value) {
  const text = asDateString(value);
  const [year, month, day] = text.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function daysBetween(start, end) {
  return Math.max(0, Math.round((dateAtUtc(end) - dateAtUtc(start)) / 86400000));
}

function addDays(value, days) {
  const date = dateAtUtc(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonths(value, months) {
  const date = dateAtUtc(value);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

function isLoanReviewDue(loan, today) {
  const loanDate = asDateString(loan.loan_date);
  const maturityDate = asDateString(loan.maturity_date);
  const todayDate = asDateString(today);
  return Boolean(loanDate && maturityDate)
    && ['Active', 'Suspended'].includes(loan.loan_status)
    && loan.release_status !== 'Released'
    && Number(loan.outstanding_principal ?? loan.principal_amount) > 0
    && maturityDate < todayDate
    && addMonths(loanDate, 15) <= todayDate;
}

function monthPeriodsBetween(start, end) {
  const startDate = dateAtUtc(start);
  const endDate = dateAtUtc(end);
  let fullMonths = (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12
    + endDate.getUTCMonth() - startDate.getUTCMonth();
  while (fullMonths > 0 && addMonths(start, fullMonths) > asDateString(end)) fullMonths -= 1;
  const periodStart = addMonths(start, fullMonths);
  const nextPeriod = addMonths(periodStart, 1);
  const partial = daysBetween(periodStart, end) / Math.max(1, daysBetween(periodStart, nextPeriod));
  return fullMonths + partial;
}

function periodsBetween(start, end, frequency, customDays) {
  const days = daysBetween(start, end);
  switch (frequency) {
    case 'daily': return days;
    case 'weekly': return days / 7;
    case 'quarterly': return monthPeriodsBetween(start, end) / 3;
    case 'half_yearly': return monthPeriodsBetween(start, end) / 6;
    case 'yearly':
    case 'annual': return monthPeriodsBetween(start, end) / 12;
    case 'custom_period': return days / Math.max(1, Number(customDays) || 30);
    case 'monthly':
    default: return monthPeriodsBetween(start, end);
  }
}

function calculateRenewalInterest(loan, periodStart, renewalDate, principal) {
  const eligibleStart = addDays(
    periodStart,
    Number(loan.interest_free_days || 0) + Number(loan.grace_period_days || 0)
  );
  const start = eligibleStart > renewalDate ? renewalDate : eligibleStart;
  const periods = periodsBetween(start, renewalDate, loan.interest_frequency, loan.custom_period_days);
  const rate = Number(loan.interest_rate || 0) / 100;
  let interest;
  if (loan.interest_type === 'fixed') {
    interest = Number(loan.fixed_interest_amount || 0) * periods;
  } else if (loan.interest_type === 'compound') {
    const compoundPeriods = periodsBetween(
      start,
      renewalDate,
      loan.compounding_frequency || 'monthly',
      loan.custom_period_days
    );
    interest = compoundPeriods > 0
      ? principal * ((1 + (rate * periods / compoundPeriods)) ** compoundPeriods - 1)
      : 0;
  } else {
    interest = principal * rate * periods;
  }
  if (periods > 0 && Number(loan.minimum_interest_amount) > 0) {
    interest = Math.max(interest, Number(loan.minimum_interest_amount));
  }
  if (Number(loan.maximum_interest_amount) > 0) {
    interest = Math.min(interest, Number(loan.maximum_interest_amount));
  }
  return Math.round(interest * 100) / 100;
}

function makeRenewalPreview(loan, renewalDate) {
  const principal = Number(loan.outstanding_principal ?? loan.principal_amount);
  const periodStartDate = asDateString(loan.interest_calculation_start_date);
  const maturityDate = asDateString(loan.maturity_date);
  const regularInterestEnd = maturityDate && maturityDate < renewalDate ? maturityDate : renewalDate;
  const regularInterest = calculateRenewalInterest(
    loan,
    periodStartDate,
    regularInterestEnd,
    principal
  );
  const lateRate = Number(loan.late_payment_interest_rate || 0);
  const latePaymentFee = maturityDate && renewalDate > maturityDate && lateRate > 0
    ? Math.round(principal * lateRate / 100
      * periodsBetween(maturityDate, renewalDate, loan.interest_frequency, loan.custom_period_days) * 100) / 100
    : 0;
  const accruedInterest = Math.round((regularInterest + latePaymentFee) * 100) / 100;
  return {
    renewal_date: renewalDate,
    period_start_date: periodStartDate,
    current_principal: principal,
    regular_interest: regularInterest,
    late_payment_fee: latePaymentFee,
    accrued_interest: accruedInterest,
    total_due: Math.round((principal + accruedInterest) * 100) / 100,
    minimum_payment: accruedInterest,
    next_maturity_date: addMonths(renewalDate, 11)
  };
}

function allocateRenewalPayment(preview, paymentAmount) {
  const amount = Math.round(Number(paymentAmount) * 100) / 100;
  const interestPaid = Math.min(amount, preview.accrued_interest);
  const principalPaid = Math.min(
    preview.current_principal,
    Math.max(0, Math.round((amount - interestPaid) * 100) / 100)
  );
  return {
    paymentAmount: amount,
    interestPaid,
    principalPaid,
    principalAfter: Math.round((preview.current_principal - principalPaid) * 100) / 100
  };
}

async function getLoanRenewal(id) {
  const connection = await pool.getConnection();
  try {
    const [[dateRow]] = await connection.query(
      "SELECT DATE_FORMAT(CURRENT_DATE(), '%Y-%m-%d') AS renewal_date"
    );
    const loan = await getLoanById(id);
    if (!loan) return null;
    const [history] = await connection.execute(
      `SELECT id, renewal_date, period_start_date, previous_maturity_date, new_maturity_date,
        payment_amount, interest_paid, late_payment_fee, principal_paid, principal_before, principal_after,
        accrued_interest, created_at
       FROM loan_renewals WHERE loan_id = ? ORDER BY renewal_date DESC, id DESC`,
      [id]
    );
    const reviewActions = await getLoanReviewActionsFrom(connection, id);
    return {
      loan,
      preview: makeRenewalPreview(loan, dateRow.renewal_date),
      history,
      reviewActions
    };
  } finally {
    connection.release();
  }
}

async function getLoanReviewActionsFrom(connection, id) {
  const [rows] = await connection.execute(
    `SELECT id, action_type, notice_method, customer_message, notes, created_by, created_at
     FROM loan_review_actions WHERE loan_id = ? ORDER BY created_at DESC, id DESC`,
    [id]
  );
  return rows;
}

async function recordLoanReviewAction(id, action, details, adminUserId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [loans] = await connection.execute(
      'SELECT * FROM loans WHERE id = ? FOR UPDATE',
      [id]
    );
    if (!loans.length) {
      const error = new Error('Loan not found');
      error.code = 'LOAN_NOT_FOUND';
      throw error;
    }

    const loan = loans[0];
    const [[dateRow]] = await connection.query(
      "SELECT DATE_FORMAT(CURRENT_DATE(), '%Y-%m-%d') AS today"
    );
    if (!isLoanReviewDue(loan, dateRow.today)) {
      const error = new Error('This loan has not reached the eligible 15-month review point');
      error.code = 'LOAN_REVIEW_NOT_DUE';
      throw error;
    }

    const notes = String(details?.notes || '').trim();
    if (!notes || notes.length > 2000) {
      const error = new Error('Review notes are required and must be 2,000 characters or fewer');
      error.code = 'INVALID_REVIEW_NOTES';
      throw error;
    }

    let method = null;
    let message = null;
    if (action === 'notice_sent') {
      const allowedMethods = new Set(['sms', 'whatsapp', 'call', 'letter', 'in_person', 'other']);
      method = String(details?.notice_method || '').trim().toLowerCase();
      message = String(details?.customer_message || '').trim();
      if (!allowedMethods.has(method) || !message || message.length > 4000) {
        const error = new Error('Choose a valid notice method and provide a customer message of at most 4,000 characters');
        error.code = 'INVALID_REVIEW_NOTICE';
        throw error;
      }
      if (!['Active', 'Suspended'].includes(loan.loan_status)) {
        const error = new Error('Notice can only be recorded for an active or suspended loan');
        error.code = 'LOAN_NOT_ACTIVE';
        throw error;
      }
    } else if (action === 'suspend') {
      if (loan.loan_status !== 'Active') {
        const error = new Error('Only active loans can be suspended');
        error.code = 'LOAN_NOT_ACTIVE';
        throw error;
      }
      const [[latestAction]] = await connection.execute(
        `SELECT action_type FROM loan_review_actions
         WHERE loan_id = ?
         ORDER BY created_at DESC, id DESC LIMIT 1`,
        [id]
      );
      if (latestAction?.action_type !== 'notice_sent') {
        const error = new Error('Record a customer notice before suspending renewal');
        error.code = 'REVIEW_NOTICE_REQUIRED';
        throw error;
      }
      await connection.execute(
        "UPDATE loans SET loan_status = 'Suspended' WHERE id = ?",
        [id]
      );
    } else if (action === 'reinstate') {
      if (loan.loan_status !== 'Suspended') {
        const error = new Error('Only suspended loans can be reinstated');
        error.code = 'LOAN_NOT_SUSPENDED';
        throw error;
      }
      await connection.execute(
        "UPDATE loans SET loan_status = 'Active' WHERE id = ?",
        [id]
      );
    } else {
      const error = new Error('Unsupported loan review action');
      error.code = 'INVALID_REVIEW_ACTION';
      throw error;
    }

    await connection.execute(
      `INSERT INTO loan_review_actions
        (loan_id, action_type, notice_method, customer_message, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        action === 'suspend' ? 'suspended' : action === 'reinstate' ? 'reinstated' : action,
        method,
        message,
        notes,
        adminUserId || null
      ]
    );
    const updatedLoan = await getLoanByIdFrom(connection, id);
    const reviewActions = await getLoanReviewActionsFrom(connection, id);
    await connection.commit();
    return { loan: updatedLoan, reviewActions };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function renewLoan(id, paymentAmount, adminUserId, paymentDetails) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [loans] = await connection.execute(
      'SELECT * FROM loans WHERE id = ? FOR UPDATE',
      [id]
    );
    if (!loans.length) {
      const error = new Error('Loan not found');
      error.code = 'LOAN_NOT_FOUND';
      throw error;
    }
    const loan = loans[0];
    const [fundAccounts] = await connection.execute(
      'SELECT id, is_active FROM fund_accounts WHERE id = ? FOR UPDATE',
      [paymentDetails.account_id]
    );
    if (!fundAccounts.length || !fundAccounts[0].is_active) {
      const error = new Error('Select an active fund account');
      error.code = 'FUND_ACCOUNT_NOT_FOUND';
      throw error;
    }
    const [[dateRow]] = await connection.query(
      "SELECT DATE_FORMAT(CURRENT_DATE(), '%Y-%m-%d') AS renewal_date"
    );
    const preview = makeRenewalPreview(loan, dateRow.renewal_date);
    const amount = Math.round(Number(paymentAmount) * 100) / 100;
    if (loan.release_status === 'Released') {
      const error = new Error('Gold has already been released and this loan is completed');
      error.code = 'LOAN_NOT_ACTIVE';
      throw error;
    }
    if (preview.current_principal <= 0) {
      const error = new Error('This loan is fully paid. Complete gold release instead of renewing it.');
      error.code = 'LOAN_READY_FOR_GOLD_RELEASE';
      throw error;
    }
    if (loan.loan_status !== 'Active') {
      const error = new Error('Only active loans can be renewed');
      error.code = 'LOAN_NOT_ACTIVE';
      throw error;
    }
    if (!(amount > 0)) {
      const error = new Error('Enter a payment amount greater than zero');
      error.code = 'INVALID_RENEWAL_PAYMENT';
      throw error;
    }
    if (amount + 0.001 < preview.minimum_payment) {
      const error = new Error(`The minimum payment is the accrued interest of ${preview.minimum_payment.toFixed(2)}`);
      error.code = 'RENEWAL_PAYMENT_BELOW_INTEREST';
      throw error;
    }
    if (amount - 0.001 > preview.total_due) {
      const error = new Error(`Payment cannot exceed the total due of ${preview.total_due.toFixed(2)}`);
      error.code = 'RENEWAL_PAYMENT_EXCEEDS_DUE';
      throw error;
    }
    const { interestPaid, principalPaid, principalAfter } = allocateRenewalPayment(preview, amount);
    const latePaymentFee = preview.late_payment_fee;
    const fullyRepaid = principalAfter === 0;
    const newMaturityDate = fullyRepaid ? null : preview.next_maturity_date;
    const previousMaturityDate = asDateString(loan.maturity_date);
    await connection.execute(
      `INSERT INTO loan_renewals (
        loan_id, renewal_date, period_start_date, previous_maturity_date, new_maturity_date,
        payment_amount, interest_paid, principal_paid, principal_before, principal_after,
        accrued_interest, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, preview.renewal_date, preview.period_start_date, previousMaturityDate, newMaturityDate,
        amount.toFixed(2), interestPaid.toFixed(2), latePaymentFee.toFixed(2), principalPaid.toFixed(2),
        preview.current_principal.toFixed(2), principalAfter.toFixed(2),
        preview.accrued_interest.toFixed(2), paymentDetails.account_id, paymentDetails.payment_method,
        paymentDetails.reference_number || null, paymentDetails.idempotency_key, adminUserId || null
      ]
    );
    if (principalPaid > 0) {
      await insertTransaction(connection, {
        account_id: paymentDetails.account_id,
        transaction_type: 'CREDIT',
        category: 'Customer Loan Repayment',
        transaction_date: preview.renewal_date,
        amount: principalPaid.toFixed(2),
        party_name: loan.customer_name,
        related_reference: loan.loan_number,
        payment_method: paymentDetails.payment_method,
        reference_number: paymentDetails.reference_number,
        description: 'Principal portion of loan repayment',
        idempotency_key: `${paymentDetails.idempotency_key}:principal`,
        created_by: adminUserId
      });
    }
    if (interestPaid > 0) {
      await insertTransaction(connection, {
        account_id: paymentDetails.account_id,
        transaction_type: 'CREDIT',
        category: 'Interest Collection',
        transaction_date: preview.renewal_date,
        amount: interestPaid.toFixed(2),
        party_name: loan.customer_name,
        related_reference: loan.loan_number,
        payment_method: paymentDetails.payment_method,
        reference_number: paymentDetails.reference_number,
        description: 'Interest portion of loan repayment',
        idempotency_key: `${paymentDetails.idempotency_key}:interest`,
        created_by: adminUserId
      });
    }
    await connection.execute(
      `UPDATE loans SET outstanding_principal = ?, interest_calculation_start_date = ?,
        maturity_date = ?, loan_status = ?, release_status = ? WHERE id = ?`,
      [
        principalAfter.toFixed(2), preview.renewal_date,
        newMaturityDate || previousMaturityDate, 'Active', fullyRepaid ? 'Pending Release' : 'Not Ready', id
      ]
    );
    const [[renewal]] = await connection.query('SELECT LAST_INSERT_ID() AS id');
    const updatedLoan = await getLoanByIdFrom(connection, id);
    const [history] = await connection.execute(
      `SELECT id, renewal_date, period_start_date, previous_maturity_date, new_maturity_date,
        payment_amount, interest_paid, late_payment_fee, principal_paid, principal_before, principal_after,
        accrued_interest, created_at
       FROM loan_renewals WHERE loan_id = ? ORDER BY renewal_date DESC, id DESC`,
      [id]
    );
    await connection.commit();
    return {
      renewal_id: renewal.id,
      payment_amount: amount,
      interest_paid: interestPaid,
      principal_paid: principalPaid,
      principal_after: principalAfter,
      renewal_date: preview.renewal_date,
      new_maturity_date: newMaturityDate,
      loan_status: 'Active',
      release_status: fullyRepaid ? 'Pending Release' : 'Not Ready',
      loan: updatedLoan,
      preview: makeRenewalPreview(updatedLoan, preview.renewal_date),
      history
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getLoanRenewalHistory(id) {
  const [rows] = await pool.execute(
    `SELECT id, renewal_date, period_start_date, previous_maturity_date, new_maturity_date,
      payment_amount, interest_paid, late_payment_fee, principal_paid, principal_before, principal_after,
      accrued_interest, created_at
     FROM loan_renewals WHERE loan_id = ? ORDER BY renewal_date DESC, id DESC`,
    [id]
  );
  return rows;
}

async function getLoanById(id) {
  return getLoanByIdFrom(pool, id);
}

async function getLoanByIdFrom(connection, id) {
  const [rows] = await connection.execute(
    `SELECT l.*, c.customer_code, c.full_name AS customer_name, c.mobile AS customer_mobile,
      c.address AS customer_address, c.city AS customer_city, c.district AS customer_district,
      c.state AS customer_state, c.pincode AS customer_pincode, c.email AS customer_email,
      c.alternate_mobile AS customer_alternate_mobile, c.date_of_birth AS customer_date_of_birth,
      c.gender AS customer_gender, c.occupation AS customer_occupation,
      c.guarantor_name, c.guarantor_mobile, c.guarantor_email,
      c.guarantor_relationship, c.guarantor_address, c.kyc_status AS customer_kyc_status
     FROM loans l JOIN loan_customers c ON c.id = l.customer_id
     WHERE l.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function listLoansForCustomer(customerId) {
  const [rows] = await pool.execute(
    `SELECT id, loan_number, customer_id, gold_pledge_number, jewellery_type, metal_type,
      gold_purity, net_gold_weight, principal_amount, outstanding_principal,
      interest_type, interest_rate, loan_date, maturity_date, loan_status,
      release_status, processing_fee, other_charges, created_at
     FROM loans WHERE customer_id = ? ORDER BY created_at DESC, id DESC`,
    [customerId]
  );
  return rows;
}

async function listLoansForUser(userId) {
  const [rows] = await pool.execute(
    `SELECT l.id, l.loan_number, l.customer_id, l.gold_pledge_number, l.jewellery_type,
      l.metal_type, l.gold_purity, l.net_gold_weight, l.principal_amount,
      l.outstanding_principal, l.interest_type, l.interest_rate, l.loan_date,
      l.maturity_date, l.loan_status, l.release_status, l.processing_fee,
      l.other_charges, l.created_at,
      c.full_name AS customer_name, c.customer_code
     FROM loans l
     JOIN loan_customers c ON c.id = l.customer_id
     WHERE c.user_id = ?
     ORDER BY l.created_at DESC, l.id DESC`,
    [userId]
  );
  return rows;
}


function allocateLoanDisbursement(amount, accounts) {
  const amountNumber = Number(amount);
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    const error = new Error('Enter a valid loan amount greater than zero');
    error.code = 'INVALID_LOAN_AMOUNT';
    throw error;
  }
  const amountCents = Math.round((amountNumber + Number.EPSILON) * 100);
  let remainingCents = amountCents;
  const allocations = [];
  let availableCents = 0;
  for (const account of accounts) {
    const balance = Number(account.balance);
    const balanceCents = Number.isFinite(balance) ? Math.max(0, Math.round((balance + Number.EPSILON) * 100)) : 0;
    availableCents += balanceCents;
    const debitCents = Math.min(remainingCents, balanceCents);
    if (debitCents > 0) {
      allocations.push({
        account_id: account.id,
        amount: (debitCents / 100).toFixed(2)
      });
      remainingCents -= debitCents;
    }
  }
  if (remainingCents > 0) {
    const error = new Error(`Insufficient available funds. Available balance: ${(availableCents / 100).toFixed(2)}.`);
    error.code = 'INSUFFICIENT_FUNDS';
    error.available_balance = (availableCents / 100).toFixed(2);
    throw error;
  }
  return allocations;
}

async function createLoan(loan, { idempotencyKey = crypto.randomUUID() } = {}) {
  const connection = await pool.getConnection();
  let loanId;
  try {
    await connection.beginTransaction();
    const [customers] = await connection.execute(
      'SELECT id, full_name FROM loan_customers WHERE id = ? FOR UPDATE',
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
    const [fundAccounts] = await connection.execute(
      'SELECT id FROM fund_accounts ORDER BY id FOR UPDATE'
    );
    const [existingDisbursements] = await connection.execute(
      `SELECT related_reference FROM fund_transactions
       WHERE idempotency_key LIKE ? AND status = 'POSTED'
       ORDER BY id LIMIT 1`,
      [`loan-disbursement:${idempotencyKey}:%`]
    );
    if (existingDisbursements.length) {
      const existingLoan = await getLoanByIdFrom(connection, existingDisbursements[0].related_reference);
      if (existingLoan) {
        await connection.commit();
        return existingLoan;
      }
    }
    const fundBalances = [];
    for (const account of fundAccounts) {
      fundBalances.push({
        id: account.id,
        balance: await getAccountBalance(connection, account.id)
      });
    }
    const allocations = allocateLoanDisbursement(loan.principal_amount, fundBalances);
    const loanToInsert = { ...loan, outstanding_principal: loan.principal_amount };
    const fields = Object.keys(loanToInsert).filter((field) => field !== 'customer_id');
    const columns = ['loan_number', 'gold_pledge_number', 'customer_id', ...fields];
    const temporaryNumber = `TEMP-${crypto.randomUUID()}`;
    const temporaryPledgeNumber = `TEMP-PLEDGE-${crypto.randomUUID()}`;
    const [result] = await connection.execute(
      `INSERT INTO loans (${columns.map((field) => `\`${field}\``).join(', ')})
       VALUES (${columns.map(() => '?').join(', ')})`,
      [temporaryNumber, temporaryPledgeNumber, loan.customer_id, ...fields.map((field) => loanToInsert[field])]
    );
    loanId = result.insertId;
    const loanNumber = `GL-${loan.loan_date.replaceAll('-', '')}-${String(loanId).padStart(6, '0')}`;
    const pledgeNumber = `GP-${loan.loan_date.replaceAll('-', '')}-${String(loanId).padStart(6, '0')}`;
    await connection.execute(
      'UPDATE loans SET loan_number = ?, gold_pledge_number = ? WHERE id = ?',
      [loanNumber, pledgeNumber, loanId]
    );
    const [[timestamp]] = await connection.query('SELECT CURRENT_TIMESTAMP() AS transaction_date');
    for (const [index, allocation] of allocations.entries()) {
      await insertTransaction(connection, {
        account_id: allocation.account_id,
        transaction_type: 'DEBIT',
        category: 'Customer Gold Loan Disbursement',
        transaction_date: timestamp.transaction_date,
        amount: allocation.amount,
        party_name: customers[0].full_name,
        related_reference: String(loanId),
        payment_method: 'Other',
        reference_number: loanNumber,
        description: 'Loan amount disbursed to customer',
        idempotency_key: `loan-disbursement:${idempotencyKey}:${index}`,
        created_by: loan.created_by
      });
    }
    const createdLoan = await getLoanByIdFrom(connection, loanId);
    await connection.commit();
    return createdLoan;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateLoan(id, loan) {
  const existingLoan = await getLoanById(id);
  if (!existingLoan) return null;
  const originalPrincipal = Number(existingLoan.principal_amount);
  const revisedPrincipal = Number(loan.principal_amount);
  const currentBalance = Number(existingLoan.outstanding_principal ?? existingLoan.principal_amount);
  const revisedLoan = {
    ...loan,
    outstanding_principal: Math.max(0, currentBalance + revisedPrincipal - originalPrincipal).toFixed(2)
  };
  const fields = Object.keys(revisedLoan);
  await pool.execute(
    `UPDATE loans SET ${fields.map((field) => `\`${field}\` = ?`).join(', ')} WHERE id = ?`,
    [...fields.map((field) => revisedLoan[field]), id]
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
  allocateLoanDisbursement,
  allocateRenewalPayment,
  calculateRenewalInterest,
  deleteLoan,
  getGoldReleaseDetails,
  getLoanById,
  getLoanRenewal,
  getLoanRenewalHistory,
  isLoanReviewDue,
  initializeLoanModule,
  listInterestTypes,
  listLoans,
  listGoldReleaseEligible,
  listLoansForCustomer,
  listLoansForUser,
  makeRenewalPreview,
  recordLoanReviewAction,
  releaseGold,
  renewLoan,
  setInterestType,
  updateLoan
};
