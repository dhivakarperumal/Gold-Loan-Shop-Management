const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const { uploadFundReceipt } = require('../middleware/fundReceiptUpload');
const {
  getAccounts,
  getReceipt,
  getSummary,
  getTransactions,
  postAccount,
  postCredit,
  postDebit,
  postFundAdded,
  postReceipt,
  postTransfer
} = require('../controllers/fundController');

const router = express.Router();

router.use(requireAdmin);
router.get('/accounts', getAccounts);
router.post('/accounts', postAccount);
router.get('/summary', getSummary);
router.get('/transactions', getTransactions);
router.get('/receipts/:filename', getReceipt);
router.post('/receipts', (req, res, next) => {
  uploadFundReceipt.single('receipt')(req, res, (error) => {
    if (!error) return next();
    return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: error.message });
  });
}, postReceipt);
router.post('/transactions/fund-added', postFundAdded);
router.post('/transactions/debit', postDebit);
router.post('/transactions/credit', postCredit);
router.post('/transfers', postTransfer);

module.exports = router;
