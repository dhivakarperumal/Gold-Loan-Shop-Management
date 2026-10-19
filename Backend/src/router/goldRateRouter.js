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

router.use(requireAdmin);
router.get('/current', getCurrent);
router.get('/history', getHistory);
router.post('/', postRates);
router.put('/:id', putRates);
router.post('/:id/activate', activateRates);

module.exports = router;
