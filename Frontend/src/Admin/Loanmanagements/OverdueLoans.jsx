import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiAlertCircle, FiCalendar, FiClock, FiCreditCard, FiEye, FiGrid, FiList, FiSearch, FiUsers } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../api";
import { isLoanReviewDue } from "./loanPolicy";
import { formatCurrency as money } from "../../utils/currency";
import DateRangeFilter from "../Components/DateRangeFilter";
import { LoanPaymentModal } from "./LoanRenewal";
import useAdminCachedList from "../useAdminCachedList";

function dateText(value) {
  if (!value) return "—";
  const text = String(value).slice(0, 10);
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.valueOf()) ? "—" : date.toLocaleDateString("en-IN");
}

function overdueDays(loan, today) {
  const text = String(loan.maturity_date || "").slice(0, 10);
  const [year, month, day] = text.split("-").map(Number);
  if (!year || !month || !day) return 0;
  const due = new Date(Date.UTC(year, month - 1, day + Math.max(0, Number(loan.grace_period_days) || 0)));
  const days = Math.floor((today.getTime() - due.getTime()) / 86400000);
  return Math.max(0, days);
}

function Detail({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 break-words text-xs font-medium text-slate-700">{value || "—"}</dd>
    </div>
  );
}

export default function OverdueLoans() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState("table");
  const [paymentLoan, setPaymentLoan] = useState(null);
  const [dateRange, setDateRange] = useState({ preset: "all", startDate: "", endDate: "" });
  const {
    data: loans,
    setData: setLoans,
    loading,
    refreshing,
    error
  } = useAdminCachedList(
    `admin:loans:${dateRange.startDate}:${dateRange.endDate}`,
    async () => {
      const { data } = await api.get("/loans", { params: { startDate: dateRange.startDate, endDate: dateRange.endDate } });
      if (!Array.isArray(data)) throw new Error("The server returned an invalid loan list.");
      return data;
    },
    []
  );

  useEffect(() => {
    if (error) {
      console.error("Failed to load overdue loans:", error);
      toast.error(error.response?.data?.message || error.message || "Could not load overdue loans.");
    }
  }, [error]);

  const today = useMemo(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }, []);

  const overdueLoans = useMemo(() => loans
    .filter((loan) =>
      ["active", "suspended"].includes(String(loan.loan_status || "").toLowerCase())
      && loan.release_status !== "Released"
      && Number(loan.outstanding_principal ?? loan.principal_amount) > 0
      && overdueDays(loan, today) > 0
    )
    .map((loan) => ({ ...loan, overdue_days: overdueDays(loan, today) }))
    .sort((first, second) => second.overdue_days - first.overdue_days), [loans, today]);

  const filteredLoans = overdueLoans.filter((loan) => {
    const query = search.trim().toLowerCase();
    const matchesStatus = statusFilter === "All"
      || String(loan.loan_status || "").toLowerCase() === statusFilter.toLowerCase();
    const matchesSearch = !query || [
      loan.loan_number, loan.gold_pledge_number, loan.customer_code, loan.customer_name,
      loan.customer_mobile, loan.customer_alternate_mobile, loan.customer_email,
      loan.customer_address, loan.customer_city, loan.customer_district,
      loan.customer_occupation, loan.guarantor_name, loan.guarantor_mobile, loan.guarantor_email
    ].some((value) => String(value || "").toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });
  const outstandingTotal = overdueLoans.reduce(
    (total, loan) => total + Number(loan.outstanding_principal ?? loan.principal_amount), 0
  );
  const customerCount = new Set(overdueLoans.map((loan) => loan.customer_id)).size;
  const reviewRequiredCount = overdueLoans.filter((loan) => isLoanReviewDue(loan, today)).length;

  return (
    <main className="space-y-6 p-2 sm:p-2">
      

      <section aria-label="Overdue loan summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="flex items-center justify-between rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
          <div><p className="text-sm font-semibold text-slate-500">Overdue Loans</p><p className="mt-2 text-2xl font-extrabold text-rose-700">{loading ? "—" : overdueLoans.length}</p></div>
          <span className="rounded-xl bg-rose-50 p-3 text-rose-700"><FiAlertCircle size={21} /></span>
        </article>
        <article className="flex items-center justify-between rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <div><p className="text-sm font-semibold text-slate-500">Customers to Follow Up</p><p className="mt-2 text-2xl font-extrabold text-amber-700">{loading ? "—" : customerCount}</p></div>
          <span className="rounded-xl bg-amber-50 p-3 text-amber-700"><FiUsers size={21} /></span>
        </article>
        <article className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div><p className="text-sm font-semibold text-slate-500">Total Outstanding Principal</p><p className="mt-2 text-2xl font-extrabold text-[#064A41]">{loading ? "—" : money(outstandingTotal)}</p></div>
          <span className="rounded-xl bg-emerald-50 p-3 text-[#087263]"><FiClock size={21} /></span>
        </article>
        <article className="flex items-center justify-between rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <div><p className="text-sm font-semibold text-slate-500">15-Month Reviews</p><p className="mt-2 text-2xl font-extrabold text-amber-700">{loading ? "—" : reviewRequiredCount}</p><p className="mt-1 text-xs text-slate-500">Authorized manual review only</p></div>
          <span className="rounded-xl bg-amber-50 p-3 text-amber-700"><FiAlertCircle size={21} /></span>
        </article>
      </section>

      <section aria-label="Overdue loan filters" className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 sm:flex-row sm:items-center sm:p-4">
        <label className="relative block min-w-0 flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <span className="sr-only">Search overdue loans and customers</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search loan, customer, mobile, address, guarantor..." className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-[#008577] focus:ring-4 focus:ring-emerald-700/10" />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <DateRangeFilter onApply={setDateRange} />
          <select
            aria-label="Filter overdue loans by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-w-[150px] rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-600 outline-none transition hover:border-slate-300 focus:border-[#008577] focus:ring-4 focus:ring-emerald-700/10"
          >
            <option value="All">Select Status</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
          </select>
          <div className="flex self-start rounded-xl border border-slate-200 bg-slate-100/80 p-1 sm:self-auto">
            <button type="button" onClick={() => setViewMode("table")} aria-label="Table view" aria-pressed={viewMode === "table"} className={`rounded-lg p-2.5 transition-all ${viewMode === "table" ? "bg-[#064A41] text-white shadow-sm" : "text-slate-400 hover:text-slate-700"}`}><FiList size={17} /></button>
            <button type="button" onClick={() => setViewMode("card")} aria-label="Card view" aria-pressed={viewMode === "card"} className={`rounded-lg p-2.5 transition-all ${viewMode === "card" ? "bg-[#064A41] text-white shadow-sm" : "text-slate-400 hover:text-slate-700"}`}><FiGrid size={17} /></button>
          </div>
        </div>
      </section>

      {viewMode === "table" ? <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] table-fixed border-collapse text-left">
            <colgroup>
              <col className="[width:4%]" />
              <col className="[width:16%]" />
              <col className="[width:12%]" />
              <col className="[width:12%]" />
              <col className="[width:14%]" />
              <col className="[width:15%]" />
              <col className="[width:12%]" />
              <col className="[width:15%]" />
            </colgroup>
            <thead>
              <tr className="bg-[#064A41] text-[11px] font-bold uppercase tracking-wide text-emerald-50/90">
                {["S No", "Loan / Pledge", "Customer", "Loan Amount", "Outstanding", "Maturity", "Overdue", "Actions"].map((heading) => (
                  <th key={heading} scope="col" className="whitespace-nowrap px-2 py-3 first:pl-3 last:pr-3">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading
                ? <tr><td colSpan="8" className="px-4 py-14 text-center text-sm text-slate-400">Loading overdue loans...</td></tr>
                : !filteredLoans.length
                  ? <tr><td colSpan="8" className="px-4 py-14 text-center text-sm text-slate-400">{overdueLoans.length ? "No overdue loans match your search." : "There are no overdue active loans."}</td></tr>
                  : filteredLoans.map((loan, index) => (
                    <tr key={loan.id} className="text-sm transition-colors hover:bg-rose-50/30">
                      <td className="px-2 py-3 pl-3 align-top text-slate-500">{index + 1}</td>
                      <td className="break-words px-2 py-3 align-top leading-snug"><span className="block font-bold text-[#064A41]">{loan.loan_number}</span>{isLoanReviewDue(loan, today) && <span className="mt-1 inline-flex rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800">15-month review</span>}</td>
                      <td className="break-words px-2 py-3 align-top leading-snug"><span className="block font-semibold text-slate-800">{loan.customer_name || "—"}</span><span className="mt-1 block text-[11px] text-slate-500">{loan.customer_mobile || "Mobile number unavailable"}</span></td>
                      <td className="whitespace-nowrap px-2 py-3 align-top font-medium text-slate-700"><span className="block">{money(loan.principal_amount)}</span><span className="mt-1 block text-[11px] text-slate-500">{Number(loan.interest_rate || 0).toFixed(2)}% interest</span></td>
                      <td className="whitespace-nowrap px-2 py-3 align-top font-bold text-rose-700">{money(loan.outstanding_principal ?? loan.principal_amount)}</td>
                      <td className="whitespace-nowrap px-2 py-3 align-top text-slate-600"><span className="inline-flex items-center gap-1"><FiCalendar size={12} />{dateText(loan.maturity_date)}</span><span className="mt-1 block text-[11px] text-slate-400">Grace: {Number(loan.grace_period_days) || 0} days</span></td>
                      <td className="px-2 py-3 align-top"><span className="inline-flex whitespace-nowrap rounded-full bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700">{loan.overdue_days} {loan.overdue_days === 1 ? "day" : "days"}</span></td>
                      <td className="px-2 py-3 pr-3 align-top">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button type="button" disabled={refreshing} onClick={() => setPaymentLoan(loan)} aria-label={`Pay or renew loan ${loan.loan_number}`} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-[#064A41] px-2 py-1.5 text-[11px] font-bold text-white hover:bg-[#087263] disabled:cursor-not-allowed disabled:opacity-50"><FiCreditCard size={12} /> Pay</button>
                          <Link to={`/admin/loans/details/${loan.id}`} aria-label={`View loan ${loan.loan_number}`} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-emerald-50 px-2 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"><FiEye size={12} /> View</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </section> : loading
        ? <section className="rounded-2xl border border-slate-200 bg-white px-4 py-14 text-center text-sm text-slate-400">Loading overdue loans...</section>
        : !filteredLoans.length
          ? <section className="rounded-2xl border border-slate-200 bg-white px-4 py-14 text-center text-sm text-slate-400">{overdueLoans.length ? "No overdue loans match your filters." : "There are no overdue active loans."}</section>
          : <section aria-label="Overdue loans in card view" className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {filteredLoans.map((loan) => (
              <article key={loan.id} className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Loan / Pledge</p>
                    <h2 className="mt-1 break-words font-bold text-[#064A41]">{loan.loan_number}</h2>
                  </div>
                  <span className="inline-flex shrink-0 rounded-full bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700">{loan.overdue_days} {loan.overdue_days === 1 ? "day" : "days"} overdue</span>
                </div>
                {isLoanReviewDue(loan, today) && <span className="mt-3 inline-flex rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">15-month review</span>}
                <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                  <dl className="space-y-2">
                    <Detail label="Customer" value={<>{loan.customer_name || "—"}<span className="mt-1 block text-[10px] text-slate-500">{loan.customer_mobile || "Mobile number unavailable"}</span></>} />
                    <Detail label="Customer ID" value={loan.customer_code} />
                    <Detail label="Date of birth" value={dateText(loan.customer_date_of_birth)} />
                    <Detail label="Gender / occupation" value={[loan.customer_gender, loan.customer_occupation].filter(Boolean).join(" · ")} />
                    <Detail label="KYC" value={loan.customer_kyc_status} />
                  </dl>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                  <Detail label="Loan amount" value={<>{money(loan.principal_amount)}<span className="mt-1 block text-[10px] text-slate-500">{Number(loan.interest_rate || 0).toFixed(2)}% interest</span></>} />
                  <Detail label="Outstanding" value={<span className="font-bold text-rose-700">{money(loan.outstanding_principal ?? loan.principal_amount)}</span>} />
                  <Detail label="Maturity" value={<>{dateText(loan.maturity_date)}<span className="mt-1 block text-[10px] text-slate-500">Grace: {Number(loan.grace_period_days) || 0} days</span></>} />
                </dl>
                <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button type="button" disabled={refreshing} onClick={() => setPaymentLoan(loan)} aria-label={`Pay or renew loan ${loan.loan_number}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#064A41] px-3 py-2 text-xs font-bold text-white hover:bg-[#087263] disabled:cursor-not-allowed disabled:opacity-50"><FiCreditCard /> Pay</button>
                  <Link to={`/admin/loans/details/${loan.id}`} aria-label={`View loan ${loan.loan_number}`} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"><FiEye /> View Loan</Link>
                </div>
              </article>
            ))}
          </section>}
      {paymentLoan && <LoanPaymentModal
        loan={paymentLoan}
        onClose={() => setPaymentLoan(null)}
        onLoanUpdated={(updatedLoan) => setLoans((current) => current.map((loan) => loan.id === updatedLoan.id ? { ...loan, ...updatedLoan } : loan))}
      />}
    </main>
  );
}
