const { randomUUID } = require('node:crypto');
const {
  createBilling,
  deleteBilling,
  getBillingById,
  getBillingProductsByIds,
  listBillings,
  updateBilling
} = require('../modules/billingModule');
const { findGoldRateForPurity, getCurrentGoldRates } = require('../modules/goldRateModule');

const PAYMENT_TYPES = new Set(['FULL_PAYMENT', 'EXCHANGE_GOLD']);
const MAX_ITEMS = 100;
const GST_RATE = 0;

function normalizeText(value, field, maxLength, required = false) {
  if (typeof value !== 'string') return required ? { error: `${field} is required` } : { value: '' };
  const normalized = value.trim();
  if (required && !normalized) return { error: `${field} is required` };
  if (normalized.length > maxLength) return { error: `${field} must be ${maxLength} characters or fewer` };
  return { value: normalized };
}

function normalizeMoney(value, field, required = true) {
  if (value === '' || value == null) {
    return required ? { error: `${field} is required` } : { value: 0 };
  }
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) {
    return { error: `${field} must be a valid non-negative amount` };
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 9999999999.99) {
    return { error: `${field} must be a valid non-negative amount` };
  }
  return { value: Math.round((amount + Number.EPSILON) * 100) / 100 };
}

function normalizeWeight(value, field, required = true) {
  if (value === '' || value == null) {
    return required ? { error: `${field} is required` } : { value: 0 };
  }
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) {
    return { error: `${field} must be a valid non-negative weight` };
  }
  const weight = Number(value);
  if (!Number.isFinite(weight) || weight < 0 || weight > 999999999.999) {
    return { error: `${field} must be a valid non-negative weight` };
  }
  return { value: Math.round((weight + Number.EPSILON) * 1000) / 1000 };
}

function normalizePeople(value, field) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_ITEMS) {
    return { error: `Add between 1 and ${MAX_ITEMS} ${field}` };
  }
  const entries = [];
  for (const [index, person] of value.entries()) {
    if (!person || typeof person !== 'object' || Array.isArray(person)) {
      return { error: `${field} ${index + 1} is invalid` };
    }
    const name = normalizeText(person.name, `${field} ${index + 1} name`, 150, true);
    const phone = normalizeText(person.phone, `${field} ${index + 1} phone`, 32);
    const email = normalizeText(person.email, `${field} ${index + 1} email`, 254);
    const address = normalizeText(person.address, `${field} ${index + 1} address`, 500);
    if (name.error || phone.error || email.error || address.error) {
      return { error: name.error || phone.error || email.error || address.error };
    }
    if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      return { error: `${field} ${index + 1} email is invalid` };
    }
    entries.push({ name: name.value, phone: phone.value, email: email.value, address: address.value });
  }
  return { value: entries };
}

function normalizeItems(value, field, withCredit = false) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_ITEMS) {
    return { error: `Add between 1 and ${MAX_ITEMS} ${field}` };
  }
  const entries = [];
  for (const [index, item] of value.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { error: `${field} ${index + 1} is invalid` };
    }
    const defaultProductName = withCredit
      ? `${item.metal_type || 'Gold'} ${item.purity || ''} exchange item`.trim()
      : '';
    const rawProductName = withCredit && (typeof item.product_name !== 'string' || !item.product_name.trim())
      ? defaultProductName
      : item.product_name;
    const productName = normalizeText(rawProductName, `${field} ${index + 1} product name`, 150, true);
    const category = normalizeText(item.category, `${field} ${index + 1} category`, 100, true);
    const purity = normalizeText(item.purity, `${field} ${index + 1} purity`, 30, withCredit);
    const metalType = withCredit
      ? normalizeText(item.metal_type == null ? 'Gold' : item.metal_type, `${field} ${index + 1} metal type`, 30, true)
      : { value: '' };
    if (productName.error || category.error || purity.error || metalType.error) {
      return { error: productName.error || category.error || purity.error || metalType.error };
    }
    const entry = {
      product_name: productName.value,
      category: category.value,
      purity: purity.value
    };
    if (withCredit) {
      entry.metal_type = metalType.value;
    } else {
      const price = normalizeMoney(item.price, `${field} ${index + 1} price`);
      if (price.error) return { error: price.error };
      entry.price = price.value;
    }
    entries.push(entry);
  }
  return { value: entries };
}

