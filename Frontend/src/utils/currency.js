const inrCurrencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const inrWholeCurrencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const inrAmountFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function numericValue(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function formatCurrency(value) {
  const number = numericValue(value);
  return number == null ? "—" : inrCurrencyFormatter.format(Math.round(number));
}

export function formatCurrencyRounded(value) {
  const number = numericValue(value);
  return number == null ? "—" : inrWholeCurrencyFormatter.format(Math.round(number));
}

export function formatAmount(value) {
  const number = numericValue(value);
  return number == null ? "—" : inrAmountFormatter.format(number);
}
