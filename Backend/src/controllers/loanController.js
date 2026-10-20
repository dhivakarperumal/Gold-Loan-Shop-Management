const { randomUUID } = require('node:crypto');
const { getLoanCustomerById, listLoanCustomers } = require('../modules/loanCustomerModule');
const {
  createLoan,
  deleteLoan,
  getGoldReleaseDetails,
  getLoanById,
  getLoanRenewal,
  getLoanRenewalHistory,
  listInterestTypes,
  listGoldReleaseEligible,
  listLoans,
  listLoansForCustomer,
  listLoansForUser,
  recordLoanReviewAction,
  renewLoan,
  releaseGold,
  setInterestType,
  updateLoan
} = require('../modules/loanModule');
const { parseDateRange } = require('../utils/dateRange');

const { findGoldRateForPurity, getCurrentGoldRates } = require('../modules/goldRateModule');
const fs = require('node:fs');
const {
  getLoanGoldImagePath,
  isValidLoanGoldImage,
  removeLoanGoldImage
} = require('../middleware/loanGoldImageUpload');
const {
  getLoanGoldReleaseDocumentPath,
  isValidLoanGoldReleaseDocument,
  removeLoanGoldReleaseDocument
} = require('../middleware/loanGoldReleaseUpload');

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
const LOAN_STATUSES = new Set(['Active', 'Pending', 'Inactive', 'Completed']);
const METAL_TYPES = new Set(['Gold', 'Silver', 'Platinum', 'Diamond']);
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

function calculateLoanAmount(goldValuation) {
  return (Math.round(Number(goldValuation) * 50) / 100).toFixed(2);
}

function calculateMetalValuation(netWeight, ratePerUnit) {
  return (Number(netWeight) * Number(ratePerUnit)).toFixed(2);
}

function normalizeLoan(body) {
  const loanAmountMode = body.loan_amount_mode == null ? 'manual' : body.loan_amount_mode;
  if (!['auto', 'manual'].includes(loanAmountMode)) return { error: 'Select a valid loan amount mode' };
  if (!validId(body.customer_id)) return { error: 'Select a valid customer' };
  const metalType = body.metal_type == null || body.metal_type === '' ? 'Gold' : body.metal_type;
  if (!METAL_TYPES.has(metalType)) return { error: 'Select a valid metal type' };
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
    loanAmountMode,
    loan: {
      customer_id: String(body.customer_id),
      jewellery_type: body.jewellery_type.trim(),
      metal_type: metalType,
      gold_purity: body.gold_purity.trim(),
      gross_weight: gross.value,
      stone_weight: stone.value,
      net_gold_weight: netWeight.toFixed(3),
      gold_valuation: '0.00',
      rate_unit: body.rate_unit === 'carat' ? 'carat' : 'gram',
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
    const customer = await getLoanCustomerById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    if (
      req.authenticatedUser.role !== 'admin'
      && String(customer.user_id) !== String(req.authenticatedUser.user_id)
    ) {
      return res.status(403).json({ message: 'You can only view loans linked to your account' });
    }
    return res.json(await listLoansForCustomer(req.params.id));
  } catch (error) {
    return next(error);
  }
}

