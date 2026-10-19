const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeReportFilters } = require('../src/controllers/reportsController');
const { bucketDate, dateBounds, estimateConfiguredInterest } = require('../src/modules/reportsModule');

test('resolves named reporting periods to actual date bounds', () => {
  const now = new Date('2026-10-19T12:00:00.000Z');
  assert.deepEqual(dateBounds('today', '', '', now), { startDate: '2026-10-19', endDate: '2026-10-19' });
  assert.deepEqual(dateBounds('yesterday', '', '', now), { startDate: '2026-10-18', endDate: '2026-10-18' });
  assert.deepEqual(dateBounds('week', '', '', now), { startDate: '2026-10-19', endDate: '2026-10-19' });
  assert.deepEqual(dateBounds('month', '', '', now), { startDate: '2026-10-01', endDate: '2026-10-19' });
  assert.deepEqual(dateBounds('year', '', '', now), { startDate: '2026-01-01', endDate: '2026-10-19' });
});

test('buckets sales history into day, week, month, and year labels', () => {
  assert.equal(bucketDate('2026-10-19', 'day'), '2026-10-19');
  assert.equal(bucketDate('2026-10-21', 'week'), '2026-10-19');
  assert.equal(bucketDate('2026-10-21', 'month'), '2026-10-01');
  assert.equal(bucketDate('2026-10-21', 'year'), '2026-01-01');
});

test('accepts a valid custom range and report filters', () => {
  const result = normalizeReportFilters({
    period: 'custom',
    startDate: '2026-10-01',
    endDate: '2026-10-19',
    category: 'Rings',
    paymentType: 'CASH',
    status: 'Recorded',
    employeeId: '12'
  });
  assert.equal(result.error, undefined);
  assert.deepEqual(result.filters, {
    period: 'custom',
    startDate: '2026-10-01',
    endDate: '2026-10-19',
    category: 'Rings',
    paymentType: 'CASH',
    status: 'Recorded',
    employeeId: '12'
  });
});

test('rejects invalid ranges, unsupported payment types, employees, and unconfigured branches', () => {
  assert.match(normalizeReportFilters({ period: 'invalid' }).error, /period/i);
  assert.match(normalizeReportFilters({ period: 'custom', startDate: '2026-02-30', endDate: '2026-03-01' }).error, /dates/i);
  assert.match(normalizeReportFilters({ period: 'custom', startDate: '2026-03-02', endDate: '2026-03-01' }).error, /range/i);
  assert.match(normalizeReportFilters({ period: 'month', paymentType: 'FULL_PAYMENT' }).error, /payment/i);
  assert.match(normalizeReportFilters({ period: 'month', employeeId: 'abc' }).error, /employee/i);
  assert.match(normalizeReportFilters({ period: 'month', branchId: '1' }).error, /branch/i);
});

test('estimates configured simple, fixed, and capped loan interest through the report date', () => {
  const loan = {
    principal_amount: '1000',
    interest_type: 'simple',
    interest_rate: '2',
    interest_frequency: 'monthly',
    interest_calculation_start_date: '2026-01-01',
    maturity_date: '2026-12-31',
    day_count_convention: '30_360',
    grace_period_days: 0,
    interest_free_days: 0
  };
  assert.equal(estimateConfiguredInterest(loan, '2026-02-01'), 20);
  assert.equal(estimateConfiguredInterest(loan, '2026-01-01'), 0);
  assert.equal(estimateConfiguredInterest({ ...loan, interest_type: 'fixed', fixed_interest_amount: 100 }, '2026-02-01'), 100);
  assert.equal(estimateConfiguredInterest({ ...loan, maximum_interest_amount: 15 }, '2026-02-01'), 15);
  assert.equal(estimateConfiguredInterest(loan, '2027-01-01'), estimateConfiguredInterest(loan, '2026-12-31'));
});
