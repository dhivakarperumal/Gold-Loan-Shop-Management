import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiActivity, FiAlertCircle, FiBarChart2, FiCalendar, FiDownload, FiPrinter, FiRefreshCw, FiSearch, FiTrendingUp } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../api";

const PAGE_SIZE = 10;
const PERIODS = [
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["week", "This Week"],
  ["month", "This Month"],
  ["year", "This Year"],
  ["custom", "Custom Range"]
];
const EMPTY_REPORT = {
  summary: {},
  salesTrend: [],
  categoryPerformance: [],
  topProducts: [],
  paymentBreakdown: [],
  inventory: { goldByPurity: [], lowStock: [] },
  loans: {},
  currentRates: [],
  rateHistory: [],
  employees: [],
  categories: [],
  statuses: [],
  rows: []
};

const formatCurrency = (value) => value == null
  ? "Not tracked"
  : `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const formatNumber = (value, digits = 2) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: digits });
const formatDate = (value) => value
  ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  : "—";
const formatDateTime = (value) => value
  ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
  : "—";
const csvCell = (value) => {
  let text = String(value ?? "");
  if (/^[\t\r=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};
const currentTime = () => new Date();
const purityName = (metal, purity) => metal === "Gold"
  ? ({ "999": "24K", "916": "22K", "833": "20K", "750": "18K", "585": "14K" })[String(purity)] || purity
  : purity;
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;"
})[character]);

function SummaryCard({ title, value, note, icon: Icon, tone = "green", unavailable = false }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    blue: "bg-sky-50 text-sky-700 ring-sky-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    rose: "bg-rose-50 text-rose-700 ring-rose-100",
    teal: "bg-teal-50 text-teal-700 ring-teal-100"
  };
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md sm:p-5">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-300 opacity-0 transition group-hover:opacity-100" />
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500">{title}</p>
          <p className={`mt-2 truncate text-xl font-black tracking-tight sm:text-2xl ${unavailable ? "text-slate-400" : "text-slate-900"}`}>{value}</p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-400">{note}</p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg ring-1 ${tones[tone] || tones.green}`}><Icon /></span>
      </div>
    </article>
  );
}

function EmptyState({ children = "No data available for the selected filters." }) {
  return <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">{children}</p>;
}

