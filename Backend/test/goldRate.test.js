const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeBatch } = require('../src/controllers/goldRateController');
const { findGoldRateForPurity, RATE_SPECS } = require('../src/modules/goldRateModule');

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
    silver_999: 150,
    platinum_950: 3500,
    platinum_900: 3300,
    diamond_df_vvs: 250000,
    diamond_gh_vs: 150000,
    diamond_ij_si: 90000
  }
});

test('normalizes a complete rate set without mixing gold and silver 999 purities', () => {
  const result = normalizeBatch(validRequest());
  assert.equal(result.error, undefined);
  assert.equal(result.batch.rates.gold_999, 10000);
  assert.equal(result.batch.rates.silver_999, 150);
  assert.equal(result.batch.rates.platinum_950, 3500);
  assert.equal(result.batch.rates.diamond_df_vvs, 250000);
  assert.equal(result.batch.reason, 'Daily market update');
});

test('defines platinum as per gram and diamond quality rates as per carat', () => {
  assert.deepEqual(
    RATE_SPECS.filter((spec) => spec.metal_type === 'Platinum').map(({ purity, rate_unit }) => [purity, rate_unit]),
    [['950', 'gram'], ['900', 'gram']]
  );
  assert.deepEqual(
    RATE_SPECS.filter((spec) => spec.metal_type === 'Diamond').map(({ purity, rate_unit }) => [purity, rate_unit]),
    [['D-F / VVS', 'carat'], ['G-H / VS', 'carat'], ['I-J / SI', 'carat']]
  );
});

test('rejects missing, zero, and invalid rate values', () => {
  const missing = validRequest();
  delete missing.rates.diamond_gh_vs;
  assert.match(normalizeBatch(missing).error, /Diamond G-H \/ VS/i);

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

test('matches purity labels to the configured rate for the selected metal', () => {
  const current = {
    rates: [
      { metal_type: 'Gold', purity: '916', rate_per_gram: 9160 },
      { metal_type: 'Gold', purity: '999', rate_per_gram: 10000 },
      { metal_type: 'Silver', purity: '999', rate_per_gram: 150 },
      { metal_type: 'Platinum', purity: '950', rate_per_gram: 3500 },
      { metal_type: 'Diamond', purity: 'D-F / VVS', rate_per_gram: 250000, rate_unit: 'carat' }
    ]
  };
  assert.equal(findGoldRateForPurity(current, '22K')?.rate_per_gram, 9160);
  assert.equal(findGoldRateForPurity(current, '24K / 999')?.rate_per_gram, 10000);
  assert.equal(findGoldRateForPurity(current, '999', 'Silver')?.rate_per_gram, 150);
  assert.equal(findGoldRateForPurity(current, '950', 'Platinum')?.rate_per_gram, 3500);
  assert.equal(findGoldRateForPurity(current, 'D-F / VVS', 'Diamond')?.rate_per_gram, 250000);
  assert.equal(findGoldRateForPurity(current, 'D-F / VVS', 'Gold'), null);
  assert.equal(findGoldRateForPurity(current, '14K')?.rate_per_gram, undefined);
});