// Authenticated user — returns their own loans matched via loan_customers.user_id
async function getMyLoans(req, res, next) {
  try {
    const loans = await listLoansForUser(req.authenticatedUser.user_id);
    return res.json(loans);
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
  const range = parseDateRange(req.query);
  if (range.error) return res.status(400).json({ message: range.error });
  try {
    return res.json(await listLoans(range));
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

async function getLoanRenewalDetails(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Loan ID is invalid' });
  try {
    const renewal = await getLoanRenewal(req.params.id);
    if (!renewal) return res.status(404).json({ message: 'Loan not found' });
    return res.json(renewal);
  } catch (error) {
    return next(error);
  }
}

async function postLoanRenewal(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Loan ID is invalid' });
  const amount = parseAmount(req.body?.payment_amount, 'Payment amount', { min: 0.01 });
  if (amount.error) return res.status(400).json({ message: amount.error });
  try {
    return res.json(await renewLoan(req.params.id, amount.value, req.adminUser.user_id));
  } catch (error) {
    if (error.code === 'LOAN_NOT_FOUND') return res.status(404).json({ message: error.message });
    if (['LOAN_NOT_ACTIVE', 'LOAN_READY_FOR_GOLD_RELEASE'].includes(error.code)) {
      return res.status(409).json({ message: error.message });
    }
    if ([
      'INVALID_RENEWAL_PAYMENT',
      'RENEWAL_PAYMENT_BELOW_INTEREST',
      'RENEWAL_PAYMENT_EXCEEDS_DUE'
    ].includes(error.code)) {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
}

async function postLoanReviewAction(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Loan ID is invalid' });
  const action = String(req.body?.action || '').trim();
  if (!['notice_sent', 'suspend', 'reinstate'].includes(action)) {
    return res.status(400).json({ message: 'Choose a valid loan review action' });
  }
  try {
    return res.json(await recordLoanReviewAction(
      req.params.id,
      action,
      req.body,
      req.adminUser.user_id
    ));
  } catch (error) {
    if (error.code === 'LOAN_NOT_FOUND') return res.status(404).json({ message: error.message });
    if (['INVALID_REVIEW_NOTES', 'INVALID_REVIEW_NOTICE', 'INVALID_REVIEW_ACTION'].includes(error.code)) {
      return res.status(400).json({ message: error.message });
    }
    if ([
      'LOAN_REVIEW_NOT_DUE',
      'LOAN_NOT_ACTIVE',
      'REVIEW_NOTICE_REQUIRED',
      'LOAN_NOT_SUSPENDED'
    ].includes(error.code)) {
      return res.status(409).json({ message: error.message });
    }
    return next(error);
  }
}

async function getLoanRenewalHistoryList(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Loan ID is invalid' });
  try {
    if (!await getLoanById(req.params.id)) return res.status(404).json({ message: 'Loan not found' });
    return res.json(await getLoanRenewalHistory(req.params.id));
  } catch (error) {
    return next(error);
  }
}

async function getGoldReleaseList(req, res, next) {
  try {
    return res.json(await listGoldReleaseEligible());
  } catch (error) {
    return next(error);
  }
}

async function postGoldRelease(req, res, next) {
  const rejectUpload = async (status, message) => {
    try {
      if (req.file) {
        await removeLoanGoldReleaseDocument(`/api/loans/gold-release-documents/${req.file.filename}`);
      }
      return res.status(status).json({ message });
    } catch (error) {
      return next(error);
    }
  };
  if (!validId(req.params.id)) return rejectUpload(400, 'Loan ID is invalid');
  if (!req.file) return res.status(400).json({ message: 'Upload the signed gold release document before completing the release' });
  try {
    if (!isValidLoanGoldReleaseDocument(req.file.path, req.file.mimetype)) {
      return rejectUpload(400, 'The uploaded file is not a valid PDF, JPG, or PNG document');
    }
  } catch (error) {
    try {
      await removeLoanGoldReleaseDocument(`/api/loans/gold-release-documents/${req.file.filename}`);
    } catch (cleanupError) {
      return next(cleanupError);
    }
    return next(error);
  }
  const signatureReceived = req.body?.customer_signature_received === true
    || String(req.body?.customer_signature_received || '').trim().toLowerCase() === 'true';
  if (!signatureReceived) {
    return rejectUpload(400, 'Confirm that the signed gold release form has been received');
  }
  const recipient = typeof req.body.released_to === 'string' ? req.body.released_to.trim() : '';
  if (!recipient || recipient.length > 150) {
    return rejectUpload(400, 'Enter the name of the person receiving the gold');
  }
  const notes = typeof req.body.notes === 'string' ? req.body.notes : '';
  if (notes.length > 2000) return rejectUpload(400, 'Release notes must be 2000 characters or fewer');
  const documentUrl = `/api/loans/gold-release-documents/${req.file.filename}`;
  try {
    return res.json(await releaseGold(req.params.id, recipient, notes, documentUrl, req.adminUser.user_id));
  } catch (error) {
    try {
      await removeLoanGoldReleaseDocument(documentUrl);
    } catch (cleanupError) {
      return next(cleanupError);
    }
    if (error.code === 'LOAN_NOT_FOUND') return res.status(404).json({ message: error.message });
    if (['GOLD_ALREADY_RELEASED', 'LOAN_BALANCE_REMAINING'].includes(error.code)) {
      return res.status(409).json({ message: error.message });
    }
    if (error.code === 'INVALID_RELEASE_RECIPIENT') return res.status(400).json({ message: error.message });
    if (error.code === 'SIGNED_RELEASE_DOCUMENT_REQUIRED') return res.status(400).json({ message: error.message });
    return next(error);
  }
}

async function getGoldReleaseRecord(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Loan ID is invalid' });
  try {
    const details = await getGoldReleaseDetails(req.params.id);
    if (!details) return res.status(404).json({ message: 'Loan not found' });
    if (details.loan.release_status !== 'Released'
      && Number(details.loan.outstanding_principal ?? details.loan.principal_amount) !== 0) {
      return res.status(409).json({ message: 'This loan is not fully paid and is not ready for gold release' });
    }
    return res.json(details);
  } catch (error) {
    return next(error);
  }
}

async function getLoanGoldImage(req, res, next) {
  const imagePath = getLoanGoldImagePath(`/api/loans/gold-images/${req.params.filename}`);
  if (!imagePath) return res.status(400).json({ message: 'Gold image reference is invalid' });
  try {
    if (!fs.existsSync(imagePath)) return res.status(404).json({ message: 'Gold image not found' });
    return res.sendFile(imagePath, (error) => {
      if (error && !res.headersSent) next(error);
    });
  } catch (error) {
    return next(error);
  }
}

async function getLoanGoldReleaseDocument(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Loan ID is invalid' });
  try {
    const details = await getGoldReleaseDetails(req.params.id);
    if (!details) return res.status(404).json({ message: 'Loan not found' });
    if (!details.release?.signed_document_url) {
      return res.status(404).json({ message: 'No signed release document is stored for this loan' });
    }
    const documentPath = getLoanGoldReleaseDocumentPath(details.release.signed_document_url);
    if (!documentPath) return res.status(400).json({ message: 'Stored release document reference is invalid' });
    if (!fs.existsSync(documentPath)) return res.status(404).json({ message: 'Signed release document file is missing' });
    return res.download(documentPath, (error) => {
      if (error && !res.headersSent) next(error);
    });
  } catch (error) {
    return next(error);
  }
}

async function rejectUploadedImage(req, next, status) {
  try {
    if (req.file) await removeLoanGoldImage(`/api/loans/gold-images/${req.file.filename}`);
    return status;
  } catch (error) {
    next(error);
    return null;
  }
}

async function postLoan(req, res, next) {
  if (req.file && !isValidLoanGoldImage(req.file.path, req.file.mimetype)) {
    const cleanupStatus = await rejectUploadedImage(req, next, 400);
    if (cleanupStatus) return res.status(cleanupStatus).json({ message: 'The uploaded file is not a valid PNG or JPG image' });
    return;
  }
  const { loan, loanAmountMode, error } = normalizeLoan(req.body || {});
  if (error) {
    const cleanupStatus = await rejectUploadedImage(req, next, 400);
    if (cleanupStatus) return res.status(cleanupStatus).json({ message: error });
    return;
  }
  const idempotencyKey = req.body?.idempotency_key ?? randomUUID();
  if (typeof idempotencyKey !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    const cleanupStatus = await rejectUploadedImage(req, next, 400);
    if (cleanupStatus) return res.status(cleanupStatus).json({ message: 'Loan request key is invalid. Please submit the loan again.' });
    return;
  }
  if (loan.loan_status === 'Completed') {
    const cleanupStatus = await rejectUploadedImage(req, next, 409);
    if (cleanupStatus) return res.status(cleanupStatus).json({ message: 'A loan can only be marked completed after its gold has been released.' });
    return;
  }
  try {
    const activeRateSet = await getCurrentGoldRates();
    const activeRate = findGoldRateForPurity(activeRateSet, loan.gold_purity, loan.metal_type);
    if (!activeRate) {
      const cleanupStatus = await rejectUploadedImage(req, next, 409);
      if (cleanupStatus) return res.status(cleanupStatus).json({ message: `No active ${loan.metal_type.toLowerCase()} rate matches this purity. Configure and activate the daily metal rates first.` });
      return;
    }
    const netGoldWeight = Number(loan.net_gold_weight);
    const metalValuation = Number(calculateMetalValuation(netGoldWeight, activeRate.rate_per_gram));
    const createdLoan = await createLoan({
      ...loan,
      gold_valuation: metalValuation.toFixed(2),
      principal_amount: loanAmountMode === 'auto' ? calculateLoanAmount(metalValuation) : loan.principal_amount,
      gold_rate_per_gram: activeRate.rate_per_gram,
      rate_unit: activeRate.rate_unit,
      gold_rate_date: activeRateSet.rate_date,
      gold_image_url: req.file ? `/api/loans/gold-images/${req.file.filename}` : null,
      created_by: req.adminUser.user_id
    }, { idempotencyKey });
    return res.status(201).json(createdLoan);
  } catch (createError) {
    try {
      if (req.file) await removeLoanGoldImage(`/api/loans/gold-images/${req.file.filename}`);
    } catch (cleanupError) {
      return next(cleanupError);
    }
    if (createError.code === 'CUSTOMER_NOT_FOUND') return res.status(404).json({ message: createError.message });
    if (createError.code === 'INTEREST_TYPE_UNAVAILABLE') return res.status(400).json({ message: createError.message });
    if (createError.code === 'INVALID_LOAN_AMOUNT') return res.status(400).json({ message: createError.message });
    if (createError.code === 'INSUFFICIENT_FUNDS') {
      return res.status(409).json({
        message: createError.message,
        available_balance: createError.available_balance
      });
    }
    return next(createError);
  }
}

async function putLoan(req, res, next) {
  if (!validId(req.params.id)) {
    const cleanupStatus = await rejectUploadedImage(req, next, 400);
    if (cleanupStatus) return res.status(cleanupStatus).json({ message: 'Loan ID is invalid' });
    return;
  }
  if (req.file && !isValidLoanGoldImage(req.file.path, req.file.mimetype)) {
    const cleanupStatus = await rejectUploadedImage(req, next, 400);
    if (cleanupStatus) return res.status(cleanupStatus).json({ message: 'The uploaded file is not a valid PNG or JPG image' });
    return;
  }
  const { loan, loanAmountMode, error } = normalizeLoan(req.body || {});
  if (error) {
    const cleanupStatus = await rejectUploadedImage(req, next, 400);
    if (cleanupStatus) return res.status(cleanupStatus).json({ message: error });
    return;
  }
  let uploadedImageSaved = false;
  try {
    const existingLoan = await getLoanById(req.params.id);
    if (!existingLoan) {
      const cleanupStatus = await rejectUploadedImage(req, next, 404);
      if (cleanupStatus) return res.status(cleanupStatus).json({ message: 'Loan not found' });
      return;
    }
    if (
      existingLoan.release_status === 'Released'
      || existingLoan.loan_status === 'Completed'
      || Number(existingLoan.outstanding_principal ?? existingLoan.principal_amount) === 0
    ) {
      const cleanupStatus = await rejectUploadedImage(req, next, 409);
      if (cleanupStatus) return res.status(cleanupStatus).json({ message: 'Paid, released, or completed loans cannot be edited. Use the gold release workflow to complete a fully paid loan.' });
      return;
    }
    if (loan.loan_status === 'Completed') {
      const cleanupStatus = await rejectUploadedImage(req, next, 409);
      if (cleanupStatus) return res.status(cleanupStatus).json({ message: 'A loan can only be marked completed after its gold has been released.' });
      return;
    }
    const existingMetalType = existingLoan.metal_type || 'Gold';
    if (
      existingLoan.gold_rate_per_gram != null
      && existingMetalType === loan.metal_type
      && existingLoan.gold_purity === loan.gold_purity
    ) {
      loan.gold_rate_per_gram = existingLoan.gold_rate_per_gram;
      loan.rate_unit = existingLoan.rate_unit || 'gram';
      loan.gold_rate_date = existingLoan.gold_rate_date;
      loan.gold_valuation = calculateMetalValuation(loan.net_gold_weight, existingLoan.gold_rate_per_gram);
    } else if (existingLoan.gold_rate_per_gram != null) {
      const activeRateSet = await getCurrentGoldRates();
      const activeRate = findGoldRateForPurity(activeRateSet, loan.gold_purity, loan.metal_type);
      if (!activeRate) {
        const cleanupStatus = await rejectUploadedImage(req, next, 409);
        if (cleanupStatus) return res.status(cleanupStatus).json({ message: `No active ${loan.metal_type.toLowerCase()} rate matches the updated purity.` });
        return;
      }
      loan.gold_rate_per_gram = activeRate.rate_per_gram;
      loan.rate_unit = activeRate.rate_unit;
      loan.gold_rate_date = activeRateSet.rate_date;
      loan.gold_valuation = calculateMetalValuation(loan.net_gold_weight, activeRate.rate_per_gram);
    } else {
      if (existingMetalType !== loan.metal_type || existingLoan.gold_purity !== loan.gold_purity) {
        const cleanupStatus = await rejectUploadedImage(req, next, 409);
        if (cleanupStatus) return res.status(cleanupStatus).json({ message: 'This historical loan has no rate snapshot, so its metal and purity cannot be changed safely.' });
        return;
      }
      loan.gold_rate_per_gram = null;
      loan.rate_unit = existingLoan.rate_unit || 'gram';
      loan.gold_rate_date = null;
      loan.gold_valuation = existingLoan.gold_valuation;
    }
    if (loanAmountMode === 'auto') {
      loan.principal_amount = calculateLoanAmount(loan.gold_valuation);
    }
    if (req.file) loan.gold_image_url = `/api/loans/gold-images/${req.file.filename}`;
    const updatedLoan = await updateLoan(req.params.id, loan);
    if (!updatedLoan) {
      const cleanupStatus = await rejectUploadedImage(req, next, 404);
      if (cleanupStatus) return res.status(cleanupStatus).json({ message: 'Loan not found' });
      return;
    }
    uploadedImageSaved = Boolean(req.file);
    if (req.file && existingLoan.gold_image_url) await removeLoanGoldImage(existingLoan.gold_image_url);
    return res.json(updatedLoan);
  } catch (updateError) {
    try {
      if (req.file && !uploadedImageSaved) await removeLoanGoldImage(`/api/loans/gold-images/${req.file.filename}`);
    } catch (cleanupError) {
      return next(cleanupError);
    }
    if (updateError.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(404).json({ message: 'Selected customer does not exist' });
    }
    return next(updateError);
  }
}

async function removeLoan(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Loan ID is invalid' });
  try {
    const loan = await getLoanById(req.params.id);
    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    if (!await deleteLoan(req.params.id)) return res.status(404).json({ message: 'Loan not found' });
    if (loan.gold_image_url) await removeLoanGoldImage(loan.gold_image_url);
    return res.status(204).end();
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ message: 'This loan cannot be deleted because related records exist.' });
    }
    return next(error);
  }
}

module.exports = {
  getCustomer,
  getCustomerLoans,
  getCustomers,
  getGoldReleaseList,
  getGoldReleaseRecord,
  getInterestTypes,
  getLoan,
  getLoanRenewalDetails,
  getLoanRenewalHistoryList,
  getLoanGoldImage,
  getLoanGoldReleaseDocument,
  getLoans,
  getMyLoans,
  calculateLoanAmount,
  calculateMetalValuation,
  normalizeLoan,
  putLoan,
  postLoan,
  postGoldRelease,
  postLoanRenewal,
  postLoanReviewAction,
  removeLoan,
  updateInterestType
};
