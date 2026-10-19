const {
  approveJobReconciliation,
  addDealerDocument,
  createDealer,
  createDealerCategory,
  createJob,
  createOldGoldReceipt,
  createPurchase,
  createRefiningReceipt,
  deleteDealerDocument,
  getCurrentRate,
  getDealerAudit,
  getDealerById,
  getDealerDocument,
  getDealerStatement,
  getDealerSummary,
  issueJob,
  listDealerCategories,
  listDealerDocuments,
  listJobs,
  listOldGoldReceipts,
  listDealerTransactions,
  listDealers,
  listOutstandingInvoices,
  listPurchases,
  postPayment,
  receiveJob,
  reconcileJob,
  reversePayment,
  updateDealer
} = require('../modules/dealerModule');
const { removeDealerDocument, validateDealerDocument } = require('../middleware/dealerDocumentUpload');
const path = require('node:path');

const DEALER_STATUSES = new Set(['Active', 'Inactive', 'On Hold']);
const PAYMENT_METHODS = new Set(['Bank', 'UPI', 'Cheque', 'Cash']);
const METAL_TYPES = new Set(['Gold','Silver']);
const PURITY_PATTERN = /^\d{3}$/;

function numeric(value, { min = 0, max = Number.MAX_SAFE_INTEGER, decimals = 2 } = {}) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max
    || Math.round(parsed * (10 ** decimals)) !== parsed * (10 ** decimals)) return null;
  return parsed;
}

function validDate(value, optional = false) {
  if (optional && (value == null || value === '')) return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function validObject(value) {
  return value == null || (typeof value === 'object' && !Array.isArray(value));
}

function normalizeDealer(body, { creating = false } = {}) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const contactPerson = typeof body.contact_person === 'string' ? body.contact_person.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const gstin = typeof body.gstin === 'string' ? body.gstin.trim().toUpperCase() : '';
  const pan = typeof body.pan === 'string' ? body.pan.trim().toUpperCase() : '';
  const categoryId = numeric(body.category_id, { min: 1, max: 4294967295, decimals: 0 });
  const creditLimit = numeric(body.credit_limit ?? 0, { max: 1000000000000 });
  const terms = numeric(body.payment_terms_days ?? 0, { max: 3650, decimals: 0 });
  const status = body.status || 'Active';
  const openingBalance = numeric(body.opening_balance ?? 0, { max: 1000000000000 });
  const openingSide = body.opening_balance_side || 'payable';
  const metalBalances = body.opening_metal_balances || [];
  if (!categoryId) return { error: 'Select a valid dealer category' };
  if (!name || name.length > 200) return { error: 'Dealer name is required and must be 200 characters or fewer' };
  if (!contactPerson || contactPerson.length > 150) return { error: 'Contact person is required and must be 150 characters or fewer' };
  if (!phone || phone.length > 32) return { error: 'A valid phone number is required' };
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return { error: 'Enter a valid dealer email' };
  if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) return { error: 'Enter a valid GSTIN' };
  if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return { error: 'Enter a valid PAN' };
  if (creditLimit === null || terms === null) return { error: 'Credit limit or payment terms are invalid' };
  if (!DEALER_STATUSES.has(status)) return { error: 'Select a valid dealer status' };
  if (!validObject(body.billing_address) || !validObject(body.shipping_address) || !validObject(body.bank_details)) {
    return { error: 'Address and bank details must be objects' };
  }
  if (creating && (openingBalance === null || !['payable','receivable'].includes(openingSide))) {
    return { error: 'Opening financial balance or balance side is invalid' };
  }
  if (creating && (!Array.isArray(metalBalances) || metalBalances.length > 20)) return { error: 'Opening metal balances must be a list of at most 20 entries' };
  const openingMetalBalances = [];
  if (creating) {
    for (const balance of metalBalances) {
      const weight = numeric(balance.weight, { max: 10000000, decimals: 3 });
      if (!METAL_TYPES.has(balance.metal_type) || !PURITY_PATTERN.test(String(balance.purity))
        || Number(balance.purity) < 1 || !weight || weight <= 0) {
        return { error: 'Each opening metal balance needs Gold/Silver, a three-digit purity and a positive weight' };
      }
      openingMetalBalances.push({ metal_type: balance.metal_type, purity: String(balance.purity), weight });
    }
  }
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  if (notes.length > 5000) return { error: 'Dealer notes are too long' };
  return {
    dealer: {
      category_id: categoryId,
      name,
      contact_person: contactPerson,
      email: email || null,
      phone,
      alternate_phone: typeof body.alternate_phone === 'string' ? body.alternate_phone.trim() || null : null,
      gstin: gstin || null,
      pan: pan || null,
      billing_address: body.billing_address || null,
      shipping_address: body.shipping_address || null,
      opening_balance_side: openingSide,
      opening_balance: openingBalance,
      opening_metal_balances: openingMetalBalances,
      credit_limit: creditLimit,
      payment_terms_days: terms,
      bank_details: body.bank_details || null,
      status,
      notes,
      audit_reason: typeof body.audit_reason === 'string' ? body.audit_reason.trim().slice(0, 500) : null
    }
  };
}

