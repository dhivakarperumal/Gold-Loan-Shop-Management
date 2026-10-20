const assert = require('node:assert/strict');
const test = require('node:test');
const {
  allocateRenewalPayment,
  isLoanReviewDue,
  makeRenewalPreview
} = require('../src/modules/loanModule');

test('requires both maturity and the 15-month date before review is due', () => {
  const loan = {
    loan_date: '2025-01-31',
    maturity_date: '2025-12-31',
    loan_status: 'Active',
    release_status: 'Not Ready',
    outstanding_principal: '50000.00',
    principal_amount: '50000.00'
  };

  assert.equal(isLoanReviewDue(loan, '2026-04-29'), false);
  assert.equal(isLoanReviewDue(loan, '2026-04-30'), true);
  assert.equal(isLoanReviewDue({ ...loan, maturity_date: '2026-04-30' }, '2026-04-30'), false);
});

test('keeps a suspended unpaid loan in the 15-month manual review workflow', () => {
  const loan = {
    loan_date: '2025-01-31',
    maturity_date: '2025-12-31',
    loan_status: 'Suspended',
    release_status: 'Not Ready',
    outstanding_principal: '50000.00',
    principal_amount: '50000.00'
  };

  assert.equal(isLoanReviewDue(loan, '2026-05-01'), true);
});

test('calculates eleven monthly interest periods and the next eleven-month maturity', () => {
  const loan = {
    principal_amount: '50000.00',
    outstanding_principal: '50000.00',
    interest_calculation_start_date: '2025-10-19',
    maturity_date: '2026-09-19',
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

test('applies the saved late-payment rate only after maturity and reports it separately', () => {
  const loan = {
    principal_amount: '50000.00',
    outstanding_principal: '50000.00',
    interest_calculation_start_date: '2025-10-19',
    maturity_date: '2026-09-19',
    interest_type: 'simple',
    interest_rate: '2.0000',
    late_payment_interest_rate: '3.0000',
    interest_frequency: 'monthly',
    grace_period_days: 0,
    interest_free_days: 0
  };

  const preview = makeRenewalPreview(loan, '2026-10-19');

  assert.equal(preview.regular_interest, 11000);
  assert.equal(preview.late_payment_fee, 1500);
  assert.equal(preview.accrued_interest, 12500);
  assert.equal(preview.total_due, 62500);
});

test('does not apply late-payment fee on or before maturity', () => {
  const loan = {
    principal_amount: '50000.00',
    outstanding_principal: '50000.00',
    interest_calculation_start_date: '2025-10-19',
    maturity_date: '2026-09-19',
    interest_type: 'simple',
    interest_rate: '2.0000',
    late_payment_interest_rate: '3.0000',
    interest_frequency: 'monthly',
    grace_period_days: 0,
    interest_free_days: 0
  };

  const preview = makeRenewalPreview(loan, '2026-09-19');

  assert.equal(preview.late_payment_fee, 0);
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
