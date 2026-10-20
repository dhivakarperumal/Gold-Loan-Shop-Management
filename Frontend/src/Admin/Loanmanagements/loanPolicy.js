function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addMonthsToLoanDate(value, months) {
  const [year, month, day] = String(value || "").slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "";
  const monthIndex = year * 12 + month - 1 + months;
  const targetYear = Math.floor(monthIndex / 12);
  const targetMonth = monthIndex % 12 + 1;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  return `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

export function loanReviewDate(loan) {
  return addMonthsToLoanDate(loan.loan_date, 15);
}

export function isLoanReviewDue(loan, today = new Date()) {
  const todayKey = dateKey(today);
  const reviewDate = loanReviewDate(loan);
  const maturityDate = String(loan.maturity_date || "").slice(0, 10);
  return ["active", "suspended"].includes(String(loan.loan_status || "").toLowerCase())
    && loan.release_status !== "Released"
    && Number(loan.outstanding_principal ?? loan.principal_amount) > 0
    && maturityDate < todayKey
    && Boolean(reviewDate)
    && reviewDate <= todayKey;
}
