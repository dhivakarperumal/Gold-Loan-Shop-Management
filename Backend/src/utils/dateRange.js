function parseDateRange(query) {
  const startDate = query.startDate || '';
  const endDate = query.endDate || '';
  const validDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  };
  if ((!startDate && endDate) || (startDate && !endDate)
    || (startDate && (!validDate(startDate) || !validDate(endDate) || startDate > endDate))) {
    return { error: 'Select a valid start and end date' };
  }
  return { startDate, endDate };
}

function addDateRangeCondition(conditions, values, column, range) {
  if (range.startDate) {
    conditions.push(`${column} >= ? AND ${column} < DATE_ADD(?, INTERVAL 1 DAY)`);
    values.push(range.startDate, range.endDate);
  }
}

module.exports = { addDateRangeCondition, parseDateRange };
