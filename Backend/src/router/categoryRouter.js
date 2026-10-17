const express = require('express');
const {
  getCategories,
  postCategory,
  putCategory,
  removeCategory
} = require('../controllers/categoryController');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

router.get('/', getCategories);
router.post('/', requireAdmin, postCategory);
router.put('/:catId', requireAdmin, putCategory);
router.delete('/:catId', requireAdmin, removeCategory);

module.exports = router;
