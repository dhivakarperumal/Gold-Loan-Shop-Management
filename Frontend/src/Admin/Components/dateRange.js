export const DATE_RANGE_OPTIONS = [
  ["all", "All Time"],
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["this_week", "This Week"],
  ["last_week", "Last Week"],
  ["this_month", "This Month"],
  ["last_month", "Last Month"],
  ["this_year", "This Year"],
  ["last_year", "Last Year"],
  ["custom", "Custom Date Range"]
];

function dateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDays(date, days) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

export function resolveDatePreset(preset, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekday = (today.getDay() + 6) % 7;
  const ranges = {
    all: null,
    today: [today, today],
    yesterday: [shiftDays(today, -1), shiftDays(today, -1)],
    this_week: [shiftDays(today, -weekday), shiftDays(today, 6 - weekday)],
    last_week: [shiftDays(today, -weekday - 7), shiftDays(today, -weekday - 1)],
    this_month: [new Date(today.getFullYear(), today.getMonth(), 1), new Date(today.getFullYear(), today.getMonth() + 1, 0)],
    last_month: [new Date(today.getFullYear(), today.getMonth() - 1, 1), new Date(today.getFullYear(), today.getMonth(), 0)],
    this_year: [new Date(today.getFullYear(), 0, 1), new Date(today.getFullYear(), 11, 31)],
    last_year: [new Date(today.getFullYear() - 1, 0, 1), new Date(today.getFullYear() - 1, 11, 31)]
  };
  const range = ranges[preset];
  if (!range) return { preset: "all", startDate: "", endDate: "" };
  return { preset, startDate: dateString(range[0]), endDate: dateString(range[1]) };
}

export function formatDateRange(range) {
  if (!range?.startDate || !range?.endDate) return "";
  return `${range.startDate} – ${range.endDate}`;
}
