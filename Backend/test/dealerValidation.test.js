const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeDealer,
  normalizeOldGold,
  normalizePayment
} = require('../src/controllers/dealerController');
const { calculatePurchaseLines } = require('../src/modules/dealerModule');

test('dealer registration accepts zero opening balance and zero credit limit', () => {
  const result = normalizeDealer({
    category_id: '1',
    name: 'Supplier',
    contact_person: 'Account Manager',
    phone: '9876543210',
    opening_balance: '0',
    opening_balance_side: 'payable',
    credit_limit: '0',
    payment_terms_days: '0'
  }, { creating: true });

  assert.equal(result.error, undefined);
  assert.equal(result.dealer.opening_balance, 0);
  assert.equal(result.dealer.credit_limit, 0);
});

test('old-gold receipt uses the active rate when rate source is global', () => {
  const result = normalizeOldGold({
    dealer_id: '4',
    gross_weight: '10',
    stone_weight: '1',
    net_weight: '9',
    tested_purity: '916',
    rate_source: 'Global',
    agreed_rate: ''
  });

  assert.equal(result.error, undefined);
  assert.equal(result.receipt.agreed_rate, 0);
});

test('negotiated old-gold rate must be provided', () => {
  const result = normalizeOldGold({
    dealer_id: '4',
    gross_weight: '10',
    stone_weight: '1',
    net_weight: '9',
    tested_purity: '916',
    rate_source: 'Negotiated',
    agreed_rate: ''
  });

  assert.match(result.error, /negotiated rate/i);
});

test('purchase line pricing preserves separate charges and applies tax to the taxable subtotal', () => {
  const result = calculatePurchaseLines([{
    description: 'Gold chain',
    metal_type: 'Gold',
    purity: '916',
    quantity: 1,
    net_weight: 2,
    making_charge: 500,
    wastage_charge: 100,
    stone_charge: 200,
    discount: 100,
    tax_rate: 3,
    tax_type: 'CGST_SGST'
  }], new Map([['Gold:916', { rate_per_gram: 10000, batch_id: 'rate-batch' }]]));

  assert.equal(result.lines[0].metal_value, 20000);
  assert.equal(result.subtotal, 20700);
  assert.equal(result.tax_total, 621);
  assert.equal(result.total, 21321);
  assert.equal(result.lines[0].rate_source, 'Global');
});

test('payment requires an idempotency key before posting', () => {
  const result = normalizePayment({
    dealer_id: '4',
    amount: '100.00',
    payment_date: '2025-01-15',
    method: 'Bank',
    allocations: []
  });

  assert.match(result.error, /idempotency key/i);
});