function normalizeExchangeItems(value, currentRateSet) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_ITEMS) {
    return { error: `Add between 1 and ${MAX_ITEMS} exchange items` };
  }
  const entries = [];
  for (const [index, item] of value.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { error: `exchange items ${index + 1} is invalid` };
    }
    const exchangeProductName = typeof item.product_name === 'string' && item.product_name.trim()
      ? item.product_name
      : `${item.metal_type || 'Gold'} ${item.purity || ''} exchange item`.trim();
    const details = normalizeItems([{
      product_name: exchangeProductName,
      category: item.category,
      metal_type: item.metal_type,
      purity: item.purity
    }], 'exchange items', true);
    if (details.error) return { error: details.error.replace('exchange items 1', `exchange items ${index + 1}`) };
    const weight = normalizeWeight(item.weight, `exchange item ${index + 1} weight`);
    const wastageWeight = normalizeWeight(item.wastage_weight, `exchange item ${index + 1} wastage weight`, false);
    if (weight.error || wastageWeight.error) return { error: weight.error || wastageWeight.error };
    if (wastageWeight.value > weight.value) {
      return { error: `Exchange item ${index + 1} wastage weight cannot exceed its weight` };
    }

    const exchange = details.value[0];
    const rate = findGoldRateForPurity(currentRateSet, exchange.purity, exchange.metal_type);
    const enteredRate = item.rate_per_unit == null || item.rate_per_unit === ''
      ? null
      : normalizeMoney(item.rate_per_unit, `exchange item ${index + 1} rate`);
    if (enteredRate?.error) return enteredRate;
    if (!rate && !enteredRate) {
      return { error: `No active daily rate exists for exchange item ${index + 1} (${exchange.metal_type} ${exchange.purity})` };
    }
    if (weight.value <= 0) return { error: `Exchange item ${index + 1} weight must be greater than zero` };
    const netWeight = Math.round((weight.value - wastageWeight.value) * 1000) / 1000;
    const ratePerUnit = enteredRate?.value ?? Number(rate.rate_per_unit ?? rate.rate_per_gram);
    if (!Number.isFinite(ratePerUnit) || ratePerUnit <= 0) {
      return { error: `The rate for exchange item ${index + 1} is invalid` };
    }
    const rateUnit = rate?.rate_unit || (exchange.metal_type === 'Diamond' ? 'carat' : 'gram');
    entries.push({
      ...exchange,
      weight: weight.value,
      wastage_weight: wastageWeight.value,
      net_weight: netWeight,
      weight_unit: rateUnit === 'carat' ? 'carat' : 'gram',
      rate_per_unit: ratePerUnit,
      rate_unit: rateUnit,
      credit_amount: Math.round((netWeight * ratePerUnit + Number.EPSILON) * 100) / 100
    });
  }
  return { value: entries };
}

function normalizeBilling(body, currentRateSet = null) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Billing details are required' };
  }
  const paymentType = body.payment_type;
  if (!PAYMENT_TYPES.has(paymentType)) return { error: 'Select a valid payment type' };
  const customers = normalizePeople(body.customers, 'customers');
  if (customers.error) return customers;
  const products = normalizeItems(body.products, 'products');
  if (products.error) return products;

  const rawExchanges = body.exchanges == null ? [] : body.exchanges;
  if (!Array.isArray(rawExchanges)) return { error: 'Exchanges must be an array' };
  if (paymentType === 'EXCHANGE_GOLD' && rawExchanges.length === 0) {
    return { error: 'Add at least one exchange item' };
  }
  if (paymentType === 'FULL_PAYMENT' && rawExchanges.length > 0) {
    return { error: 'Exchange items are only allowed with Exchange Gold payment' };
  }
  let exchanges = [];
  if (rawExchanges.length > 0) {
    const normalizedExchanges = normalizeExchangeItems(rawExchanges, currentRateSet);
    if (normalizedExchanges.error) return normalizedExchanges;
    exchanges = normalizedExchanges.value;
  }

  const subTotal = Math.round(products.value.reduce((sum, product) => sum + product.price, 0) * 100) / 100;
  const discount = normalizeMoney(body.discount_amount, 'Discount amount', false);
  if (discount.error) return discount;
  if (discount.value > subTotal) return { error: 'Discount cannot exceed the products subtotal' };
  const exchangeCredit = Math.round(exchanges.reduce((sum, exchange) => sum + exchange.credit_amount, 0) * 100) / 100;
  if (exchangeCredit > subTotal - discount.value) {
    return { error: 'Discount and exchange credit cannot exceed the purchased products subtotal' };
  }
  const rawGstRate = body.gst_rate == null || body.gst_rate === '' ? GST_RATE : Number(body.gst_rate);
  if (!Number.isFinite(rawGstRate) || rawGstRate < 0 || rawGstRate > 100) {
    return { error: 'GST rate must be a valid percentage between 0 and 100' };
  }
  const gstRate = Math.round(rawGstRate * 100) / 100;
  const netSubtotal = subTotal - discount.value - exchangeCredit;
  const gstAmount = Math.round(netSubtotal * gstRate) / 100;
  const totalAmount = Math.round((netSubtotal + gstAmount) * 100) / 100;
  if (subTotal > 9999999999.99 || totalAmount > 9999999999.99) {
    return { error: 'Bill total exceeds the supported limit' };
  }

  return {
    billing: {
      invoice_no: `BILL-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`,
      customers: customers.value,
      products: products.value,
      exchanges,
      payment_type: paymentType,
      sub_total: subTotal,
      discount_amount: discount.value,
      gst_amount: gstAmount,
      total_amount: totalAmount
    }
  };
}

