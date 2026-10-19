const assert = require('node:assert/strict');
const test = require('node:test');
const {
  allocateRenewalPayment,
  makeRenewalPreview
} = require('../src/modules/loanModule');

test('calculates eleven monthly interest periods and the next eleven-month maturity', () => {
  const loan = {
    principal_amount: '50000.00',
    outstanding_principal: '50000.00',
    interest_calculation_start_date: '2025-10-19',
    interest_type: 'simple',
    interest_rate: '2.0000',
    interest_frequency: 'monthly',
    grace_period_days: 0,
    interest_free_days: 0
  };

  const preview = makeRenewalPreview(loan, '2026-09-19');

  assert.equal(preview.accrued_interest, 11000);
  assert.equal(preview.total_due, 61000);
  assert.equal(preview.next_maturity_date, '2027-08-19');
});

test('allocates payment to accrued interest first and reduces principal with the remainder', () => {
  const allocation = allocateRenewalPayment({
    accrued_interest: 11000,
    current_principal: 50000
  }, 41000);

  assert.deepEqual(allocation, {
    paymentAmount: 41000,
    interestPaid: 11000,
    principalPaid: 30000,
    principalAfter: 20000
  });
});

test('does not charge minimum interest for a period with no elapsed time', () => {
  const loan = {
    principal_amount: '50000.00',
    outstanding_principal: '50000.00',
    interest_calculation_start_date: '2026-09-19',
    interest_type: 'simple',
    interest_rate: '2.0000',
    interest_frequency: 'monthly',
    minimum_interest_amount: '100.00',
    grace_period_days: 0,
    interest_free_days: 0
  };

  assert.equal(makeRenewalPreview(loan, '2026-09-19').accrued_interest, 0);
});
