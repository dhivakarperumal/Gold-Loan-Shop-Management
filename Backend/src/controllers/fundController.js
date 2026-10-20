const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const { getFundReceiptPath } = require('../middleware/fundReceiptUpload');
const {
  createFundAccount,
  createFundTransaction,
  getFundSummary,
  listFundAccounts,
  listFundTransactions,
  transferFunds
} = require('../modules/fundModule');

const CATEGORIES = {
  FUND_ADDED: new Set(['Cash', 'Bank Account', 'UPI', 'Owner Investment', 'Business Capital', 'Other']),
  DEBIT: new Set([
    'Customer Gold Loan Disbursement', 'Supplier Payment', 'Gold Purchase', 'Shop Expenses',
    'Employee Salary', 'Rent and Electricity', 'Customer Refund', 'Bank Withdrawal or Transfer', 'Other Expenses'
  ]),
  CREDIT: new Set([
    'Customer Loan Repayment', 'Gold Sales Billing Collection', 'Interest Collection',
    'Making Charges Collection', 'Customer Advance', 'Owner Capital', 'Supplier Refund',
    'Bank Deposit', 'Other Income'
  ])
};
const PAYMENT_METHODS = new Set(['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Other']);

function text(value, maxLength, required = false) {
  if (value == null && !required) return '';
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const result = String(value).trim();
  return result && result.length <= maxLength ? result : (required ? null : '');
}

function validAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 && amount <= 999999999999.99
    ? Math.round((amount + Number.EPSILON) * 100) / 100
    : null;
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?)?$/.test(value)) return null;
  const normalized = value.length === 10 ? `${value}T12:00:00` : value;
  return Number.isNaN(Date.parse(normalized)) ? null : normalized.replace('T', ' ');
}

function validId(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

function parseTransaction(body, transactionType, adminId) {
  const category = text(body.category, 80, true);
  const accountId = validId(body.account_id) ? Number(body.account_id) : null;
  const amount = validAmount(body.amount);
  const transactionDate = validDate(body.transaction_date);
  const paymentMethod = text(body.payment_method, 40, true);
  if (!accountId) return { error: 'Select a valid fund account' };
  if (!amount) return { error: 'Enter an amount greater than zero' };
  if (!transactionDate) return { error: 'Enter a valid transaction date' };
  if (!category || !CATEGORIES[transactionType]?.has(category)) return { error: 'Select a valid transaction category' };
  if (!paymentMethod || !PAYMENT_METHODS.has(paymentMethod)) return { error: 'Select a valid payment method' };
  const partyName = text(body.party_name, 150);
  const relatedReference = text(body.related_reference, 100);
  const referenceNumber = text(body.reference_number, 100);
  const description = text(body.description, 2000);
  const receiptUrl = text(body.receipt_url, 255);
  const idempotencyKey = text(body.idempotency_key, 150);
  if ([partyName, relatedReference, referenceNumber, description, receiptUrl, idempotencyKey].includes(null)) {
    return { error: 'One or more transaction fields are invalid or too long' };
  }
  return {
    value: {
      account_id: accountId,
      transaction_type: transactionType,
      category,
      transaction_date: transactionDate,
      amount: amount.toFixed(2),
      party_name: partyName,
      related_reference: relatedReference,
      payment_method: paymentMethod,
      reference_number: referenceNumber,
      description,
      receipt_url: receiptUrl,
      idempotency_key: idempotencyKey,
      created_by: adminId
    }
  };
}

function transactionHandler(transactionType) {
  return async (req, res, next) => {
    const parsed = parseTransaction(req.body || {}, transactionType, req.adminUser.user_id);
    if (parsed.error) return res.status(400).json({ message: parsed.error });
    try {
      return res.status(201).json(await createFundTransaction(parsed.value));
    } catch (error) {
      if (error.code === 'FUND_ACCOUNT_NOT_FOUND') return res.status(400).json({ message: error.message });
      if (error.code === 'INSUFFICIENT_FUNDS') return res.status(409).json({ message: error.message });
      if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'This linked transaction has already been recorded' });
      return next(error);
    }
  };
}

async function getAccounts(req, res, next) {
  try {
    return res.json(await listFundAccounts());
  } catch (error) {
    return next(error);
  }
}

