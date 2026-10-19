const express = require('express');
const requireUser = require('../middleware/requireUser');
const {
  deleteWishlistItem,
  getWishlist,
  postWishlist
} = require('../controllers/storeController');

const router = express.Router();

router.use(requireUser);
router.get('/:userId', getWishlist);
router.post('/', postWishlist);
router.delete('/:userId/:productId', deleteWishlistItem);

module.exports = router;
