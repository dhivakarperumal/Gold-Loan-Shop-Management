const assert = require('node:assert/strict');
const test = require('node:test');
const { calculateProductPricing, rateForProduct } = require('../src/services/productPricing');

const baseProduct = {
  net_gold_weight: 10,
  making_charge_type: 'Fixed Amount',
  making_charge: 1000,
  wastage_type: 'Percentage',
  wastage: 2,
  stone_charges: 500,
  other_charges: 100,
  gst_rate: 3,
  price_includes_gst: false,
  offer_type: 'None',
  offer: 0,
  fixed_discount_amount: 0
};

test('calculates 22K product value, charges, tax-exclusive price, and no offer', () => {
  assert.deepEqual(calculateProductPricing(baseProduct, 8000), {
    gold_value: 80000,
    pre_discount_price: 85696,
    tax_amount: 2496,
    applied_discount: 0,
    offer_price: 85696,
    final_selling_price: 85696
  });
});

test('supports percentage offers and limits the discount to the pre-discount price', () => {
  const result = calculateProductPricing({
    ...baseProduct,
    offer_type: 'Percentage',
    offer: 20
  }, 8000);
  assert.equal(result.applied_discount, result.pre_discount_price * 0.2);
  assert.equal(result.final_selling_price, result.pre_discount_price * 0.8);
});

test('supports fixed amount offers and never permits a negative price', () => {
  const result = calculateProductPricing({
    ...baseProduct,
    offer_type: 'Fixed Amount',
    fixed_discount_amount: 999999
  }, 8000);
  assert.equal(result.applied_discount, result.pre_discount_price);
  assert.equal(result.final_selling_price, 0);
});

test('does not apply a discount when offer type is None', () => {
  const result = calculateProductPricing({ ...baseProduct, offer_type: 'None', offer: 15 }, 8000);
  assert.equal(result.applied_discount, 0);
});

test('tax-inclusive prices extract the tax component without adding tax twice', () => {
  const result = calculateProductPricing({
    ...baseProduct,
    price_includes_gst: true,
    gst_rate: 10,
    stone_charges: 0,
    other_charges: 0,
    wastage: 0,
    making_charge: 0
  }, 100);
  assert.equal(result.pre_discount_price, 1000);
  assert.equal(result.tax_amount, 90.91);
  assert.equal(result.final_selling_price, 1000);
});

test('matches 24K, 22K, and 18K purity labels to their configured rates', () => {
  const rates = [
    { metal_type: 'Gold', purity: '999', rate_per_gram: 10000 },
    { metal_type: 'Gold', purity: '916', rate_per_gram: 9160 },
    { metal_type: 'Gold', purity: '750', rate_per_gram: 7500 }
  ];
  assert.equal(rateForProduct(rates, '24K', 'Gold').rate_per_gram, 10000);
  assert.equal(rateForProduct(rates, '22K / 916', 'Gold').rate_per_gram, 9160);
  assert.equal(rateForProduct(rates, '18K', 'Gold').rate_per_gram, 7500);
});

test('rejects invalid inputs and offer types', () => {
  assert.throws(() => calculateProductPricing({ ...baseProduct, net_gold_weight: -1 }, 8000), /non-negative/);
  assert.throws(() => calculateProductPricing({ ...baseProduct, offer_type: 'Invalid' }, 8000), /Offer type/);
});
