import assert from "node:assert/strict";
import test from "node:test";
import { resolveDatePreset } from "../src/Admin/Components/dateRange.js";

test("resolves today and yesterday using local calendar dates", () => {
  const now = new Date(2026, 9, 20, 23, 45);
  assert.deepEqual(resolveDatePreset("today", now), {
    preset: "today", startDate: "2026-10-20", endDate: "2026-10-20"
  });
  assert.deepEqual(resolveDatePreset("yesterday", now), {
    preset: "yesterday", startDate: "2026-10-19", endDate: "2026-10-19"
  });
});

test("resolves Monday-to-Sunday current and previous weeks", () => {
  const now = new Date(2026, 9, 20);
  assert.deepEqual(resolveDatePreset("this_week", now), {
    preset: "this_week", startDate: "2026-10-19", endDate: "2026-10-25"
  });
  assert.deepEqual(resolveDatePreset("last_week", now), {
    preset: "last_week", startDate: "2026-10-12", endDate: "2026-10-18"
  });
});

test("handles month transitions and leap-year February", () => {
  const now = new Date(2024, 2, 1);
  assert.deepEqual(resolveDatePreset("this_month", now), {
    preset: "this_month", startDate: "2024-03-01", endDate: "2024-03-31"
  });
  assert.deepEqual(resolveDatePreset("last_month", now), {
    preset: "last_month", startDate: "2024-02-01", endDate: "2024-02-29"
  });
});

test("resolves year boundaries and all-time correctly", () => {
  const now = new Date(2025, 0, 1);
  assert.deepEqual(resolveDatePreset("this_year", now), {
    preset: "this_year", startDate: "2025-01-01", endDate: "2025-12-31"
  });
  assert.deepEqual(resolveDatePreset("last_year", now), {
    preset: "last_year", startDate: "2024-01-01", endDate: "2024-12-31"
  });
  assert.deepEqual(resolveDatePreset("all", now), {
    preset: "all", startDate: "", endDate: ""
  });
});