function normalizePurchase(body) {
  const dealerId = numeric(body.dealer_id, { min: 1, max: Number.MAX_SAFE_INTEGER, decimals: 0 });
  const type = body.document_type || 'invoice';
  const types = new Set(['invoice','purchase_return','debit_note','credit_note']);
  const supplierInvoice = typeof body.supplier_invoice_number === 'string' ? body.supplier_invoice_number.trim() : '';
  if (!dealerId || !types.has(type)) return { error: 'Select a valid dealer and purchase document type' };
  if (type === 'invoice' && (!supplierInvoice || supplierInvoice.length > 80)) return { error: 'Supplier invoice number is required and must be 80 characters or fewer' };
  if (!validDate(body.document_date)) return { error: 'Enter a valid document date' };
  if (!validDate(body.due_date, true)) return { error: 'Enter a valid due date' };
  if (body.due_date && body.due_date < body.document_date) return { error: 'Due date cannot be before the document date' };
  if (!Array.isArray(body.lines) || body.lines.length < 1 || body.lines.length > 100) return { error: 'Add between 1 and 100 purchase lines' };
  const lines = [];
  for (const line of body.lines) {
    const metalType = line.metal_type || 'Gold';
    const purity = String(line.purity || '');
    if (!['Gold','Silver','Other'].includes(metalType) || (metalType !== 'Other' && !PURITY_PATTERN.test(purity))) {
      return { error: 'Each metal line must use Gold/Silver and a three-digit purity' };
    }
    if (line.negotiated_rate != null && typeof line.negotiated_rate !== 'boolean') return { error: 'Negotiated rate flag must be true or false' };
    for (const key of ['quantity','net_weight','rate_per_gram','unit_price','making_charge','wastage_charge','stone_charge','discount','tax_rate']) {
      if (line[key] != null && numeric(line[key], { max: 100000000, decimals: key === 'net_weight' || key === 'quantity' ? 3 : 2 }) === null) {
        return { error: `Purchase line ${key.replaceAll('_',' ')} is invalid` };
      }
    }
    lines.push({ ...line, metal_type: metalType, purity });
  }
  const linkedId = body.linked_document_id == null || body.linked_document_id === ''
    ? null : numeric(body.linked_document_id, { min: 1, max: Number.MAX_SAFE_INTEGER, decimals: 0 });
  if (body.linked_document_id && !linkedId) return { error: 'Linked invoice reference is invalid' };
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  if (notes.length > 1000) return { error: 'Purchase notes are too long' };
  return { purchase: {
    dealer_id: dealerId, document_type: type, supplier_invoice_number: supplierInvoice || null,
    linked_document_id: linkedId, document_date: body.document_date, due_date: body.due_date || null,
    notes: notes || null, lines
  } };
}

