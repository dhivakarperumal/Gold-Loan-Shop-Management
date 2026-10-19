const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const {
  activateRates,
  getCurrent,
  getHistory,
  postRates,
  putRates
} = require('../controllers/goldRateController');

const router = express.Router();

router.get('/current', getCurrent);
router.get('/history', requireAdmin, getHistory);
router.post('/', requireAdmin, postRates);
router.put('/:id', requireAdmin, putRates);
router.post('/:id/activate', requireAdmin, activateRates);

module.exports = router;
