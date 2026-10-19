const { pool } = require('../config/db');

const PRODUCT_COLUMNS = `
  id, product_code, name, brand, category, subcategory, metal_type, product_type,
  description, full_description, purity, gross_weight, net_gold_weight,
  gold_rate_per_gram, DATE_FORMAT(gold_rate_date, '%Y-%m-%d') AS gold_rate_date,
  gold_value, pre_discount_price, tax_amount, applied_discount,
  price_updated_at, making_charge_type, making_charge, wastage_type, wastage,
  stone_weight, stone_charges, other_charges, stone_type, huid, available_sizes, product_size, length, width,
  height, ring_size, bangle_size, chain_length, size_guide_chart, mrp, offer, offer_type,
  fixed_discount_amount, offer_price, discount, gst_rate, final_selling_price, price_includes_gst,
  highlights, specifications, care_instructions, warranty, images, video,
  certificate, rating, total_reviews, total_stock, stock_status, sku_barcode,
  warehouse, status, featured, new_arrival, best_seller, variants, material,
  wash_care, saree_length, blouse_length, top_length, bottom_length,
  dupatta_length, gown_length, sleeve_type, neck_type, fit_type, work_type,
  zari_color, age, created_at, updated_at
`;

const JSON_COLUMNS = new Set(['available_sizes', 'highlights', 'images', 'variants']);

function parseProduct(product) {
  const parsed = { ...product };
  for (const column of JSON_COLUMNS) {
    if (typeof parsed[column] === 'string') {
      parsed[column] = JSON.parse(parsed[column]);
    }
  }
  parsed.price_includes_gst = Boolean(parsed.price_includes_gst);
  parsed.featured = Boolean(parsed.featured);
  parsed.new_arrival = Boolean(parsed.new_arrival);
  parsed.best_seller = Boolean(parsed.best_seller);
  return parsed;
}

const columnDefinitions = {
  brand: "VARCHAR(150) NULL",
  metal_type: "VARCHAR(150) NULL",
  product_type: "VARCHAR(100) NULL",
  full_description: "TEXT NULL",
  purity: "VARCHAR(50) NULL",
  gross_weight: "DECIMAL(12,3) NULL",
  net_gold_weight: "DECIMAL(12,3) NULL",
  gold_rate_per_gram: "DECIMAL(14,2) NULL",
  gold_rate_date: "DATE NULL",
  making_charge_type: "VARCHAR(32) NULL",
  making_charge: "DECIMAL(14,2) NULL",
  wastage_type: "VARCHAR(32) NULL",
  wastage: "DECIMAL(12,3) NULL",
  stone_weight: "DECIMAL(12,3) NULL",
  stone_charges: "DECIMAL(14,2) NULL",
  stone_type: "VARCHAR(100) NULL",
  huid: "VARCHAR(100) NULL",
  available_sizes: "JSON NULL",
  product_size: "VARCHAR(100) NULL",
  length: "VARCHAR(50) NULL",
  width: "VARCHAR(50) NULL",
  height: "VARCHAR(50) NULL",
  ring_size: "VARCHAR(50) NULL",
  bangle_size: "VARCHAR(50) NULL",
  chain_length: "VARCHAR(50) NULL",
  size_guide_chart: "VARCHAR(500) NULL",
  discount: "DECIMAL(7,2) NULL",
  gst_rate: "DECIMAL(7,2) NULL",
  final_selling_price: "DECIMAL(14,2) NULL",
  offer_type: "VARCHAR(32) NOT NULL DEFAULT 'None'",
  fixed_discount_amount: "DECIMAL(14,2) NOT NULL DEFAULT 0",
  gold_value: "DECIMAL(14,2) NULL",
  pre_discount_price: "DECIMAL(14,2) NULL",
  tax_amount: "DECIMAL(14,2) NULL",
  applied_discount: "DECIMAL(14,2) NULL",
  price_updated_at: "DATETIME NULL",
  other_charges: "DECIMAL(14,2) NOT NULL DEFAULT 0",
  price_includes_gst: "BOOLEAN NOT NULL DEFAULT FALSE",
  highlights: "JSON NULL",
  specifications: "TEXT NULL",
  care_instructions: "TEXT NULL",
  warranty: "TEXT NULL",
  images: "JSON NULL",
  video: "VARCHAR(500) NULL",
  certificate: "VARCHAR(500) NULL",
  total_reviews: "INT UNSIGNED NOT NULL DEFAULT 0",
  stock_status: "VARCHAR(32) NULL",
  sku_barcode: "VARCHAR(150) NULL",
  warehouse: "VARCHAR(150) NULL",
  featured: "BOOLEAN NOT NULL DEFAULT FALSE",
  new_arrival: "BOOLEAN NOT NULL DEFAULT FALSE",
  best_seller: "BOOLEAN NOT NULL DEFAULT FALSE",
  variants: "JSON NULL",
  material: "VARCHAR(150) NULL",
  wash_care: "VARCHAR(255) NULL",
  saree_length: "VARCHAR(100) NULL",
  blouse_length: "VARCHAR(100) NULL",
  top_length: "VARCHAR(100) NULL",
  bottom_length: "VARCHAR(100) NULL",
  dupatta_length: "VARCHAR(100) NULL",
  gown_length: "VARCHAR(100) NULL",
  sleeve_type: "VARCHAR(100) NULL",
  neck_type: "VARCHAR(100) NULL",
  fit_type: "VARCHAR(100) NULL",
  work_type: "VARCHAR(150) NULL",
  zari_color: "VARCHAR(100) NULL",
  age: "VARCHAR(50) NULL"
};