async function postAccount(req, res, next) {
  const name = text(req.body?.name, 100, true);
  const accountType = text(req.body?.account_type, 30, true);
  const openingBalance = Number(req.body?.opening_balance ?? 0);
  const accountNumber = text(req.body?.account_number, 100);
  if (!name || !['Cash', 'Bank Account', 'UPI', 'Other'].includes(accountType)
    || !Number.isFinite(openingBalance) || openingBalance < 0 || openingBalance > 999999999999.99
    || accountNumber === null) {
    return res.status(400).json({ message: 'Enter a valid account name, type, opening balance, and account number' });
  }
  try {
    return res.status(201).json(await createFundAccount({
      name, account_type: accountType, opening_balance: openingBalance.toFixed(2), account_number: accountNumber
    }));
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'An account with this name already exists' });
    return next(error);
  }
}

async function getSummary(req, res, next) {
  const today = new Date().toISOString().slice(0, 10);
  const from = req.query.from || `${today.slice(0, 8)}01`;
  const to = req.query.to || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    return res.status(400).json({ message: 'Select a valid date range' });
  }
  try {
    return res.json(await getFundSummary(from, to));
  } catch (error) {
    return next(error);
  }
}

async function getTransactions(req, res, next) {
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.page_size || 20);
  const accountId = req.query.account_id;
  const from = req.query.from;
  const to = req.query.to;
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 5000
    || (accountId && !validId(accountId))
    || (from && !/^\d{4}-\d{2}-\d{2}$/.test(from))
    || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to))) {
    return res.status(400).json({ message: 'Transaction filters are invalid' });
  }
  try {
    return res.json(await listFundTransactions({
      page, page_size: pageSize, account_id: accountId || '',
      transaction_type: req.query.transaction_type || 'ALL',
      category: text(req.query.category, 80), search: text(req.query.search, 150),
      from: from || '', to: to || ''
    }));
  } catch (error) {
    return next(error);
  }
}

async function postTransfer(req, res, next) {
  const sourceId = validId(req.body?.source_account_id) ? Number(req.body.source_account_id) : null;
  const destinationId = validId(req.body?.destination_account_id) ? Number(req.body.destination_account_id) : null;
  const amount = validAmount(req.body?.amount);
  const transactionDate = validDate(req.body?.transaction_date);
  const paymentMethod = text(req.body?.payment_method, 40, true);
  const referenceNumber = text(req.body?.reference_number, 100);
  const description = text(req.body?.description, 2000);
  const idempotencyKey = text(req.body?.idempotency_key, 150, true);
  if (!sourceId || !destinationId || sourceId === destinationId || !amount || !transactionDate
    || !PAYMENT_METHODS.has(paymentMethod) || referenceNumber === null || description === null || !idempotencyKey) {
    return res.status(400).json({ message: 'Enter valid source and destination accounts, date, amount, and payment method' });
  }
  try {
    const result = await transferFunds({
      source_account_id: sourceId,
      destination_account_id: destinationId,
      transaction_date: transactionDate,
      amount: amount.toFixed(2),
      payment_method: paymentMethod,
      reference_number: referenceNumber,
      description,
      idempotency_key: idempotencyKey,
      transfer_id: randomUUID(),
      created_by: req.adminUser.user_id
    });
    return res.status(201).json(result);
  } catch (error) {
    if (error.code === 'FUND_ACCOUNT_NOT_FOUND' || error.code === 'INSUFFICIENT_FUNDS') {
      return res.status(409).json({ message: error.message });
    }
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'This transfer has already been recorded' });
    return next(error);
  }
}

function postReceipt(req, res) {
  if (!req.file) return res.status(400).json({ message: 'Select a receipt file to upload' });
  return res.status(201).json({ receipt_url: `/api/funds/receipts/${req.file.filename}` });
}

function getReceipt(req, res) {
  const filePath = getFundReceiptPath(req.params.filename);
  if (!filePath) return res.status(400).json({ message: 'Receipt reference is invalid' });
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Receipt file not found' });
  return res.sendFile(filePath, (error) => {
    if (error && !res.headersSent) {
      console.error('Could not send fund receipt:', error);
      res.status(500).json({ message: 'Could not load receipt' });
    }
  });
}

module.exports = {
  getAccounts,
  getReceipt,
  getSummary,
  getTransactions,
  postAccount,
  postCredit: transactionHandler('CREDIT'),
  postDebit: transactionHandler('DEBIT'),
  postFundAdded: transactionHandler('FUND_ADDED'),
  postReceipt,
  postTransfer
};
