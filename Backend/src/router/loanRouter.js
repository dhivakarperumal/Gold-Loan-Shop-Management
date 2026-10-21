const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const requireAuthenticatedUser = require('../middleware/requireAuthenticatedUser');
const { uploadLoanGoldImage } = require('../middleware/loanGoldImageUpload');
const { uploadLoanGoldReleaseDocument } = require('../middleware/loanGoldReleaseUpload');
const {
  getCustomer,
  getCustomerLoans,
  getCustomers,
  getGoldReleaseList,
  getGoldReleaseRecord,
  getInterestTypes,
  getLoan,
  getLoanGoldImage,
  getLoanGoldReleaseDocument,
  getLoanRenewalDetails,
  getLoanRenewalHistoryList,
  getLoans,
  getMyLoans,
  postLoan,
  postGoldRelease,
  postLoanRenewal,
  postLoanReviewAction,
  putLoan,
  removeLoan,
  updateInterestType
} = require('../controllers/loanController');

const router = express.Router();

// ── Self-service: authenticated customer routes (no admin required) ──
router.get('/loans/my-loans', requireAuthenticatedUser, getMyLoans);

router.use(requireAdmin);

router.get('/customers', getCustomers);
router.get('/customers/:id/loans', getCustomerLoans);
router.get('/customers/:id', getCustomer);
router.get('/loans/interest-types', getInterestTypes);
router.patch('/loans/interest-types/:typeKey', updateInterestType);
router.get('/loans', getLoans);
router.get('/loans/gold-images/:filename', getLoanGoldImage);
router.get('/loans/:id/gold-release-document', getLoanGoldReleaseDocument);
router.get('/loans/gold-release', getGoldReleaseList);
router.get('/loans/:id/gold-release', getGoldReleaseRecord);
router.post('/loans/:id/gold-release', (req, res, next) => {
  uploadLoanGoldReleaseDocument.single('signed_document')(req, res, (error) => {
    if (!error) return next();
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ message: error.message });
  });
}, postGoldRelease);
router.get('/loans/:id/renewal', getLoanRenewalDetails);
router.get('/loans/:id/renewals', getLoanRenewalHistoryList);
router.post('/loans/:id/renewal', postLoanRenewal);
router.post('/loans/:id/review-action', postLoanReviewAction);
router.get('/loans/:id', getLoan);
router.post('/loans', (req, res, next) => {
  uploadLoanGoldImage.single('gold_image')(req, res, (error) => {
    if (!error) return next();
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ message: error.message });
  });
}, postLoan);
router.put('/loans/:id', (req, res, next) => {
  uploadLoanGoldImage.single('gold_image')(req, res, (error) => {
    if (!error) return next();
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ message: error.message });
  });
}, putLoan);
router.delete('/loans/:id', removeLoan);

module.exports = router;
