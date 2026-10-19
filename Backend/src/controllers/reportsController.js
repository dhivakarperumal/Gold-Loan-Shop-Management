const { dateBounds, getReportsData } = require('../modules/reportsModule');

const PERIODS = new Set(['today', 'yesterday', 'week', 'month', 'year', 'custom']);
const PAYMENT_METHODS = new Set(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'OTHER', 'UNSPECIFIED']);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value) {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function normalizeReportFilters(query) {
  const period = query.period || 'month';
  if (!PERIODS.has(period)) return { error: 'Select a valid report period' };
  if (period === 'custom' && (!validDate(query.startDate || '') || !validDate(query.endDate || ''))) {
    return { error: 'Enter valid start and end dates' };
  }
  const { startDate, endDate } = dateBounds(period, query.startDate, query.endDate);
  if (!validDate(startDate) || !validDate(endDate) || startDate > endDate) {
    return { error: 'The report date range is invalid' };
  }
  const rangeDays = (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000;
  if (rangeDays > 3660) return { error: 'Report date range cannot exceed 10 years' };

  const category = query.category || '';
  if (typeof category !== 'string' || category.length > 150) return { error: 'Product category is invalid' };
  const paymentType = query.paymentType || '';
  if (paymentType && !PAYMENT_METHODS.has(paymentType)) return { error: 'Payment method is invalid' };
  const status = query.status || '';
  if (typeof status !== 'string' || status.length > 40) return { error: 'Transaction status is invalid' };
  const employeeId = query.employeeId || '';
  if (employeeId && (!/^\d+$/.test(employeeId) || !Number.isSafeInteger(Number(employeeId)) || Number(employeeId) < 1)) {
    return { error: 'Employee selection is invalid' };
  }
  if (query.branchId) return { error: 'Branch filtering is unavailable because branch data is not configured' };
  return { filters: { period, startDate, endDate, category, paymentType, status, employeeId } };
}

async function getReports(req, res, next) {
  const { filters, error } = normalizeReportFilters(req.query || {});
  if (error) return res.status(400).json({ message: error });
  try {
    return res.json(await getReportsData(filters));
  } catch (reportError) {
    return next(reportError);
  }
}

module.exports = { getReports, normalizeReportFilters };
