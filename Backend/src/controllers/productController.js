const {
  createProduct,
  deleteProduct,
  getLatestProductCode,
  getProductById,
  listProducts,
  updateProduct
} = require('../modules/productModule');
const { isValidProductFile, removeProductFiles } = require('../middleware/productUpload');
const { findGoldRateForPurity, getCurrentGoldRates } = require('../modules/goldRateModule');
const { calculateProductPricing, recalculateProductPrices } = require('../services/productPricing');
const { pool } = require('../config/db');

const JSON_FIELDS = new Set(['available_sizes', 'highlights', 'images', 'variants']);
const BOOLEAN_FIELDS = new Set(['price_includes_gst', 'featured', 'new_arrival', 'best_seller']);
const NUMBER_FIELDS = new Set([
  'mrp', 'offer', 'offer_price', 'rating', 'total_stock', 'gross_weight',
  'net_gold_weight', 'gold_rate_per_gram', 'making_charge', 'wastage',
  'stone_weight', 'stone_charges', 'other_charges', 'discount', 'gst_rate', 'final_selling_price', 'total_reviews',
  'fixed_discount_amount'
]);
const ALLOWED_FIELDS = new Set([
  'product_code', 'name', 'brand', 'category', 'subcategory', 'metal_type', 'product_type',
  'description', 'full_description', 'purity', 'gross_weight', 'net_gold_weight',
  'gold_rate_per_gram', 'making_charge_type', 'making_charge', 'wastage_type',
  'wastage', 'stone_weight', 'stone_charges', 'other_charges', 'stone_type', 'huid', 'available_sizes',
  'product_size', 'length', 'width', 'height', 'ring_size', 'bangle_size',
  'chain_length', 'size_guide_chart', 'mrp', 'offer', 'offer_price', 'discount',
  'gst_rate', 'final_selling_price', 'price_includes_gst', 'offer_type',
  'fixed_discount_amount', 'highlights',
  'specifications', 'care_instructions', 'warranty', 'images', 'video',
  'certificate', 'rating', 'total_reviews', 'total_stock', 'stock_status',
  'sku_barcode', 'warehouse', 'status', 'featured', 'new_arrival', 'best_seller',
  'variants', 'material', 'wash_care', 'saree_length', 'blouse_length',
  'top_length', 'bottom_length', 'dupatta_length', 'gown_length', 'sleeve_type',
  'neck_type', 'fit_type', 'work_type', 'zari_color', 'age'
]);

function parseJsonField(value, field) {
  if (Array.isArray(value)) return { value };
  if (typeof value !== 'string') return { error: `${field} must be an array` };
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? { value: parsed } : { error: `${field} must be an array` };
  } catch {
    return { error: `${field} must be valid JSON` };
  }
}

function normalizeProduct(body) {
  const product = {};
  for (const [field, rawValue] of Object.entries(body)) {
    if (!ALLOWED_FIELDS.has(field)) continue;
    if (JSON_FIELDS.has(field)) {
      const parsed = parseJsonField(rawValue, field);
      if (parsed.error) return parsed;
      product[field] = parsed.value;
    } else if (BOOLEAN_FIELDS.has(field)) {
      product[field] = rawValue === true || rawValue === 'true' || rawValue === '1' || rawValue === 1;
    } else if (NUMBER_FIELDS.has(field)) {
      if (rawValue === '' || rawValue == null) {
        product[field] = field === 'rating' || field === 'mrp' || field === 'offer'
          || field === 'offer_price' || field === 'total_stock' || field === 'total_reviews'
          ? 0
          : null;
      } else {
        const number = Number(rawValue);
        if (!Number.isFinite(number) || number < 0) return { error: `${field} must be a non-negative number` };
        product[field] = number;
      }
    } else {
      product[field] = rawValue == null ? null : String(rawValue).trim();
    }
  }

  if (!product.name || !product.category || !product.product_code) {
    return { error: 'Product name, SKU, and category are required' };
  }
  if (product.name.length > 255 || product.product_code.length > 100) {
    return { error: 'Product name or SKU is too long' };
  }
  if (!['Active', 'Draft', 'Inactive'].includes(product.status || 'Active')) {
    return { error: 'Product status must be Active, Draft, or Inactive' };
  }
  if (product.offer_type && !['None', 'Percentage', 'Fixed Amount'].includes(product.offer_type)) {
    return { error: 'Offer type must be None, Percentage, or Fixed Amount' };
  }
  if (Number(product.offer) > 100) return { error: 'Offer percentage cannot exceed 100' };
  product.status = product.status || 'Active';
  product.images = product.images || [];
  product.variants = product.variants || [];
  product.available_sizes = product.available_sizes || [];
  product.highlights = product.highlights || [];
  product.total_stock = Math.floor(product.total_stock || 0);
  product.rating = product.rating ?? 0;
  product.offer = product.offer ?? 0;
  product.mrp = product.mrp ?? 0;
  product.offer_type = product.offer_type || 'Percentage';
  product.fixed_discount_amount = product.fixed_discount_amount ?? 0;
  product.stock_status = product.stock_status
    || (product.total_stock <= 0 ? 'Out of Stock' : product.total_stock < 10 ? 'Low Stock' : 'In Stock');
  return { product };
}

