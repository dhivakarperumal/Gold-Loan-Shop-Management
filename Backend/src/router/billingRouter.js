const express = require('express');
const { getBillings, postBilling, putBilling, removeBilling } = require('../controllers/billingController');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

router.use(requireAdmin);
router.get('/', getBillings);
router.post('/', postBilling);
router.put('/:id', putBilling);
router.delete('/:id', removeBilling);

module.exports = router;
