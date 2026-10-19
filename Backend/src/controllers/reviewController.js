const {
  createReview,
  deleteReview,
  getReviewById,
  listReviews,
  productExists,
  reviewImageInUse,
  updateReviewReply,
  updateReviewStatus
} = require('../modules/reviewModule');
const { isValidReviewImage, removeReviewImage, removeReviewUpload } = require('../middleware/reviewImageUpload');

const REVIEW_STATUSES = new Set(['Pending', 'Published', 'Flagged']);

function validId(value) {
  return /^\d+$/.test(String(value)) && BigInt(value) > 0n;
}

function normalizeReview(body) {
  const productId = Number(body.product_id);
  const userName = typeof body.user_name === 'string' ? body.user_name.trim() : '';
  const userEmail = typeof body.user_email === 'string' ? body.user_email.trim() : '';
  const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
  const rating = Number(body.rating);
  const image = body.review_image == null || body.review_image === '' ? null : body.review_image;
  if (!Number.isSafeInteger(productId) || productId < 1) return { error: 'Select a valid product' };
  if (!userName || userName.length > 150) return { error: 'Customer name is required and must be 150 characters or fewer' };
  if (userEmail && (userEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail))) {
    return { error: 'Enter a valid customer email address' };
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: 'Rating must be between 1 and 5' };
  if (!comment || comment.length > 5000) return { error: 'Review comment is required and must be 5000 characters or fewer' };
  if (image !== null && (typeof image !== 'string'
    || !/^\/uploads\/reviews\/[0-9a-f-]{36}\.(?:png|jpg|webp)$/i.test(image))) {
    return { error: 'Review image must be uploaded using the review image uploader' };
  }
  return {
    review: {
      product_id: productId,
      user_name: userName,
      user_email: userEmail || null,
      rating,
      comment,
      review_image: image
    }
  };
}

async function getReviews(req, res, next) {
  const status = req.query.status == null || req.query.status === '' ? '' : String(req.query.status);
  const rating = req.query.rating == null || req.query.rating === '' ? 0 : Number(req.query.rating);
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
  if (status && !REVIEW_STATUSES.has(status)) return res.status(400).json({ message: 'Review status filter is invalid' });
  if (rating && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    return res.status(400).json({ message: 'Rating filter must be between 1 and 5' });
  }
  try {
    return res.json(await listReviews({ status, rating, search }));
  } catch (error) {
    return next(error);
  }
}

async function postReview(req, res, next) {
  const { review, error } = normalizeReview(req.body || {});
  if (error) return res.status(400).json({ message: error });
  try {
    if (!await productExists(review.product_id)) return res.status(404).json({ message: 'Product not found' });
    return res.status(201).json(await createReview(review));
  } catch (createError) {
    return next(createError);
  }
}

async function putReviewStatus(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Review ID is invalid' });
  const { status } = req.body || {};
  if (!REVIEW_STATUSES.has(status)) return res.status(400).json({ message: 'Review status is invalid' });
  try {
    if (!await updateReviewStatus(req.params.id, status)) return res.status(404).json({ message: 'Review not found' });
    return res.json({ message: 'Review status updated', status });
  } catch (error) {
    return next(error);
  }
}

async function putReviewReply(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Review ID is invalid' });
  const reply = typeof req.body?.admin_reply === 'string' ? req.body.admin_reply.trim() : '';
  if (!reply || reply.length > 5000) return res.status(400).json({ message: 'Reply is required and must be 5000 characters or fewer' });
  try {
    if (!await updateReviewReply(req.params.id, reply)) return res.status(404).json({ message: 'Review not found' });
    return res.json({ message: 'Review reply saved' });
  } catch (error) {
    return next(error);
  }
}

async function removeReview(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Review ID is invalid' });
  try {
    const review = await getReviewById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (!await deleteReview(req.params.id)) return res.status(404).json({ message: 'Review not found' });
    if (!await reviewImageInUse(review.review_image, req.params.id)) {
      await removeReviewImage(review.review_image);
    }
    return res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    return next(error);
  }
}

async function postReviewUpload(req, res, next) {
  if (!req.file) return res.status(400).json({ message: 'Select a review image to upload' });
  try {
    if (!isValidReviewImage(req.file)) {
      await removeReviewUpload(req.file);
      return res.status(400).json({ message: 'The uploaded file is not a valid PNG, JPG, or WEBP image' });
    }
    return res.status(201).json({ url: `/uploads/reviews/${req.file.filename}` });
  } catch (error) {
    await removeReviewUpload(req.file);
    return next(error);
  }
}

async function cleanFailedReviewUpload(req, res, next) {
  try {
    await removeReviewUpload(req.file);
    const tooLarge = req.uploadError?.code === 'LIMIT_FILE_SIZE';
    return res.status(tooLarge ? 413 : 400).json({
      message: tooLarge ? 'Review images must be 5 MB or smaller' : req.uploadError?.message || 'Review image upload failed'
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  cleanFailedReviewUpload,
  getReviews,
  normalizeReview,
  postReview,
  postReviewUpload,
  putReviewReply,
  putReviewStatus,
  removeReview
};
