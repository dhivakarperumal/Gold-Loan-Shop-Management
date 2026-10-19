const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeBatch } = require('../src/controllers/goldRateController');
const { findGoldRateForPurity } = require('../src/modules/goldRateModule');

const validRequest = () => ({
  rate_date: '2026-06-01',
  effective_from: '2026-06-01T09:00',
  making_charge_type: 'Percentage',
  making_charge_value: 12,
  wastage_percentage: 2,
  reason: 'Daily market update',
  rates: {
    gold_999: 10000,
    gold_916: 9160,
    gold_833: 8330,
    gold_750: 7500,
    gold_585: 5850,
    silver_999: 150
  }
});

test('normalizes a complete rate set without mixing gold and silver 999 purities', () => {
  const result = normalizeBatch(validRequest());
  assert.equal(result.error, undefined);
  assert.equal(result.batch.rates.gold_999, 10000);
  assert.equal(result.batch.rates.silver_999, 150);
  assert.equal(result.batch.reason, 'Daily market update');
});

test('rejects missing, zero, and invalid rate values', () => {
  const missing = validRequest();
  delete missing.rates.gold_833;
  assert.match(normalizeBatch(missing).error, /gold 833/i);

  const zero = validRequest();
  zero.rates.gold_916 = 0;
  assert.match(normalizeBatch(zero).error, /gold 916/i);

  const boolean = validRequest();
  boolean.rates.gold_916 = true;
  assert.match(normalizeBatch(boolean).error, /gold 916/i);

  const invalidDate = validRequest();
  invalidDate.rate_date = '2026-02-30';
  assert.match(normalizeBatch(invalidDate).error, /rate date/i);
});

test('matches loan purity labels to the configured gold rate', () => {
  const current = {
    rates: [
      { metal_type: 'Gold', purity: '916', rate_per_gram: 9160 },
      { metal_type: 'Gold', purity: '999', rate_per_gram: 10000 },
      { metal_type: 'Silver', purity: '999', rate_per_gram: 150 }
    ]
  };
  assert.equal(findGoldRateForPurity(current, '22K')?.rate_per_gram, 9160);
  assert.equal(findGoldRateForPurity(current, '24K / 999')?.rate_per_gram, 10000);
  assert.equal(findGoldRateForPurity(current, '14K')?.rate_per_gram, undefined);
});