async function initializeProductModule() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      product_code VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(150) NOT NULL,
      subcategory VARCHAR(150) NULL,
      description TEXT NULL,
      mrp DECIMAL(14,2) NOT NULL DEFAULT 0,
      offer DECIMAL(7,2) NOT NULL DEFAULT 0,
      offer_price DECIMAL(14,2) NOT NULL DEFAULT 0,
      rating DECIMAL(3,2) NOT NULL DEFAULT 0,
      total_stock INT NOT NULL DEFAULT 0,
      status VARCHAR(32) NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  const [columns] = await pool.query('SHOW COLUMNS FROM products');
  const existingColumns = new Set(columns.map((column) => column.Field));
  for (const [column, definition] of Object.entries(columnDefinitions)) {
    if (!existingColumns.has(column)) {
      await pool.query(`ALTER TABLE products ADD COLUMN \`${column}\` ${definition}`);
    }
  }
  await pool.query("UPDATE products SET offer_type = 'Percentage' WHERE (offer_type IS NULL OR offer_type = 'None') AND offer > 0");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_price_history (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      product_id INT UNSIGNED NOT NULL,
      product_code VARCHAR(100) NULL,
      previous_price DECIMAL(14,2) NULL,
      new_price DECIMAL(14,2) NOT NULL,
      rate_per_gram DECIMAL(14,2) NOT NULL,
      reason VARCHAR(500) NOT NULL,
      changed_by BIGINT UNSIGNED NULL,
      changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_product_price_history_product (product_id, changed_at),
      INDEX idx_product_price_history_changed (changed_at)
    )
  `);
}

async function listProducts({
  page, limit, search, status, category, purity, offerStatus, stockStatus,
  lastPriceUpdate, sortBy, sortOrder
}) {
  const where = [];
  const params = [];
  if (search) {
    where.push('(name LIKE ? OR product_code LIKE ? OR category LIKE ? OR purity LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }
  if (status === 'Low Stock') where.push('total_stock > 0 AND total_stock < 10');
  else if (status === 'Out of Stock') where.push('total_stock <= 0');
  else if (status === 'In Stock') where.push('total_stock >= 10');
  else if (status === 'Active' || status === 'Draft' || status === 'Inactive') {
    where.push('status = ?');
    params.push(status);
  }
  if (category) {
    where.push('category = ?');
    params.push(category);
  }
  if (purity) {
    where.push('purity = ?');
    params.push(purity);
  }
  if (offerStatus === 'offered') {
    where.push("(offer_type <> 'None' OR offer > 0)");
  } else if (offerStatus === 'no-offer') {
    where.push("(offer_type = 'None' OR offer_type IS NULL) AND offer <= 0");
  }
  if (stockStatus === 'in-stock') where.push('total_stock > 0');
  else if (stockStatus === 'out-of-stock') where.push('total_stock <= 0');
  else if (stockStatus === 'low-stock') where.push('total_stock > 0 AND total_stock < 10');
  else if (stockStatus === 'normal-stock') where.push('total_stock >= 10');
  if (lastPriceUpdate === 'updated') where.push('price_updated_at IS NOT NULL');
  else if (lastPriceUpdate === 'not-updated') where.push('price_updated_at IS NULL');
  const sortColumns = {
    name: 'name',
    product_code: 'product_code',
    category: 'category',
    purity: 'purity',
    final_selling_price: 'final_selling_price',
    total_stock: 'total_stock',
    updated_at: 'updated_at',
    price_updated_at: 'price_updated_at'
  };
  const orderBy = sortColumns[sortBy] || 'created_at';
  const direction = sortOrder === 'asc' ? 'ASC' : 'DESC';
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM products ${whereSql}`, params);
  const [[{ total: allTotal }]] = await pool.query('SELECT COUNT(*) AS total FROM products');
  const [[{ active }]] = await pool.query("SELECT COUNT(*) AS active FROM products WHERE status = 'Active'");
  const [[{ lowStock }]] = await pool.query('SELECT COUNT(*) AS lowStock FROM products WHERE total_stock > 0 AND total_stock < 10');
  const [[{ outOfStock }]] = await pool.query('SELECT COUNT(*) AS outOfStock FROM products WHERE total_stock <= 0');
  const [categoryRows] = await pool.query('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category');
  const [purityRows] = await pool.query('SELECT DISTINCT purity FROM products WHERE purity IS NOT NULL ORDER BY purity');
  const offset = (page - 1) * limit;
  const [rows] = await pool.execute(
    `SELECT ${PRODUCT_COLUMNS} FROM products ${whereSql}
     ORDER BY \`${orderBy}\` ${direction}, id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return {
    products: rows.map(parseProduct),
    pagination: { total, totalPages: Math.max(1, Math.ceil(total / limit)), page, limit },
    stats: { total: allTotal, active, lowStock, outOfStock },
    filters: {
      categories: categoryRows.map((row) => row.category),
      purities: purityRows.map((row) => row.purity)
    }
  };
}

async function getProductById(id) {
  const [rows] = await pool.execute(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = ?`, [id]);
  return rows[0] ? parseProduct(rows[0]) : null;
}

