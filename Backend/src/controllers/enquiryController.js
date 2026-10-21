const {
  createEnquiry,
  deleteEnquiry,
  getEnquiry,
  listEnquiries,
  updateEnquiryStatus
} = require('../modules/enquiryModule');
const { getCurrentGoldRates } = require('../modules/goldRateModule');

const ENQUIRY_STATUSES = new Set(['New Enquiry', 'In Progress', 'Quotation Sent', 'Converted', 'Closed', 'Not Interested']);
const ENQUIRY_TYPES = new Set(['Gold Jewellery', 'Gold Coin / Bar', 'Gold Loan', 'Old Gold Exchange', 'Other']);
const PRIORITIES = new Set(['Low', 'Medium', 'High']);
const METAL_TYPES = new Set(['Gold', 'Silver', 'Platinum', 'Diamond']);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const GOLD_KARAT_PURITIES = new Map([
  ['24k', '999'],
  ['22k', '916'],
  ['20k', '833'],
  ['18k', '750'],
  ['14k', '585']
]);

function purityForRate(purity, metalType) {
  const normalized = String(purity || '').trim();
  return metalType === 'Gold'
    ? GOLD_KARAT_PURITIES.get(normalized.toLowerCase()) || normalized
    : normalized;
}

function validId(value) {
  return /^\d+$/.test(String(value)) && BigInt(value) > 0n;
}

function optionalText(value, maxLength, field) {
  if (value == null || value === '') return { value: null };
  if (typeof value !== 'string' || value.trim().length > maxLength) {
    return { error: `${field} must be ${maxLength} characters or fewer` };
  }
  return { value: value.trim() || null };
}

function normalizeEnquiry(body) {
  const customerName = optionalText(body.customer_name, 150, 'Customer name');
  const phone = optionalText(body.phone, 32, 'Mobile number');
  const email = optionalText(body.email, 254, 'Email address');
  if (customerName.error || !customerName.value) return { error: customerName.error || 'Customer name is required' };
  if (phone.error || !phone.value) return { error: phone.error || 'Mobile number is required' };
  if (email.error) return { error: email.error };
  if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) return { error: 'Enter a valid email address' };
  const type = body.enquiry_type;
  if (!ENQUIRY_TYPES.has(type)) return { error: 'Enquiry type is invalid' };
  const status = body.status || 'New Enquiry';
  const priority = body.priority || 'Medium';
  if (!ENQUIRY_STATUSES.has(status)) return { error: 'Enquiry status is invalid' };
  if (!PRIORITIES.has(priority)) return { error: 'Enquiry priority is invalid' };
  if (body.whatsapp_confirmation != null && typeof body.whatsapp_confirmation !== 'boolean') {
    return { error: 'WhatsApp confirmation must be true or false' };
  }
  const values = {};
  const textFields = {
    alternate_phone: 32, address: 2000, city: 100, state: 100, pincode: 20,
    product_category: 100, product_name: 200, purity: 20, preferred_design: 100,
    message: 5000, assigned_to: 150, source: 80, follow_up_time: 8
  };
  for (const [field, length] of Object.entries(textFields)) {
    const normalized = optionalText(body[field], length, field.replaceAll('_', ' '));
    if (normalized.error) return { error: normalized.error };
    values[field] = normalized.value;
  }
  for (const field of ['quantity', 'weight', 'approx_budget']) {
    if (body[field] == null || body[field] === '') {
      values[field] = null;
      continue;
    }
    const number = Number(body[field]);
    if (!Number.isFinite(number) || number < 0) return { error: `${field.replaceAll('_', ' ')} must be a non-negative number` };
    values[field] = number;
  }
  const productId = body.product_id == null || body.product_id === '' ? null : Number(body.product_id);
  if (productId !== null && (!Number.isSafeInteger(productId) || productId < 1)) return { error: 'Product is invalid' };
  const metalType = body.metal_type == null || body.metal_type === '' ? null : String(body.metal_type);
  if (metalType && !METAL_TYPES.has(metalType)) return { error: 'Metal type is invalid' };
  if (values.purity && !metalType) return { error: 'Select a metal type for the selected purity' };
  const followUpDate = body.follow_up_date || null;
  if (followUpDate) {
    const date = new Date(`${followUpDate}T00:00:00.000Z`);
    if (!DATE_PATTERN.test(followUpDate) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== followUpDate) {
      return { error: 'Follow up date is invalid' };
    }
  }
  if (values.follow_up_time && !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(values.follow_up_time)) {
    return { error: 'Follow up time is invalid' };
  }
  return {
    enquiry: {
      ...values,
      customer_name: customerName.value,
      phone: phone.value,
      email: email.value,
      enquiry_type: type,
      product_id: productId,
      metal_type: metalType,
      daily_rate: null,
      rate_unit: null,
      rate_date: null,
      status,
      priority,
      follow_up_date: followUpDate,
      whatsapp_confirmation: Boolean(body.whatsapp_confirmation)
    }
  };
}

