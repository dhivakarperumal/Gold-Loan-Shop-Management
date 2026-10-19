const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeItem } = require('../src/controllers/storeController');

test('normalizes cart and wishlist item fields', () => {
  assert.deepEqual(normalizeItem({
    product_id: '12',
    variant_color: ' Gold ',
    variant_size: ' 18 ',
    image: '/uploads/products/item.jpg',
    quantity: '2'
  }, 7, { cart: true }), {
    item: {
      userId: 7,
      productId: 12,
      color: 'Gold',
      size: '18',
      image: '/uploads/products/item.jpg',
      quantity: 2
    }
  });
  assert.equal(normalizeItem({ product_id: 12 }, 7).item.quantity, 1);
});

test('rejects invalid product, quantity, variant, and image values', () => {
  for (const body of [
    { product_id: 0 },
    { product_id: 12, quantity: 1.5 },
    { product_id: 12, quantity: 1001 },
    { product_id: 12, variant_color: 'x'.repeat(101) }
  ]) {
    assert.ok(normalizeItem(body, 7, { cart: true }).error);
  }
});
