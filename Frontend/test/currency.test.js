import assert from "node:assert/strict";
import test from "node:test";
import { formatAmount, formatCurrency } from "../src/utils/currency.js";

test("formats INR values with grouping and exactly two decimal places", () => {
  assert.match(formatCurrency(35), /35\.00$/);
  assert.match(formatCurrency(1234.5), /1,234\.50$/);
  assert.match(formatCurrency(0), /0\.00$/);
});

test("formats plain amounts with exactly two decimal places", () => {
  assert.equal(formatAmount(35), "35.00");
  assert.equal(formatAmount(1234.5), "1,234.50");
});

test("shows a placeholder for missing or invalid amounts", () => {
  assert.equal(formatCurrency(null), "—");
  assert.equal(formatCurrency("invalid"), "—");
  assert.equal(formatAmount(undefined), "—");
});
