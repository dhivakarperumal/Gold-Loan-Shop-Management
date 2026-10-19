const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const { getReports } = require('../controllers/reportsController');

const router = express.Router();

router.use(requireAdmin);
router.get('/', getReports);

module.exports = router;
