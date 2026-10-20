import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiAlertCircle, FiCheck, FiCheckCircle, FiChevronLeft, FiChevronRight, FiEdit2, FiEye, FiGrid, FiLayers, FiList, FiPauseCircle, FiPlus, FiPrinter, FiSearch, FiTrash2 } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../api";
import { printLoanAgreement } from "./loanPrint";
import DateRangeFilter from "../Components/DateRangeFilter";
import { isLoanReviewDue } from "./loanPolicy";
import { formatCurrency } from "../../utils/currency";

const rateText = (value) => {
  if (value == null || value === "") return "—";
  const rate = Number(value);
  return Number.isFinite(rate) ? rate.toFixed(2) : "—";
};
const dateText = (value) => {
  if (!value) return "—";
  const text = String(value);
  const date = /^\d{4}-\d{2}-\d{2}/.test(text)
    ? new Date(`${text.slice(0, 10)}T00:00:00`)
    : new Date(value);
  return Number.isNaN(date.valueOf()) ? "—" : date.toLocaleDateString("en-IN");
};

function overdueDays(loan, today) {
  const [year, month, day] = String(loan.maturity_date || "").slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return 0;
  const gracePeriod = Math.max(0, Number(loan.grace_period_days) || 0);
  const dueDate = new Date(Date.UTC(year, month - 1, day + gracePeriod));
  return Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / 86400000));
}

function isOverdueActiveLoan(loan, today) {
  return ["active", "suspended"].includes(String(loan.loan_status || "").toLowerCase())
    && loan.release_status !== "Released"
    && Number(loan.outstanding_principal ?? loan.principal_amount) > 0
    && overdueDays(loan, today) > 0;
}

function displayStatus(loan) {
  if (loan.release_status === "Released") return "Completed";
  if (loan.release_status === "Pending Release"
    && Number(loan.outstanding_principal ?? loan.principal_amount) === 0) return "Awaiting Gold Release";
  return loan.loan_status || "Unknown";
}

