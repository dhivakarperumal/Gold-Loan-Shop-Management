const express = require('express');
const {
  getMetals,
  postMetal,
  putMetal,
  removeMetal
} = require('../controllers/metalController');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

router.get('/', getMetals);
router.post('/', requireAdmin, postMetal);
router.put('/:id', requireAdmin, putMetal);
router.delete('/:id', requireAdmin, removeMetal);

module.exports = router;
