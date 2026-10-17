const express = require('express');
const {
  getMetals,
  postMetal,
  postMetalImage,
  putMetal,
  removeMetal
} = require('../controllers/metalController');
const requireAdmin = require('../middleware/requireAdmin');
const { uploadMetalImage } = require('../middleware/metalImageUpload');

const router = express.Router();

router.get('/', getMetals);
router.post('/images', requireAdmin, (req, res, next) => {
  uploadMetalImage.single('image')(req, res, (error) => {
    if (!error) return next();
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ message: error.message });
  });
}, postMetalImage);
router.post('/', requireAdmin, postMetal);
router.put('/:id', requireAdmin, putMetal);
router.delete('/:id', requireAdmin, removeMetal);

module.exports = router;
