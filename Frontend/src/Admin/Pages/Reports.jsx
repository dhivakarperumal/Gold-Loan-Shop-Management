import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  Gem,
  Package,
  RefreshCw,
  Share2,
  TrendingUp,
  UsersRound,
  Wallet
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api";
import DateRangeFilter from "../Components/DateRangeFilter";
import { DATE_RANGE_OPTIONS, formatDateRange } from "../Components/dateRange";

const RANGE_OPTIONS = DATE_RANGE_OPTIONS.map(([value, label]) => ({ value, label }));

const EMPTY_REVENUE_TRENDS = [];

const STAT_CARDS = [
  {
    id: "total_customers",
    icon: UsersRound,
    cardStyle: "border-[#2C6A55] bg-[#123B32]",
    iconStyle: "bg-[#006D50] text-white",
    accent: "#6EE7B7"
  },
  {
    id: "active_gold_loans",
    icon: Wallet,
    cardStyle: "border-[#8B6D2E] bg-[#3D3019]",
    iconStyle: "bg-gradient-to-br from-[#F7C84B] to-[#B87500] text-white",
    accent: "#FCD36B"
  },
  {
    id: "total_products",
    icon: Package,
    cardStyle: "border-[#546E7A] bg-[#263238]",
    iconStyle: "bg-[#00838F] text-white",
    accent: "#80DEEA"
  },
  {
    id: "gold_stock_value",
    icon: Gem,
    cardStyle: "border-[#9A533D] bg-[#482A24]",
    iconStyle: "bg-gradient-to-br from-[#F7C84B] to-[#B87500] text-white",
    accent: "#FDBA9A"
  }
];

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const escapeXml = (value) => String(value ?? "").replace(/[<>&'"]/g, (character) => ({
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  "'": "&apos;",
  "\"": "&quot;"
})[character]);

function getReportSheets(data, range) {
  const rangeLabel = RANGE_OPTIONS.find((option) => option.value === range)?.label || range;
  return [
    {
      name: "Summary",
      rows: [
        ["Gold Shop Report", rangeLabel],
        ["Metric", "Value", "Details"],
        ...(data.stats || []).map((stat) => [stat.label, stat.value, stat.trend]),
        ["Total loans", data.totalLoansCount ?? 0, "Filtered total"],
        ...Object.entries(data.loanStatusCounts || {}).map(([status, count]) => [`${status} loans`, count, "Filtered count"])
      ]
    },
    {
      name: "Sales Trend",
      rows: [
        ["Period", "Sales (INR)", "Date"],
        ...(data.revenueTrends || []).map((item) => [item.label, Number(item.revenue) || 0, item.date || ""])
      ]
    },
    {
      name: "Loan Activity",
      rows: [
        ["Loan ID", "Customer", "Jewellery", "Amount", "Status", "Date"],
        ...(data.recentLoans || []).map((loan) => [
          loan.id, loan.customer, loan.jewellery, loan.rawAmount ?? loan.amount, loan.status, loan.date
        ])
      ]
    },
    {
      name: "Products",
      rows: [
        ["Product", "Category", "Sales", "Price"],
        ...(data.topProducts || []).map((product) => [product.name, product.cat, product.sales, product.amount])
      ]
    }
  ];
}