async function getProducts(req, res, next) {
  const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit) || 100)));
  try {
    return res.json(await listProducts({
      page,
      limit,
      search: String(req.query.search || '').trim(),
      status: String(req.query.status || 'All'),
      category: String(req.query.category || '').trim(),
      purity: String(req.query.purity || '').trim(),
      offerStatus: String(req.query.offerStatus || ''),
      stockStatus: String(req.query.stockStatus || ''),
      lastPriceUpdate: String(req.query.lastPriceUpdate || ''),
      sortBy: String(req.query.sortBy || ''),
      sortOrder: String(req.query.sortOrder || '')
    }));
  } catch (error) {
    return next(error);
  }
}

async function getProduct(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: 'Product ID is invalid' });
  try {
    const product = await getProductById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    return res.json(product);
  } catch (error) {
    return next(error);
  }
}

async function getProductPricing(req, res, next) {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: 'Product ID is invalid' });
    try {
      const product = await getProductById(id);
      if (!product) return res.status(404).json({ message: 'Product not found' });
      return res.json({
        id: product.id,
        gold_rate_per_gram: product.gold_rate_per_gram,
        gold_rate_date: product.gold_rate_date,
        gold_value: product.gold_value,
        pre_discount_price: product.pre_discount_price,
        tax_amount: product.tax_amount,
        applied_discount: product.applied_discount,
        offer_price: product.offer_price,
        final_selling_price: product.final_selling_price,
        price_updated_at: product.price_updated_at
      });
    } catch (error) {
      return next(error);
    }
  }

async function getProductPriceHistory(req, res, next) {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: 'Product ID is invalid' });
    try {
      const [history] = await pool.execute(`
        SELECT h.*, u.username AS changed_by_name
        FROM product_price_history h
        LEFT JOIN users u ON u.user_id = h.changed_by
        WHERE h.product_id = ? ORDER BY h.changed_at DESC, h.id DESC LIMIT 100
      `, [id]);
      return res.json({ history });
    } catch (error) {
      return next(error);
    }
  }

async function postRecalculatePrices(req, res, next) {
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (!reason || reason.length > 500) {
      return res.status(400).json({ message: 'A reason of 1 to 500 characters is required' });
    }
    try {
      const rateSet = await getCurrentGoldRates();
      if (!rateSet) return res.status(409).json({ message: 'Activate a daily gold rate before recalculating product prices' });
      const connection = await pool.getConnection();
      let result;
      try {
        await connection.beginTransaction();
        result = await recalculateProductPrices(connection, rateSet.rates, {
          reason,
          rateDate: rateSet.rate_date,
          userId: req.adminUser.user_id
        });
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
      return res.json({ ...result, rate_date: rateSet.rate_date });
    } catch (error) {
      return next(error);
    }
}

async function latestProductCode(req, res, next) {
  try {
    return res.json({ latestCode: await getLatestProductCode() });
  } catch (error) {
    return next(error);
  }
}

async function postProduct(req, res, next) {
  const { product, error } = normalizeProduct(req.body || {});
  if (error) return res.status(400).json({ message: error });
  try {
    if (Number(product.net_gold_weight) > 0) {
      const activeRateSet = await getCurrentGoldRates();
      const activeRate = findGoldRateForPurity(activeRateSet, product.purity, product.metal_type);
      if (!activeRate) return res.status(409).json({ message: `No active ${product.metal_type || 'metal'} rate matches this product purity. Configure and activate the daily precious rates first.` });
      product.gold_rate_per_gram = activeRate.rate_per_gram;
      product.gold_rate_date = activeRateSet.rate_date;
      product.price_updated_at = new Date();
      Object.assign(product, calculateProductPricing(product, activeRate.rate_per_gram));
    }
    const created = await createProduct(product);
    if (product.gold_rate_per_gram != null) {
      await pool.execute(`
        INSERT INTO product_price_history
          (product_id, product_code, previous_price, new_price, rate_per_gram, reason, changed_by)
        VALUES (?, ?, NULL, ?, ?, 'Initial product pricing', ?)
      `, [created.id, created.product_code, created.final_selling_price, product.gold_rate_per_gram, req.adminUser.user_id]);
    }
    return res.status(201).json(created);
  } catch (createError) {
    if (createError.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'This SKU already exists' });
    return next(createError);
  }
}

