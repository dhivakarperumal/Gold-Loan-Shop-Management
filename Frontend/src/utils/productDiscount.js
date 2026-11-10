export function getProductDiscountPercentage(product) {
  const mrp = Number(product.mrp);
  const price = Number(product.price);
  const originalPrice = Number.isFinite(mrp) && mrp > 0 ? mrp : price;
  const offerPrice = [
    product.offer_price,
    product.final_selling_price,
    product.price,
    originalPrice
  ]
    .map(Number)
    .find((value) => Number.isFinite(value) && value > 0);
  if (
    !Number.isFinite(originalPrice)
    || !Number.isFinite(offerPrice)
    || originalPrice <= 0
    || offerPrice >= originalPrice
  ) {
    return 0;
  }
  return Math.round(((originalPrice - offerPrice) / originalPrice) * 100);
}
