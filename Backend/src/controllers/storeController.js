const {
  addCartItem,
  addWishlistItem,
  clearCartItems,
  listCartItems,
  listWishlistItems,
  removeCartItem,
  removeWishlistItem,
  updateCartItem
} = require('../modules/storeModule');

function validId(value) {
  return /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
}

function userMatches(req, userId) {
  return validId(userId) && Number(userId) === Number(req.storeUser.user_id);
}

function parseProductMedia(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mediaPath(media) {
  if (typeof media === 'string') return media;
  return media?.url || media?.path || media?.src || '';
}

function presentStoreItem(item) {
  const variants = parseProductMedia(item.variants);
  return {
    ...item,
    id: Number(item.id),
    product_id: Number(item.product_id),
    quantity: item.quantity == null ? undefined : Number(item.quantity),
    total_stock: Number(item.total_stock || 0),
    price: Number(item.price || 0),
    total_price: item.total_price == null ? undefined : Number(item.total_price),
    image: item.image || mediaPath(parseProductMedia(item.product_images)[0]) || null,
    variants
  };
}

function normalizeItem(body, userId, { cart = false } = {}) {
  const productId = Number(body.product_id);
  const quantity = cart ? Number(body.quantity ?? 1) : 1;
  if (!Number.isSafeInteger(productId) || productId < 1) return { error: 'Product ID is invalid' };
  if (cart && (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000)) {
    return { error: 'Quantity must be a whole number between 1 and 1000' };
  }
  if (body.variant_color != null && typeof body.variant_color !== 'string') return { error: 'Product color is invalid' };
  if (body.variant_size != null && typeof body.variant_size !== 'string') return { error: 'Product size is invalid' };
  const color = body.variant_color?.trim() || '';
  const size = body.variant_size?.trim() || '';
  if (color.length > 100 || size.length > 100) return { error: 'Product variant is invalid' };
  let image = null;
  if (body.image != null && body.image !== '') {
    if (typeof body.image !== 'string' || body.image.length > 1000) return { error: 'Product image is invalid' };
    image = body.image;
  }
  return { item: { userId, productId, color, size, image, quantity } };
}

async function getCart(req, res, next) {
  if (!userMatches(req, req.params.userId)) return res.status(403).json({ message: 'You can only access your own cart' });
  try {
    return res.json((await listCartItems(req.storeUser.user_id)).map(presentStoreItem));
  } catch (error) {
    return next(error);
  }
}

async function postCart(req, res, next) {
  if (!userMatches(req, req.body?.user_id)) return res.status(403).json({ message: 'You can only update your own cart' });
  const { item, error } = normalizeItem(req.body || {}, req.storeUser.user_id, { cart: true });
  if (error) return res.status(400).json({ message: error });
  try {
    await addCartItem(item);
    const items = await listCartItems(req.storeUser.user_id);
    return res.status(201).json(items.map(presentStoreItem));
  } catch (storeError) {
    if (storeError.code === 'PRODUCT_UNAVAILABLE') return res.status(404).json({ message: storeError.message });
    if (storeError.code === 'INSUFFICIENT_STOCK') return res.status(400).json({ message: storeError.message });
    return next(storeError);
  }
}

async function putCart(req, res, next) {
  if (!validId(req.params.itemId)) return res.status(400).json({ message: 'Cart item ID is invalid' });
  const quantity = Number(req.body?.quantity);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) {
    return res.status(400).json({ message: 'Quantity must be a whole number between 1 and 1000' });
  }
  try {
    const updated = await updateCartItem({ userId: req.storeUser.user_id, itemId: req.params.itemId, quantity });
    if (!updated) return res.status(404).json({ message: 'Cart item not found' });
    return res.json({ message: 'Cart quantity updated' });
  } catch (error) {
    if (error.code === 'INSUFFICIENT_STOCK') return res.status(400).json({ message: error.message });
    return next(error);
  }
}

async function deleteCartItem(req, res, next) {
  if (!validId(req.params.itemId)) return res.status(400).json({ message: 'Cart item ID is invalid' });
  try {
    if (!await removeCartItem(req.storeUser.user_id, req.params.itemId)) {
      return res.status(404).json({ message: 'Cart item not found' });
    }
    return res.json({ message: 'Cart item removed' });
  } catch (error) {
    return next(error);
  }
}

async function deleteCart(req, res, next) {
  if (!userMatches(req, req.params.userId)) return res.status(403).json({ message: 'You can only clear your own cart' });
  try {
    await clearCartItems(req.storeUser.user_id);
    return res.json({ message: 'Cart cleared' });
  } catch (error) {
    return next(error);
  }
}

async function getWishlist(req, res, next) {
  if (!userMatches(req, req.params.userId)) return res.status(403).json({ message: 'You can only access your own wishlist' });
  try {
    return res.json((await listWishlistItems(req.storeUser.user_id)).map(presentStoreItem));
  } catch (error) {
    return next(error);
  }
}

async function postWishlist(req, res, next) {
  if (!userMatches(req, req.body?.user_id)) return res.status(403).json({ message: 'You can only update your own wishlist' });
  const { item, error } = normalizeItem(req.body || {}, req.storeUser.user_id);
  if (error) return res.status(400).json({ message: error });
  try {
    await addWishlistItem(item);
    return res.status(201).json({ message: 'Product added to wishlist' });
  } catch (storeError) {
    if (storeError.code === 'PRODUCT_UNAVAILABLE') return res.status(404).json({ message: storeError.message });
    return next(storeError);
  }
}

async function deleteWishlistItem(req, res, next) {
  if (!userMatches(req, req.params.userId)) return res.status(403).json({ message: 'You can only update your own wishlist' });
  if (!validId(req.params.productId)) return res.status(400).json({ message: 'Product ID is invalid' });
  try {
    await removeWishlistItem(req.storeUser.user_id, req.params.productId);
    return res.json({ message: 'Product removed from wishlist' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  deleteCart,
  deleteCartItem,
  deleteWishlistItem,
  getCart,
  getWishlist,
  normalizeItem,
  postCart,
  postWishlist,
  putCart
};
