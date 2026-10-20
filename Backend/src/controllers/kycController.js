const fs = require('node:fs');
const path = require('node:path');
const {
  createOrResubmitApplication,
  getAllowedDocumentTypes,
  getKycApplicationById,
  getKycDocument,
  getKycStats,
  getLatestApplication,
  listKycApplications,
  recordKycDocumentView,
  reviewKycApplication
} = require('../modules/kycModule');
const {
  MAX_FILE_SIZE_BYTES,
  MAX_FILES,
  removeKycFiles,
  resolveKycStoragePath,
  validateKycFileSignature
} = require('../middleware/kycUpload');

const CONSENT_VERSION = process.env.KYC_PRIVACY_NOTICE_VERSION || 'manual-kyc-v1';
const REVIEW_DECISIONS = new Set(['in_review', 'verified', 'rejected', 'resubmission_required']);

function canReadKycDocument(document, userId, isAdmin) {
  return isAdmin || Number(document.user_id) === Number(userId);
}

function parseDocumentTypes(value, fileCount) {
  let types;
  try {
    types = typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return null;
  }
  if (!Array.isArray(types) || types.length !== fileCount) return null;
  const allowed = new Set(getAllowedDocumentTypes());
  return types.every((type) => typeof type === 'string' && allowed.has(type)) ? types : null;
}

function normalizeReviewReason(value) {
  if (value === undefined || value === null) return '';
  return typeof value === 'string' ? value.trim().slice(0, 2000) : null;
}

function toCustomerApplication(application) {
  if (!application) return null;
  return {
    id: application.id,
    status: application.status,
    provider: application.provider,
    consent_version: application.consent_version,
    consented_at: application.consented_at,
    reviewed_at: application.reviewed_at,
    review_reason: application.review_reason,
    created_at: application.created_at,
    updated_at: application.updated_at,
    documents: application.documents
  };
}

async function prepareDocuments(files, documentTypes) {
  if (!Array.isArray(files) || files.length < 1 || files.length > MAX_FILES) {
    const error = new Error(`Upload between 1 and ${MAX_FILES} KYC documents`);
    error.statusCode = 400;
    throw error;
  }
  const types = parseDocumentTypes(documentTypes, files.length);
  if (!types) {
    const error = new Error('Choose an allowed document type for every uploaded file');
    error.statusCode = 400;
    throw error;
  }
  return files.map((file, index) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const error = new Error('Each KYC document must be within the configured file-size limit');
      error.statusCode = 413;
      throw error;
    }
    if (!validateKycFileSignature(file.path, file.mimetype)) {
      const error = new Error(`The uploaded ${path.extname(file.originalname).toUpperCase()} file content does not match its declared type`);
      error.statusCode = 400;
      throw error;
    }
    return {
      documentType: types[index],
      storageKey: path.basename(file.filename),
      mimeType: file.mimetype,
      fileSize: file.size
    };
  });
}

async function submitApplication(req, res, next) {
  try {
    const consent = req.body.consent === 'true';
    if (!consent) {
      const error = new Error('Consent to the manual KYC privacy notice is required');
      error.statusCode = 400;
      throw error;
    }
    const documents = await prepareDocuments(req.files, req.body.document_types);
    const application = await createOrResubmitApplication({
      userId: req.authenticatedUser.user_id,
      actorId: req.authenticatedUser.user_id,
      documents,
      consentVersion: CONSENT_VERSION
    });
    return res.status(201).json({
      message: 'KYC documents submitted for manual review',
      application: toCustomerApplication(application)
    });
  } catch (error) {
    if (!error.uploadCommitted) {
      await removeKycFiles((req.files || []).map((file) => file.filename)).catch((cleanupError) => {
        console.error('Failed to clean rejected KYC upload:', cleanupError);
      });
    }
    return next(error);
  }
}

async function getCustomerStatus(req, res, next) {
  try {
    const application = await getLatestApplication(req.authenticatedUser.user_id);
    return res.json({
      applicant: {
        name: req.authenticatedUser.name,
        email: req.authenticatedUser.email,
        phone: req.authenticatedUser.phone
      },
      allowedDocumentTypes: getAllowedDocumentTypes(),
      maximumFileSizeBytes: MAX_FILE_SIZE_BYTES,
      maximumFiles: MAX_FILES,
      consentVersion: CONSENT_VERSION,
      application: toCustomerApplication(application)
    });
  } catch (error) {
    return next(error);
  }
}

function parsePositiveInteger(value, fallback, maximum) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

