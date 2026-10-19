const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const {
  cleanFailedReviewUpload,
  getReviews,
  postReview,
  postReviewUpload,
  putReviewReply,
  putReviewStatus,
  removeReview
} = require('../controllers/reviewController');
const { uploadReviewImage } = require('../middleware/reviewImageUpload');

const router = express.Router();

function receiveReviewImage(req, res, next) {
  uploadReviewImage.single('image')(req, res, (error) => {
    if (!error) return next();
    req.uploadError = error;
    return cleanFailedReviewUpload(req, res, next);
  });
}

router.use(requireAdmin);
router.get('/admin/all', getReviews);
router.post('/upload', receiveReviewImage, postReviewUpload);
router.post('/', postReview);
router.put('/admin/:id/status', putReviewStatus);
router.put('/admin/:id/reply', putReviewReply);
router.delete('/admin/:id', removeReview);

module.exports = router;
