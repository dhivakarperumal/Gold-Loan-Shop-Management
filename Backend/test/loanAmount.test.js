const assert = require('node:assert/strict');
const test = require('node:test');
const { calculateLoanAmount, calculateMetalValuation, normalizeLoan } = require('../src/controllers/loanController');

test('accepts a manually entered loan amount without tying it to the gold valuation', () => {
  const { loan, error } = normalizeLoan({
    customer_id: '1',
    jewellery_type: 'Bangle',
    gold_purity: '22K',
    metal_type: 'Gold',
    gross_weight: '10',
    stone_weight: '0',
    principal_amount: '4200',
    loan_amount_mode: 'manual',
    interest_type: 'simple',
    interest_rate: '12',
    interest_frequency: 'monthly',
    interest_calculation_start_date: '2026-10-17',
    day_count_convention: 'actual_365',
    loan_date: '2026-10-17',
    maturity_date: '2027-10-17',
    payment_frequency: 'monthly',
    loan_status: 'Active'
  });

  assert.equal(error, undefined);
  assert.equal(loan.principal_amount, '4200.0000');
});

test('calculates half the gold valuation in automatic mode', () => {
  assert.equal(calculateLoanAmount(5000), '2500.00');
  const { loanAmountMode, error } = normalizeLoan({
    customer_id: '1',
    jewellery_type: 'Bangle',
    gold_purity: '22K',
    gross_weight: '10',
    stone_weight: '0',
    principal_amount: '2500',
    loan_amount_mode: 'auto',
    interest_type: 'simple',
    interest_rate: '12',
    interest_frequency: 'monthly',
    interest_calculation_start_date: '2026-10-17',
    day_count_convention: 'actual_365',
    loan_date: '2026-10-17',
    maturity_date: '2027-10-17',
    payment_frequency: 'monthly',
    loan_status: 'Active'
  });

  assert.equal(error, undefined);
  assert.equal(loanAmountMode, 'auto');
});

test('normalizes supported precious-metal collateral types', () => {
  for (const [metal, purity] of [
    ['Silver', '999'],
    ['Platinum', '950'],
    ['Diamond', 'D-F / VVS']
  ]) {
    const { loan, error } = normalizeLoan({
      customer_id: '1',
      jewellery_type: 'Other',
      metal_type: metal,
      gold_purity: purity,
      gross_weight: '2',
      stone_weight: '0',
      principal_amount: '100',
      interest_type: 'simple',
      interest_rate: '12',
      interest_frequency: 'monthly',
      interest_calculation_start_date: '2026-10-17',
      day_count_convention: 'actual_365',
      loan_date: '2026-10-17',
      maturity_date: '2027-10-17',
      payment_frequency: 'monthly',
      loan_status: 'Active'
    });
    assert.equal(error, undefined);
    assert.equal(loan.metal_type, metal);
  }
  assert.equal(calculateMetalValuation(2, 250000), '500000.00');
});
