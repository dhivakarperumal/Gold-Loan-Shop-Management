const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const {
  getReceiptSettings,
  putReceiptSettings
} = require('../controllers/receiptSettingsController');

const router = express.Router();

router.use(requireAdmin);
router.get('/', getReceiptSettings);
router.put('/', putReceiptSettings);

module.exports = router;