const Reports = () => {
  const [period, setPeriod] = useState("month");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [sortDirection, setSortDirection] = useState("desc");
  const [page, setPage] = useState(1);
  const [report, setReport] = useState(EMPTY_REPORT);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [printGeneratedAt, setPrintGeneratedAt] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const requestController = useRef(null);

  const loadReports = useCallback(async (quiet = false, signal) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const params = { period };
      if (period === "custom") {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      if (category) params.category = category;
      if (employeeId) params.employeeId = employeeId;
      if (paymentType) params.paymentType = paymentType;
      if (status) params.status = status;
      const response = await api.get("/reports", { params, signal });
      if (signal?.aborted) return;
      if (!response.data || !Array.isArray(response.data.rows)) {
        throw new Error("The server returned an invalid report payload.");
      }
      setReport({ ...EMPTY_REPORT, ...response.data });
      setLastUpdated(new Date());
    } catch (requestError) {
      if (requestError.code === "ERR_CANCELED") return;
      const message = requestError.response?.data?.message || requestError.message || "Could not load reports.";
      setError(message);
      console.error("Failed to load reports:", requestError);
      if (quiet) toast.error(message);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [period, startDate, endDate, category, employeeId, paymentType, status]);

  const refreshReports = useCallback((quiet = true) => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    void loadReports(quiet, controller.signal);
  }, [loadReports]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => refreshReports(false), 0);
    const timer = window.setInterval(() => refreshReports(true), 60000);
    return () => {
      requestController.current?.abort();
      window.clearTimeout(initialRefresh);
      window.clearInterval(timer);
    };
  }, [refreshReports]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...report.rows]
      .filter((row) => !query || [
        row.transactionId, row.customerName, row.reportCategory, row.description,
        row.paymentMethod, row.status, row.employeeName
      ].some((value) => String(value || "").toLowerCase().includes(query)))
      .sort((first, second) => (
        new Date(first.date) - new Date(second.date)
      ) * (sortDirection === "asc" ? 1 : -1));
  }, [report.rows, search, sortDirection]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const exportCsv = (rowsToExport = filteredRows) => {
    if (!rowsToExport.length) {
      toast.error("There are no report rows to export.");
      return;
    }
    const summaryRows = rowsToExport === filteredRows ? [
      ["Total Sales", summary.totalSales ?? "Not tracked", "Total Purchases", summary.totalPurchases ?? "Not tracked"],
      ["Gross Profit", summary.grossProfit ?? "Not tracked", "Expenses", summary.totalExpenses ?? "Not tracked"],
      ["GST recorded", summary.gstCollected ?? "Not tracked"]
    ] : [];
    const csv = [
      ["Sri Gold Shop - Real-Time Reports"],
      [`Date range: ${report.period?.startDate || ""} to ${report.period?.endDate || ""}`],
      [`Generated: ${currentTime().toLocaleString("en-IN")}`],
      ...summaryRows,
      ["Transaction ID", "Date", "Customer / Supplier", "Report Category", "Description", "Weight (g)", "Amount", "Payment Type", "Status"],
      ...rowsToExport.map((row) => [
        row.transactionId, row.date, row.customerName, row.reportCategory, row.description,
        row.weightGrams ?? "", row.amount, row.paymentMethod, row.status
      ])
    ].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sri-gold-reports-${report.period?.startDate || "report"}-${report.period?.endDate || ""}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const printTransaction = (row) => {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      toast.error("Allow pop-ups to print this report row.");
      return;
    }
    const details = [
      ["Transaction ID", row.transactionId],
      ["Date & Time", formatDateTime(row.date)],
      ["Customer / Supplier", row.customerName],
      ["Report Category", row.reportCategory],
      ["Description", row.description],
      ["Weight (g)", row.weightGrams == null ? "—" : formatNumber(row.weightGrams, 3)],
      ["Amount", formatCurrency(row.amount)],
      ["Payment Type", row.paymentMethod],
      ["Status", row.status]
    ];
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html><head><title>Report ${escapeHtml(row.transactionId)}</title><style>body{font:14px Arial,sans-serif;color:#1e293b;margin:32px}h1{color:#15803d}table{border-collapse:collapse;width:100%}td{border-bottom:1px solid #e2e8f0;padding:10px}td:first-child{font-weight:bold;width:32%}</style></head><body><h1>Sri Gold Shop · Report Transaction</h1><p>Generated ${escapeHtml(currentTime().toLocaleString("en-IN"))}</p><table>${details.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join("")}</table></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 100);
  };

  const printReport = () => {
    setPrintGeneratedAt(currentTime());
    window.setTimeout(() => window.print(), 100);
  };
  const summary = report.summary || {};
  const comparisonNote = (value) => value == null
    ? "No prior-period baseline"
    : `${value > 0 ? "+" : ""}${value}% vs previous period`;

  const cards = [
    { title: "Total Sales", value: formatCurrency(summary.totalSales), note: comparisonNote(summary.previousPeriod?.salesChangePercent), icon: FiTrendingUp, tone: "green" },
    { title: "Total Purchases", value: formatCurrency(summary.totalPurchases), note: comparisonNote(summary.previousPeriod?.purchasesChangePercent), icon: FiDownload, tone: "amber" },
    { title: "Gross Profit", value: formatCurrency(summary.grossProfit), note: "Requires linked product cost records", icon: FiBarChart2, tone: "blue", unavailable: true },
    { title: "Total Expenses", value: formatCurrency(summary.totalExpenses), note: "Expense records are not configured", icon: FiActivity, tone: "rose", unavailable: true },
    { title: "Payments Received", value: formatCurrency(summary.paymentsReceived), note: "No payment ledger is configured", icon: FiDownload, tone: "violet", unavailable: true },
    { title: "Customer Dues", value: formatCurrency(summary.outstandingCustomerDues), note: "Customer credit balances are not recorded", icon: FiActivity, tone: "teal", unavailable: true },
    { title: "Gold Stock Available", value: `${formatNumber(summary.availableGoldGrams, 3)} g`, note: "Active catalog quantity × net gold weight", icon: FiBarChart2, tone: "amber" },
    { title: "Active Gold Loans", value: formatNumber(summary.activeGoldLoans, 0), note: `${formatCurrency(summary.activeLoanPrincipal)} principal on active loans`, icon: FiActivity, tone: "green" }
  ];

  const filterClass = "min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#15803D] focus:ring-2 focus:ring-emerald-100";

  return (
    <main className="mx-auto max-w-[1600px] space-y-5 bg-[#F8FAFC] pb-8 text-slate-800">
      <style>{`@media print { @page { size: landscape; margin: 12mm; } tr { break-inside: avoid; } } @page { @bottom-right { content: "Page " counter(page); font-size: 9px; color: #64748b; } }`}</style>
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-slate-400">
            <span>Home</span><span aria-hidden="true">›</span><span className="text-emerald-700">Reports</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Real-Time Reports</h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${error ? "bg-rose-500" : "animate-pulse bg-emerald-500"}`} />
              {error ? "Refresh unavailable" : "Live"}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-slate-500">Monitor sales, inventory, payments, and gold loan performance.</p>
          <p className="mt-2 text-[11px] text-slate-400">Last updated: {lastUpdated ? formatDateTime(lastUpdated) : "Waiting for first refresh"}{printGeneratedAt && <span className="hidden print:inline"> · Generated: {formatDateTime(printGeneratedAt)}</span>}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <label className="relative">
            <span className="sr-only">Report period</span>
            <FiCalendar aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select aria-label="Date period" className={`${filterClass} h-10 pl-9 pr-8`} value={period} onChange={(event) => setPeriod(event.target.value)}>
              {PERIODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => refreshReports(true)} disabled={refreshing} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-emerald-200 hover:text-emerald-800 disabled:opacity-60">
            <FiRefreshCw className={refreshing ? "animate-spin" : ""} /> Refresh
          </button>
          <button type="button" onClick={exportCsv} disabled={loading || !filteredRows.length} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#15803D] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#166534] disabled:opacity-60">
            <FiDownload /> Export Reports
          </button>
          <button type="button" onClick={printReport} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50">
            <FiPrinter /> Print / PDF
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 print:hidden">
          <span className="inline-flex items-center gap-2"><FiAlertCircle /> {error}</span>
          <button type="button" onClick={() => refreshReports(true)} className="font-bold underline">Try again</button>
        </div>
      )}

      <section aria-label="Report filters" className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.035)] print:hidden">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-600"><FiCalendar className="text-[#15803D]" /> Report Filters</div>
          <span className="text-[11px] text-slate-400">{report.period ? `${formatDate(report.period.startDate)} – ${formatDate(report.period.endDate)}` : "Selected range"} · refreshes every 60 seconds</span>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {period === "custom" ? (
            <>
              <label className="text-xs font-semibold text-slate-500">Start Date<input type="date" className={`${filterClass} mt-1 block w-full`} value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} /></label>
              <label className="text-xs font-semibold text-slate-500">End Date<input type="date" className={`${filterClass} mt-1 block w-full`} value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} /></label>
            </>
          ) : (
            <div className="flex min-h-10 items-center rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Date range: {report.period ? `${formatDate(report.period.startDate)} – ${formatDate(report.period.endDate)}` : "Loading"}
            </div>
          )}
          <select aria-label="Product category" className={filterClass} value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All Product Categories</option>
            {report.categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select aria-label="Employee" className={filterClass} value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
            <option value="">All Employees</option>
            {report.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
          </select>
          <select aria-label="Payment method" className={filterClass} value={paymentType} onChange={(event) => setPaymentType(event.target.value)}>
            <option value="">All Payment Methods</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CHEQUE">Cheque</option>
            <option value="OTHER">Other</option>
            <option value="UNSPECIFIED">Not specified</option>
          </select>
          <select aria-label="Transaction status" className={filterClass} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All Transaction Statuses</option>
            {report.statuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
          </select>
          <div title="Branch data is not currently stored in the system" className={`${filterClass} flex cursor-not-allowed items-center text-slate-400`}>All Branches · branch data unavailable</div>
        </div>
      </section>

      <section aria-label="Summary metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:gap-4">
        {loading && !lastUpdated
          ? Array.from({ length: 8 }, (_, index) => <div key={index} className="h-[112px] animate-pulse rounded-2xl border border-slate-100 bg-white shadow-sm" />)
          : cards.map((card) => <SummaryCard key={card.title} {...card} />)}
      </section>

      <div className="grid gap-4 xl:grid-cols-5">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.035)] sm:p-5 xl:col-span-3">
          <div className="mb-4 flex items-start justify-between"><div><h2 className="font-extrabold text-slate-900">Sales Trend</h2><p className="mt-1 text-xs text-slate-500">Recorded bill totals by {report.salesTrendGranularity || "day"}</p></div><FiBarChart2 className="text-xl text-[#15803D]" /></div>
          {report.salesTrend.length ? (
            <div className="flex h-52 items-end gap-1 overflow-x-auto border-b border-slate-100 pb-1">
              {report.salesTrend.map((item) => {
                const max = Math.max(...report.salesTrend.map((point) => point.sales), 1);
                const label = report.salesTrendGranularity === "year" ? item.date.slice(0, 4)
                  : report.salesTrendGranularity === "month" ? item.date.slice(0, 7)
                    : item.date.slice(5);
                return <div key={item.date} title={`${item.date}: ${formatCurrency(item.sales)} · ${item.transactions} bills · ${formatNumber(item.goldGrams, 3)} g`} className="group flex h-full min-w-4 flex-1 flex-col justify-end">
                  <div className="w-full rounded-t bg-[#15803D] transition group-hover:bg-emerald-500" style={{ height: `${Math.max(2, item.sales / max * 100)}%` }} />
                  <span className="mt-2 text-center text-[9px] text-slate-400">{label}</span>
                </div>;
              })}
            </div>
          ) : <EmptyState />}
          <p className="mt-3 text-xs text-slate-500">Net gold recorded sold: {formatNumber(summary.soldNetGoldGrams, 3)} g. Sales amount and transaction count are available in each bar’s tooltip.</p>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.035)] sm:p-5 xl:col-span-2">
          <h2 className="font-extrabold text-slate-900">Category-wise Sales</h2>
          <p className="mb-4 mt-1 text-xs text-slate-500">Product line totals before bill-level adjustments</p>
          {report.categoryPerformance.length ? (
            <div className="space-y-4">
              {report.categoryPerformance.slice(0, 8).map((item) => {
                const max = Math.max(...report.categoryPerformance.map((value) => value.amount), 1);
                return <div key={item.category}>
                  <div className="mb-1 flex justify-between gap-2 text-xs"><span className="truncate font-semibold text-slate-600">{item.category}</span><span className="font-bold text-slate-800">{formatCurrency(item.amount)}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-emerald-50"><div className="h-full rounded-full bg-[#15803D]" style={{ width: `${Math.max(1, item.amount / max * 100)}%` }} /></div>
                </div>;
              })}
            </div>
          ) : <EmptyState />}
          <h3 className="mb-3 mt-6 text-sm font-bold text-slate-800">Sales by Payment Method</h3>
          <p className="mb-3 text-xs text-slate-500">Based on payment method recorded on each bill.</p>
          {report.paymentBreakdown.length ? <div className="space-y-3">{report.paymentBreakdown.map((item) => {
            const max = Math.max(...report.paymentBreakdown.map((value) => value.amount), 1);
            return <div key={item.method}><div className="mb-1 flex justify-between text-xs"><span>{item.method}</span><strong>{formatCurrency(item.amount)}</strong></div><div className="h-2 overflow-hidden rounded-full bg-emerald-50"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.max(1, item.amount / max * 100)}%` }} /></div></div>;
          })}</div> : <EmptyState />}
          <p className="mt-4 text-xs text-slate-500">GST recorded on matching bills: <strong className="text-slate-700">{formatCurrency(summary.gstCollected)}</strong></p>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.035)] sm:p-5 xl:col-span-2">
          <h2 className="font-extrabold text-slate-900">Gold Inventory by Purity</h2>
          <p className="mb-4 mt-1 text-xs text-slate-500">Current active catalog stock × per-item weights; not a stock movement ledger</p>
          {report.inventory.goldByPurity.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-xs">
                <thead className="border-b border-slate-100 text-[10px] uppercase text-slate-400"><tr><th className="py-2">Purity</th><th className="py-2 text-right">Available units</th><th className="py-2 text-right">Gross grams</th><th className="py-2 text-right">Net gold grams</th><th className="py-2 text-right">Stone grams</th></tr></thead>
                <tbody className="divide-y divide-slate-50">{report.inventory.goldByPurity.map((row) => <tr key={row.purity}><td className="py-3 font-bold text-slate-700">{row.purity}</td><td className="py-3 text-right">{formatNumber(row.units, 0)}</td><td className="py-3 text-right">{formatNumber(row.grossGrams, 3)}</td><td className="py-3 text-right font-semibold text-[#15803D]">{formatNumber(row.netGoldGrams, 3)}</td><td className="py-3 text-right">{formatNumber(row.stoneGrams, 3)}</td></tr>)}</tbody>
              </table>
            </div>
          ) : <EmptyState />}
        </section>
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.035)] sm:p-5">
          <h2 className="font-extrabold text-slate-900">Low Stock Alerts</h2>
          <p className="mb-4 mt-1 text-xs text-slate-500">Active products with fewer than 10 units</p>
          {report.inventory.lowStock.length ? <ul className="max-h-64 space-y-2 overflow-auto">{report.inventory.lowStock.map((item) => <li key={item.name} className="flex justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2 text-xs"><span className="truncate font-semibold text-slate-700">{item.name}<span className="block text-[10px] text-slate-400">{item.category}</span></span><strong className="shrink-0 text-amber-800">{item.quantity} left</strong></li>)}</ul> : <EmptyState>No low-stock products.</EmptyState>}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.035)] sm:p-5">
          <h2 className="font-extrabold text-slate-900">Current Daily Gold Rates</h2>
          <p className="mb-4 mt-1 text-xs text-slate-500">Active rate set used by the system</p>
          {report.currentRates.length ? <div className="grid gap-2 sm:grid-cols-2">{report.currentRates.map((rate) => <div key={`${rate.metal_type}-${rate.purity}`} className="flex justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs"><span className="font-semibold text-slate-600">{rate.metal_type} · {purityName(rate.metal_type, rate.purity)}{purityName(rate.metal_type, rate.purity) !== rate.purity ? ` / ${rate.purity}` : ""}</span><strong className="text-[#15803D]">{formatCurrency(rate.rate_per_unit ?? rate.rate_per_gram)} / {rate.rate_unit || "gram"}</strong></div>)}</div> : <EmptyState>No active rate set.</EmptyState>}
          <h3 className="mb-2 mt-5 text-sm font-bold text-slate-700">Recent Rate Changes</h3>
          {report.rateHistory.length ? <ul className="max-h-52 divide-y divide-slate-100 overflow-auto">{report.rateHistory.slice(0, 8).map((item) => {
            const change = item.previous_rate > 0 ? ((item.new_rate - item.previous_rate) / item.previous_rate * 100).toFixed(1) : null;
            return <li key={item.id} className="flex flex-wrap justify-between gap-2 py-2 text-xs"><span>{item.metal_type} {purityName(item.metal_type, item.purity)} · {formatDateTime(item.changed_at)} · {item.employee_name || "Admin"}</span><strong>{formatCurrency(item.previous_rate)} → {formatCurrency(item.new_rate)}{change == null ? "" : ` (${change > 0 ? "+" : ""}${change}%)`}</strong></li>;
          })}</ul> : <EmptyState>No rate updates in this period.</EmptyState>}
        </section>
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.035)] sm:p-5">
          <h2 className="font-extrabold text-slate-900">Top-Selling Products</h2>
          <p className="mb-4 mt-1 text-xs text-slate-500">Ranked by recorded product line value</p>
          {report.topProducts.length ? <ol className="space-y-2">{report.topProducts.map((item, index) => <li key={item.name} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#DCFCE7] font-black text-[#15803D]">{index + 1}</span><span className="min-w-0 flex-1 truncate font-semibold text-slate-700">{item.name}</span><strong>{formatCurrency(item.amount)}</strong></li>)}</ol> : <EmptyState />}
          <h3 className="mb-2 mt-5 text-sm font-bold text-slate-700">Loan Snapshot</h3>
          <p className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">{formatNumber(report.loans.activeCount, 0)} active gold loans · {formatCurrency(report.loans.activePrincipal)} principal recorded on active loans. Estimated configured interest to maturity: {formatCurrency(report.loans.estimatedAccruedInterest)} as of {formatDate(report.loans.estimatedAsOf)}. Actual repayments, interest collections, and late-interest postings are not recorded.</p>
          {report.loans.statusBreakdown?.length > 0 && <ul className="mt-3 flex flex-wrap gap-2">{report.loans.statusBreakdown.map((item) => <li key={item.status} className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800">{item.status}: {item.count}</li>)}</ul>}
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.035)] print:break-before-page">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-extrabold text-slate-900">Report Transactions</h2><p className="mt-1 text-xs text-slate-500">Sales, supplier documents, and loan disbursements recorded in the selected period.</p></div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <label className="relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-[#15803D]" placeholder="Search transactions" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
            <button type="button" onClick={() => setSortDirection((value) => value === "desc" ? "asc" : "desc")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Date {sortDirection === "desc" ? "↓" : "↑"}</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-xs">
            <thead className="bg-gradient-to-r from-[#07564B] via-[#064A41] to-[#043D37] text-[10px] uppercase text-white"><tr><th className="px-4 py-3">Transaction ID</th><th className="px-4 py-3">Date & Time</th><th className="px-4 py-3">Customer / Supplier</th><th className="px-4 py-3">Report Category</th><th className="px-4 py-3">Description</th><th className="px-4 py-3 text-right">Weight (g)</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Payment Method</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 print:hidden">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100 print:hidden">
              {loading && !lastUpdated ? Array.from({ length: 5 }, (_, index) => <tr key={index}><td colSpan="10" className="px-4 py-4"><div className="h-5 animate-pulse rounded bg-slate-100" /></td></tr>)
                : visibleRows.map((row) => <tr key={`${row.source}-${row.transactionId}`} className="hover:bg-emerald-50/30">
                  <td className="px-4 py-3 font-bold text-slate-700">{row.transactionId}</td><td className="px-4 py-3 whitespace-nowrap text-slate-500">{formatDateTime(row.date)}</td><td className="px-4 py-3">{row.customerName}</td><td className="px-4 py-3">{row.reportCategory}</td><td className="max-w-64 truncate px-4 py-3" title={row.description}>{row.description}</td><td className="px-4 py-3 text-right">{row.weightGrams == null ? "—" : formatNumber(row.weightGrams, 3)}</td><td className="px-4 py-3 text-right font-bold">{formatCurrency(row.amount)}</td><td className="px-4 py-3">{row.paymentMethod}</td><td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">{String(row.status).replaceAll("_", " ")}</span></td><td className="px-4 py-3 print:hidden"><div className="flex items-center gap-2"><button type="button" onClick={() => setSelectedRow(row)} className="font-bold text-[#15803D] hover:underline">View</button><button type="button" onClick={() => printTransaction(row)} className="font-bold text-slate-600 hover:underline">Print</button><button type="button" onClick={() => exportCsv([row])} className="font-bold text-slate-600 hover:underline">Export</button></div></td>
                </tr>)}
              {!loading && visibleRows.length === 0 && <tr><td colSpan="10" className="px-4 py-10 text-center text-slate-400">No data available for the selected filters.</td></tr>}
            </tbody>
            <tbody className="hidden divide-y divide-slate-100 print:table-row-group">{filteredRows.map((row) => <tr key={`print-${row.source}-${row.transactionId}`}><td className="px-4 py-2">{row.transactionId}</td><td className="px-4 py-2">{formatDateTime(row.date)}</td><td className="px-4 py-2">{row.customerName}</td><td className="px-4 py-2">{row.reportCategory}</td><td className="px-4 py-2">{row.description}</td><td className="px-4 py-2 text-right">{row.weightGrams == null ? "—" : formatNumber(row.weightGrams, 3)}</td><td className="px-4 py-2 text-right">{formatCurrency(row.amount)}</td><td className="px-4 py-2">{row.paymentMethod}</td><td className="px-4 py-2">{row.status}</td><td className="print:hidden" /></tr>)}</tbody>
          </table>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 print:hidden">
          <span>Showing {filteredRows.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filteredRows.length)} of {filteredRows.length} records</span>
          <div className="flex items-center gap-2"><button type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => value - 1)} className="rounded border px-3 py-1.5 disabled:opacity-40">Previous</button><span>Page {currentPage} / {pageCount}</span><button type="button" disabled={currentPage >= pageCount} onClick={() => setPage((value) => value + 1)} className="rounded border px-3 py-1.5 disabled:opacity-40">Next</button></div>
        </footer>
      </section>

      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
        Coverage note: the current database has no expense, customer payment/refund, billing status, branch, loan repayment/interest ledger, or product-linked purchase cost records. These values are marked “Not tracked”; loan principal is not treated as revenue. Sales totals use saved bill totals; purchase totals include supplier invoices and old-gold documents. Inventory grams are catalog estimates, not movement reconciliation.
      </p>

      {selectedRow && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 print:hidden" role="presentation" onClick={() => setSelectedRow(null)}>
        <section role="dialog" aria-modal="true" aria-label="Report transaction details" onClick={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-black">Transaction Details</h2><button type="button" onClick={() => setSelectedRow(null)} className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100">Close</button></div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">{[
            ["Transaction ID", selectedRow.transactionId], ["Date", formatDateTime(selectedRow.date)],
            ["Customer / Supplier", selectedRow.customerName], ["Category", selectedRow.reportCategory],
            ["Description", selectedRow.description], ["Weight", selectedRow.weightGrams == null ? "—" : `${formatNumber(selectedRow.weightGrams, 3)} g`],
            ["Amount", formatCurrency(selectedRow.amount)], ["Payment Type", selectedRow.paymentMethod], ["Status", selectedRow.status]
          ].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-1 break-words font-semibold text-slate-700">{value}</dd></div>)}</dl>
        </section>
      </div>}
    </main>
  );
};

export default Reports;
