const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const { getDashboard } = require('../controllers/dashboardController');

const router = express.Router();

router.get('/', requireAdmin, getDashboard);

module.exports = router;