function normalizePayment(body) {
  const dealerId = numeric(body.dealer_id, { min: 1, max: Number.MAX_SAFE_INTEGER, decimals: 0 });
  const amount = numeric(body.amount, { min: 0.01, max: 1000000000000 });
  const idempotencyKey = typeof body.idempotency_key === 'string' ? body.idempotency_key.trim() : '';
  const paymentDate = body.payment_date;
  if (!dealerId || !amount || !PAYMENT_METHODS.has(body.method) || !validDate(paymentDate)) {
    return { error: 'Dealer, positive payment amount, valid method and payment date are required' };
  }
  if (!idempotencyKey || idempotencyKey.length > 100) return { error: 'A unique idempotency key is required for payment posting' };
  if (!Array.isArray(body.allocations) || body.allocations.length > 100) return { error: 'Payment allocations must be a list of at most 100 invoices' };
  const allocations = [];
  for (const item of body.allocations) {
    const purchaseId = numeric(item.purchase_id, { min: 1, max: Number.MAX_SAFE_INTEGER, decimals: 0 });
    const allocationAmount = numeric(item.amount, { min: 0.01, max: 1000000000000 });
    if (!purchaseId || !allocationAmount) return { error: 'Each payment allocation requires a valid invoice and positive amount' };
    allocations.push({ purchase_id: purchaseId, amount: allocationAmount });
  }
  const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
  if (reference.length > 120) return { error: 'Payment reference is too long' };
  return { payment: { dealer_id: dealerId, amount, idempotency_key: idempotencyKey,
    payment_date: paymentDate, method: body.method, reference: reference || null,
    notes: typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) || null : null, allocations } };
}

function normalizeJob(body) {
  const dealerId = numeric(body.dealer_id, { min: 1, max: Number.MAX_SAFE_INTEGER, decimals: 0 });
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const labourCharge = numeric(body.labour_charge ?? 0, { max: 1000000000000 });
  const approvedWastage = numeric(body.approved_wastage ?? 0, { max: 100000, decimals: 3 });
  if (!dealerId || !description || description.length > 500 || labourCharge === null
    || approvedWastage === null || !validDate(body.due_date, true)) return { error: 'Job dealer, description, charges, wastage and due date must be valid' };
  return { job: { dealer_id: dealerId, description, labour_charge: labourCharge,
    approved_wastage: approvedWastage, due_date: body.due_date || null } };
}

function normalizeMetalLine(body, { issue = false } = {}) {
  const jobId = numeric(body.job_id, { min: 1, max: Number.MAX_SAFE_INTEGER, decimals: 0 });
  const weight = numeric(body.weight, { min: 0.001, max: 10000000, decimals: 3 });
  const metalType = body.metal_type;
  const purity = String(body.purity || '');
  const receiptType = body.receipt_type || 'finished';
  const labourCharge = numeric(body.labour_charge ?? 0, { max: 1000000000000 });
  if (!jobId || !weight || !METAL_TYPES.has(metalType) || !PURITY_PATTERN.test(purity)) {
    return { error: 'Job, metal, three-digit purity and positive weight are required' };
  }
  if (Number(purity) < 1 || Number(purity) > 1000) return { error: 'Purity must be between 001 and 1000' };
  if (!issue && (!['finished','scrap','dust'].includes(receiptType) || labourCharge === null)) {
    return { error: 'Receipt type or labour charge is invalid' };
  }
  return { line: { job_id: jobId, weight, metal_type: metalType, purity,
    receipt_type: receiptType, labour_charge: labourCharge || 0 } };
}

