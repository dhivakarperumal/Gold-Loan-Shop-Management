const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const {
  cleanFailedBannerUpload,
  getBanners,
  postBanner,
  postBannerUpload,
  putBanner,
  removeBanner
} = require('../controllers/bannerController');
const { uploadBannerImage } = require('../middleware/bannerImageUpload');

const router = express.Router();

function receiveBannerImage(req, res, next) {
  uploadBannerImage.single('image')(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') req.fileSizeLimitExceeded = true;
    else req.fileValidationError = error.message;
    return cleanFailedBannerUpload(req, res, next);
  });
}

router.get('/', requireAdmin, getBanners);
router.post('/upload', requireAdmin, receiveBannerImage, postBannerUpload);
router.post('/', requireAdmin, postBanner);
router.put('/:id', requireAdmin, putBanner);
router.delete('/:id', requireAdmin, removeBanner);

module.exports = router;
