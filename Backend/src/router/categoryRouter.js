const express = require('express');
const {
  getCategories,
  postCategory,
  putCategory,
  removeCategory
} = require('../controllers/categoryController');
const requireAdmin = require('../middleware/requireAdmin');
const {
  removeCategoryImages,
  uploadCategoryImages
} = require('../middleware/categoryImageUpload');

const router = express.Router();

router.get('/', getCategories);
const receiveCategoryImages = (req, res, next) => {
  uploadCategoryImages.array('images', 20)(req, res, (error) => {
    if (!error) return next();
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    removeCategoryImages((req.files || []).map((file) => `/uploads/categories/${file.filename}`))
      .then(() => res.status(status).json({ message: error.message }))
      .catch(next);
  });
};

router.post('/', requireAdmin, receiveCategoryImages, postCategory);
router.put('/:catId', requireAdmin, receiveCategoryImages, putCategory);
router.delete('/:catId', requireAdmin, removeCategory);

module.exports = router;
