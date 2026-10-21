const assert = require('node:assert/strict');
const test = require('node:test');
const { addDateRangeCondition, parseDateRange } = require('../src/utils/dateRange');

test('accepts an unrestricted date range', () => {
  assert.deepEqual(parseDateRange({}), { startDate: '', endDate: '' });
  assert.deepEqual(parseDateRange({ startDate: '', endDate: '' }), { startDate: '', endDate: '' });
});

test('accepts valid inclusive date boundaries', () => {
  assert.deepEqual(
    parseDateRange({ startDate: '2024-02-29', endDate: '2024-03-01' }),
    { startDate: '2024-02-29', endDate: '2024-03-01' }
  );
});

test('rejects partial, invalid, and reversed ranges', () => {
  for (const range of [
    { startDate: '2024-01-01' },
    { endDate: '2024-01-31' },
    { startDate: '2023-02-29', endDate: '2023-03-01' },
    { startDate: '2024-02-01', endDate: '2024-01-31' }
  ]) {
    assert.equal(Boolean(parseDateRange(range).error), true);
  }
});

test('builds an inclusive timestamp condition with an exclusive next-day end', () => {
  const conditions = [];
  const values = [];
  addDateRangeCondition(conditions, values, 't.transaction_date', {
    startDate: '2024-02-29',
    endDate: '2024-03-01'
  });
  assert.deepEqual(conditions, ['t.transaction_date >= ? AND t.transaction_date < DATE_ADD(?, INTERVAL 1 DAY)']);
  assert.deepEqual(values, ['2024-02-29', '2024-03-01']);
});
