const { pool } = require('../config/db');
const { resolveKycStoragePath } = require('../middleware/kycUpload');
const { getKycProvider } = require('../services/kyc/providerFactory');
const fs = require('node:fs');

const ACTIVE_STATUSES = ['pending', 'in_review', 'verified'];
const REVIEW_STATUSES = ['pending', 'in_review', 'verified', 'rejected', 'resubmission_required', 'failed'];
const ALLOWED_DOCUMENT_TYPES = new Set([
  'passport',
  'voter_id',
  'driving_license',
  'pan',
  'ration_card',
  'aadhaar'
]);

function canResubmitKycStatus(status) {
  return ['rejected', 'resubmission_required', 'failed'].includes(status);
}

function canReviewKycStatus(status) {
  return ['pending', 'in_review'].includes(status);
}

function getAllowedDocumentTypes() {
  const configured = process.env.KYC_ALLOWED_DOCUMENT_TYPES;
  if (!configured) return [];
  const values = [...new Set(configured.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean))];
  const invalid = values.filter((value) => !ALLOWED_DOCUMENT_TYPES.has(value));
  if (invalid.length) {
    throw new Error(`Unsupported KYC document types: ${invalid.join(', ')}`);
  }
  return values;
}

async function initializeKycModule() {
  getKycProvider();
  getAllowedDocumentTypes();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS kyc_applications (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      provider VARCHAR(32) NOT NULL DEFAULT 'manual',
      provider_reference VARCHAR(191) NULL,
      consent_version VARCHAR(64) NOT NULL,
      consented_at DATETIME NOT NULL,
      reviewer_id INT UNSIGNED NULL,
      reviewed_at DATETIME NULL,
      review_reason VARCHAR(2000) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_kyc_applications_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      CONSTRAINT fk_kyc_applications_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(user_id) ON DELETE SET NULL,
      INDEX idx_kyc_applications_status_created (status, created_at),
      INDEX idx_kyc_applications_user_created (user_id, created_at)
    ) ENGINE=InnoDB
  `);
  const [providerReferenceColumn] = await pool.query(
    "SHOW COLUMNS FROM kyc_applications LIKE 'provider_reference'"
  );
  if (providerReferenceColumn.length === 0) {
    await pool.query('ALTER TABLE kyc_applications ADD COLUMN provider_reference VARCHAR(191) NULL AFTER provider');
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS kyc_documents (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      application_id BIGINT UNSIGNED NOT NULL,
      document_type VARCHAR(32) NOT NULL,
      storage_key VARCHAR(64) NOT NULL UNIQUE,
      mime_type VARCHAR(64) NOT NULL,
      file_size INT UNSIGNED NOT NULL,
      uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_kyc_documents_application FOREIGN KEY (application_id) REFERENCES kyc_applications(id) ON DELETE CASCADE,
      INDEX idx_kyc_documents_application (application_id)
    ) ENGINE=InnoDB
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS kyc_audit_events (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      application_id BIGINT UNSIGNED NOT NULL,
      actor_id INT UNSIGNED NULL,
      action VARCHAR(48) NOT NULL,
      previous_status VARCHAR(32) NULL,
      new_status VARCHAR(32) NULL,
      reason VARCHAR(2000) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_kyc_audit_application FOREIGN KEY (application_id) REFERENCES kyc_applications(id) ON DELETE CASCADE,
      CONSTRAINT fk_kyc_audit_actor FOREIGN KEY (actor_id) REFERENCES users(user_id) ON DELETE SET NULL,
      INDEX idx_kyc_audit_application_created (application_id, created_at)
    ) ENGINE=InnoDB
  `);
}

function applicationProjection() {
  return `
    SELECT a.id, a.user_id, a.status, a.provider, a.provider_reference, a.consent_version, a.consented_at,
           a.reviewer_id, a.reviewed_at, a.review_reason, a.created_at, a.updated_at,
           u.name AS applicant_name, u.email AS applicant_email, u.phone AS applicant_phone,
           reviewer.name AS reviewer_name
    FROM kyc_applications a
    JOIN users u ON u.user_id = a.user_id
    LEFT JOIN users reviewer ON reviewer.user_id = a.reviewer_id
  `;
}