async function getEnquiries(req, res, next) {
  const status = req.query.status ? String(req.query.status) : '';
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 8);
  const product = typeof req.query.product === 'string' ? req.query.product.trim().slice(0, 100) : '';
  const startDate = req.query.startDate ? String(req.query.startDate) : '';
  const endDate = req.query.endDate ? String(req.query.endDate) : '';
  if (status && !ENQUIRY_STATUSES.has(status)) return res.status(400).json({ message: 'Enquiry status filter is invalid' });
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({ message: 'Pagination values are invalid' });
  }
  if ((startDate && !DATE_PATTERN.test(startDate)) || (endDate && !DATE_PATTERN.test(endDate)) || (startDate && endDate && startDate > endDate)) {
    return res.status(400).json({ message: 'Date range is invalid' });
  }
  try {
    return res.json(await listEnquiries({
      search: typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '',
      status, product, startDate, endDate, page, limit
    }));
  } catch (error) {
    return next(error);
  }
}

async function postEnquiry(req, res, next) {
  const { enquiry, error } = normalizeEnquiry(req.body || {});
  if (error) return res.status(400).json({ message: error });
  try {
    if (enquiry.purity) {
      const activeRates = await getCurrentGoldRates();
      const configuredPurity = purityForRate(enquiry.purity, enquiry.metal_type);
      const selectedRate = activeRates?.rates?.find((rate) => (
        rate.metal_type === enquiry.metal_type && rate.purity === configuredPurity
      ));
      if (!selectedRate) return res.status(400).json({ message: 'No active daily rate is available for this metal and purity' });
      enquiry.purity = selectedRate.purity;
      enquiry.daily_rate = Number(selectedRate.rate_per_unit ?? selectedRate.rate_per_gram);
      enquiry.rate_unit = selectedRate.rate_unit || 'gram';
      enquiry.rate_date = activeRates.rate_date;
    }
    return res.status(201).json({ enquiry: await createEnquiry(enquiry) });
  } catch (requestError) {
    return next(requestError);
  }
}

async function putEnquiryStatus(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Enquiry ID is invalid' });
  const status = req.body?.status;
  if (!ENQUIRY_STATUSES.has(status)) return res.status(400).json({ message: 'Enquiry status is invalid' });
  try {
    if (!await updateEnquiryStatus(req.params.id, status)) return res.status(404).json({ message: 'Enquiry not found' });
    return res.json({ message: 'Enquiry status updated' });
  } catch (error) {
    return next(error);
  }
}

async function removeEnquiry(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Enquiry ID is invalid' });
  try {
    if (!await getEnquiry(req.params.id)) return res.status(404).json({ message: 'Enquiry not found' });
    await deleteEnquiry(req.params.id);
    return res.json({ message: 'Enquiry deleted successfully' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getEnquiries, postEnquiry, putEnquiryStatus, removeEnquiry, normalizeEnquiry, purityForRate };
