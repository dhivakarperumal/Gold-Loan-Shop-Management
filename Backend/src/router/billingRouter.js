const express = require('express');
const { getBillings, postBilling } = require('../controllers/billingController');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

router.use(requireAdmin);
router.get('/', getBillings);
router.post('/', postBilling);

module.exports = router;
