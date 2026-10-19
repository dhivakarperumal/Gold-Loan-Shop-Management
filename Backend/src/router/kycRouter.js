const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const requireAuthenticatedUser = require('../middleware/requireAuthenticatedUser');
const { MAX_FILES, removeKycFiles, uploadKycDocuments } = require('../middleware/kycUpload');
const {
  adminStats,
  getApplicationDetails,
  getCustomerStatus,
  listApplications,
  reviewApplication,
  serveDocument,
  submitApplication
} = require('../controllers/kycController');

const router = express.Router();
const uploadsPerHour = 5;
const uploadAttempts = new Map();
let lastPrunedAt = 0;

function limitCustomerUploads(req, res, next) {
  const key = String(req.authenticatedUser.user_id);
  const now = Date.now();
  if (now - lastPrunedAt > 5 * 60 * 1000) {
    for (const [userId, attempt] of uploadAttempts) {
      if (now - attempt.startedAt >= 60 * 60 * 1000) uploadAttempts.delete(userId);
    }
    lastPrunedAt = now;
  }
  const existing = uploadAttempts.get(key);
  if (!existing || now - existing.startedAt >= 60 * 60 * 1000) {
    uploadAttempts.set(key, { startedAt: now, count: 1 });
    return next();
  }
  if (existing.count >= uploadsPerHour) {
    res.set('Retry-After', String(Math.ceil((60 * 60 * 1000 - (now - existing.startedAt)) / 1000)));
    return res.status(429).json({ message: 'Too many KYC upload attempts. Try again later.' });
  }
  existing.count += 1;
  return next();
}

function handleDocumentUpload(req, res, next) {
  uploadKycDocuments.array('documents', MAX_FILES)(req, res, async (error) => {
    if (!error) return next();
    await removeKycFiles((req.files || []).map((file) => file.filename)).catch((cleanupError) => {
      console.error('Failed to clean incomplete KYC upload:', cleanupError);
    });
    const tooLarge = error.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_FILE_COUNT';
    return res.status(tooLarge ? 413 : 400).json({
      message: tooLarge ? 'KYC upload exceeds the allowed file count or size' : error.message
    });
  });
}

router.get('/status', requireAuthenticatedUser, getCustomerStatus);
router.post('/', requireAuthenticatedUser, limitCustomerUploads, handleDocumentUpload, submitApplication);
router.post('/resubmit', requireAuthenticatedUser, limitCustomerUploads, handleDocumentUpload, submitApplication);
router.get('/documents/:documentId', requireAuthenticatedUser, serveDocument);

router.get('/admin/stats', requireAdmin, adminStats);
router.get('/admin/applications', requireAdmin, listApplications);
router.get('/admin/applications/:id', requireAdmin, getApplicationDetails);
router.patch('/admin/applications/:id/review', requireAdmin, reviewApplication);
router.get('/admin/documents/:documentId', requireAdmin, serveDocument);

router.use((error, req, res, next) => {
  if (Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode < 500) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  return next(error);
});

module.exports = router;
