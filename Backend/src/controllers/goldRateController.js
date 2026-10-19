const {
  activateRateBatch,
  createRateBatch,
  getCurrentGoldRates,
  listRateBatches,
  listRateHistory,
  RATE_SPECS,
  updateRateBatch
} = require('../modules/goldRateModule');

const MAKING_TYPES = new Set(['Percentage', 'Fixed Amount']);

function numericValue(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return NaN;
  if (typeof value === 'string' && !value.trim()) return NaN;
  return Number(value);
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function normalizeBatch(body) {
  if (!validDate(body.rate_date)) return { error: 'Enter a valid rate date' };
  if (typeof body.effective_from !== 'string' || Number.isNaN(new Date(body.effective_from).valueOf())) {
    return { error: 'Enter a valid effective date and time' };
  }
  if (!MAKING_TYPES.has(body.making_charge_type)) return { error: 'Select a valid making charge type' };
  const makingChargeValue = numericValue(body.making_charge_value);
  const wastagePercentage = numericValue(body.wastage_percentage);
  if (!Number.isFinite(makingChargeValue) || makingChargeValue < 0 || makingChargeValue > 10000000) {
    return { error: 'Making charge must be between 0 and 10000000' };
  }
  if (!Number.isFinite(wastagePercentage) || wastagePercentage < 0 || wastagePercentage > 100) {
    return { error: 'Wastage percentage must be between 0 and 100' };
  }
  if (!body.rates || typeof body.rates !== 'object' || Array.isArray(body.rates)) {
    return { error: 'Enter all required rates' };
  }
  const rates = {};
  for (const spec of RATE_SPECS) {
    const value = numericValue(body.rates[spec.key]);
    if (!Number.isFinite(value) || value <= 0 || value > 1000000000) {
      return { error: `Enter a valid positive rate for ${`${spec.metal_type} ${spec.purity}`}` };
    }
    rates[spec.key] = value;
  }
  if (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.trim().length > 500) {
    return { error: 'A reason of 1 to 500 characters is required' };
  }
  return {
    batch: {
      rate_date: body.rate_date,
      effective_from: new Date(body.effective_from).toISOString().slice(0, 19).replace('T', ' '),
      making_charge_type: body.making_charge_type,
      making_charge_value: makingChargeValue,
      wastage_percentage: wastagePercentage,
      rates,
      reason: body.reason.trim()
    }
  };
}

function sendBatchError(res, error) {
  if (error === 'NOT_FOUND') return res.status(404).json({ message: 'Rate set not found' });
  if (error === 'NOT_DRAFT') return res.status(409).json({ message: 'Only a complete draft rate set can be changed or activated' });
  if (error === 'CONFLICT') return res.status(409).json({ message: 'This rate set was changed by another administrator. Refresh and try again.' });
  return null;
}

async function getCurrent(req, res, next) {
  try {
    return res.json(await getCurrentGoldRates());
  } catch (error) {
    return next(error);
  }
}

async function getHistory(req, res, next) {
  try {
    const history = await listRateHistory();
    return res.json({ history, batches: await listRateBatches({ limit: 100 }) });
  } catch (error) {
    return next(error);
  }
}

async function postRates(req, res, next) {
  const normalized = normalizeBatch(req.body || {});
  if (normalized.error) return res.status(400).json({ message: normalized.error });
  try {
    const batch = await createRateBatch(normalized.batch, req.adminUser.user_id);
    return res.status(201).json(batch);
  } catch (error) {
    return next(error);
  }
}

async function putRates(req, res, next) {
  const normalized = normalizeBatch(req.body || {});
  if (normalized.error) return res.status(400).json({ message: normalized.error });
  const expectedVersion = numericValue((req.body || {}).expected_version);
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
    return res.status(400).json({ message: 'A valid rate-set version is required. Refresh the draft and try again.' });
  }
  try {
    const result = await updateRateBatch(
      req.params.id,
      normalized.batch,
      req.adminUser.user_id,
      expectedVersion
    );
    if (result.error) return sendBatchError(res, result.error);
    return res.json(result.batch);
  } catch (error) {
    return next(error);
  }
}

async function activateRates(req, res, next) {
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  if (!reason || reason.length > 500) {
    return res.status(400).json({ message: 'A reason of 1 to 500 characters is required' });
  }
  try {
    const result = await activateRateBatch(req.params.id, reason, req.adminUser.user_id);
    if (result.error) return sendBatchError(res, result.error);
    return res.json({
      ...result.batch,
      price_recalculation: result.priceRecalculation,
      activation_scope: result.priceRecalculation
        ? 'applicable product prices recalculated; historical invoices unchanged'
        : 'future-effective rate; product prices will recalculate after the rate becomes effective'
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { activateRates, getCurrent, getHistory, normalizeBatch, postRates, putRates };
