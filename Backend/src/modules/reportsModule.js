const { pool } = require('../config/db');
const { getCurrentGoldRates } = require('./goldRateModule');

function parseJson(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function paymentMethodName(method) {
  return ({
    CASH: 'Cash',
    UPI: 'UPI',
    CARD: 'Card',
    BANK_TRANSFER: 'Bank Transfer',
    CHEQUE: 'Cheque',
    OTHER: 'Other',
    UNSPECIFIED: 'Not specified'
  })[method] || 'Not specified';
}

function dateOnly(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function bucketDate(date, granularity) {
  if (granularity === 'year') return `${date.slice(0, 4)}-01-01`;
  if (granularity === 'month') return `${date.slice(0, 7)}-01`;
  if (granularity === 'week') {
    const weekStart = new Date(`${date}T00:00:00.000Z`);
    weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
    return weekStart.toISOString().slice(0, 10);
  }
  return date;
}

function dateBounds(period, start, end, now = new Date()) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const format = (date) => date.toISOString().slice(0, 10);
  if (period === 'custom') return { startDate: start, endDate: end };
  let first = new Date(today);
  let last = new Date(today);
  if (period === 'yesterday') {
    first.setUTCDate(first.getUTCDate() - 1);
    last = new Date(first);
  } else if (period === 'week') {
    first.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 6) % 7));
  } else if (period === 'year') {
    first = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  } else if (period === 'month') {
    first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  }
  return { startDate: format(first), endDate: format(last) };
}

