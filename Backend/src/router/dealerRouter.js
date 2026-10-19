const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const { handleDealerUploadError, uploadDealerDocument } = require('../middleware/dealerDocumentUpload');
const {
  downloadDocument,
  approvePendingJobReconciliation,
  getAudit,
  getCategories,
  getDealer,
  getDealers,
  getDocuments,
  getGlobalRate,
  getJobs,
  getOldGoldReceipts,
  getPurchases,
  getStatement,
  getSummary,
  postCategory,
  postDealer,
  postDealerPayment,
  reverseDealerPayment,
  postDocument,
  postJob,
  postJobIssue,
  postJobReceipt,
  postJobReconciliation,
  postOldGold,
  postPurchase,
  postRefining,
  putDealer,
  removeDocument
} = require('../controllers/dealerController');

const router = express.Router();
router.use(requireAdmin);

router.get('/summary', getSummary);
router.get('/categories', getCategories);
router.post('/categories', postCategory);
router.get('/global-rate', getGlobalRate);
router.get('/purchases', getPurchases);
router.post('/purchases', postPurchase);
router.get('/jobs', getJobs);
router.get('/old-gold', getOldGoldReceipts);
router.post('/payments', postDealerPayment);
router.post('/payments/:id/reverse', reverseDealerPayment);
router.post('/jobs', postJob);
router.post('/jobs/issue', postJobIssue);
router.post('/jobs/receipt', postJobReceipt);
router.post('/jobs/:id/reconcile', postJobReconciliation);
router.post('/jobs/:id/reconcile/approve', approvePendingJobReconciliation);
router.post('/old-gold', postOldGold);
router.post('/refining', postRefining);
router.get('/:id/statement', getStatement);
router.get('/:id/audit', getAudit);
router.get('/:id/documents', getDocuments);
router.post('/:id/documents', uploadDealerDocument.single('document'), handleDealerUploadError, postDocument);
router.get('/documents/:documentId/download', downloadDocument);
router.delete('/documents/:documentId', removeDocument);
router.get('/:id', getDealer);
router.put('/:id', putDealer);
router.get('/', getDealers);
router.post('/', postDealer);

module.exports = router;