function normalizeOldGold(body) {
  const dealerId = numeric(body.dealer_id, { min: 1, max: Number.MAX_SAFE_INTEGER, decimals: 0 });
  const grossWeight = numeric(body.gross_weight, { min: 0.001, max: 10000000, decimals: 3 });
  const stoneWeight = numeric(body.stone_weight ?? 0, { max: 10000000, decimals: 3 });
  const netWeight = numeric(body.net_weight, { min: 0.001, max: 10000000, decimals: 3 });
  const purity = String(body.tested_purity || '');
  const rateSource = body.rate_source || 'Global';
  const rate = body.agreed_rate == null || body.agreed_rate === ''
    ? null : numeric(body.agreed_rate, { min: 0.01, max: 100000000 });
  if (!dealerId || !grossWeight || stoneWeight === null || !netWeight
    || Math.abs(Math.round((grossWeight - stoneWeight) * 1000) - Math.round(netWeight * 1000)) > 0
    || !PURITY_PATTERN.test(purity) || Number(purity) > 1000
    || Number(purity) < 1 || !['Global','Negotiated'].includes(rateSource)) {
    return { error: 'Old-gold weights, tested purity and agreed rate are invalid; net weight must equal gross less stones' };
  }
  if (rateSource === 'Negotiated' && rate === null) return { error: 'Enter a positive negotiated rate' };
  return { receipt: { dealer_id: dealerId, gross_weight: grossWeight, stone_weight: stoneWeight,
    net_weight: netWeight, tested_purity: purity, agreed_rate: rate ?? 0, rate_source: rateSource } };
}

function normalizeRefining(body) {
  const dealerId = numeric(body.dealer_id, { min: 1, max: Number.MAX_SAFE_INTEGER, decimals: 0 });
  const oldReceiptId = numeric(body.old_gold_receipt_id, { min: 1, max: Number.MAX_SAFE_INTEGER, decimals: 0 });
  const recoveredWeight = numeric(body.recovered_weight, { min: 0.001, max: 10000000, decimals: 3 });
  const purity = String(body.recovered_purity || '');
  const metalType = body.recovered_metal_type || 'Gold';
  const charges = numeric(body.refining_charges ?? 0, { max: 1000000000000 });
  if (!dealerId || !oldReceiptId || !recoveredWeight || !PURITY_PATTERN.test(purity) || Number(purity) > 1000
    || metalType !== 'Gold' || charges === null) return { error: 'Refining receipt values are invalid; recovered metal must be gold' };
  return { receipt: { dealer_id: dealerId, old_gold_receipt_id: oldReceiptId,
    recovered_weight: recoveredWeight, recovered_purity: purity,
    recovered_metal_type: metalType, refining_charges: charges } };
}

function sendError(res, error) {
  const statusByCode = {
    INVALID_CATEGORY: 400, INVALID_LINE: 400, RATE_NOT_FOUND: 409, DEALER_NOT_FOUND: 404,
    DUPLICATE_INVOICE: 409, IDEMPOTENCY_CONFLICT: 409, INVALID_ALLOCATION: 400,
    JOB_NOT_OPEN: 409, JOB_NOT_ISSUED: 409, JOB_NOT_FOUND: 404, JOB_CLOSED: 409,
    LOSS_EXCEEDED: 400, OLD_GOLD_NOT_FOUND: 404, CREDIT_LIMIT: 409,
    PAYMENT_NOT_FOUND: 404, PAYMENT_ALREADY_REVERSED: 409,
    LINKED_INVOICE_REQUIRED: 400, INVALID_LINKED_INVOICE: 400, RECOVERY_EXCEEDS_SOURCE: 409
  };
  if (statusByCode[error.code]) return res.status(statusByCode[error.code]).json({ message: error.message });
  if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'A duplicate dealer, category or document reference already exists' });
  return null;
}

function validId(value) {
  return /^\d+$/.test(String(value)) && BigInt(value) > 0n;
}

function asyncHandler(handler) {
  return async (req, res, next) => {
    try { await handler(req, res, next); }
    catch (error) { if (!sendError(res, error)) next(error); }
  };
}