function money(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

function elapsedDays(from, to, convention) {
  if (!from || !to || to <= from) return 0;
  if (convention === '30_360') {
    const [fromYear, fromMonth, fromDay] = from.split('-').map(Number);
    const [toYear, toMonth, toDay] = to.split('-').map(Number);
    return Math.max(0, (toYear - fromYear) * 360 + (toMonth - fromMonth) * 30
      + Math.min(toDay, 30) - Math.min(fromDay, 30));
  }
  return Math.max(0, (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86400000);
}

function periodCount(days, frequency, convention, customDays) {
  const yearDays = convention === 'actual_365' ? 365 : 360;
  const divisor = {
    daily: 1,
    weekly: 7,
    monthly: yearDays / 12,
    quarterly: yearDays / 4,
    half_yearly: yearDays / 2,
    yearly: yearDays,
    custom_period: Math.max(1, Number(customDays) || 30)
  }[frequency] || yearDays / 12;
  return days / divisor;
}

function estimateConfiguredInterest(loan, asOfDate) {
  const principal = Number(loan.principal_amount);
  const rate = Number(loan.interest_rate);
  const convention = loan.day_count_convention || 'actual_365';
  const startDate = dateOnly(loan.interest_calculation_start_date);
  const accruedThrough = asOfDate < dateOnly(loan.maturity_date) ? asOfDate : dateOnly(loan.maturity_date);
  if (!(principal > 0) || !(rate >= 0) || !startDate || accruedThrough <= startDate) return 0;
  const days = elapsedDays(startDate, accruedThrough, convention);
  const eligibleDays = Math.max(0, days - Number(loan.interest_free_days || 0) - Number(loan.grace_period_days || 0));
  const periods = periodCount(eligibleDays, loan.interest_frequency, convention, loan.custom_period_days);
  let interest = 0;
  if (loan.interest_type === 'compound') {
    const compoundPeriods = periodCount(eligibleDays, loan.compounding_frequency || 'monthly', convention, loan.custom_period_days);
    const ratePerCompoundPeriod = rate / 100 * periods / Math.max(compoundPeriods, Number.EPSILON);
    interest = principal * ((1 + ratePerCompoundPeriod) ** compoundPeriods - 1);
  } else if (loan.interest_type === 'fixed') {
    interest = Number(loan.fixed_interest_amount || 0) * periods;
  } else if (loan.interest_type === 'reducing_balance') {
    const paymentPeriods = loan.payment_frequency === 'bullet'
      ? 1
      : Math.max(1, periodCount(eligibleDays, loan.payment_frequency, convention, loan.custom_period_days));
    const principalPerPeriod = principal / paymentPeriods;
    for (let index = 0; index < paymentPeriods; index += 1) {
      interest += Math.max(0, principal - principalPerPeriod * index) * rate / 100 * (periods / paymentPeriods);
    }
  } else {
    interest = principal * rate / 100 * periods;
  }
  if (Number(loan.minimum_interest_amount) > 0) interest = Math.max(interest, Number(loan.minimum_interest_amount));
  if (Number(loan.maximum_interest_amount) > 0) interest = Math.min(interest, Number(loan.maximum_interest_amount));
  return money(interest);
}

function mapBillRow(bill, filters) {
  const products = parseJson(bill.products);
  const customers = parseJson(bill.customers);
  const matchingProducts = filters.category
    ? products.filter((product) => String(product.category || '').toLowerCase() === filters.category.toLowerCase())
    : products;
  if (filters.category && matchingProducts.length === 0) return null;
  if (filters.paymentType && (bill.payment_method || 'UNSPECIFIED') !== filters.paymentType) return null;
  if (filters.status && filters.status !== 'Recorded') return null;
  const lineSubtotal = matchingProducts.reduce((sum, product) => sum + (Number(product.price) || 0), 0);
  return {
    transactionId: bill.invoice_no,
    date: bill.created_at,
    customerName: customers.map((customer) => customer.name).filter(Boolean).join(', ') || 'Walk-in customer',
    reportCategory: 'Sale',
    description: matchingProducts.map((product) => product.product_name).filter(Boolean).join(', ') || 'Jewellery sale',
    weightGrams: matchingProducts.reduce((sum, product) => sum + (Number(product.net_gold_weight) || 0), 0),
    amount: filters.category ? lineSubtotal : Number(bill.total_amount) || 0,
    gstAmount: Number(bill.gst_amount) || 0,
    paymentMethod: paymentMethodName(bill.payment_method),
    status: 'Recorded',
    category: matchingProducts.map((product) => product.category).filter(Boolean).join(', '),
    source: 'sale'
  };
}

async function getReportsData(filters) {
  const { startDate, endDate } = filters;
  const fromTimestamp = `${startDate} 00:00:00`;
  const toExclusive = `${new Date(Date.parse(`${endDate}T00:00:00.000Z`) + 86400000).toISOString().slice(0, 10)} 00:00:00`;
  const employeeFilter = filters.employeeId ? Number(filters.employeeId) : null;
  const periodLength = (Date.parse(`${endDate}T00:00:00.000Z`) - Date.parse(`${startDate}T00:00:00.000Z`)) / 86400000 + 1;
  const trendGranularity = periodLength <= 31 ? 'day'
    : periodLength <= 120 ? 'week'
      : periodLength <= 1095 ? 'month' : 'year';
  const previousEndDate = new Date(Date.parse(`${startDate}T00:00:00.000Z`) - 86400000).toISOString().slice(0, 10);
  const previousStartDate = new Date(Date.parse(`${startDate}T00:00:00.000Z`) - periodLength * 86400000).toISOString().slice(0, 10);
  const previousFromTimestamp = `${previousStartDate} 00:00:00`;
  const previousToTimestamp = `${new Date(Date.parse(`${previousEndDate}T00:00:00.000Z`) + 86400000).toISOString().slice(0, 10)} 00:00:00`;
  const [billRowsResult, purchaseRowsResult, loanRowsResult, productRowsResult, activeLoansResult, allLoanStatusResult,
    rateHistoryResult, rateBatchResult, employeeRowsResult, previousBillRowsResult, previousPurchaseRowsResult] = await Promise.all([
    pool.execute(
      `SELECT id, invoice_no, customers, products, payment_type, payment_method, total_amount,
        sub_total, discount_amount, gst_amount, created_at
       FROM billings WHERE created_at >= ? AND created_at < ?
       ORDER BY created_at DESC, id DESC`,
      [fromTimestamp, toExclusive]
    ),
    pool.execute(
      `SELECT p.id, p.document_number, p.document_type, p.document_date, p.due_date, p.total,
        p.paid_amount, p.posted_by, d.name AS dealer_name, u.username AS employee_name
       FROM dealer_purchases p
       JOIN dealers d ON d.id = p.dealer_id
       LEFT JOIN users u ON u.user_id = p.posted_by
       WHERE p.document_date >= ? AND p.document_date <= ? ${employeeFilter ? 'AND p.posted_by = ?' : ''}
       ORDER BY p.document_date DESC, p.id DESC`,
      employeeFilter ? [startDate, endDate, employeeFilter] : [startDate, endDate]
    ),
    pool.execute(
      `SELECT l.id, l.loan_number, l.loan_date, l.principal_amount, l.loan_status, l.net_gold_weight,
        l.gold_purity, l.metal_type, l.created_by, c.full_name AS customer_name, u.username AS employee_name
       FROM loans l JOIN loan_customers c ON c.id = l.customer_id
       LEFT JOIN users u ON u.user_id = l.created_by
       WHERE l.loan_date >= ? AND l.loan_date <= ? ${employeeFilter ? 'AND l.created_by = ?' : ''}
       ORDER BY l.loan_date DESC, l.id DESC`,
      employeeFilter ? [startDate, endDate, employeeFilter] : [startDate, endDate]
    ),
    pool.query(
      `SELECT id, product_code, name, category, metal_type, purity, gross_weight, net_gold_weight,
        stone_weight, total_stock, status, gold_rate_per_gram, mrp
       FROM products WHERE status = 'Active' ORDER BY category, name`
    ),
    pool.query(
      `SELECT principal_amount, interest_type, interest_rate, fixed_interest_amount,
        interest_frequency, custom_period_days, interest_calculation_start_date,
        compounding_frequency, day_count_convention, grace_period_days, interest_free_days,
        minimum_interest_amount, maximum_interest_amount, payment_frequency, maturity_date
       FROM loans WHERE loan_status = 'Active' AND metal_type = 'Gold'`
    ),
    pool.query(`SELECT loan_status, COUNT(*) AS count FROM loans
      WHERE metal_type = 'Gold' GROUP BY loan_status`),
    pool.execute(
      `SELECT h.id, h.metal_type, h.purity, h.rate_unit, h.previous_rate, h.new_rate, h.action,
        h.reason, h.changed_at, u.username AS employee_name
       FROM gold_rate_history h LEFT JOIN users u ON u.user_id = h.changed_by
       WHERE h.changed_at >= ? AND h.changed_at < ?
       ORDER BY h.changed_at DESC, h.id DESC LIMIT 100`,
      [fromTimestamp, toExclusive]
    ),
    getCurrentGoldRates(),
    pool.query(`SELECT user_id AS id, username AS name FROM users
      WHERE role IN ('admin', 'manager') AND status = 'Active' ORDER BY username`),
    pool.execute(
      `SELECT id, invoice_no, customers, products, payment_type, payment_method, total_amount,
        sub_total, discount_amount, gst_amount, created_at
       FROM billings WHERE created_at >= ? AND created_at < ?
       ORDER BY created_at DESC, id DESC`,
      [previousFromTimestamp, previousToTimestamp]
    ),
    pool.execute(
      `SELECT document_type, total, posted_by FROM dealer_purchases
       WHERE document_date >= ? AND document_date <= ? ${employeeFilter ? 'AND posted_by = ?' : ''}`,
      employeeFilter
        ? [previousStartDate, previousEndDate, employeeFilter]
        : [previousStartDate, previousEndDate]
    )
  ]);
  const bills = billRowsResult[0];
  const purchases = purchaseRowsResult[0];
  const loans = loanRowsResult[0];
  const products = productRowsResult[0];
  const activeLoans = activeLoansResult[0];
  const allLoanStatuses = allLoanStatusResult[0];
  const rateHistory = rateHistoryResult[0];
  const previousBills = previousBillRowsResult[0];
  const previousPurchases = previousPurchaseRowsResult[0];
  const employees = employeeRowsResult[0].map((employee) => ({ id: Number(employee.id), name: employee.name }));
  const activeLoanPrincipal = activeLoans.reduce((sum, loan) => sum + (Number(loan.principal_amount) || 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const estimatedActiveLoanInterest = activeLoans.reduce(
    (sum, loan) => sum + estimateConfiguredInterest(loan, today),
    0
  );
  const loanStatusBreakdown = allLoanStatuses.map((row) => ({
    status: row.loan_status,
    count: Number(row.count) || 0
  }));

  const filteredBills = (employeeFilter ? [] : bills.map((bill) => mapBillRow(bill, filters))).filter(Boolean);
  const purchaseRecords = (filters.category || filters.paymentType ? [] : purchases)
    .filter((purchase) => !filters.status || purchase.document_type === filters.status)
    .map((purchase) => ({
      transactionId: purchase.document_number,
      date: purchase.document_date,
      customerName: purchase.dealer_name,
      reportCategory: 'Purchase',
      description: `${purchase.document_type.replaceAll('_', ' ')} · ${purchase.dealer_name}`,
      weightGrams: null,
      amount: Number(purchase.total) || 0,
      paymentMethod: 'Supplier account',
      status: purchase.document_type,
      category: '',
      source: 'purchase',
      employeeName: purchase.employee_name || ''
    }));
  const loanRecords = (filters.category || filters.paymentType ? [] : loans)
    .filter((loan) => !filters.status || loan.loan_status === filters.status)
    .map((loan) => ({
      transactionId: loan.loan_number,
      date: loan.loan_date,
      customerName: loan.customer_name,
      reportCategory: 'Loan disbursement',
      description: `${loan.metal_type} ${loan.gold_purity} collateral · ${Number(loan.net_gold_weight || 0)} g`,
      weightGrams: Number(loan.net_gold_weight) || 0,
      amount: Number(loan.principal_amount) || 0,
      paymentMethod: 'Loan principal',
      status: loan.loan_status,
      category: '',
      source: 'loan',
      employeeName: loan.employee_name || ''
    }));
  const rows = [
    ...filteredBills,
    ...purchaseRecords,
    ...loanRecords
  ].sort((first, second) => new Date(second.date) - new Date(first.date));

  const sales = filteredBills.reduce((sum, bill) => sum + bill.amount, 0);
  const gstCollected = filteredBills.reduce((sum, bill) => sum + bill.gstAmount, 0);
  const purchaseTotal = filters.category || filters.paymentType ? 0 : purchases
    .filter((purchase) => (purchase.document_type === 'invoice' || purchase.document_type === 'old_gold')
      && (!filters.status || purchase.document_type === filters.status))
    .reduce((sum, purchase) => sum + (Number(purchase.total) || 0), 0);
  const previousSales = employeeFilter ? 0 : previousBills
    .map((bill) => mapBillRow(bill, filters))
    .filter(Boolean)
    .reduce((sum, bill) => sum + bill.amount, 0);
  const previousPurchaseTotal = filters.category || filters.paymentType ? 0 : previousPurchases
    .filter((purchase) => (purchase.document_type === 'invoice' || purchase.document_type === 'old_gold')
      && (!filters.status || purchase.document_type === filters.status))
    .reduce((sum, purchase) => sum + (Number(purchase.total) || 0), 0);
  const changePercent = (current, previous) => previous > 0
    ? Math.round(((current - previous) / previous) * 1000) / 10
    : null;
  const categoryTotals = new Map();
  const productTotals = new Map();
  const trend = new Map();
  const paymentBreakdown = new Map();
  let soldNetWeight = 0;
  for (const bill of bills) {
    const row = employeeFilter ? null : mapBillRow(bill, filters);
    if (!row) continue;
    const productsOnBill = parseJson(bill.products).filter((product) => (
      !filters.category || String(product.category || '').toLowerCase() === filters.category.toLowerCase()
    ));
    for (const product of productsOnBill) {
      const category = product.category || 'Uncategorized';
      const amount = Number(product.price) || 0;
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount);
      const productName = product.product_name || 'Unnamed product';
      productTotals.set(productName, (productTotals.get(productName) || 0) + amount);
      soldNetWeight += Number(product.net_gold_weight) || 0;
    }
    const day = bucketDate(dateOnly(bill.created_at), trendGranularity);
    const dayStats = trend.get(day) || { date: day, sales: 0, transactions: 0, goldGrams: 0 };
    dayStats.sales += row.amount;
    dayStats.transactions += 1;
    dayStats.goldGrams += productsOnBill.reduce((sum, product) => sum + (Number(product.net_gold_weight) || 0), 0);
    trend.set(day, dayStats);
    const paymentLabel = paymentMethodName(bill.payment_method);
    paymentBreakdown.set(paymentLabel, (paymentBreakdown.get(paymentLabel) || 0) + row.amount);
  }

  const stockByPurity = new Map();
  let availableGoldGrams = 0;
  let lowStockProducts = 0;
  for (const product of products) {
    const stock = Number(product.total_stock) || 0;
    const netWeight = Number(product.net_gold_weight) || 0;
    if (stock < 10) lowStockProducts += 1;
    if (String(product.metal_type || '').toLowerCase() === 'gold') {
      availableGoldGrams += stock * netWeight;
      const purity = product.purity || 'Unspecified';
      const summary = stockByPurity.get(purity) || { purity, units: 0, netGoldGrams: 0, grossGrams: 0, stoneGrams: 0 };
      summary.units += stock;
      summary.netGoldGrams += stock * netWeight;
      summary.grossGrams += stock * (Number(product.gross_weight) || 0);
      summary.stoneGrams += stock * (Number(product.stone_weight) || 0);
      stockByPurity.set(purity, summary);
    }
  }

  return {
    period: { startDate, endDate },
    summary: {
      totalSales: money(sales),
      totalPurchases: money(purchaseTotal),
      previousPeriod: {
        totalSales: money(previousSales),
        totalPurchases: money(previousPurchaseTotal),
        salesChangePercent: changePercent(sales, previousSales),
        purchasesChangePercent: changePercent(purchaseTotal, previousPurchaseTotal),
        startDate: previousStartDate,
        endDate: previousEndDate
      },
      salesTrendGranularity: trendGranularity,
      grossProfit: null,
      totalExpenses: null,
      paymentsReceived: null,
      outstandingCustomerDues: null,
      availableGoldGrams: Math.round(availableGoldGrams * 1000) / 1000,
      activeGoldLoans: activeLoans.length,
      activeLoanPrincipal: money(activeLoanPrincipal),
      estimatedActiveLoanInterest: money(estimatedActiveLoanInterest),
      gstCollected: filters.category ? null : money(gstCollected),
      soldNetGoldGrams: Math.round(soldNetWeight * 1000) / 1000,
      lowStockProducts
    },
    salesTrend: [...trend.values()].sort((a, b) => a.date.localeCompare(b.date)),
    categoryPerformance: [...categoryTotals.entries()].map(([category, amount]) => ({ category, amount: money(amount) })).sort((a, b) => b.amount - a.amount),
    topProducts: [...productTotals.entries()].map(([name, amount]) => ({ name, amount: money(amount) })).sort((a, b) => b.amount - a.amount).slice(0, 10),
    paymentBreakdown: [...paymentBreakdown.entries()].map(([method, amount]) => ({ method, amount: money(amount) })),
    inventory: {
      goldByPurity: [...stockByPurity.values()].map((row) => ({
        ...row,
        netGoldGrams: Math.round(row.netGoldGrams * 1000) / 1000,
        grossGrams: Math.round(row.grossGrams * 1000) / 1000,
        stoneGrams: Math.round(row.stoneGrams * 1000) / 1000
      })).sort((a, b) => a.purity.localeCompare(b.purity)),
      lowStock: products.filter((product) => Number(product.total_stock) < 10)
        .map((product) => ({ name: product.name, category: product.category, quantity: Number(product.total_stock) })),
      stockValuation: null
    },
    loans: {
      activeCount: activeLoans.length,
      activePrincipal: money(activeLoanPrincipal),
      estimatedAccruedInterest: money(estimatedActiveLoanInterest),
      estimatedAsOf: today,
      disbursements: loans.length,
      overdueCount: Number(allLoanStatuses.find((row) => row.loan_status === 'Overdue')?.count) || 0,
      statusBreakdown: loanStatusBreakdown
    },
    currentRates: rateBatchResult?.rates || [],
    rateHistory: rateHistory.map((row) => ({
      ...row,
      previous_rate: row.previous_rate == null ? null : Number(row.previous_rate),
      new_rate: Number(row.new_rate)
    })),
    employees,
    categories: [...new Set([...products.map((product) => product.category), ...categoryTotals.keys()].filter(Boolean))].sort(),
    statuses: [...new Set([...purchases.map((purchase) => purchase.document_type), ...loans.map((loan) => loan.loan_status), 'Recorded'])].sort(),
    rows
  };
}

module.exports = { bucketDate, dateBounds, estimateConfiguredInterest, getReportsData };
