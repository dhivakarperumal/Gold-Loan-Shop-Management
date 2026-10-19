function money(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function numeric(value, field) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new TypeError(`${field} must be a finite non-negative number`);
  }
  return parsed;
}

function calculateProductPricing(product, ratePerGram) {
  const netGoldWeight = numeric(product.net_gold_weight, 'Net gold weight');
  const rate = numeric(ratePerGram, 'Gold rate');
  const makingCharge = numeric(product.making_charge, 'Making charge');
  const wastage = numeric(product.wastage, 'Wastage');
  const stoneCharges = numeric(product.stone_charges, 'Stone charges');
  const otherCharges = numeric(product.other_charges, 'Other charges');
  const gstRate = numeric(product.gst_rate, 'GST rate');
  const goldValue = money(netGoldWeight * rate);
  const makingValue = String(product.making_charge_type).toLowerCase() === 'percentage'
    ? money(goldValue * makingCharge / 100)
    : money(makingCharge);
  const wastageWeight = String(product.wastage_type).toLowerCase() === 'percentage'
    ? netGoldWeight * wastage / 100
    : wastage;
  const wastageValue = money(wastageWeight * rate);
  const preTaxSubtotal = money(goldValue + makingValue + wastageValue + stoneCharges + otherCharges);
  const priceIncludesGst = Boolean(product.price_includes_gst);
  const initialTax = money(priceIncludesGst
    ? preTaxSubtotal * gstRate / (100 + gstRate)
    : preTaxSubtotal * gstRate / 100);
  const preDiscountPrice = priceIncludesGst ? preTaxSubtotal : money(preTaxSubtotal + initialTax);
  const offerType = product.offer_type || (numeric(product.offer, 'Offer') > 0 ? 'Percentage' : 'None');
  let discount = 0;
  if (offerType === 'Percentage') {
    const percentage = numeric(product.offer, 'Offer percentage');
    discount = preDiscountPrice * percentage / 100;
  } else if (offerType === 'Fixed Amount') {
    discount = numeric(product.fixed_discount_amount, 'Fixed discount');
  } else if (offerType !== 'None') {
    throw new TypeError('Offer type must be Percentage, Fixed Amount, or None');
  }
  discount = money(Math.min(discount, preDiscountPrice));
  const offerPrice = money(preDiscountPrice - discount);
  const tax = money(priceIncludesGst
    ? offerPrice * gstRate / (100 + gstRate)
    : offerPrice * gstRate / (100 + gstRate));
  const finalPrice = offerPrice;
  if ([goldValue, preDiscountPrice, discount, offerPrice, finalPrice, tax].some((value) => value < 0)) {
    throw new RangeError('Calculated product prices cannot be negative');
  }
  return {
    gold_value: goldValue,
    pre_discount_price: preDiscountPrice,
    tax_amount: tax,
    applied_discount: discount,
    offer_price: offerPrice,
    final_selling_price: finalPrice
  };
}

function rateForProduct(rates, purity, metalType) {
  const normalize = (value) => String(value || '').toLowerCase();
  const metal = normalize(metalType);
  const text = normalize(purity);
  const digits = text.match(/\d{3}/)?.[0] || ({
    '24k': '999',
    '22k': '916',
    '20k': '833',
    '18k': '750',
    '14k': '585'
  })[text.match(/\d{2}k/)?.[0]];
  return rates.find((rate) => normalize(rate.metal_type) === metal
    && (normalize(rate.purity) === text || (digits && String(rate.purity) === digits))) || null;
}

async function recalculateProductPrices(connection, rates, { reason, userId, rateDate }) {
  const [products] = await connection.query(`
    SELECT id, product_code, metal_type, purity, net_gold_weight, making_charge_type,
      making_charge, wastage_type, wastage, stone_charges, other_charges, gst_rate,
      price_includes_gst, offer_type, offer, fixed_discount_amount,
      gold_rate_per_gram, gold_value, pre_discount_price, tax_amount, applied_discount,
      offer_price, final_selling_price
    FROM products
    WHERE net_gold_weight > 0 AND metal_type IS NOT NULL AND purity IS NOT NULL
    FOR UPDATE
  `);
  let changed = 0;
  for (const product of products) {
    const rate = rateForProduct(rates, product.purity, product.metal_type);
    if (!rate) continue;
    const pricing = calculateProductPricing(product, rate.rate_per_gram);
    const oldFinal = product.final_selling_price == null ? null : Number(product.final_selling_price);
    const oldRate = product.gold_rate_per_gram == null ? null : Number(product.gold_rate_per_gram);
    const priceChanged = oldRate !== Number(rate.rate_per_gram)
      || Number(product.gold_value || 0) !== pricing.gold_value
      || Number(product.pre_discount_price || 0) !== pricing.pre_discount_price
      || Number(product.tax_amount || 0) !== pricing.tax_amount
      || Number(product.applied_discount || 0) !== pricing.applied_discount
      || Number(product.offer_price || 0) !== pricing.offer_price
      || oldFinal !== pricing.final_selling_price;
    if (!priceChanged) continue;
    await connection.execute(`
      INSERT INTO product_price_history
        (product_id, product_code, previous_price, new_price, rate_per_gram, reason, changed_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      product.id, product.product_code, oldFinal, pricing.final_selling_price,
      rate.rate_per_gram, reason, userId
    ]);
    await connection.execute(`
      UPDATE products SET gold_rate_per_gram = ?, gold_value = ?, pre_discount_price = ?,
        tax_amount = ?, applied_discount = ?, offer_price = ?, final_selling_price = ?,
        gold_rate_date = ?, price_updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      rate.rate_per_gram, pricing.gold_value, pricing.pre_discount_price,
      pricing.tax_amount, pricing.applied_discount, pricing.offer_price,
      pricing.final_selling_price, rateDate || null, product.id
    ]);
    changed += 1;
  }
  return { examined: products.length, updated: changed };
}

module.exports = { calculateProductPricing, rateForProduct, recalculateProductPrices };
