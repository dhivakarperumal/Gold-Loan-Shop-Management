const { getLoanCustomerById, listLoanCustomers } = require('../modules/loanCustomerModule');
const {
  createLoan,
  getLoanById,
  listInterestTypes,
  listLoans,
  listLoansForCustomer,
  setInterestType
} = require('../modules/loanModule');

const INTEREST_FREQUENCIES = new Set([
  'daily', 'weekly', 'monthly', 'quarterly', 'half_yearly', 'yearly', 'custom_period'
]);
const COMPOUND_FREQUENCIES = new Set([
  'daily', 'weekly', 'monthly', 'quarterly', 'half_yearly', 'yearly'
]);
const PAYMENT_FREQUENCIES = new Set([
  'daily', 'weekly', 'monthly', 'quarterly', 'half_yearly', 'yearly', 'bullet'
]);
const DAY_COUNT_CONVENTIONS = new Set(['actual_365', 'actual_360', '30_360']);
const LOAN_STATUSES = new Set(['Active', 'Pending']);
const INTEREST_TYPES = new Set([
  'simple', 'compound', 'flat', 'reducing_balance', 'daily', 'monthly',
  'annual', 'fixed', 'slab_based', 'custom'
]);
const REQUIRED_TEXT = ['jewellery_type', 'gold_purity'];
const MAXIMUM = 999999999999;

function validId(value) {
  return /^\d+$/.test(String(value)) && BigInt(value) > 0n;
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function parseAmount(value, label, { min = 0, max = MAXIMUM } = {}) {
  if (value === '' || value == null) return { error: `${label} is required` };
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < min || amount > max) {
    return { error: `${label} must be between ${min} and ${max}` };
  }
  return { value: amount.toFixed(4) };
}

function normalizeLoan(body) {
  if (!validId(body.customer_id)) return { error: 'Select a valid customer' };
  for (const field of REQUIRED_TEXT) {
    if (typeof body[field] !== 'string' || !body[field].trim() || body[field].trim().length > 100) {
      return { error: `${field.replaceAll('_', ' ')} is required and must be 100 characters or fewer` };
    }
  }
  if (!INTEREST_FREQUENCIES.has(body.interest_frequency)) return { error: 'Select a valid interest frequency' };
  if (typeof body.interest_type !== 'string' || !INTEREST_TYPES.has(body.interest_type)) {
    return { error: 'Select a valid interest type' };
  }
  if (!PAYMENT_FREQUENCIES.has(body.payment_frequency)) return { error: 'Select a valid payment frequency' };
  if (!DAY_COUNT_CONVENTIONS.has(body.day_count_convention)) return { error: 'Select a valid day-count convention' };
  if (!LOAN_STATUSES.has(body.loan_status)) return { error: 'Select a valid loan status' };
  if (!validDate(body.loan_date) || !validDate(body.maturity_date)) {
    return { error: 'Enter valid loan and maturity dates' };
  }
  if (body.maturity_date <= body.loan_date) return { error: 'Maturity date must be after the loan date' };
  const startDate = body.interest_calculation_start_date || body.loan_date;
  if (!validDate(startDate) || startDate < body.loan_date || startDate >= body.maturity_date) {
    return { error: 'Interest start date must be on or after the loan date and before maturity' };
  }
  const principal = parseAmount(body.principal_amount, 'Loan amount', { min: 0.01 });
  if (principal.error) return principal;
  const valuation = parseAmount(body.gold_valuation, 'Gold valuation', { min: 0.01 });
  if (valuation.error) return valuation;
  const rate = body.interest_type === 'fixed' && (body.interest_rate === '' || body.interest_rate == null)
    ? { value: '0.0000' }
    : parseAmount(body.interest_rate, 'Interest rate', { max: 1000 });
  if (rate.error) return rate;
  const gross = parseAmount(body.gross_weight, 'Gross weight', { min: 0.001, max: 999999 });
  if (gross.error) return gross;
  const stone = parseAmount(body.stone_weight || 0, 'Stone weight', { max: 999999 });
  if (stone.error) return stone;
  const netWeight = Number(gross.value) - Number(stone.value);
  if (netWeight <= 0) return { error: 'Gross weight must be greater than stone weight' };
  const fee = parseAmount(body.processing_fee || 0, 'Processing fee');
  if (fee.error) return fee;
  const charges = parseAmount(body.other_charges || 0, 'Other charges');
  if (charges.error) return charges;
  const fixed = body.fixed_interest_amount == null || body.fixed_interest_amount === ''
    ? { value: null }
    : parseAmount(body.fixed_interest_amount, 'Fixed interest amount');
  if (fixed.error) return fixed;
  const lateRate = body.late_payment_interest_rate == null || body.late_payment_interest_rate === ''
    ? { value: null }
    : parseAmount(body.late_payment_interest_rate, 'Late payment interest rate', { max: 1000 });
  if (lateRate.error) return lateRate;
  const minimum = body.minimum_interest_amount == null || body.minimum_interest_amount === ''
    ? { value: null }
    : parseAmount(body.minimum_interest_amount, 'Minimum interest amount');
  if (minimum.error) return minimum;
  const maximumInterest = body.maximum_interest_amount == null || body.maximum_interest_amount === ''
    ? { value: null }
    : parseAmount(body.maximum_interest_amount, 'Maximum interest amount');
  if (maximumInterest.error) return maximumInterest;
  if (minimum.value && maximumInterest.value && Number(maximumInterest.value) < Number(minimum.value)) {
    return { error: 'Maximum interest must be greater than or equal to minimum interest' };
  }
  const dayCounts = [body.grace_period_days || 0, body.interest_free_days || 0];
  if (!dayCounts.every((value) => /^\d+$/.test(String(value)) && Number(value) <= 3650)) {
    return { error: 'Grace period and interest-free period must be whole days from 0 to 3650' };
  }
  if (body.interest_type === 'fixed' && (!fixed.value || Number(fixed.value) <= 0)) {
    return { error: 'Enter a fixed interest amount for this interest type' };
  }
  if (body.interest_type === 'compound' && !body.compounding_frequency) {
    return { error: 'Select a compounding frequency for compound interest' };
  }
  if (body.interest_type === 'compound' && !COMPOUND_FREQUENCIES.has(body.compounding_frequency)) {
    return { error: 'Select a valid compounding frequency' };
  }
  const customPeriodDays = body.custom_period_days == null || body.custom_period_days === ''
    ? null
    : Number(body.custom_period_days);
  if (body.interest_frequency === 'custom_period'
    && (!Number.isInteger(customPeriodDays) || customPeriodDays < 1 || customPeriodDays > 3650)) {
    return { error: 'Custom interest period must be a whole number of days from 1 to 3650' };
  }
  return {
    loan: {
      customer_id: String(body.customer_id),
      jewellery_type: body.jewellery_type.trim(),
      gold_purity: body.gold_purity.trim(),
      gross_weight: gross.value,
      stone_weight: stone.value,
      net_gold_weight: netWeight.toFixed(3),
      gold_valuation: valuation.value,
      principal_amount: principal.value,
      interest_type: body.interest_type,
      interest_rate: rate.value,
      fixed_interest_amount: fixed.value,
      interest_frequency: body.interest_frequency,
      custom_period_days: customPeriodDays,
      interest_calculation_start_date: startDate,
      compounding_frequency: body.compounding_frequency || null,
      day_count_convention: body.day_count_convention,
      grace_period_days: Number(dayCounts[0]),
      late_payment_interest_rate: lateRate.value,
      interest_free_days: Number(dayCounts[1]),
      minimum_interest_amount: minimum.value,
      maximum_interest_amount: maximumInterest.value,
      processing_fee: fee.value,
      other_charges: charges.value,
      loan_date: body.loan_date,
      maturity_date: body.maturity_date,
      payment_frequency: body.payment_frequency,
      loan_status: body.loan_status,
      notes: typeof body.notes === 'string' ? body.notes.trim().slice(0, 5000) : null
    }
  };
}