async function getLatestApplication(userId) {
  const [applications] = await pool.execute(
    `${applicationProjection()} WHERE a.user_id = ? ORDER BY a.created_at DESC, a.id DESC LIMIT 1`,
    [userId]
  );
  if (!applications[0]) return null;
  const application = applications[0];
  const [documents] = await pool.execute(
    `SELECT id, document_type, mime_type, file_size, uploaded_at
     FROM kyc_documents WHERE application_id = ? ORDER BY id`,
    [application.id]
  );
  return { ...application, documents };
}

async function createOrResubmitApplication({ userId, actorId, documents, consentVersion }) {
  const provider = getKycProvider();
  const providerResult = await provider.startVerification();
  const connection = await pool.getConnection();
  let oldStorageKeys = [];
  let applicationId;
  let previousStatus = null;
  let action = 'submitted';
  try {
    await connection.beginTransaction();
    await connection.execute('SELECT user_id FROM users WHERE user_id = ? FOR UPDATE', [userId]);
    const [existingRows] = await connection.execute(
      `SELECT id, status FROM kyc_applications
       WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 1 FOR UPDATE`,
      [userId]
    );
    const existing = existingRows[0];
    if (existing && ACTIVE_STATUSES.includes(existing.status)) {
      const error = new Error('A KYC application is already active');
      error.statusCode = 409;
      throw error;
    }

    if (existing) {
      if (!canResubmitKycStatus(existing.status)) {
        const error = new Error('This KYC application cannot be resubmitted in its current status');
        error.statusCode = 409;
        throw error;
      }
      applicationId = existing.id;
      previousStatus = existing.status;
      action = 'resubmitted';
      const [oldDocuments] = await connection.execute(
        'SELECT storage_key FROM kyc_documents WHERE application_id = ?',
        [applicationId]
      );
      oldStorageKeys = oldDocuments.map((document) => document.storage_key);
      await connection.execute('DELETE FROM kyc_documents WHERE application_id = ?', [applicationId]);
      await connection.execute(
        `UPDATE kyc_applications
         SET status = ?, provider = ?, consent_version = ?, consented_at = CURRENT_TIMESTAMP,
             provider_reference = ?, reviewer_id = NULL, reviewed_at = NULL, review_reason = NULL
         WHERE id = ?`,
        [providerResult.status, providerResult.provider, consentVersion, providerResult.externalReference, applicationId]
      );
    } else {
      const [result] = await connection.execute(
        `INSERT INTO kyc_applications (user_id, status, provider, provider_reference, consent_version, consented_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [userId, providerResult.status, providerResult.provider, providerResult.externalReference, consentVersion]
      );
      applicationId = result.insertId;
    }

    for (const document of documents) {
      await connection.execute(
        `INSERT INTO kyc_documents (application_id, document_type, storage_key, mime_type, file_size)
         VALUES (?, ?, ?, ?, ?)`,
        [applicationId, document.documentType, document.storageKey, document.mimeType, document.fileSize]
      );
    }
    await connection.execute(
      `INSERT INTO kyc_audit_events (application_id, actor_id, action, previous_status, new_status)
       VALUES (?, ?, ?, ?, ?)`,
      [applicationId, actorId, action, previousStatus, providerResult.status]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  for (const storageKey of oldStorageKeys) {
    const filePath = resolveKycStoragePath(storageKey);
    if (!filePath) continue;
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`Failed to remove replaced KYC document ${storageKey}:`, error);
      }
    }
  }
  try {
    return await getLatestApplication(userId);
  } catch (error) {
    error.uploadCommitted = true;
    throw error;
  }
}

async function listKycApplications({ page, pageSize, status, search, dateFrom, dateTo }) {
  const conditions = [];
  const values = [];
  if (status) {
    conditions.push('a.status = ?');
    values.push(status);
  }
  if (search) {
    conditions.push('(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR CAST(a.id AS CHAR) = ?)');
    const match = `%${search}%`;
    values.push(match, match, match, search);
  }
  if (dateFrom) {
    conditions.push('a.created_at >= ?');
    values.push(`${dateFrom} 00:00:00`);
  }
  if (dateTo) {
    conditions.push('a.created_at < DATE_ADD(?, INTERVAL 1 DAY)');
    values.push(`${dateTo} 00:00:00`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;
  const [applications] = await pool.execute(
    `${applicationProjection()} ${where}
     ORDER BY a.created_at DESC, a.id DESC LIMIT ? OFFSET ?`,
    [...values, pageSize, offset]
  );
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM kyc_applications a JOIN users u ON u.user_id = a.user_id ${where}`,
    values
  );
  return { applications, total: Number(countRows[0].total) };
}

async function getKycStats() {
  const [rows] = await pool.query(
    `SELECT status, COUNT(*) AS total FROM kyc_applications GROUP BY status`
  );
  return Object.fromEntries(REVIEW_STATUSES.map((status) => [
    status,
    Number(rows.find((row) => row.status === status)?.total || 0)
  ]));
}

async function getKycApplicationById(applicationId) {
  const [rows] = await pool.execute(`${applicationProjection()} WHERE a.id = ? LIMIT 1`, [applicationId]);
  if (!rows[0]) return null;
  const application = rows[0];
  const [documents] = await pool.execute(
    `SELECT id, document_type, mime_type, file_size, uploaded_at
     FROM kyc_documents WHERE application_id = ? ORDER BY id`,
    [applicationId]
  );
  const [audit] = await pool.execute(
    `SELECT e.id, e.actor_id, e.action, e.previous_status, e.new_status, e.reason, e.created_at,
            u.name AS actor_name
     FROM kyc_audit_events e LEFT JOIN users u ON u.user_id = e.actor_id
     WHERE e.application_id = ? ORDER BY e.created_at DESC, e.id DESC`,
    [applicationId]
  );
  return { ...application, documents, audit };
}

async function reviewKycApplication({ applicationId, reviewerId, decision, reason }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      'SELECT id, status FROM kyc_applications WHERE id = ? FOR UPDATE',
      [applicationId]
    );
    const application = rows[0];
    if (!application) {
      const error = new Error('KYC application not found');
      error.statusCode = 404;
      throw error;
    }
    if (!canReviewKycStatus(application.status)) {
      const error = new Error(`KYC application cannot be reviewed from ${application.status}`);
      error.statusCode = 409;
      throw error;
    }
    await connection.execute(
      `UPDATE kyc_applications
       SET status = ?, reviewer_id = ?, reviewed_at = CURRENT_TIMESTAMP, review_reason = ?
       WHERE id = ?`,
      [decision, reviewerId, reason || null, applicationId]
    );
    await connection.execute(
      `INSERT INTO kyc_audit_events (application_id, actor_id, action, previous_status, new_status, reason)
       VALUES (?, ?, 'reviewed', ?, ?, ?)`,
      [applicationId, reviewerId, application.status, decision, reason || null]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return getKycApplicationById(applicationId);
}

async function getKycDocument(documentId) {
  const [rows] = await pool.execute(
    `SELECT d.id, d.application_id, a.user_id, d.document_type, d.storage_key,
            d.mime_type, d.file_size
     FROM kyc_documents d JOIN kyc_applications a ON a.id = d.application_id
     WHERE d.id = ? LIMIT 1`,
    [documentId]
  );
  return rows[0] || null;
}

async function recordKycDocumentView({ applicationId, documentId, actorId }) {
  await pool.execute(
    `INSERT INTO kyc_audit_events (application_id, actor_id, action, reason)
     VALUES (?, ?, 'document_viewed', ?)`,
    [applicationId, actorId, `Document ID: ${documentId}`]
  );
}

module.exports = {
  ACTIVE_STATUSES,
  ALLOWED_DOCUMENT_TYPES,
  REVIEW_STATUSES,
  canResubmitKycStatus,
  canReviewKycStatus,
  createOrResubmitApplication,
  getAllowedDocumentTypes,
  getKycApplicationById,
  getKycDocument,
  getKycStats,
  getLatestApplication,
  initializeKycModule,
  listKycApplications,
  recordKycDocumentView,
  reviewKycApplication
};
