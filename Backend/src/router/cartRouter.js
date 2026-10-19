const express = require('express');
const requireUser = require('../middleware/requireUser');
const {
  deleteCart,
  deleteCartItem,
  getCart,
  postCart,
  putCart
} = require('../controllers/storeController');

const router = express.Router();

router.use(requireUser);
router.get('/:userId', getCart);
router.post('/', postCart);
router.delete('/clear/:userId', deleteCart);
router.put('/:itemId', putCart);
router.delete('/:itemId', deleteCartItem);

module.exports = router;