async function putProduct(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: 'Product ID is invalid' });
  const { product, error } = normalizeProduct(req.body || {});
  if (error) return res.status(400).json({ message: error });
  try {
    const existingProduct = await getProductById(id);
    if (!existingProduct) return res.status(404).json({ message: 'Product not found' });
    if (Number(product.net_gold_weight) > 0) {
      const activeRateSet = await getCurrentGoldRates();
      const activeRate = findGoldRateForPurity(activeRateSet, product.purity, product.metal_type);
      if (!activeRate) return res.status(409).json({ message: `No active ${product.metal_type || 'metal'} rate matches the updated product purity.` });
      product.gold_rate_per_gram = activeRate.rate_per_gram;
      product.gold_rate_date = activeRateSet.rate_date;
      product.price_updated_at = new Date();
      Object.assign(product, calculateProductPricing({ ...existingProduct, ...product }, activeRate.rate_per_gram));
    } else {
      product.gold_rate_per_gram = existingProduct.gold_rate_per_gram;
      product.gold_rate_date = existingProduct.gold_rate_date;
    }
    const updated = await updateProduct(id, product);
    if (product.gold_rate_per_gram != null
      && Number(existingProduct.final_selling_price) !== Number(updated.final_selling_price)) {
      await pool.execute(`
        INSERT INTO product_price_history
          (product_id, product_code, previous_price, new_price, rate_per_gram, reason, changed_by)
        VALUES (?, ?, ?, ?, ?, 'Product pricing updated', ?)
      `, [
        id, updated.product_code, existingProduct.final_selling_price,
        updated.final_selling_price, product.gold_rate_per_gram, req.adminUser.user_id
      ]);
    }
    return res.json(updated);
  } catch (updateError) {
    if (updateError.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'This SKU already exists' });
    return next(updateError);
  }
}

async function removeProduct(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: 'Product ID is invalid' });
  try {
    if (!await deleteProduct(id)) return res.status(404).json({ message: 'Product not found' });
    return res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    return next(error);
  }
}

async function receiveProductFiles(req, res, next) {
  const files = Object.values(req.files || {}).flat();
  try {
    if (files.some((file) => !isValidProductFile(file))) {
      await removeProductFiles(files);
      return res.status(400).json({ message: 'One or more uploaded files have invalid content' });
    }
    return next();
  } catch (error) {
    await removeProductFiles(files);
    return next(error);
  }
}

function uploadedPaths(files = []) {
  return files.map((file) => `/uploads/products/${file.filename}`);
}

async function uploadProductImages(req, res) {
  return res.status(201).json({ images: uploadedPaths(req.files?.images) });
}

async function uploadProductMedia(req, res) {
  return res.status(201).json({
    images: uploadedPaths(req.files?.images),
    video: uploadedPaths(req.files?.video)[0] || null,
    size_guide_chart: uploadedPaths(req.files?.size_guide_chart)[0] || null,
    certificate: uploadedPaths(req.files?.certificate)[0] || null
  });
}

module.exports = {
  getProduct,
  getProductPricing,
  getProductPriceHistory,
  getProducts,
  latestProductCode,
  postProduct,
  postRecalculatePrices,
  putProduct,
  receiveProductFiles,
  removeProduct,
  uploadProductImages,
  uploadProductMedia
};
