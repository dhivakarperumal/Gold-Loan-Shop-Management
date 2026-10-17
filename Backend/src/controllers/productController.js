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

const JSON_FIELDS = new Set(['available_sizes', 'highlights', 'images', 'variants']);
const BOOLEAN_FIELDS = new Set(['price_includes_gst', 'featured', 'new_arrival', 'best_seller']);
const NUMBER_FIELDS = new Set([
  'mrp', 'offer', 'offer_price', 'rating', 'total_stock', 'gross_weight',
  'net_gold_weight', 'gold_rate_per_gram', 'making_charge', 'wastage',
  'stone_weight', 'stone_charges', 'discount', 'gst_rate', 'final_selling_price', 'total_reviews'
]);
const ALLOWED_FIELDS = new Set([
  'product_code', 'name', 'brand', 'category', 'subcategory', 'metal_type', 'product_type',
  'description', 'full_description', 'purity', 'gross_weight', 'net_gold_weight',
  'gold_rate_per_gram', 'making_charge_type', 'making_charge', 'wastage_type',
  'wastage', 'stone_weight', 'stone_charges', 'stone_type', 'huid', 'available_sizes',
  'product_size', 'length', 'width', 'height', 'ring_size', 'bangle_size',
  'chain_length', 'size_guide_chart', 'mrp', 'offer', 'offer_price', 'discount',
  'gst_rate', 'final_selling_price', 'price_includes_gst', 'highlights',
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
  product.status = product.status || 'Active';
  product.images = product.images || [];
  product.variants = product.variants || [];
  product.available_sizes = product.available_sizes || [];
  product.highlights = product.highlights || [];
  product.total_stock = Math.floor(product.total_stock || 0);
  product.rating = product.rating ?? 0;
  product.offer = product.offer ?? 0;
  product.mrp = product.mrp ?? 0;
  product.offer_price = product.offer_price ?? product.mrp;
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
      status: String(req.query.status || 'All')
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
    }
    return res.status(201).json(await createProduct(product));
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
    if (Number(product.net_gold_weight) > 0
      && (existingProduct.purity !== product.purity || existingProduct.metal_type !== product.metal_type)) {
      const activeRateSet = await getCurrentGoldRates();
      const activeRate = findGoldRateForPurity(activeRateSet, product.purity, product.metal_type);
      if (!activeRate) return res.status(409).json({ message: `No active ${product.metal_type || 'metal'} rate matches the updated product purity.` });
      product.gold_rate_per_gram = activeRate.rate_per_gram;
      product.gold_rate_date = activeRateSet.rate_date;
    } else {
      product.gold_rate_per_gram = existingProduct.gold_rate_per_gram;
      product.gold_rate_date = existingProduct.gold_rate_date;
    }
    return res.json(await updateProduct(id, product));
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
  getProducts,
  latestProductCode,
  postProduct,
  putProduct,
  receiveProductFiles,
  removeProduct,
  uploadProductImages,
  uploadProductMedia
};
