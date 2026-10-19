export function getRateForPurity(rateSet, purity, metalType = "Gold") {
  const text = String(purity || "").toLowerCase();
  const purityValue = text.match(/\d{3}/)?.[0] || ({
    "24k": "999", "22k": "916", "20k": "833", "18k": "750", "14k": "585"
  })[text.match(/\d{2}k/)?.[0]];
  return rateSet?.rates?.find((rate) => (
    rate.metal_type.toLowerCase() === metalType.toLowerCase() && rate.purity === purityValue
  )) || null;
}

export function formatRateDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? String(value).slice(0, 10)
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