async function getCustomers(req, res, next) {
  try {
    return res.json(await listLoanCustomers(String(req.query.search || '').trim().slice(0, 100)));
  } catch (error) {
    return next(error);
  }
}

async function getCustomer(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Customer ID is invalid' });
  try {
    const customer = await getLoanCustomerById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    return res.json(customer);
  } catch (error) {
    return next(error);
  }
}

async function getCustomerLoans(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Customer ID is invalid' });
  try {
    if (!await getLoanCustomerById(req.params.id)) return res.status(404).json({ message: 'Customer not found' });
    return res.json(await listLoansForCustomer(req.params.id));
  } catch (error) {
    return next(error);
  }
}

async function getInterestTypes(req, res, next) {
  try {
    return res.json(await listInterestTypes());
  } catch (error) {
    return next(error);
  }
}

async function updateInterestType(req, res, next) {
  if (typeof req.body.enabled !== 'boolean') return res.status(400).json({ message: 'Enabled must be true or false' });
  try {
    if (!await setInterestType(req.params.typeKey, req.body.enabled)) {
      return res.status(404).json({ message: 'Interest type not found' });
    }
    return res.json({ type_key: req.params.typeKey, enabled: req.body.enabled });
  } catch (error) {
    return next(error);
  }
}

async function getLoans(req, res, next) {
  try {
    return res.json(await listLoans());
  } catch (error) {
    return next(error);
  }
}

async function getLoan(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Loan ID is invalid' });
  try {
    const loan = await getLoanById(req.params.id);
    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    return res.json(loan);
  } catch (error) {
    return next(error);
  }
}

async function postLoan(req, res, next) {
  const { loan, error } = normalizeLoan(req.body || {});
  if (error) return res.status(400).json({ message: error });
  try {
    return res.status(201).json(await createLoan({ ...loan, created_by: req.adminUser.user_id }));
  } catch (createError) {
    if (createError.code === 'CUSTOMER_NOT_FOUND') return res.status(404).json({ message: createError.message });
    if (createError.code === 'INTEREST_TYPE_UNAVAILABLE') return res.status(400).json({ message: createError.message });
    return next(createError);
  }
}

module.exports = {
  getCustomer,
  getCustomerLoans,
  getCustomers,
  getInterestTypes,
  getLoan,
  getLoans,
  postLoan,
  updateInterestType
};