async function getLatestProductCode() {
  const [[row]] = await pool.query('SELECT id FROM products ORDER BY id DESC LIMIT 1');
  return `GOLD-PRD-${String((row?.id || 0) + 1).padStart(3, '0')}`;
}

async function createProduct(product) {
  const columns = Object.keys(product);
  const values = columns.map((column) =>
    JSON_COLUMNS.has(column) && product[column] != null ? JSON.stringify(product[column]) : product[column]
  );
  const placeholders = columns.map(() => '?').join(', ');
  const [result] = await pool.execute(
    `INSERT INTO products (${columns.map((column) => `\`${column}\``).join(', ')})
     VALUES (${placeholders})`,
    values
  );
  return getProductById(result.insertId);
}

async function updateProduct(id, product) {
  const columns = Object.keys(product);
  const values = columns.map((column) =>
    JSON_COLUMNS.has(column) && product[column] != null ? JSON.stringify(product[column]) : product[column]
  );
  await pool.execute(
    `UPDATE products SET ${columns.map((column) => `\`${column}\` = ?`).join(', ')} WHERE id = ?`,
    [...values, id]
  );
  return getProductById(id);
}

async function deleteProduct(id) {
  const [result] = await pool.execute('DELETE FROM products WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  createProduct,
  deleteProduct,
  getLatestProductCode,
  getProductById,
  initializeProductModule,
  listProducts,
  updateProduct
};
