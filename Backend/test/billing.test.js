const assert = require('node:assert/strict');
const test = require('node:test');
const { mapSelectedProducts, normalizeBilling } = require('../src/controllers/billingController');

const billingInput = (overrides = {}) => ({
  customers: [{
    name: 'A Customer',
    phone: '9876543210',
    email: 'a@example.com',
    address: '12 Gold Street'
  }],
  products: [
    { product_name: 'Gold chain', category: 'Chain', purity: '22K', price: 10000 },
    { product_name: 'Gold ring', category: 'Ring', purity: '18K', price: 5000 }
  ],
  exchanges: [],
  payment_type: 'FULL_PAYMENT',
  ...overrides
});

test('calculates full-payment billing totals with 3% GST', () => {
  const result = normalizeBilling(billingInput());
  assert.equal(result.error, undefined);
  assert.equal(result.billing.sub_total, 15000);
  assert.equal(result.billing.gst_amount, 450);
  assert.equal(result.billing.total_amount, 15450);
  assert.match(result.billing.invoice_no, /^BILL-\d{8}-[A-F0-9]{8}$/);
});

test('preserves each customer address in the saved billing payload', () => {
  const result = normalizeBilling(billingInput());
  assert.equal(result.billing.customers[0].address, '12 Gold Street');
});

test('deducts exchange credit before calculating GST', () => {
  const result = normalizeBilling(billingInput({
    payment_type: 'EXCHANGE_GOLD',
    exchanges: [{ product_name: 'Old chain', category: 'Chain', purity: '22K', credit_amount: 2000 }]
  }));
  assert.equal(result.error, undefined);
  assert.equal(result.billing.sub_total, 15000);
  assert.equal(result.billing.gst_amount, 390);
  assert.equal(result.billing.total_amount, 13390);
});

test('rejects exchange credits over subtotal and missing exchange items', () => {
  assert.match(normalizeBilling(billingInput({
    payment_type: 'EXCHANGE_GOLD',
    exchanges: [{ product_name: 'Old chain', category: 'Chain', purity: '22K', credit_amount: 16000 }]
  })).error, /cannot exceed/i);
  assert.match(normalizeBilling(billingInput({ payment_type: 'EXCHANGE_GOLD' })).error, /at least one exchange/i);
});

test('uses catalog details and catalog price instead of client-submitted product values', () => {
  const selected = mapSelectedProducts([{
    product_id: 12,
    product_name: 'Forged product',
    category: 'Forged category',
    purity: '24K',
    price: 1
  }], [{
    id: 12,
    name: 'Catalog necklace',
    category: 'Necklace',
    purity: '22K',
    offer_price: 12000,
    final_selling_price: 12500,
    mrp: 15000,
    status: 'Active'
  }]);
  assert.deepEqual(selected, {
    products: [{
      product_id: 12,
      product_name: 'Catalog necklace',
      category: 'Necklace',
      purity: '22K',
      price: 12000
    }]
  });
});

test('rejects products that are missing from or inactive in the catalog', () => {
  assert.match(mapSelectedProducts([{ product_id: 99 }], []).error, /no longer active/i);
  assert.match(mapSelectedProducts([{ product_id: 12 }], [{
    id: 12, name: 'Inactive', category: 'Ring', purity: '18K', status: 'Inactive'
  }]).error, /no longer active/i);
});
