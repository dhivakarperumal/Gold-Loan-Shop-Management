const { randomUUID } = require('node:crypto');
const {
  createBilling,
  getBillingProductsByIds,
  listBillings
} = require('../modules/billingModule');

const PAYMENT_TYPES = new Set(['FULL_PAYMENT', 'EXCHANGE_GOLD']);
const MAX_ITEMS = 100;
const GST_RATE = 3;

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
    const productName = normalizeText(item.product_name, `${field} ${index + 1} product name`, 150, true);
    const category = normalizeText(item.category, `${field} ${index + 1} category`, 100, true);
    const purity = normalizeText(item.purity, `${field} ${index + 1} purity`, 30, withCredit);
    if (productName.error || category.error || purity.error) {
      return { error: productName.error || category.error || purity.error };
    }
    const entry = {
      product_name: productName.value,
      category: category.value,
      purity: purity.value
    };
    if (withCredit) {
      const credit = normalizeMoney(item.credit_amount, `${field} ${index + 1} exchange credit`);
      if (credit.error) return { error: credit.error };
      entry.credit_amount = credit.value;
    } else {
      const price = normalizeMoney(item.price, `${field} ${index + 1} price`);
      if (price.error) return { error: price.error };
      entry.price = price.value;
    }
    entries.push(entry);
  }
  return { value: entries };
}

function normalizeBilling(body) {
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
    const normalizedExchanges = normalizeItems(rawExchanges, 'exchange items', true);
    if (normalizedExchanges.error) return normalizedExchanges;
    exchanges = normalizedExchanges.value;
  }

  const subTotal = Math.round(products.value.reduce((sum, product) => sum + product.price, 0) * 100) / 100;
  const exchangeCredit = Math.round(exchanges.reduce((sum, exchange) => sum + exchange.credit_amount, 0) * 100) / 100;
  if (exchangeCredit > subTotal) return { error: 'Exchange credit cannot exceed the purchased products subtotal' };
  const gstAmount = Math.round((subTotal - exchangeCredit) * GST_RATE) / 100;
  const totalAmount = Math.round((subTotal - exchangeCredit + gstAmount) * 100) / 100;
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
    const { billing, error } = normalizeBilling({ ...req.body, products });
    if (error) return res.status(400).json({ message: error });
    return res.status(201).json(await createBilling(billing));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getBillings,
  mapSelectedProducts,
  normalizeBilling,
  postBilling,
  resolveSelectedProducts
};