function createExcelWorkbook(data, range) {
  const sheets = getReportSheets(data, range).map(({ name, rows }) => {
    const tableRows = rows.map((row) => `<Row>${row.map((value) => {
      const isNumber = typeof value === "number" && Number.isFinite(value);
      return `<Cell><Data ss:Type="${isNumber ? "Number" : "String"}">${escapeXml(value)}</Data></Cell>`;
    }).join("")}</Row>`).join("");
    return `<Worksheet ss:Name="${escapeXml(name)}"><Table>${tableRows}</Table></Worksheet>`;
  }).join("");
  const workbook = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${sheets}
</Workbook>`;
  return new Blob(["\uFEFF", workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
}

function downloadExcel(data, range) {
  const url = URL.createObjectURL(createExcelWorkbook(data, range));
  const link = document.createElement("a");
  link.href = url;
  link.download = `gold-shop-report-${range}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function openPdfReport(data, range) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Allow pop-ups to print or save this report as PDF");
    return;
  }

  const table = (headers, rows) => `
    <table>
      <thead><tr>${headers.map((header) => `<th>${escapeXml(header)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((value) => `<td>${escapeXml(value)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>`;
  const sheets = getReportSheets(data, range);
  const summaryRows = [
    ...(data.stats || []).map((stat) => [stat.label, stat.value, stat.trend]),
    ["Total loans", data.totalLoansCount ?? 0, "Filtered total"],
    ...Object.entries(data.loanStatusCounts || {}).map(([status, count]) => [`${status} loans`, count, "Filtered count"])
  ];
  const rangeLabel = escapeXml(RANGE_OPTIONS.find((option) => option.value === range)?.label || range);
  const content = `
    <header><p>SRI GOLDS · ADMIN REPORT</p><h1>Gold Shop Report</h1><span>${rangeLabel}</span></header>
    <section><h2>Summary</h2>${table(["Metric", "Value", "Details"], summaryRows)}</section>
    <section><h2>Sales trend</h2>${table(sheets[1].rows[0], sheets[1].rows.slice(1))}</section>
    <section><h2>Loan activity</h2>${table(sheets[2].rows[0], sheets[2].rows.slice(1))}</section>
    <section><h2>Products</h2>${table(sheets[3].rows[0], sheets[3].rows.slice(1))}</section>`;
  printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Gold Shop Report</title>
    <style>
      body{font:14px Arial,sans-serif;color:#17211e;margin:32px}
      header{border-bottom:3px solid #006d50;padding-bottom:14px;margin-bottom:24px}
      header p{color:#006d50;font-size:11px;font-weight:bold;letter-spacing:2px}
      h1{margin:6px 0;font-size:26px}header span{color:#64748b}
      section{margin:22px 0;break-inside:avoid}
      h2{font-size:17px;color:#123b32}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th,td{border:1px solid #dbe4df;padding:7px;text-align:left}
      th{background:#edf5f1;color:#123b32}
      @page{size:auto;margin:16mm}
      @media print{body{margin:0}}
    </style></head><body>${content}</body></html>`);
  printWindow.document.close();
  printWindow.addEventListener("afterprint", () => printWindow.close(), { once: true });
  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 300);
}

async function shareReport(data, range) {
  const rangeLabel = RANGE_OPTIONS.find((option) => option.value === range)?.label || range;
  const message = [
    `Gold Shop Report — ${rangeLabel}`,
    ...(data.stats || []).map((stat) => `${stat.label}: ${stat.value}`),
    `Total loans: ${data.totalLoansCount ?? 0}`
  ].join("\n");

  try {
    if (navigator.share) {
      const file = new File([createExcelWorkbook(data, range)], `gold-shop-report-${range}.xls`, {
        type: "application/vnd.ms-excel"
      });
      const shareData = { title: "Gold Shop Report", text: message };
      if (navigator.canShare?.({ files: [file] })) shareData.files = [file];
      await navigator.share(shareData);
      return;
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(message);
      toast.success("Report summary copied. You can share it now.");
      return;
    }
    toast.error("Sharing is not available in this browser");
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("Failed to share report:", error);
      toast.error("Could not share the report");
    }
  }
}

const Reports = () => {
  const [dateRange, setDateRange] = useState({ preset: "all", startDate: "", endDate: "" });
  const [reportsData, setReportsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const fetchReports = async () => {
      setLoading(true);
      setError(false);

      try {
        const response = await api.get("/dashboard", {
          params: {
            datePreset: dateRange.preset,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
          },
          signal: controller.signal
        });
        if (!response.data?.stats) {
          throw new Error("Dashboard API returned no report metrics");
        }
        setReportsData(response.data);
      } catch (fetchError) {
        if (fetchError.name === "CanceledError") return;
        console.error("Failed to load report data:", fetchError);
        setError(true);
        toast.error("Failed to load report data");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchReports();
    return () => controller.abort();
  }, [dateRange, retryKey]);

  const chartValues = reportsData?.revenueTrends || EMPTY_REVENUE_TRENDS;
  const chartMax = Math.max(...chartValues.map((item) => Number(item.revenue) || 0), 1);
  const chartTotal = useMemo(
    () => chartValues.reduce((total, item) => total + (Number(item.revenue) || 0), 0),
    [chartValues]
  );
  const statById = useMemo(
    () => new Map((reportsData?.stats || []).map((stat) => [stat.id, stat])),
    [reportsData]
  );
  const selectedRange = dateRange.preset === "custom"
    ? formatDateRange(dateRange)
    : RANGE_OPTIONS.find((option) => option.value === dateRange.preset)?.label || "All Time";
  const exportRange = dateRange.preset;
  const loans = reportsData?.recentLoans || [];
  const products = reportsData?.topProducts || [];
  const loanStatuses = reportsData?.loanStatusCounts || {};
  const displayedStatuses = ["Active", "Processing", "Pending", "Overdue"];

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Admin insights
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Reports</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Sales trends, customers, inventory and gold loan activity from your dashboard data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter onApply={setDateRange} />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => reportsData && downloadExcel(reportsData, exportRange)}
              disabled={!reportsData || loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
            >
              <FileSpreadsheet size={16} />
              Excel
            </button>
            <button
              type="button"
              onClick={() => reportsData && openPdfReport(reportsData, exportRange)}
              disabled={!reportsData || loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-700 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
            >
              <FileText size={16} />
              PDF
            </button>
            <button
              type="button"
              onClick={() => reportsData && shareReport(reportsData, exportRange)}
              disabled={!reportsData || loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
            >
              <Share2 size={16} />
              Share
            </button>
          </div>
        </div>
      </div>

      {error && !reportsData ? (
        <section className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-slate-800">Reports couldn’t be loaded.</p>
          <p className="mt-1 text-sm text-slate-500">Check your connection and try again.</p>
          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900"
          >
            <RefreshCw size={15} />
            Try again
          </button>
        </section>
      ) : (
        <>
          <section aria-label="Report summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            {STAT_CARDS.map(({ id, icon: Icon, cardStyle, iconStyle, accent }) => {
              const stat = statById.get(id);
              return (
                <article
                  key={id}
                  className={`relative flex min-h-[164px] min-w-0 items-center gap-4 overflow-hidden rounded-2xl border border-l-4 p-4 pr-10 shadow-[0_3px_12px_rgba(30,41,59,0.1)] transition duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-5 sm:pr-11 ${cardStyle}`}
                >
                  <div className={`z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl shadow-md ring-1 ring-white/10 ${iconStyle}`}>
                    <Icon size={22} strokeWidth={2.2} />
                  </div>
                  <div className="relative z-10 min-w-0">
                    <p className="truncate text-xs font-semibold leading-5 text-slate-200">{stat?.label || "Loading metric"}</p>
                    <p className="mt-1 truncate text-2xl font-black leading-tight tracking-tight text-white tabular-nums">
                      {loading && !stat ? "—" : stat?.value || "—"}
                    </p>
                    <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] font-bold leading-4 text-emerald-300">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-current" />
                      <span className="truncate">{stat?.trend || "From dashboard data"}</span>
                    </div>
                    <p className="mt-1 truncate text-[10px] font-medium leading-4 text-slate-300">
                      {selectedRange} · Dashboard report
                    </p>
                  </div>
                  <TrendingUp
                    aria-hidden="true"
                    size={30}
                    strokeWidth={2.5}
                    style={{ color: accent }}
                    className="absolute bottom-3 right-3 opacity-90"
                  />
                </article>
              );
            })}
          </section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5 xl:col-span-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-900">Sales overview</h2>
                  <p className="mt-1 text-xs text-slate-500">{selectedRange} · Values returned by the dashboard API</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Period total</p>
                  <p className="font-bold text-slate-900">{formatCurrency(chartTotal)}</p>
                </div>
              </div>

              {chartValues.length ? (
                <div className="mt-5 overflow-x-auto pb-1">
                  <div className="relative flex h-56 min-w-[560px] items-end gap-2 border-b border-l border-slate-200 px-3 pb-7 pt-3 sm:gap-3">
                    <div className="pointer-events-none absolute inset-x-0 top-3 bottom-7 flex flex-col justify-between">
                      {[0, 1, 2, 3].map((line) => (
                        <div key={line} className="border-t border-dashed border-slate-100" />
                      ))}
                    </div>
                    {chartValues.map((item, index) => {
                      const amount = Number(item.revenue) || 0;
                      const height = Math.max((amount / chartMax) * 100, amount > 0 ? 4 : 0);
                      const labelStep = Math.max(1, Math.ceil(chartValues.length / 8));
                      const showLabel = index % labelStep === 0 || index === chartValues.length - 1;
                      return (
                        <div
                          key={`${item.label}-${index}`}
                          className="relative z-10 flex h-full min-w-0 flex-1 flex-col justify-end"
                          title={`${item.date || item.label}: ${formatCurrency(amount)}`}
                        >
                          <div className="flex h-full items-end">
                            <div
                              className="w-full rounded-t-md bg-gradient-to-t from-emerald-700 to-teal-500 transition-[height] duration-300"
                              style={{ height: `${height}%` }}
                            />
                          </div>
                          {showLabel && (
                            <span className="absolute -bottom-6 left-1/2 w-12 -translate-x-1/2 truncate text-center text-[10px] font-medium text-slate-500">
                              {item.label}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mt-5 flex h-56 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
                  No sales trend data is available for this period.
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5 xl:col-span-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-900">Gold loan report</h2>
                  <p className="mt-1 text-xs text-slate-500">Current loan counts from the dashboard</p>
                </div>
                <div className="rounded-lg bg-amber-50 px-3 py-1.5 text-right">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-amber-800">Total loans</p>
                  <p className="font-bold text-amber-900">{reportsData?.totalLoansCount ?? "—"}</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {displayedStatuses.map((status) => (
                  <div key={status} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3">
                    <span className="text-xs font-medium text-slate-600">{status}</span>
                    <span className="text-sm font-bold text-slate-900">{loanStatuses[status] ?? 0}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-3 text-xs text-emerald-900">
                <BarChart3 size={16} className="shrink-0" />
                <span>Loan status counts reflect the latest dashboard response.</span>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm xl:col-span-3">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
                <div>
                  <h2 className="font-bold text-slate-900">Recent loan activity</h2>
                  <p className="mt-1 text-xs text-slate-500">Latest loan records in the dashboard response</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{loans.length} records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold sm:px-5">Loan ID</th>
                      <th className="px-4 py-3 font-semibold">Customer</th>
                      <th className="px-4 py-3 font-semibold">Jewellery</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loans.map((loan, index) => (
                      <tr key={loan.rawId || loan.id || index} className="text-slate-700">
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800 sm:px-5">{loan.id || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3">{loan.customer || "—"}</td>
                        <td className="px-4 py-3">{loan.jewellery || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold">{loan.amount || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800">{loan.status || "—"}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">{loan.date || "—"}</td>
                      </tr>
                    ))}
                    {!loans.length && (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-slate-500">No loan activity is available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5 xl:col-span-2">
              <div>
                <h2 className="font-bold text-slate-900">Product price snapshot</h2>
                <p className="mt-1 text-xs text-slate-500">Products returned by the dashboard API</p>
              </div>
              <div className="mt-4 divide-y divide-slate-100">
                {products.slice(0, 5).map((product, index) => (
                  <div key={product.id || `${product.name}-${index}`} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                        <Gem size={17} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-800">{product.name || "Product"}</p>
                        <p className="truncate text-[11px] text-slate-500">{product.cat || "Jewellery"}</p>
                      </div>
                    </div>
                    <p className="shrink-0 text-xs font-bold text-slate-800">{product.amount || "—"}</p>
                  </div>
                ))}
                {!products.length && (
                  <p className="py-8 text-center text-sm text-slate-500">No product data is available.</p>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
