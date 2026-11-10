import assert from "node:assert/strict";
import test from "node:test";
import { getProductDiscountPercentage } from "../src/utils/productDiscount.js";

test("calculates the displayed discount from product prices, not the discount amount", () => {
  assert.equal(getProductDiscountPercentage({
    mrp: 4068,
    offer_price: 3661,
    discount: 407
  }), 10);
  assert.equal(getProductDiscountPercentage({
    mrp: 4068,
    offer_price: 0,
    final_selling_price: 3661,
    discount: 407
  }), 10);
});

test("returns no discount when the sale price is not below the original price", () => {
  assert.equal(getProductDiscountPercentage({ mrp: 1000, offer_price: 1000 }), 0);
  assert.equal(getProductDiscountPercentage({ mrp: 1000, offer_price: 1200 }), 0);
});

test("supports chatbot products with price instead of MRP", () => {
  assert.equal(getProductDiscountPercentage({ price: 2000, offer_price: 1500 }), 25);
});