function validDate(value) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? value
    : undefined;
}

async function listApplications(req, res, next) {
  try {
    const requestedStatus = typeof req.query.status === 'string' ? req.query.status : '';
    if (requestedStatus && !['all', 'pending', 'in_review', 'verified', 'rejected', 'resubmission_required', 'failed'].includes(requestedStatus)) {
      return res.status(400).json({ message: 'Invalid KYC status filter' });
    }
    const dateFrom = validDate(req.query.dateFrom);
    const dateTo = validDate(req.query.dateTo);
    if (dateFrom === undefined || dateTo === undefined || (dateFrom && dateTo && dateFrom > dateTo)) {
      return res.status(400).json({ message: 'Use a valid date range' });
    }
    const page = parsePositiveInteger(req.query.page, 1, 1000000);
    const pageSize = parsePositiveInteger(req.query.pageSize, 20, 100);
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 120) : '';
    const result = await listKycApplications({
      page,
      pageSize,
      status: requestedStatus && requestedStatus !== 'all' ? requestedStatus : '',
      search,
      dateFrom: dateFrom || '',
      dateTo: dateTo || ''
    });
    return res.json({ ...result, page, pageSize, pages: Math.ceil(result.total / pageSize) });
  } catch (error) {
    return next(error);
  }
}

async function adminStats(req, res, next) {
  const dateFrom = validDate(req.query.dateFrom);
  const dateTo = validDate(req.query.dateTo);
  if (dateFrom === undefined || dateTo === undefined || (dateFrom && dateTo && dateFrom > dateTo)) {
    return res.status(400).json({ message: 'Use a valid date range' });
  }
  try {
    return res.json({
      stats: await getKycStats({ dateFrom: dateFrom || '', dateTo: dateTo || '' }),
      allowedDocumentTypes: getAllowedDocumentTypes()
    });
  } catch (error) {
    return next(error);
  }
}

async function getApplicationDetails(req, res, next) {
  try {
    const application = await getKycApplicationById(req.params.id);
    if (!application) return res.status(404).json({ message: 'KYC application not found' });
    return res.json({ application });
  } catch (error) {
    return next(error);
  }
}

async function reviewApplication(req, res, next) {
  try {
    const decision = typeof req.body.decision === 'string' ? req.body.decision : '';
    const reason = normalizeReviewReason(req.body.reason);
    if (!REVIEW_DECISIONS.has(decision) || reason === null) {
      return res.status(400).json({ message: 'Choose a valid review decision and provide a text reason' });
    }
    if (['rejected', 'resubmission_required'].includes(decision) && !reason) {
      return res.status(400).json({ message: 'A reason is required for rejection or resubmission' });
    }
    const application = await reviewKycApplication({
      applicationId: req.params.id,
      reviewerId: req.adminUser.user_id,
      decision,
      reason
    });
    return res.json({ message: 'KYC review saved', application });
  } catch (error) {
    return next(error);
  }
}

async function serveDocument(req, res, next) {
  try {
    const document = await getKycDocument(req.params.documentId);
    if (!document) return res.status(404).json({ message: 'KYC document not found' });
    const isAdmin = Boolean(req.adminUser);
    if (!canReadKycDocument(document, req.authenticatedUser?.user_id, isAdmin)) {
      return res.status(404).json({ message: 'KYC document not found' });
    }
    const filePath = resolveKycStoragePath(document.storage_key);
    if (!filePath) return res.status(404).json({ message: 'KYC document is unavailable' });
    await fs.promises.access(filePath, fs.constants.R_OK);
    await recordKycDocumentView({
      applicationId: document.application_id,
      documentId: document.id,
      actorId: isAdmin ? req.adminUser.user_id : req.authenticatedUser.user_id
    });
    res.set({
      'Content-Type': document.mime_type,
      'Content-Disposition': `inline; filename="kyc-document-${document.id}.${document.mime_type === 'application/pdf' ? 'pdf' : document.mime_type === 'image/png' ? 'png' : 'jpg'}"`,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': 'sandbox; default-src \'none\'',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Cache-Control': 'private, no-store'
    });
    return res.sendFile(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ message: 'KYC document is unavailable' });
    return next(error);
  }
}

module.exports = {
  adminStats,
  canReadKycDocument,
  validDate,
  getApplicationDetails,
  getCustomerStatus,
  listApplications,
  normalizeReviewReason,
  parseDocumentTypes,
  prepareDocuments,
  reviewApplication,
  serveDocument,
  submitApplication,
  toCustomerApplication
};