const getCategories = asyncHandler(async (req, res) => res.json(await listDealerCategories()));
const postCategory = asyncHandler(async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name || name.length > 100) return res.status(400).json({ message: 'Category name is required and must be 100 characters or fewer' });
  return res.status(201).json(await createDealerCategory(name));
});
const getOldGoldReceipts = asyncHandler(async (req, res) => {
  const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit) || 25)));
  const dealerId = req.query.dealer_id ? numeric(req.query.dealer_id, { min: 1, decimals: 0 }) : null;
  if (req.query.dealer_id && !dealerId) return res.status(400).json({ message: 'Dealer ID is invalid' });
  return res.json(await listOldGoldReceipts({ dealerId, page, limit }));
});
const getSummary = asyncHandler(async (req, res) => res.json(await getDealerSummary()));
const getDealers = asyncHandler(async (req, res) => {
  const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit) || 25)));
  const status = req.query.status && req.query.status !== 'All' ? String(req.query.status) : '';
  if (status && !DEALER_STATUSES.has(status)) return res.status(400).json({ message: 'Dealer status filter is invalid' });
  const categoryId = req.query.category_id ? numeric(req.query.category_id, { min: 1, decimals: 0 }) : null;
  if (req.query.category_id && !categoryId) return res.status(400).json({ message: 'Dealer category filter is invalid' });
  return res.json(await listDealers({ page, limit, search: String(req.query.search || '').trim().slice(0, 100), status, categoryId }));
});
const postDealer = asyncHandler(async (req, res) => {
  const { dealer, error } = normalizeDealer(req.body || {}, { creating: true });
  if (error) return res.status(400).json({ message: error });
  return res.status(201).json(await createDealer(dealer, req.adminUser.user_id));
});
const putDealer = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Dealer ID is invalid' });
  const { dealer, error } = normalizeDealer(req.body || {});
  if (error) return res.status(400).json({ message: error });
  const result = await updateDealer(req.params.id, dealer, req.adminUser.user_id);
  return result ? res.json(result) : res.status(404).json({ message: 'Dealer not found' });
});
const getDealer = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Dealer ID is invalid' });
  const dealer = await getDealerById(req.params.id);
  return dealer ? res.json(dealer) : res.status(404).json({ message: 'Dealer not found' });
});
const getAudit = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Dealer ID is invalid' });
  if (!await getDealerById(req.params.id)) return res.status(404).json({ message: 'Dealer not found' });
  return res.json(await getDealerAudit(req.params.id));
});
const getStatement = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Dealer ID is invalid' });
  if (!await getDealerById(req.params.id)) return res.status(404).json({ message: 'Dealer not found' });
  if (!validDate(req.query.from, true) || !validDate(req.query.to, true) || (req.query.from && req.query.to && req.query.from > req.query.to)) {
    return res.status(400).json({ message: 'Statement date range is invalid' });
  }
  const [statement, invoices, transactions, documents] = await Promise.all([
    getDealerStatement(req.params.id, { from: req.query.from, to: req.query.to }),
    listOutstandingInvoices(req.params.id),
    listDealerTransactions(req.params.id),
    listDealerDocuments(req.params.id)
  ]);
  return res.json({ ...statement, outstanding_invoices: invoices, transactions, documents, generated_at: new Date().toISOString() });
});
const getPurchases = asyncHandler(async (req, res) => {
  const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit) || 25)));
  const dealerId = req.query.dealer_id ? numeric(req.query.dealer_id, { min: 1, decimals: 0 }) : null;
  if (req.query.dealer_id && !dealerId) return res.status(400).json({ message: 'Dealer ID is invalid' });
  return res.json(await listPurchases({ dealerId, page, limit, search: String(req.query.search || '').trim().slice(0, 100), overdue: req.query.overdue === 'true' }));
});
const getJobs = asyncHandler(async (req, res) => {
  const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit) || 25)));
  const dealerId = req.query.dealer_id ? numeric(req.query.dealer_id, { min: 1, decimals: 0 }) : null;
  const status = req.query.status && req.query.status !== 'All' ? String(req.query.status) : '';
  const statuses = new Set(['Open','Issued','Partially Received','Received','Reconciled','Cancelled']);
  if (req.query.dealer_id && !dealerId) return res.status(400).json({ message: 'Dealer ID is invalid' });
  if (status && !statuses.has(status)) return res.status(400).json({ message: 'Job status filter is invalid' });
  return res.json(await listJobs({ dealerId, status, page, limit }));
});
const postPurchase = asyncHandler(async (req, res) => {
  const { purchase, error } = normalizePurchase(req.body || {});
  if (error) return res.status(400).json({ message: error });
  return res.status(201).json(await createPurchase(purchase, req.adminUser.user_id));
});
const postDealerPayment = asyncHandler(async (req, res) => {
  const { payment, error } = normalizePayment(req.body || {});
  if (error) return res.status(400).json({ message: error });
  return res.status(201).json(await postPayment(payment, req.adminUser.user_id));
});
const reverseDealerPayment = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Payment ID is invalid' });
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  if (!reason || reason.length > 500) return res.status(400).json({ message: 'A reversal reason of 1 to 500 characters is required' });
  return res.json(await reversePayment(req.params.id, reason, req.adminUser.user_id));
});
const postJob = asyncHandler(async (req, res) => {
  const { job, error } = normalizeJob(req.body || {});
  if (error) return res.status(400).json({ message: error });
  return res.status(201).json(await createJob(job, req.adminUser.user_id));
});
const postJobIssue = asyncHandler(async (req, res) => {
  const { line, error } = normalizeMetalLine(req.body || {}, { issue: true });
  if (error) return res.status(400).json({ message: error });
  return res.status(201).json(await issueJob(line, req.adminUser.user_id));
});
const postJobReceipt = asyncHandler(async (req, res) => {
  const { line, error } = normalizeMetalLine(req.body || {});
  if (error) return res.status(400).json({ message: error });
  return res.status(201).json(await receiveJob(line, req.adminUser.user_id));
});
const postJobReconciliation = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Job ID is invalid' });
  const approvedLoss = numeric(req.body?.approved_loss ?? 0, { max: 100000, decimals: 3 });
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  if (approvedLoss === null || reason.length > 500) return res.status(400).json({ message: 'Approved loss or approval reason is invalid' });
  const result = await reconcileJob(req.params.id, { approved_loss: approvedLoss, reason }, req.adminUser.user_id);
  return result.error === 'APPROVAL_REQUIRED'
    ? res.status(409).json({ ...result, message: 'Metal difference requires an authorized approval reason' })
    : res.json(result);
});
const approvePendingJobReconciliation = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Job ID is invalid' });
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  if (!reason || reason.length > 500) return res.status(400).json({ message: 'An approval reason of 1 to 500 characters is required' });
  return res.json(await approveJobReconciliation(req.params.id, reason, req.adminUser.user_id));
});
const postOldGold = asyncHandler(async (req, res) => {
  const { receipt, error } = normalizeOldGold(req.body || {});
  if (error) return res.status(400).json({ message: error });
  if (receipt.rate_source === 'Global') {
    const rate = await getCurrentRate('Gold', receipt.tested_purity);
    if (!rate) return res.status(409).json({ message: `No active gold rate for purity ${receipt.tested_purity}` });
    receipt.agreed_rate = Number(rate.rate_per_gram);
    receipt.rate_batch_id = rate.batch_id;
    receipt.gold_rate_date = rate.rate_date;
  }
  return res.status(201).json(await createOldGoldReceipt(receipt, req.adminUser.user_id));
});
const postRefining = asyncHandler(async (req, res) => {
  const { receipt, error } = normalizeRefining(req.body || {});
  if (error) return res.status(400).json({ message: error });
  return res.status(201).json(await createRefiningReceipt(receipt, req.adminUser.user_id));
});
const getGlobalRate = asyncHandler(async (req, res) => {
  const metal = req.query.metal_type || 'Gold';
  const purity = String(req.query.purity || '');
  if (!METAL_TYPES.has(metal) || !PURITY_PATTERN.test(purity)) return res.status(400).json({ message: 'Metal type and purity are invalid' });
  const rate = await getCurrentRate(metal, purity);
  return rate ? res.json(rate) : res.status(404).json({ message: 'No active rate is configured for this metal and purity' });
});
const getDocuments = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Dealer ID is invalid' });
  if (!await getDealerById(req.params.id)) return res.status(404).json({ message: 'Dealer not found' });
  return res.json(await listDealerDocuments(req.params.id));
});
const postDocument = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) {
    await removeDealerDocument(req.file);
    return res.status(400).json({ message: 'Dealer ID is invalid' });
  }
  if (!req.file) return res.status(400).json({ message: 'Select a dealer document to upload' });
  if (!await getDealerById(req.params.id)) {
    await removeDealerDocument(req.file);
    return res.status(404).json({ message: 'Dealer not found' });
  }
  if (!validateDealerDocument(req.file)) {
    await removeDealerDocument(req.file);
    return res.status(400).json({ message: 'Document must be a valid PDF, JPG, PNG, or WEBP file' });
  }
  const documentType = typeof req.body.document_type === 'string' ? req.body.document_type.trim() : '';
  if (!documentType || documentType.length > 60) {
    await removeDealerDocument(req.file);
    return res.status(400).json({ message: 'Document type is required and must be 60 characters or fewer' });
  }
  let id;
  try {
    id = await addDealerDocument({
      dealerId: req.params.id, documentType, originalName: path.basename(req.file.originalname).slice(0, 255),
      storedName: req.file.filename, mimeType: req.file.mimetype, userId: req.adminUser.user_id
    });
  } catch (error) {
    await removeDealerDocument(req.file);
    throw error;
  }
  return res.status(201).json({ id, dealer_id: Number(req.params.id), document_type: documentType, original_name: path.basename(req.file.originalname), mime_type: req.file.mimetype });
});
const downloadDocument = asyncHandler(async (req, res) => {
  if (!validId(req.params.documentId)) return res.status(400).json({ message: 'Document ID is invalid' });
  const document = await getDealerDocument(req.params.documentId);
  if (!document) return res.status(404).json({ message: 'Dealer document not found' });
  const filePath = path.resolve(__dirname, '../../uploads/.private/dealer-documents', document.stored_name);
  return res.download(filePath, document.original_name);
});
const removeDocument = asyncHandler(async (req, res) => {
  if (!validId(req.params.documentId)) return res.status(400).json({ message: 'Document ID is invalid' });
  const document = await getDealerDocument(req.params.documentId);
  if (!document) return res.status(404).json({ message: 'Dealer document not found' });
  await deleteDealerDocument(req.params.documentId);
  await removeDealerDocument({ filename: document.stored_name });
  return res.json({ message: 'Dealer document deleted' });
});

module.exports = {
  asyncHandler,
  downloadDocument,
  getAudit,
  getCategories,
  getDealer,
  getDealers,
  getDocuments,
  getGlobalRate,
  getOldGoldReceipts,
  getOldGoldReceipts,
  getJobs,
  getPurchases,
  getStatement,
  getSummary,
  normalizeDealer,
  normalizeMetalLine,
  normalizeOldGold,
  normalizePayment,
  normalizePurchase,
  normalizeRefining,
  postCategory,
  postDealer,
  postDealerPayment,
  reverseDealerPayment,
  postDocument,
  postJob,
  postJobIssue,
  postJobReceipt,
  postJobReconciliation,
  approvePendingJobReconciliation,
  postOldGold,
  postPurchase,
  postRefining,
  putDealer,
  removeDocument
};