export default function AllLoans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState("table");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  const [dateRange, setDateRange] = useState({ preset: "all", startDate: "", endDate: "" });
  const loadLoans = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
    try {
      const { data } = await api.get("/loans", {
        params: { startDate: dateRange.startDate, endDate: dateRange.endDate }
      });
      if (!Array.isArray(data)) throw new Error("The server returned an invalid loan list.");
      setLoans(data);
    } catch (error) {
      console.error("Failed to load loans:", error);
      toast.error(error.response?.data?.message || error.message || "Could not load loans.");
    } finally {
      setLoading(false);
    }
  }, [dateRange.startDate, dateRange.endDate]);

  const handleDeleteLoan = async (loan) => {
    if (!window.confirm(`Permanently delete loan ${loan.loan_number}? This action cannot be undone.`)) return;
    try {
      await api.delete(`/loans/${loan.id}`);
      setLoans((currentLoans) => currentLoans.filter((item) => item.id !== loan.id));
      toast.success(`Loan ${loan.loan_number} deleted.`);
    } catch (error) {
      console.error("Failed to delete loan:", error);
      toast.error(error.response?.data?.message || "Could not delete loan.");
    }
  };

  useEffect(() => {
    loadLoans({ showLoading: false });
    const refreshLoans = () => loadLoans({ showLoading: false });
    window.addEventListener("focus", refreshLoans);
    return () => window.removeEventListener("focus", refreshLoans);
  }, [loadLoans]);

  const loanCounts = loans.reduce((counts, loan) => {
    const status = String(loan.loan_status || "").trim().toLowerCase();
    const released = loan.release_status === "Released";
    const awaitingGoldRelease = loan.release_status === "Pending Release"
      && Number(loan.outstanding_principal ?? loan.principal_amount) === 0;
    if (status === "active" && !awaitingGoldRelease) counts.active += 1;
    if (status === "inactive") counts.inactive += 1;
    if (status === "completed" || released) counts.completed += 1;
    return counts;
  }, { active: 0, inactive: 0, completed: 0 });
  const overdueLoansCount = loans.filter((loan) => isOverdueActiveLoan(loan, todayUtc)).length;
  const reviewRequiredCount = loans.filter((loan) => isLoanReviewDue(loan, todayUtc)).length;
  const summaryCards = [
    { label: "Total Loans", value: loans.length, icon: FiLayers, color: "bg-teal-50 text-[#008577]", accent: "from-teal-500/10" },
    { label: "Active Loans", value: loanCounts.active, icon: FiCheckCircle, color: "bg-emerald-50 text-emerald-700", accent: "from-emerald-500/10" },
    { label: "Inactive Loans", value: loanCounts.inactive, icon: FiPauseCircle, color: "bg-amber-50 text-amber-700", accent: "from-amber-500/10" },
    { label: "Completed Loans", value: loanCounts.completed, icon: FiCheck, color: "bg-slate-100 text-slate-600", accent: "from-slate-500/10" },
    { label: "Overdue Loans", value: overdueLoansCount, icon: FiAlertCircle, color: "bg-rose-50 text-rose-700", accent: "from-rose-500/10" }
  ];
  const query = searchTerm.trim().toLowerCase();
  const filteredLoans = loans.filter((loan) => {
    const matchesSearch = !query || [
      loan.loan_number, loan.customer_name, loan.customer_code, loan.customer_mobile
    ].some((value) => String(value || "").toLowerCase().includes(query));
    const matchesStatus = statusFilter === "All"
      || String(displayStatus(loan)).trim().toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filteredLoans.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedLoans = filteredLoans.slice((activePage - 1) * pageSize, activePage * pageSize);
  const getStatusStyle = (status) => {
    switch (String(status || "").trim().toLowerCase()) {
      case "active": return "bg-emerald-50 text-emerald-700";
      case "inactive": return "bg-amber-50 text-amber-700";
      case "suspended": return "bg-rose-50 text-rose-700";
      case "completed": return "bg-slate-100 text-slate-600";
      case "pending": return "bg-blue-50 text-blue-700";
      case "awaiting gold release": return "bg-amber-50 text-amber-800";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <main className="space-y-6 p-2 sm:p-2">

      <section aria-label="Loan summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map(({ label, value, icon: Icon, color, accent }) => (
          <article key={label} className="group relative isolate flex min-h-28 items-center justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/[0.06]">
            <div className={`pointer-events-none absolute inset-y-0 right-0 -z-10 w-2/3 bg-gradient-to-l ${accent} to-transparent opacity-70`} />
            <div>
              <p className="text-sm font-semibold text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-[#064A41]">{loading ? "—" : value}</p>
            </div>
            <span className={`rounded-2xl p-3.5 ring-1 ring-inset ring-black/[0.03] ${color}`}><Icon size={22} aria-hidden="true" /></span>
          </article>
        ))}
      </section>

      {!loading && (overdueLoansCount > 0 || reviewRequiredCount > 0) && (
        <section role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="mt-0.5 shrink-0 text-rose-600" size={20} aria-hidden="true" />
            <div>
              {overdueLoansCount > 0 && <><p className="font-bold">{overdueLoansCount} {overdueLoansCount === 1 ? "loan is" : "loans are"} overdue</p><p className="mt-0.5 text-sm text-rose-700">Maturity date and grace period have passed for active loans with an outstanding balance.</p></>}
              {reviewRequiredCount > 0 && <p className="mt-1 text-sm font-semibold text-rose-800">{reviewRequiredCount} {reviewRequiredCount === 1 ? "account has" : "accounts have"} reached the 15-month review point. Authorized manual review is required; collateral is not automatically seized or forfeited.</p>}
            </div>
          </div>
          <Link to="/admin/loans/overdueloans" className="inline-flex shrink-0 items-center gap-1 self-start rounded-lg bg-rose-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-rose-800 sm:self-auto">
            View overdue loans
          </Link>
        </section>
      )}

      <section aria-label="Loan list controls" className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_2px_10px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between sm:p-4">
       
        <label className="relative min-w-0 sm:w-1/3 sm:min-w-[280px] sm:flex-none">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <span className="sr-only">Search loans</span>
          <input type="search" placeholder="Search loans by number, customer..." value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setCurrentPage(1); }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-3 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-[#008577] focus:bg-white focus:ring-4 focus:ring-emerald-700/10" />
        </label>

        
        <div className="flex flex-wrap items-center justify-between gap-2 sm:ml-auto sm:justify-start sm:gap-3">
          <div> <DateRangeFilter onApply={(range) => { setCurrentPage(1); setDateRange(range); }} /></div>
          <select aria-label="Filter loans by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}
            className="min-w-[142px] rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-600 outline-none transition hover:border-slate-300 focus:border-[#008577] focus:ring-4 focus:ring-emerald-700/10">
            <option value="All">Select Status</option>
            {["Active", "Suspended", "Awaiting Gold Release", "Inactive", "Completed", "Pending"].map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <div className="flex rounded-xl border border-slate-200 bg-slate-100/80 p-1">
            <button type="button" onClick={() => setViewMode("table")} aria-label="List view" aria-pressed={viewMode === "table"} className={`rounded-lg p-2.5 transition-all ${viewMode === "table" ? "bg-[#064A41] text-white shadow-sm" : "text-slate-400 hover:text-slate-700"}`}><FiList size={17} /></button>
            <button type="button" onClick={() => setViewMode("grid")} aria-label="Card view" aria-pressed={viewMode === "grid"} className={`rounded-lg p-2.5 transition-all ${viewMode === "grid" ? "bg-[#064A41] text-white shadow-sm" : "text-slate-400 hover:text-slate-700"}`}><FiGrid size={17} /></button>
          </div>
          <Link to="/admin/loans/createloan" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#064A41] px-4 py-3 text-sm font-bold text-white shadow-md shadow-emerald-950/15 transition hover:-translate-y-0.5 hover:bg-[#087263] focus:outline-none focus:ring-4 focus:ring-emerald-700/20"><FiPlus size={16} /> Create Loan</Link>
        </div>
         

      </section>

     
      {viewMode === "table" ? (
        <section aria-label="Loans in table view" className="overflow-hidden  bg-white">
          <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-0 sm:flex-row sm:items-center sm:justify-between">
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-separate border-spacing-0 text-left">
              <thead><tr className="bg-[#064A41] text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-50/90">
                {["S No", "Loan Number", "Customer", "Outstanding Balance", "Interest", "Maturity", "Status", "Actions"].map((title) => <th key={title} scope="col" className="whitespace-nowrap px-4 py-4 first:rounded-tl-xl first:pl-5 last:rounded-tr-xl last:pr-5">{title}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-100/80">
                {loading ? <tr><td colSpan="8" className="px-4 py-16 text-center text-sm font-medium text-slate-400">Loading loans...</td></tr>
                  : filteredLoans.length === 0 ? <tr><td colSpan="8" className="px-4 py-16 text-center text-sm font-medium text-slate-400">{loans.length === 0 ? "No loans created yet." : "No loans match your search or status filter."}</td></tr>
                    : filteredLoans.map((loan, index) => (
                      <tr key={loan.id} className="text-sm transition-colors hover:bg-emerald-50/55">
                        <td className="whitespace-nowrap px-4 py-4 pl-5 text-xs font-medium tabular-nums text-slate-400">{index + 1}</td>
                        <td className="whitespace-nowrap px-4 py-4 font-bold text-[#064A41]">{loan.loan_number}</td>
                        <td className="px-4 py-4"><div className="flex min-w-[145px] items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold uppercase text-[#087263] ring-1 ring-inset ring-emerald-800/5">{String(loan.customer_name || "?").trim().charAt(0)}</span><span className="min-w-0"><span className="block truncate font-semibold text-slate-800">{loan.customer_name || "—"}</span><span className="mt-0.5 block text-xs text-slate-400">{loan.customer_code || "—"}</span></span></div></td>
                        <td className="whitespace-nowrap px-4 py-4 font-bold tabular-nums text-slate-800" title={`Original loan amount: ${formatCurrency(loan.principal_amount)}`}>{formatCurrency(loan.outstanding_principal ?? loan.principal_amount)}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-slate-600"><span className="font-semibold text-slate-800">{rateText(loan.interest_rate)}%</span></td>
                        <td className="whitespace-nowrap px-4 py-4">
                          <span className={isOverdueActiveLoan(loan, todayUtc) ? "font-bold text-rose-700" : "text-slate-600"}>{dateText(loan.maturity_date)}</span>
                          {isOverdueActiveLoan(loan, todayUtc) && <span className="ml-2 inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">Overdue</span>}
                          {isLoanReviewDue(loan, todayUtc) && <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800" title="15 months since loan date; authorized manual review required">Review</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold ${getStatusStyle(displayStatus(loan))}`}><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />{displayStatus(loan)}</span></td>
                        <td className="whitespace-nowrap px-4 py-4 pr-5">
                          <div className="flex items-center gap-1">
                            <Link to={`/admin/loans/details/${loan.id}`} aria-label={`View loan ${loan.loan_number}`} title="View loan" className="rounded-lg p-2 text-slate-400 transition hover:bg-teal-50 hover:text-[#008577] focus:outline-none focus:ring-2 focus:ring-teal-600/30"><FiEye size={16} /></Link>
                            {Number(loan.outstanding_principal ?? loan.principal_amount) > 0 && loan.loan_status !== "Completed" && loan.release_status !== "Released" && <Link to={`/admin/loans/edit/${loan.id}`} aria-label={`Edit loan ${loan.loan_number}`} title="Edit loan" className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/30"><FiEdit2 size={16} /></Link>}
                            {loan.release_status === "Pending Release" && Number(loan.outstanding_principal ?? loan.principal_amount) === 0 && <Link to={`/admin/loans/completeloan/${loan.id}`} aria-label={`Complete loan ${loan.loan_number}`} title="Complete Loan" className="rounded-lg p-2 text-amber-600 transition hover:bg-amber-50 hover:text-amber-800"><FiCheckCircle size={16} /></Link>}
                            <button type="button" onClick={() => printLoanAgreement(loan.id)} aria-label={`Print or download loan ${loan.loan_number}`} title="Print / Download PDF" className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"><FiPrinter size={16} /></button>
                            <button type="button" onClick={() => handleDeleteLoan(loan)} aria-label={`Delete loan ${loan.loan_number}`} title="Delete loan" className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-600/30"><FiTrash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        loading ? <section className="rounded-2xl border border-slate-200 bg-white px-4 py-16 text-center text-sm font-medium text-slate-400">Loading loans...</section>
          : filteredLoans.length === 0 ? <section className="rounded-2xl border border-slate-200 bg-white px-4 py-16 text-center text-sm font-medium text-slate-400">{loans.length === 0 ? "No loans created yet." : "No loans match your search or status filter."}</section>
            : <section aria-label="Loans in card view" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredLoans.map((loan) => (
                <article key={loan.id} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/[0.06]">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Loan Number</p><h2 className="mt-1 font-extrabold text-[#064A41]">{loan.loan_number}</h2></div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold ${getStatusStyle(displayStatus(loan))}`}><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />{displayStatus(loan)}</span>
                  </div>
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold uppercase text-[#087263]">{String(loan.customer_name || "?").trim().charAt(0)}</span><div className="min-w-0"><p className="truncate font-semibold text-slate-800">{loan.customer_name || "—"}</p><p className="mt-0.5 text-xs text-slate-400">{loan.customer_code || "—"}</p></div></div>
                    <p className="mt-2 text-xs text-slate-500">{loan.customer_mobile || "Mobile number unavailable"}</p>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div><dt className="text-xs font-medium text-slate-400">Outstanding Balance</dt><dd className="mt-1 font-bold text-[#064A41]">{formatCurrency(loan.outstanding_principal ?? loan.principal_amount)}</dd></div>
                      <div><dt className="text-xs text-slate-500">Maturity</dt><dd className={`mt-1 font-semibold ${isOverdueActiveLoan(loan, todayUtc) ? "text-rose-700" : "text-slate-700"}`}>{dateText(loan.maturity_date)}{isOverdueActiveLoan(loan, todayUtc) && <span className="ml-2 text-[10px] font-bold uppercase text-rose-700">Overdue</span>}{isLoanReviewDue(loan, todayUtc) && <span className="ml-2 text-[10px] font-bold uppercase text-amber-800">Review</span>}</dd></div>
                      <div><dt className="text-xs font-medium text-slate-400">Interest</dt><dd className="mt-1 font-semibold text-slate-700">{rateText(loan.interest_rate)}%</dd></div>
                    </dl>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <Link to={`/admin/loans/details/${loan.id}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#008577] hover:underline"><FiEye /> View details</Link>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => printLoanAgreement(loan.id)} aria-label={`Print or download loan ${loan.loan_number}`} title="Print / Download PDF" className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"><FiPrinter size={16} /></button>
                        {loan.release_status === "Pending Release" && Number(loan.outstanding_principal ?? loan.principal_amount) === 0 && <Link to={`/admin/loans/completeloan/${loan.id}`} aria-label={`Complete loan ${loan.loan_number}`} title="Complete Loan" className="rounded-lg p-2 text-amber-600 transition hover:bg-amber-50 hover:text-amber-800"><FiCheckCircle size={16} /></Link>}
                        {Number(loan.outstanding_principal ?? loan.principal_amount) > 0 && loan.loan_status !== "Completed" && loan.release_status !== "Released" && <Link to={`/admin/loans/edit/${loan.id}`} aria-label={`Edit loan ${loan.loan_number}`} title="Edit loan" className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-700"><FiEdit2 size={16} /></Link>}
                        <button type="button" onClick={() => handleDeleteLoan(loan)} aria-label={`Delete loan ${loan.loan_number}`} title="Delete loan" className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700"><FiTrash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </section>
      )}
    </main>
  );
}
