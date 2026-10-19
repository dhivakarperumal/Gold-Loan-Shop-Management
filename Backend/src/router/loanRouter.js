const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const { uploadLoanGoldImage } = require('../middleware/loanGoldImageUpload');
const {
  getCustomer,
  getCustomerLoans,
  getCustomers,
  getInterestTypes,
  getLoan,
  getLoanGoldImage,
  getLoanRenewalDetails,
  getLoanRenewalHistoryList,
  getLoans,
  postLoan,
  postLoanRenewal,
  putLoan,
  removeLoan,
  updateInterestType
} = require('../controllers/loanController');

const router = express.Router();

router.use(requireAdmin);
router.get('/customers', getCustomers);
router.get('/customers/:id/loans', getCustomerLoans);
router.get('/customers/:id', getCustomer);
router.get('/loans/interest-types', getInterestTypes);
router.patch('/loans/interest-types/:typeKey', updateInterestType);
router.get('/loans', getLoans);
router.get('/loans/gold-images/:filename', getLoanGoldImage);
router.get('/loans/:id/renewal', getLoanRenewalDetails);
router.get('/loans/:id/renewals', getLoanRenewalHistoryList);
router.post('/loans/:id/renewal', postLoanRenewal);
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
