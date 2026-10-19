const { pool } = require('../config/db');

async function initializeStoreModule() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      product_id INT UNSIGNED NOT NULL,
      variant_color VARCHAR(100) NOT NULL DEFAULT '',
      variant_size VARCHAR(100) NOT NULL DEFAULT '',
      image VARCHAR(1000) NULL,
      price DECIMAL(14,2) NOT NULL,
      quantity INT UNSIGNED NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_cart_user_product_variant (user_id, product_id, variant_color, variant_size),
      CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      CONSTRAINT fk_cart_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS wishlist_items (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      product_id INT UNSIGNED NOT NULL,
      variant_color VARCHAR(100) NOT NULL DEFAULT '',
      variant_size VARCHAR(100) NOT NULL DEFAULT '',
      image VARCHAR(1000) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_wishlist_user_product (user_id, product_id),
      CONSTRAINT fk_wishlist_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      CONSTRAINT fk_wishlist_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);
}

async function getStoreProduct(connection, productId, lock = false) {
  const [rows] = await connection.execute(
    `SELECT id, name, status, offer_price, final_selling_price, mrp, total_stock, images, variants
     FROM products WHERE id = ?${lock ? ' FOR UPDATE' : ''}`,
    [productId]
  );
  return rows[0] || null;
}

async function listCartItems(userId) {
  const [rows] = await pool.execute(
    `SELECT c.id, c.product_id, c.variant_color AS colorName, c.variant_size AS size,
       c.image, c.price, c.quantity, p.name, p.images AS product_images,
       p.variants, p.total_stock, (c.price * c.quantity) AS total_price
     FROM cart_items c JOIN products p ON p.id = c.product_id
     WHERE c.user_id = ? ORDER BY c.created_at DESC, c.id DESC`,
    [userId]
  );
  return rows;
}

async function addCartItem({ userId, productId, color, size, image, quantity }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const product = await getStoreProduct(connection, productId, true);
    if (!product || product.status !== 'Active') {
      throw Object.assign(new Error('Product is unavailable'), { code: 'PRODUCT_UNAVAILABLE' });
    }

    const [existingRows] = await connection.execute(
      `SELECT quantity FROM cart_items
       WHERE user_id = ? AND product_id = ? AND variant_color = ? AND variant_size = ? FOR UPDATE`,
      [userId, productId, color, size]
    );
    const currentQuantity = Number(existingRows[0]?.quantity || 0);
    if (currentQuantity + quantity > Number(product.total_stock || 0)) {
      throw Object.assign(new Error('Requested quantity exceeds available stock'), { code: 'INSUFFICIENT_STOCK' });
    }

    const price = Number(product.offer_price) > 0
      ? Number(product.offer_price)
      : Number(product.final_selling_price) > 0
        ? Number(product.final_selling_price)
        : Number(product.mrp || 0);
    const [result] = await connection.execute(
      `INSERT INTO cart_items (user_id, product_id, variant_color, variant_size, image, price, quantity)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), price = VALUES(price),
         image = COALESCE(VALUES(image), image)`,
      [userId, productId, color, size, image, price, quantity]
    );
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateCartItem({ userId, itemId, quantity }) {
  const [rows] = await pool.execute(
    `SELECT c.id, p.total_stock FROM cart_items c
     JOIN products p ON p.id = c.product_id
     WHERE c.id = ? AND c.user_id = ?`,
    [itemId, userId]
  );
  if (!rows.length) return false;
  if (quantity > Number(rows[0].total_stock || 0)) {
    throw Object.assign(new Error('Requested quantity exceeds available stock'), { code: 'INSUFFICIENT_STOCK' });
  }
  await pool.execute('UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?', [quantity, itemId, userId]);
  return true;
}

async function removeCartItem(userId, itemId) {
  const [result] = await pool.execute(
    'DELETE FROM cart_items WHERE id = ? AND user_id = ?',
    [itemId, userId]
  );
  return result.affectedRows > 0;
}

async function clearCartItems(userId) {
  await pool.execute('DELETE FROM cart_items WHERE user_id = ?', [userId]);
}

async function listWishlistItems(userId) {
  const [rows] = await pool.execute(
    `SELECT w.id, w.product_id, w.variant_color AS colorName, w.variant_size AS size,
       w.image, p.name, p.images AS product_images, p.variants, p.total_stock,
       COALESCE(NULLIF(p.offer_price, 0), NULLIF(p.final_selling_price, 0), p.mrp) AS price
     FROM wishlist_items w JOIN products p ON p.id = w.product_id
     WHERE w.user_id = ? ORDER BY w.created_at DESC, w.id DESC`,
    [userId]
  );
  return rows;
}

async function addWishlistItem({ userId, productId, color, size, image }) {
  const product = await getStoreProduct(pool, productId);
  if (!product || product.status !== 'Active') {
    throw Object.assign(new Error('Product is unavailable'), { code: 'PRODUCT_UNAVAILABLE' });
  }
  await pool.execute(
    `INSERT INTO wishlist_items (user_id, product_id, variant_color, variant_size, image)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE variant_color = VALUES(variant_color), variant_size = VALUES(variant_size),
       image = COALESCE(VALUES(image), image)`,
    [userId, productId, color, size, image]
  );
}

async function removeWishlistItem(userId, productId) {
  const [result] = await pool.execute(
    'DELETE FROM wishlist_items WHERE user_id = ? AND product_id = ?',
    [userId, productId]
  );
  return result.affectedRows > 0;
}

module.exports = {
  addCartItem,
  addWishlistItem,
  clearCartItems,
  initializeStoreModule,
  listCartItems,
  listWishlistItems,
  removeCartItem,
  removeWishlistItem,
  updateCartItem
};
