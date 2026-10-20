import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiAlertCircle, FiCalendar, FiClock, FiEye, FiSearch, FiUsers } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../api";
import { isLoanReviewDue } from "./loanPolicy";

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2
}).format(Number(value || 0));

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
  const [loans, setLoans] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get("/loans")
      .then(({ data }) => {
        if (!Array.isArray(data)) throw new Error("The server returned an invalid loan list.");
        if (active) setLoans(data);
      })
      .catch((error) => {
        console.error("Failed to load overdue loans:", error);
        if (active) toast.error(error.response?.data?.message || error.message || "Could not load overdue loans.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

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
    return !query || [
      loan.loan_number, loan.gold_pledge_number, loan.customer_code, loan.customer_name,
      loan.customer_mobile, loan.customer_alternate_mobile, loan.customer_email,
      loan.customer_address, loan.customer_city, loan.customer_district,
      loan.customer_occupation, loan.guarantor_name, loan.guarantor_mobile, loan.guarantor_email
    ].some((value) => String(value || "").toLowerCase().includes(query));
  });
  const outstandingTotal = overdueLoans.reduce(
    (total, loan) => total + Number(loan.outstanding_principal ?? loan.principal_amount), 0
  );
  const customerCount = new Set(overdueLoans.map((loan) => loan.customer_id)).size;
  const reviewRequiredCount = overdueLoans.filter((loan) => isLoanReviewDue(loan, today)).length;

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#008577]">Loan Management</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Overdue Loans</h1>
          <p className="mt-1 text-sm text-slate-500">Active loans past their maturity date and grace period, with customer contact details.</p>
        </div>
        <span className="text-xs font-semibold text-slate-400">{loading ? "Loading..." : `${overdueLoans.length} overdue ${overdueLoans.length === 1 ? "loan" : "loans"}`}</span>
      </header>

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

      <label className="relative block max-w-xl">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <span className="sr-only">Search overdue loans and customers</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search loan, customer, mobile, address, guarantor..." className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-[#008577] focus:ring-4 focus:ring-emerald-700/10" />
      </label>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-800">Overdue customer register</h2>
          <p className="mt-0.5 text-xs text-slate-500">Overdue is calculated after the maturity date plus any configured grace-period days.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] table-fixed border-separate border-spacing-0 text-left">
            <colgroup>
              <col className="[width:12%]" />
              <col className="[width:13%]" />
              <col className="[width:20%]" />
              <col className="[width:14%]" />
              <col className="[width:9%]" />
              <col className="[width:10%]" />
              <col className="[width:10%]" />
              <col className="[width:6%]" />
              <col className="[width:6%]" />
            </colgroup>
            <thead><tr className="bg-[#064A41] text-[10px] font-bold uppercase tracking-wide text-emerald-50/90">
              {["Loan / Pledge", "Customer", "Contact & Address", "Guarantor", "Loan Amount", "Outstanding", "Maturity", "Overdue", "View"].map((heading) => <th key={heading} className="whitespace-nowrap px-2.5 py-3 first:pl-4 last:pr-4">{heading}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading
                ? <tr><td colSpan="9" className="px-4 py-14 text-center text-sm text-slate-400">Loading overdue loans...</td></tr>
                : !filteredLoans.length
                  ? <tr><td colSpan="9" className="px-4 py-14 text-center text-sm text-slate-400">{overdueLoans.length ? "No overdue loans match your search." : "There are no overdue active loans."}</td></tr>
                  : filteredLoans.map((loan) => (
                    <tr key={loan.id} className="align-top text-sm transition-colors hover:bg-rose-50/30">
                      <td className="break-words px-2.5 py-4 pl-4"><span className="block font-bold text-[#064A41]">{loan.loan_number}</span><span className="mt-1 block text-xs text-slate-500">Pledge: {loan.gold_pledge_number || "—"}</span>{isLoanReviewDue(loan, today) && <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">15-month review</span>}</td>
                      <td className="break-words px-2.5 py-4"><dl className="space-y-2"><Detail label="Customer" value={loan.customer_name} /><Detail label="Customer ID" value={loan.customer_code} /><Detail label="Date of birth" value={dateText(loan.customer_date_of_birth)} /><Detail label="Gender / occupation" value={[loan.customer_gender, loan.customer_occupation].filter(Boolean).join(" · ")} /><Detail label="KYC" value={loan.customer_kyc_status} /></dl></td>
                      <td className="break-words px-2.5 py-4"><dl className="space-y-2"><Detail label="Mobile" value={loan.customer_mobile} /><Detail label="Alternate mobile" value={loan.customer_alternate_mobile} /><Detail label="Email" value={loan.customer_email} /><Detail label="Address" value={[loan.customer_address, loan.customer_city, loan.customer_district, loan.customer_state, loan.customer_pincode].filter(Boolean).join(", ")} /></dl></td>
                      <td className="break-words px-2.5 py-4"><dl className="space-y-2"><Detail label="Name" value={loan.guarantor_name} /><Detail label="Mobile" value={loan.guarantor_mobile} /><Detail label="Email" value={loan.guarantor_email} /><Detail label="Relationship" value={loan.guarantor_relationship} /><Detail label="Address" value={loan.guarantor_address} /></dl></td>
                      <td className="break-words px-2.5 py-4 font-medium text-slate-700">{money(loan.principal_amount)}<span className="mt-1 block text-xs text-slate-500">{Number(loan.interest_rate || 0).toFixed(2)}% interest</span></td>
                      <td className="break-words px-2.5 py-4 font-bold text-rose-700">{money(loan.outstanding_principal ?? loan.principal_amount)}</td>
                      <td className="break-words px-2.5 py-4 text-slate-600"><span className="inline-flex items-center gap-1.5"><FiCalendar />{dateText(loan.maturity_date)}</span><span className="mt-1 block text-xs text-slate-400">Grace: {Number(loan.grace_period_days) || 0} days</span></td>
                      <td className="break-words px-2.5 py-4"><span className="rounded-full bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700">{loan.overdue_days} {loan.overdue_days === 1 ? "day" : "days"}</span></td>
                      <td className="px-2.5 py-4 pr-4"><Link to={`/admin/loans/details/${loan.id}`} aria-label={`View loan ${loan.loan_number}`} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"><FiEye /> View</Link></td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
