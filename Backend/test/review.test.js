const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeReview } = require('../src/controllers/reviewController');

test('normalizes valid admin-created review input', () => {
  const image = '/uploads/reviews/123e4567-e89b-12d3-a456-426614174000.webp';
  const result = normalizeReview({
    product_id: '12',
    user_name: '  Customer Name ',
    user_email: '',
    rating: 5,
    comment: '  Excellent quality. ',
    review_image: image
  });

  assert.equal(result.error, undefined);
  assert.deepEqual(result.review, {
    product_id: null,
    user_name: 'Customer Name',
    user_email: null,
    rating: 5,
    comment: 'Excellent quality.',
    review_image: image
  });
});

test('allows admin-created reviews without a target product', () => {
  const result = normalizeReview({
    user_name: 'Customer',
    rating: 5,
    comment: 'Great service',
    product_id: 'not-a-product'
  });

  assert.equal(result.error, undefined);
  assert.equal(result.review.product_id, null);
});

test('rejects invalid product, customer, rating, comment, email, and image values', () => {
  const valid = {
    product_id: 12,
    user_name: 'Customer',
    user_email: 'customer@example.com',
    rating: 4,
    comment: 'Good product',
    review_image: null
  };
  for (const [field, value] of Object.entries({
    user_name: ' ',
    user_email: 'not-an-email',
    rating: 6,
    comment: '',
    review_image: '/uploads/reviews/../../private.txt'
  })) {
    assert.ok(normalizeReview({ ...valid, [field]: value }).error, `${field} should be rejected`);
  }
});
