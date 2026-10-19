const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const {
  readHomeSections,
  updateHomeSections
} = require('../controllers/homeSectionController');

const router = express.Router();

router.get('/', readHomeSections);
router.put('/', requireAdmin, updateHomeSections);

module.exports = router;