function mapSelectedProducts(rawProducts, catalogProducts) {
  if (!Array.isArray(rawProducts) || rawProducts.length < 1 || rawProducts.length > MAX_ITEMS) {
    return { error: `Add between 1 and ${MAX_ITEMS} products` };
  }
  const productIds = rawProducts.map((product, index) => {
    if (!product || typeof product !== 'object' || Array.isArray(product)) return null;
    const id = Number(product.product_id);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  });
  const invalidIndex = productIds.findIndex((id) => id == null);
  if (invalidIndex !== -1) return { error: `Product ${invalidIndex + 1} must be selected from the catalog` };

  const byId = new Map(catalogProducts.map((product) => [Number(product.id), product]));
  const products = [];
  for (const [index, productId] of productIds.entries()) {
    const catalogProduct = byId.get(productId);
    if (!catalogProduct || catalogProduct.status !== 'Active') {
      return { error: `Product ${index + 1} is no longer active in the catalog` };
    }
    const price = Number(catalogProduct.offer_price) > 0
      ? Number(catalogProduct.offer_price)
      : Number(catalogProduct.final_selling_price) > 0
        ? Number(catalogProduct.final_selling_price)
        : Number(catalogProduct.mrp || 0);
    products.push({
      product_id: productId,
      product_name: catalogProduct.name,
      category: catalogProduct.category,
      purity: catalogProduct.purity || '',
      price
    });
  }
  return { products };
}

async function resolveSelectedProducts(rawProducts) {
  if (!Array.isArray(rawProducts) || rawProducts.length < 1 || rawProducts.length > MAX_ITEMS) {
    return { error: `Add between 1 and ${MAX_ITEMS} products` };
  }
  const productIds = rawProducts.map((product) => {
    const id = Number(product?.product_id);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  });
  if (productIds.some((id) => id == null)) return mapSelectedProducts(rawProducts, []);
  const catalogProducts = await getBillingProductsByIds([...new Set(productIds)]);
  return mapSelectedProducts(rawProducts, catalogProducts);
}

async function getBillings(req, res, next) {
  try {
    return res.json(await listBillings());
  } catch (error) {
    return next(error);
  }
}

async function postBilling(req, res, next) {
  try {
    const { products, error: productsError } = await resolveSelectedProducts(req.body?.products);
    if (productsError) return res.status(400).json({ message: productsError });
    const currentRateSet = req.body?.payment_type === 'EXCHANGE_GOLD' ? await getCurrentGoldRates() : null;
    const { billing, error } = normalizeBilling({ ...req.body, products }, currentRateSet);
    if (error) return res.status(400).json({ message: error });
    return res.status(201).json(await createBilling(billing));
  } catch (error) {
    return next(error);
  }
}

function validBillingId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function putBilling(req, res, next) {
  const id = validBillingId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid bill ID' });
  try {
    const existing = await getBillingById(id);
    if (!existing) return res.status(404).json({ message: 'Bill not found' });
    const { products, error: productsError } = await resolveSelectedProducts(req.body?.products);
    if (productsError) return res.status(400).json({ message: productsError });
    const currentRateSet = req.body?.payment_type === 'EXCHANGE_GOLD' ? await getCurrentGoldRates() : null;
    const { billing, error } = normalizeBilling({ ...req.body, products }, currentRateSet);
    if (error) return res.status(400).json({ message: error });
    billing.invoice_no = existing.invoice_no;
    const updated = await updateBilling(id, billing);
    if (!updated) return res.status(404).json({ message: 'Bill not found' });
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
}

async function removeBilling(req, res, next) {
  const id = validBillingId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid bill ID' });
  try {
    const deleted = await deleteBilling(id);
    if (!deleted) return res.status(404).json({ message: 'Bill not found' });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getBillings,
  mapSelectedProducts,
  normalizeExchangeItems,
  normalizeBilling,
  putBilling,
  postBilling,
  removeBilling,
  resolveSelectedProducts
};
