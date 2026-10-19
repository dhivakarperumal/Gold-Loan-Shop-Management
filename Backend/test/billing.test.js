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

const currentRates = {
  rates: [
    { metal_type: 'Gold', purity: '916', rate_per_gram: 1000, rate_per_unit: 1000, rate_unit: 'gram' },
    { metal_type: 'Silver', purity: '999', rate_per_gram: 80, rate_per_unit: 80, rate_unit: 'gram' }
  ]
};
const exchangeItem = (overrides = {}) => ({
  product_name: 'Old chain',
  category: 'Chain',
  metal_type: 'Gold',
  purity: '22K',
  weight: 4,
  wastage_weight: 2,
  credit_amount: 1,
  ...overrides
});

test('defaults GST to 0% for full-payment billing totals', () => {
  const result = normalizeBilling(billingInput());
  assert.equal(result.error, undefined);
  assert.equal(result.billing.sub_total, 15000);
  assert.equal(result.billing.gst_amount, 0);
  assert.equal(result.billing.total_amount, 15000);
  assert.match(result.billing.invoice_no, /^BILL-\d{8}-[A-F0-9]{8}$/);
});

test('preserves each customer address in the saved billing payload', () => {
  const result = normalizeBilling(billingInput());
  assert.equal(result.billing.customers[0].address, '12 Gold Street');
});

test('defaults an omitted payment method for compatibility with older clients', () => {
  const result = normalizeBilling(billingInput());
  assert.equal(result.error, undefined);
  assert.equal(result.billing.payment_method, 'UNSPECIFIED');
});

test('accepts supported payment methods and rejects unsupported methods', () => {
  const result = normalizeBilling(billingInput({ payment_method: 'UPI' }));
  assert.equal(result.error, undefined);
  assert.equal(result.billing.payment_method, 'UPI');
  assert.match(normalizeBilling(billingInput({ payment_method: 'CRYPTO' })).error, /payment method/i);
});

test('deducts exchange credit before calculating entered GST', () => {
  const result = normalizeBilling(billingInput({
    payment_type: 'EXCHANGE_GOLD',
    gst_rate: 3,
    exchanges: [exchangeItem()]
  }), currentRates);
  assert.equal(result.error, undefined);
  assert.equal(result.billing.sub_total, 15000);
  assert.equal(result.billing.exchanges[0].metal_type, 'Gold');
  assert.equal(result.billing.exchanges[0].weight, 4);
  assert.equal(result.billing.exchanges[0].wastage_weight, 2);
  assert.equal(result.billing.exchanges[0].net_weight, 2);
  assert.equal(result.billing.exchanges[0].credit_amount, 2000);
  assert.equal(result.billing.gst_amount, 390);
  assert.equal(result.billing.total_amount, 13390);
});

test('values exchange credit using active daily rate and rejects wastage above weight', () => {
  const invalid = normalizeBilling(billingInput({
    payment_type: 'EXCHANGE_GOLD',
    exchanges: [exchangeItem({ weight: 2, wastage_weight: 3 })]
  }), currentRates);
  assert.match(invalid.error, /wastage weight cannot exceed/i);
});

test('generates an exchange item name when none is provided', () => {
  const unnamedItem = exchangeItem({ product_name: '' });
  delete unnamedItem.credit_amount;
  const result = normalizeBilling(billingInput({
    payment_type: 'EXCHANGE_GOLD',
    exchanges: [unnamedItem]
  }), currentRates);
  assert.equal(result.error, undefined);
  assert.equal(result.billing.exchanges[0].product_name, 'Gold 22K exchange item');
});

test('uses the selected metal purity daily rate for exchange credit', () => {
  const result = normalizeBilling(billingInput({
    payment_type: 'EXCHANGE_GOLD',
    exchanges: [exchangeItem({ metal_type: 'Silver', purity: '999', weight: 5, wastage_weight: 1 })]
  }), currentRates);
  assert.equal(result.error, undefined);
  assert.equal(result.billing.exchanges[0].net_weight, 4);
  assert.equal(result.billing.exchanges[0].credit_amount, 320);
  assert.equal(result.billing.exchanges[0].weight_unit, 'gram');
});

test('allows a manually entered exchange rate and calculates the exchange amount from it', () => {
  const result = normalizeBilling(billingInput({
    payment_type: 'EXCHANGE_GOLD',
    exchanges: [exchangeItem({ rate_per_unit: 1250 })]
  }), currentRates);
  assert.equal(result.error, undefined);
  assert.equal(result.billing.exchanges[0].rate_per_unit, 1250);
  assert.equal(result.billing.exchanges[0].credit_amount, 2500);
});

test('accepts a manual exchange rate when no daily rate is available', () => {
  const result = normalizeBilling(billingInput({
    payment_type: 'EXCHANGE_GOLD',
    exchanges: [exchangeItem({ rate_per_unit: 900 })]
  }));
  assert.equal(result.error, undefined);
  assert.equal(result.billing.exchanges[0].credit_amount, 1800);
});

test('rejects invalid manually entered exchange rates', () => {
  const result = normalizeBilling(billingInput({
    payment_type: 'EXCHANGE_GOLD',
    exchanges: [exchangeItem({ rate_per_unit: -1 })]
  }), currentRates);
  assert.match(result.error, /rate/i);
});

test('accepts a custom GST rate and calculates the GST amount and total', () => {
  const result = normalizeBilling(billingInput({ gst_rate: 3.33 }));
  assert.equal(result.error, undefined);
  assert.equal(result.billing.gst_amount, 499.5);
  assert.equal(result.billing.total_amount, 15499.5);
});

test('applies a fixed discount before exchange credit and GST', () => {
  const result = normalizeBilling(billingInput({
    discount_amount: 1000,
    gst_rate: 3,
    payment_type: 'EXCHANGE_GOLD',
    exchanges: [exchangeItem()]
  }), currentRates);
  assert.equal(result.error, undefined);
  assert.equal(result.billing.discount_amount, 1000);
  assert.equal(result.billing.gst_amount, 360);
  assert.equal(result.billing.total_amount, 12360);
});

test('rejects discounts and exchange credits that exceed the products subtotal', () => {
  assert.match(normalizeBilling(billingInput({ discount_amount: 15001 })).error, /discount/i);
  assert.match(normalizeBilling(billingInput({
    discount_amount: 14000,
    payment_type: 'EXCHANGE_GOLD',
    exchanges: [exchangeItem()]
  }), currentRates).error, /cannot exceed/i);
});

test('rejects invalid GST rates', () => {
  assert.match(normalizeBilling(billingInput({ gst_rate: -1 })).error, /GST rate/i);
  assert.match(normalizeBilling(billingInput({ gst_rate: 101 })).error, /GST rate/i);
  assert.match(normalizeBilling(billingInput({ gst_rate: 'not-a-number' })).error, /GST rate/i);
});

test('rejects exchange credits over subtotal and missing exchange items', () => {
  assert.match(normalizeBilling(billingInput({
    payment_type: 'EXCHANGE_GOLD',
    exchanges: [exchangeItem({ weight: 20, wastage_weight: 0 })]
  }), currentRates).error, /cannot exceed/i);
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
    gross_weight: 8.25,
    net_gold_weight: 7.5,
    making_charge_type: 'Fixed Amount',
    making_charge: 1200,
    gold_rate_per_gram: 7200,
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
      gross_weight: 8.25,
      net_gold_weight: 7.5,
      making_charge_type: 'Fixed Amount',
      making_charge: 1200,
      rate_per_gram: 7200,
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
