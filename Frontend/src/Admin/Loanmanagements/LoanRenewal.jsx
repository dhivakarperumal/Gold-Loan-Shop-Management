import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiAlertCircle, FiArrowLeft, FiCalendar, FiCheckCircle, FiChevronRight, FiGrid, FiLayers, FiList, FiPlus, FiRefreshCw, FiSearch, FiShield, FiX } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api, { getPrivateFile } from "../../api";
import { isLoanReviewDue, loanReviewDate } from "./loanPolicy";
import { formatCurrency as money } from "../../utils/currency";
import DateRangeFilter from "../Components/DateRangeFilter";

function dateText(value) {
  if (!value) return "—";
  const text = String(value);
  const date = /^\d{4}-\d{2}-\d{2}/.test(text)
    ? new Date(`${text.slice(0, 10)}T00:00:00`)
    : new Date(value);
  return Number.isNaN(date.valueOf()) ? "—" : date.toLocaleDateString("en-IN");
}

function rateText(value) {
  const rate = Number(value);
  return Number.isFinite(rate) ? `${rate.toFixed(2)}%` : "—";
}

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function Info({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-800">{value || "—"}</dd>
    </div>
  );
}

function LoanPaymentModal({ loan: loanRow, onClose, onLoanUpdated }) {
  const [data, setData] = useState(null);
  const [fundAccounts, setFundAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api.get(`/loans/${loanRow.id}/renewal`),
      api.get("/funds/accounts")
    ]).then(([renewalResponse, accountsResponse]) => {
      if (!Array.isArray(accountsResponse.data)) throw new Error("The server returned an invalid fund account list.");
      if (!active) return;
      const activeAccounts = accountsResponse.data.filter((account) => account.is_active);
      setData(renewalResponse.data);
      setFundAccounts(activeAccounts);
      setAccountId(String(activeAccounts[0]?.id || ""));
      setLoadError("");
    }).catch((error) => {
      console.error("Failed to load loan payment details:", error);
      if (!active) return;
      const message = error.response?.data?.message || error.message || "Could not load payment and renewal details.";
      setLoadError(message);
      toast.error(message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [loanRow.id]);

  const loan = data?.loan;
  const preview = data?.preview;
  const amount = Number(paymentAmount);
  const principalReduction = preview && Number.isFinite(amount)
    ? Math.max(0, Math.min(preview.current_principal, amount - preview.accrued_interest))
    : 0;
  const canPay = Boolean(
    loan
    && preview
    && loan.loan_status === "Active"
    && preview.current_principal > 0
    && accountId
    && Number.isFinite(amount)
    && amount > 0
    && amount + 0.001 >= preview.minimum_payment
    && amount <= preview.total_due + 0.001
  );

  const submitPayment = async (event) => {
    event.preventDefault();
    if (!canPay || saving) return;
    setSaving(true);
    try {
      const { data: updatedData } = await api.post(`/loans/${loanRow.id}/renewal`, {
        payment_amount: amount,
        account_id: accountId,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim(),
        idempotency_key: crypto.randomUUID()
      });
      setData(updatedData);
      setPaymentAmount("");
      setReferenceNumber("");
      onLoanUpdated(updatedData.loan);
      toast.success(updatedData.preview.current_principal === 0
        ? "Loan paid in full. Complete and record the gold release."
        : `Payment recorded. Loan renewed through ${dateText(updatedData.loan.maturity_date)}.`);
    } catch (error) {
      console.error("Failed to record loan payment:", error);
      toast.error(error.response?.data?.message || "Could not record this payment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="loan-payment-title" className="my-auto max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white p-4 sm:p-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Payment and renewal</p>
            <h2 id="loan-payment-title" className="mt-1 truncate text-lg font-black text-slate-900">{loanRow.loan_number} · {loanRow.customer_name || "Customer"}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close payment details" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><FiX size={20} /></button>
        </div>

        {loading
          ? <p className="p-8 text-center text-sm text-slate-500">Loading payment details...</p>
          : loadError || !loan || !preview
            ? <div className="p-6"><p role="alert" className="text-sm text-rose-700">{loadError || "Payment details are unavailable."}</p></div>
            : <div className="p-4 sm:p-5">
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-[#008577]"><FiCalendar /></span>
                  <div><h3 className="font-bold text-slate-800">Payment and renewal</h3><p className="text-xs text-slate-500">Renewal date: {dateText(preview.renewal_date)}</p></div>
                </div>
                <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
                  <div className="flex justify-between gap-3 text-slate-600"><span>Current principal</span><strong className="text-slate-800">{money(preview.current_principal)}</strong></div>
                  <div className="flex justify-between gap-3 text-slate-600"><span>Regular interest accrued</span><strong className="text-slate-800">{money(preview.regular_interest)}</strong></div>
                  <div className="flex justify-between gap-3 text-slate-600"><span>Late payment fee</span><strong className="text-rose-700">{money(preview.late_payment_fee)}</strong></div>
                  <div className="flex justify-between gap-3 border-t border-slate-200 pt-2 text-slate-600"><span>Total interest and late fee</span><strong className="text-slate-800">{money(preview.accrued_interest)}</strong></div>
                  <div className="flex justify-between gap-3 border-t border-slate-200 pt-2 font-bold text-slate-800"><span>Total due</span><span>{money(preview.total_due)}</span></div>
                  <p className="pt-1 text-[11px] leading-relaxed text-slate-500">Total due is current principal plus accrued interest. Processing and other charges are not included.</p>
                </div>
                {preview.current_principal > 0 ? (
                  <form onSubmit={submitPayment} className="space-y-3">
                    <label className="block text-sm font-semibold text-slate-700">Payable amount
                      <span className="mt-1.5 flex min-h-12 items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-[#008577] focus-within:ring-4 focus-within:ring-emerald-700/10">
                        <span className="mr-2 text-slate-400">₹</span>
                        <input type="number" inputMode="decimal" min="0.01" max={preview.total_due} step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} disabled={loan.loan_status !== "Active" || saving} placeholder="Enter amount received" className="w-full border-0 bg-transparent text-sm font-bold text-slate-800 outline-none" />
                      </span>
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">Deposit account
                      <select required value={accountId} onChange={(event) => setAccountId(event.target.value)} disabled={saving || !fundAccounts.length} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-[#008577]">
                        <option value="">Select account</option>
                        {fundAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                      </select>
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">Payment method
                      <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} disabled={saving} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-[#008577]">
                        {["Cash", "UPI", "Card", "Bank Transfer", "Cheque", "Other"].map((method) => <option key={method} value={method}>{method}</option>)}
                      </select>
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">Reference number <span className="font-normal text-slate-400">(optional)</span>
                      <input value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} maxLength={100} disabled={saving} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal text-slate-700 outline-none focus:border-[#008577]" />
                    </label>
                    {!fundAccounts.length && <p className="text-xs text-rose-600">No active fund accounts are available. Add or activate a fund account before recording this payment.</p>}
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">Minimum interest payment: <strong>{money(preview.minimum_payment)}</strong>. Any extra payment reduces the principal; remaining balance earns interest at the saved rate for the next 11 months.</div>
                    {paymentAmount && Number.isFinite(amount) && amount > 0 && <div className="space-y-1 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs">
                      <p className="flex justify-between gap-2 text-slate-600"><span>Interest covered</span><strong>{money(Math.min(amount, preview.accrued_interest))}</strong></p>
                      <p className="flex justify-between gap-2 text-slate-600"><span>Principal reduction</span><strong>{money(principalReduction)}</strong></p>
                      <p className="flex justify-between gap-2 font-bold text-[#064A41]"><span>Principal after payment</span><strong>{money(preview.current_principal - principalReduction)}</strong></p>
                    </div>}
                    <button type="submit" disabled={!canPay || saving} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#064A41] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#087263] disabled:cursor-not-allowed disabled:opacity-50">
                      {saving ? "Saving payment..." : <><FiRefreshCw /> Record Payment &amp; Renew</>}
                    </button>
                    {loan.loan_status !== "Active" && <p className="text-center text-xs font-semibold text-slate-500">This loan is not active and cannot be renewed.</p>}
                  </form>
                ) : <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <p className="font-semibold">This loan is paid in full.</p>
                  <Link to={`/admin/loans/goldrelease/${loan.id}`} onClick={onClose} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#064A41] px-3 py-2 font-bold text-white hover:bg-[#087263]"><FiCheckCircle /> Continue to Gold Release</Link>
                </div>}
              </section>

            </div>}
      </section>
    </div>
  );
}

export default function LoanRenewal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [renewalData, setRenewalData] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState("table");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [fundAccounts, setFundAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [goldImage, setGoldImage] = useState("");
  const [noticeMethod, setNoticeMethod] = useState("sms");
  const [customerMessage, setCustomerMessage] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewActionNotes, setReviewActionNotes] = useState("");
  const [dateRange, setDateRange] = useState({ preset: "all", startDate: "", endDate: "" });
  const [paymentLoan, setPaymentLoan] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const request = id
      ? api.get(`/loans/${id}/renewal`).then(({ data }) => {
        if (active) setRenewalData(data);
      })
      : api.get("/loans", {
        params: { startDate: dateRange.startDate, endDate: dateRange.endDate }
      }).then(({ data }) => {
        if (!Array.isArray(data)) throw new Error("The server returned an invalid loan list.");
        if (active) {
          setLoans(data.filter((loan) =>
            ["Active", "Suspended"].includes(loan.loan_status)
            && loan.release_status !== "Released"
            && Number(loan.outstanding_principal ?? loan.principal_amount) > 0
          ));
        }
      });
    request.catch((error) => {
      console.error("Failed to load loan renewal data:", error);
      if (active) toast.error(error.response?.data?.message || error.message || "Could not load loan renewal data.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [id, dateRange.startDate, dateRange.endDate]);

  const loan = renewalData?.loan;
  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    api.get("/funds/accounts")
      .then(({ data }) => {
        if (!Array.isArray(data)) throw new Error("The server returned an invalid fund account list.");
        const activeAccounts = data.filter((account) => account.is_active);
        if (active) {
          setFundAccounts(activeAccounts);
          setAccountId((current) => current || String(activeAccounts[0]?.id || ""));
        }
      })
      .catch((error) => {
        console.error("Failed to load fund accounts for loan renewal:", error);
        if (active) toast.error(error.response?.data?.message || "Could not load fund accounts.");
      });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!loan) return;
    setCustomerMessage(
      `Your loan ${loan.loan_number} has reached its 15-month review date. Please contact Sri Golds to discuss payment or renewal options. Any further action will follow your loan agreement and applicable process.`
    );
  }, [loan?.id, loan?.loan_number]);
  useEffect(() => {
    if (!loan?.gold_image_url) {
      setGoldImage("");
      return undefined;
    }
    let active = true;
    let objectUrl = "";
    getPrivateFile(loan.gold_image_url, { responseType: "blob" })
      .then(({ data }) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(data);
        setGoldImage(objectUrl);
      })
      .catch((error) => {
        console.error("Failed to load pledged gold image:", error);
        if (active) toast.error(error.response?.data?.message || "Could not load pledged gold image.");
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [loan?.gold_image_url]);

  const filteredLoans = loans.filter((item) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [
      item.loan_number, item.customer_name, item.customer_code, item.customer_mobile
    ].some((value) => String(value || "").toLowerCase().includes(query));
    const matchesStatus = statusFilter === "All"
      || String(item.loan_status || "").toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });
  const todayKey = localDateKey(new Date());
  const renewalSummary = [
    { label: "Total Loans", value: loans.length, icon: FiLayers, color: "border-slate-200 text-[#008577]", iconColor: "bg-teal-50 text-[#008577]" },
    { label: "Maturing Today", value: loans.filter((item) => String(item.maturity_date || "").slice(0, 10) === todayKey).length, icon: FiCalendar, color: "border-amber-100 text-amber-700", iconColor: "bg-amber-50 text-amber-700" },
    { label: "Past Maturity", value: loans.filter((item) => {
      const maturityDate = String(item.maturity_date || "").slice(0, 10);
      return Boolean(maturityDate) && maturityDate < todayKey;
    }).length, icon: FiAlertCircle, color: "border-rose-100 text-rose-700", iconColor: "bg-rose-50 text-rose-700" },
    { label: "15-Month Reviews", value: loans.filter((item) => isLoanReviewDue(item)).length, icon: FiShield, color: "border-emerald-100 text-emerald-700", iconColor: "bg-emerald-50 text-emerald-700" }
  ];

  const amount = Number(paymentAmount);
  const preview = renewalData?.preview;
  const principalReduction = Number.isFinite(amount) && preview
    ? Math.max(0, Math.min(preview.current_principal, amount - preview.accrued_interest))
    : 0;
  const canRenew = Boolean(
    loan
    && preview
    && preview.current_principal > 0
    && loan.loan_status === "Active"
    && Number.isFinite(amount)
    && amount > 0
    && amount + 0.001 >= preview.minimum_payment
    && amount <= preview.total_due + 0.001
  );

  const handleRenewal = async (event) => {
    event.preventDefault();
    if (!canRenew || saving) return;
    setSaving(true);
    try {
      const { data } = await api.post(`/loans/${id}/renewal`, {
        payment_amount: amount,
        account_id: accountId,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim(),
        idempotency_key: crypto.randomUUID()
      });
      setRenewalData(data);
      setPaymentAmount("");
      setReferenceNumber("");
      if (data.preview.current_principal === 0) {
        toast.success("Loan paid in full. Complete and record the gold release."          && Boolean(accountId)
        );
        navigate(`/admin/loans/completeloan/${id}`);
      } else {
        toast.success(`Payment recorded. Loan renewed through ${dateText(data.loan.maturity_date)}.`);
      }
    } catch (error) {
      console.error("Failed to renew loan:", error);
      toast.error(error.response?.data?.message || "Could not renew this loan.");
    } finally {
      setSaving(false);
    }
  };

  const handleReviewAction = async (action) => {
    if (!manualReviewDue || savingReview) return;
    if (action === "suspend" && !window.confirm("Suspend renewal for this loan? A customer notice must already be recorded. This does not transfer ownership of or authorize taking the pledged gold.")) return;
    if (action === "reinstate" && !window.confirm("Reinstate renewal access for this loan?")) return;
    setSavingReview(true);
    try {
      const payload = action === "notice_sent"
        ? { action, notice_method: noticeMethod, customer_message: customerMessage, notes: reviewNotes }
        : { action, notes: reviewActionNotes };
      const { data } = await api.post(`/loans/${id}/review-action`, payload);
      setRenewalData((current) => ({ ...current, loan: data.loan, reviewActions: data.reviewActions }));
      setReviewNotes("");
      setReviewActionNotes("");
      toast.success(action === "notice_sent"
        ? "Customer notice recorded. The app does not send SMS or WhatsApp automatically."
        : action === "suspend" ? "Renewal suspended. No collateral action was taken." : "Renewal access reinstated.");
    } catch (error) {
      console.error("Failed to update loan review:", error);
      toast.error(error.response?.data?.message || "Could not update the loan review.");
    } finally {
      setSavingReview(false);
    }
  };

  if (!id) {
    return (
      <main className="space-y-6 p-2">
        <section aria-label="Loan renewal summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {renewalSummary.map(({ label, value, icon: Icon, color, iconColor }) => (
            <article key={label} className={`flex items-center justify-between rounded-2xl border bg-white p-5 shadow-sm ${color}`}>
              <div>
                <p className="text-sm font-semibold text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-extrabold">{loading ? "—" : value}</p>
              </div>
              <span className={`rounded-xl p-3 ${iconColor}`}><Icon size={21} /></span>
            </article>
          ))}
        </section>
        <section aria-label="Loan renewal filters" className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_2px_10px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <label className="relative min-w-0 sm:w-1/3 sm:min-w-[280px] sm:flex-none">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <span className="sr-only">Search loans</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search loans by number, customer..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-3 pl-12 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-[#008577] focus:bg-white focus:ring-4 focus:ring-emerald-700/10" />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2 sm:ml-auto sm:justify-start sm:gap-3">
            <DateRangeFilter onApply={(range) => { setLoading(true); setDateRange(range); }} />
            <select aria-label="Filter loans by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}
              className="min-w-[142px] rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-600 outline-none transition hover:border-slate-300 focus:border-[#008577] focus:ring-4 focus:ring-emerald-700/10">
              <option value="All">Select Status</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
            </select>
            <div className="flex rounded-xl border border-slate-200 bg-slate-100/80 p-1">
              <button type="button" onClick={() => setViewMode("table")} aria-label="List view" aria-pressed={viewMode === "table"} className={`rounded-lg p-2.5 transition-all ${viewMode === "table" ? "bg-[#064A41] text-white shadow-sm" : "text-slate-400 hover:text-slate-700"}`}><FiList size={17} /></button>
              <button type="button" onClick={() => setViewMode("card")} aria-label="Card view" aria-pressed={viewMode === "card"} className={`rounded-lg p-2.5 transition-all ${viewMode === "card" ? "bg-[#064A41] text-white shadow-sm" : "text-slate-400 hover:text-slate-700"}`}><FiGrid size={17} /></button>
            </div>
            <Link to="/admin/loans/createloan" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#064A41] px-4 py-3 text-sm font-bold text-white shadow-md shadow-emerald-950/15 transition hover:-translate-y-0.5 hover:bg-[#087263] focus:outline-none focus:ring-4 focus:ring-emerald-700/20"><FiPlus size={16} /> Create Loan</Link>
          </div>
        </section>
        {viewMode === "table" ? <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-separate border-spacing-0 text-left">
              <thead><tr className="bg-[#064A41] text-[11px] font-bold uppercase tracking-wide text-emerald-50/90">
                {["Loan Number", "Customer", "Mobile", "Principal", "Balance", "Interest", "Maturity", "Actions"].map((label) =>
                  <th key={label} className="whitespace-nowrap px-4 py-3 first:pl-5">{label}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading
                  ? <tr><td colSpan="8" className="px-4 py-14 text-center text-sm text-slate-400">Loading loans...</td></tr>
                  : filteredLoans.length === 0
                    ? <tr><td colSpan="8" className="px-4 py-14 text-center text-sm text-slate-400">{loans.length ? "No loans match your search." : "No active loans are available for renewal."}</td></tr>
                    : filteredLoans.map((item) => (
                      <tr key={item.id} className={`text-sm transition-colors ${["Active", "Suspended"].includes(item.loan_status) ? "cursor-pointer hover:bg-emerald-50/60" : "opacity-60"}`}
                        onClick={() => ["Active", "Suspended"].includes(item.loan_status) && navigate(Number(item.outstanding_principal ?? item.principal_amount) === 0 ? `/admin/loans/completeloan/${item.id}` : `/admin/loans/loanreniwel/${item.id}`)}>
                        <td className="whitespace-nowrap px-4 py-4 pl-5 font-bold text-[#064A41]">{item.loan_number}</td>
                        <td className="px-4 py-4"><span className="block font-semibold text-slate-800">{item.customer_name || "—"}</span><span className="text-xs text-slate-400">{item.customer_code || "—"}</span></td>
                        <td className="whitespace-nowrap px-4 py-4 text-slate-600">{item.customer_mobile || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-4 tabular-nums text-slate-600">{money(item.principal_amount)}</td>
                        <td className="whitespace-nowrap px-4 py-4 font-bold tabular-nums text-slate-800">{money(item.outstanding_principal ?? item.principal_amount)}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-slate-600">{rateText(item.interest_rate)} / {String(item.interest_frequency || "").replaceAll("_", " ")}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-slate-600">{dateText(item.maturity_date)}</td>
                        <td className="whitespace-nowrap px-4 py-4 pr-5">
                          {item.loan_status === "Active" && Number(item.outstanding_principal ?? item.principal_amount) === 0
                            ? <Link to={`/admin/loans/completeloan/${item.id}`} onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Complete loan <FiChevronRight /></Link>
                            : item.loan_status === "Active"
                              ? <div className="flex items-center gap-2">
                                <button type="button" onClick={(event) => { event.stopPropagation(); setPaymentLoan(item); }} className="inline-flex items-center gap-1 rounded-lg bg-[#064A41] px-3 py-2 text-xs font-bold text-white hover:bg-[#087263]">Pay</button>
                                <Link to={`/admin/loans/loanreniwel/${item.id}`} onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">Renew <FiChevronRight /></Link>
                              </div>
                            : item.loan_status === "Suspended"
                              ? <Link to={`/admin/loans/loanreniwel/${item.id}`} onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Review <FiChevronRight /></Link>
                            : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">{item.loan_status}</span>}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </section> : loading
          ? <section className="rounded-2xl border border-slate-200 bg-white px-4 py-14 text-center text-sm text-slate-400">Loading loans...</section>
          : filteredLoans.length === 0
            ? <section className="rounded-2xl border border-slate-200 bg-white px-4 py-14 text-center text-sm text-slate-400">{loans.length ? "No loans match your filters." : "No active loans are available for renewal."}</section>
            : <section aria-label="Loans for renewal in card view" className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {filteredLoans.map((item) => (
                <article key={item.id} className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Loan Number</p>
                      <h2 className="mt-1 break-words font-bold text-[#064A41]">{item.loan_number}</h2>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{item.customer_name || "—"}</p>
                      <p className="text-xs text-slate-500">{item.customer_mobile || "Mobile unavailable"}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${item.loan_status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{item.loan_status}</span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                    <Info label="Principal" value={money(item.principal_amount)} />
                    <Info label="Balance" value={money(item.outstanding_principal ?? item.principal_amount)} />
                    <Info label="Interest" value={`${rateText(item.interest_rate)} / ${String(item.interest_frequency || "").replaceAll("_", " ")}`} />
                    <Info label="Maturity" value={dateText(item.maturity_date)} />
                  </dl>
                  <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
                    {item.loan_status === "Active" && Number(item.outstanding_principal ?? item.principal_amount) === 0
                      ? <Link to={`/admin/loans/completeloan/${item.id}`} className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Complete loan <FiChevronRight /></Link>
                      : item.loan_status === "Active"
                        ? <Link to={`/admin/loans/loanreniwel/${item.id}`} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">Renew <FiChevronRight /></Link>
                        : <Link to={`/admin/loans/loanreniwel/${item.id}`} className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Review <FiChevronRight /></Link>}
                  </div>
                </article>
              ))}
            </section>}
        {paymentLoan && <LoanPaymentModal
          loan={paymentLoan}
          onClose={() => setPaymentLoan(null)}
          onLoanUpdated={(updatedLoan) => setLoans((current) => current.map((item) => item.id === updatedLoan.id ? { ...item, ...updatedLoan } : item))}
        />}
      </main>
    );
  }

  if (loading) return <main className="p-6 text-sm text-slate-500">Loading renewal details...</main>;
  if (!renewalData || !loan) {
    return <main className="space-y-3 p-6"><p className="text-sm text-slate-600">Loan renewal details could not be loaded.</p><Link to="/admin/loans/loanreniwel" className="inline-flex items-center gap-2 text-sm font-semibold text-[#008577]"><FiArrowLeft /> Loan Renewal</Link></main>;
  }

  const address = [loan.customer_address, loan.customer_city, loan.customer_district, loan.customer_state, loan.customer_pincode].filter(Boolean).join(", ");
  const unit = loan.rate_unit === "carat" ? "ct" : "g";
  const active = loan.loan_status === "Active";
  const manualReviewDue = isLoanReviewDue(loan);

  return (
    <main className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6">
      <Link to="/admin/loans/loanreniwel" className="inline-flex items-center gap-2 text-sm font-semibold text-[#008577]"><FiArrowLeft /> All loans for renewal</Link>
      <header className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-br from-[#064A41] to-[#087568] p-5 text-white shadow-lg sm:flex-row sm:items-center sm:p-6">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Loan Renewal</p><h1 className="mt-1 text-2xl font-extrabold">{loan.loan_number}</h1><p className="mt-1 text-sm text-white/75">{loan.customer_name} · {loan.customer_mobile || "No mobile"}</p></div>
        <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${active ? "bg-emerald-300/20 text-emerald-50" : "bg-white/15 text-white"}`}>{loan.loan_status}</span>
      </header>
      {manualReviewDue && <section role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><FiCalendar className="mt-0.5 shrink-0" /><div><p className="font-bold">15-month account review required</p><p className="mt-1 text-sm">This unpaid loan has passed its maturity and reached {dateText(loanReviewDate(loan))}. Refer it for authorized manual review. This flag does not authorize automatic collateral seizure or forfeiture.</p></div></section>}
      {manualReviewDue && (
        <section className="space-y-4 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-amber-50 p-2.5 text-amber-800"><FiShield size={20} /></span>
            <div>
              <h2 className="font-bold text-slate-900">Customer notice and renewal suspension</h2>
              <p className="mt-1 text-sm text-slate-600">Send the notice using the selected channel, then record that it was sent. Renewal suspension requires a saved notice and staff confirmation. This system does not send messages automatically or decide ownership/return of pledged gold.</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <form onSubmit={(event) => { event.preventDefault(); handleReviewAction("notice_sent"); }} className="space-y-3 rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-800">Record customer notice</h3>
              <label className="block text-xs font-semibold text-slate-600">Notice channel
                <select value={noticeMethod} onChange={(event) => setNoticeMethod(event.target.value)} disabled={savingReview} className="mt-1 block min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
                  <option value="sms">SMS (send outside this app)</option>
                  <option value="whatsapp">WhatsApp (send outside this app)</option>
                  <option value="call">Phone call</option>
                  <option value="letter">Letter</option>
                  <option value="in_person">In person</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-600">Customer message
                <textarea required maxLength={4000} rows={3} value={customerMessage} onChange={(event) => setCustomerMessage(event.target.value)} disabled={savingReview} className="mt-1 block w-full rounded-lg border border-slate-200 p-3 text-sm font-normal text-slate-800" />
              </label>
              <label className="block text-xs font-semibold text-slate-600">Internal contact notes
                <textarea required maxLength={2000} rows={2} value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} disabled={savingReview} placeholder="Record who was contacted and any response" className="mt-1 block w-full rounded-lg border border-slate-200 p-3 text-sm font-normal text-slate-800" />
              </label>
              <button type="submit" disabled={savingReview || !customerMessage.trim() || !reviewNotes.trim()} className="min-h-10 rounded-lg bg-[#064A41] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{savingReview ? "Saving..." : "Confirm notice sent & save record"}</button>
            </form>

            <div className="space-y-3 rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-800">Renewal status</h3>
              {loan.loan_status === "Suspended" ? (
                <>
                  <p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">Renewal is suspended. No collateral action has been taken.</p>
                  <label className="block text-xs font-semibold text-slate-600">Reinstatement notes
                    <textarea maxLength={2000} rows={2} value={reviewActionNotes} onChange={(event) => setReviewActionNotes(event.target.value)} disabled={savingReview} placeholder="Reason for reinstating renewal access" className="mt-1 block w-full rounded-lg border border-slate-200 p-3 text-sm font-normal text-slate-800" />
                  </label>
                  <button type="button" onClick={() => handleReviewAction("reinstate")} disabled={savingReview || !reviewActionNotes.trim()} className="min-h-10 rounded-lg border border-emerald-700 px-4 py-2 text-sm font-bold text-emerald-800 disabled:opacity-50">{savingReview ? "Saving..." : "Reinstate renewal"}</button>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600">{renewalData.reviewActions?.some((item) => item.action_type === "notice_sent") ? "A customer notice is recorded. An administrator may now suspend renewal if required by the approved policy." : "Record a customer notice before suspending renewal."}</p>
                  <label className="block text-xs font-semibold text-slate-600">Suspension notes
                    <textarea maxLength={2000} rows={2} value={reviewActionNotes} onChange={(event) => setReviewActionNotes(event.target.value)} disabled={savingReview} placeholder="Reason for suspending renewal access" className="mt-1 block w-full rounded-lg border border-slate-200 p-3 text-sm font-normal text-slate-800" />
                  </label>
                  <button type="button" onClick={() => handleReviewAction("suspend")} disabled={savingReview || !renewalData.reviewActions?.some((item) => item.action_type === "notice_sent") || !reviewActionNotes.trim()} className="min-h-10 rounded-lg bg-amber-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{savingReview ? "Saving..." : "Suspend renewal"}</button>
                </>
              )}
            </div>
          </div>

          {renewalData.reviewActions?.length > 0 && (
            <div className="border-t border-slate-100 pt-3">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Review action history</h3>
              <ul className="space-y-2">
                {renewalData.reviewActions.map((item) => (
                  <li key={item.id} className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                    <p className="font-bold">{item.action_type.replaceAll("_", " ")} · {dateText(item.created_at)}{item.notice_method ? ` · ${item.notice_method}` : ""}</p>
                    {item.customer_message && <p className="mt-1 whitespace-pre-wrap">{item.customer_message}</p>}
                    <p className="mt-1 whitespace-pre-wrap text-slate-500">{item.notes}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-800">Customer and pledged item</h2>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Customer ID" value={loan.customer_code || loan.customer_id} />
              <Info label="Customer name" value={loan.customer_name} />
              <Info label="Mobile" value={loan.customer_mobile} />
              <Info label="Alternate mobile" value={loan.customer_alternate_mobile} />
              <Info label="Email" value={loan.customer_email} />
              <Info label="Date of birth" value={dateText(loan.customer_date_of_birth)} />
              <Info label="Gender" value={loan.customer_gender} />
              <Info label="Occupation" value={loan.customer_occupation} />
              <Info label="KYC status" value={loan.customer_kyc_status} />
              <div className="sm:col-span-2 lg:col-span-3"><Info label="Address" value={address} /></div>
              <Info label="Guarantor" value={loan.guarantor_name} />
              <Info label="Guarantor mobile" value={loan.guarantor_mobile} />
              <Info label="Guarantor email" value={loan.guarantor_email} />
              <Info label="Guarantor relationship" value={loan.guarantor_relationship} />
              <div className="sm:col-span-2 lg:col-span-3"><Info label="Guarantor address" value={loan.guarantor_address} /></div>
              <Info label="Pledge number" value={loan.gold_pledge_number} />
              <Info label="Jewellery" value={`${loan.jewellery_type} · ${loan.metal_type || "Gold"}`} />
              <Info label="Purity" value={loan.gold_purity} />
              <Info label="Gross weight" value={`${loan.gross_weight} ${unit}`} />
              <Info label="Stone weight" value={`${loan.stone_weight || 0} ${unit}`} />
              <Info label="Net weight" value={`${loan.net_gold_weight} ${unit}`} />
              <Info label="Gold valuation" value={money(loan.gold_valuation)} />
              {goldImage && <div className="sm:col-span-2 lg:col-span-3"><dt className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Pledged gold image</dt><img src={goldImage} alt={`Pledged ${loan.jewellery_type}`} className="max-h-56 rounded-xl border border-slate-200 object-contain" /></div>}
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-800">Saved loan terms</h2>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Original loan amount" value={money(loan.principal_amount)} />
              <Info label="Current principal balance" value={money(preview.current_principal)} />
              <Info label="Interest type" value={String(loan.interest_type || "").replaceAll("_", " ")} />
              <Info label="Interest rate" value={`${rateText(loan.interest_rate)} per ${String(loan.interest_frequency || "").replaceAll("_", " ")}`} />
              <Info label="Interest period starts" value={dateText(preview.period_start_date)} />
              <Info label="Loan date" value={dateText(loan.loan_date)} />
              <Info label="15-month manual review date" value={dateText(loanReviewDate(loan))} />
              <Info label="Current maturity" value={dateText(loan.maturity_date)} />
              <Info label="Renewal date" value={dateText(preview.renewal_date)} />
              <Info label="Compounding frequency" value={loan.compounding_frequency} />
              <Info label="Payment frequency" value={loan.payment_frequency} />
              <Info label="Custom interest period" value={loan.custom_period_days == null ? "—" : `${loan.custom_period_days} days`} />
              <Info label="Grace period" value={`${loan.grace_period_days || 0} days`} />
              <Info label="Interest-free period" value={`${loan.interest_free_days || 0} days`} />
              <Info label={`Late payment rate (${String(loan.interest_frequency || "monthly").replaceAll("_", " ")} period)`} value={loan.late_payment_interest_rate == null ? "Not set" : rateText(loan.late_payment_interest_rate)} />
              <Info label="Fixed interest amount" value={loan.fixed_interest_amount == null ? "—" : money(loan.fixed_interest_amount)} />
              <Info label="Minimum interest" value={loan.minimum_interest_amount == null ? "—" : money(loan.minimum_interest_amount)} />
              <Info label="Maximum interest" value={loan.maximum_interest_amount == null ? "—" : money(loan.maximum_interest_amount)} />
              <Info label="Next maturity after renewal" value={dateText(preview.next_maturity_date)} />
              <Info label="Processing fee" value={money(loan.processing_fee)} />
              <Info label="Other charges" value={money(loan.other_charges)} />
              <Info label="Notes" value={loan.notes} />
            </dl>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm xl:sticky xl:top-5">
            <div className="mb-4 flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-[#008577]"><FiCalendar /></span><div><h2 className="font-bold text-slate-800">Payment and renewal</h2><p className="text-xs text-slate-500">Renewal date: {dateText(preview.renewal_date)}</p></div></div>
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between gap-3 text-slate-600"><span>Current principal</span><strong className="text-slate-800">{money(preview.current_principal)}</strong></div>
              <div className="flex justify-between gap-3 text-slate-600"><span>Regular interest accrued</span><strong className="text-slate-800">{money(preview.regular_interest)}</strong></div>
              <div className="flex justify-between gap-3 text-slate-600"><span>Late payment fee</span><strong className="text-rose-700">{money(preview.late_payment_fee)}</strong></div>
              <div className="flex justify-between gap-3 border-t border-slate-200 pt-2 text-slate-600"><span>Total interest and late fee</span><strong className="text-slate-800">{money(preview.accrued_interest)}</strong></div>
              <div className="flex justify-between gap-3 border-t border-slate-200 pt-2 font-bold text-slate-800"><span>Total due</span><span>{money(preview.total_due)}</span></div>
              <p className="pt-1 text-[11px] leading-relaxed text-slate-500">Total due is current principal plus accrued interest. Processing and other charges are not included.</p>
            </div>
            <form onSubmit={handleRenewal} className="mt-4 space-y-3">
              {preview.current_principal <= 0 ? (
                <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-900">This loan is paid in full. The loan remains open until its pledged gold is handed back and recorded.</p>
                  <Link to={`/admin/loans/goldrelease/${id}`} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#064A41] px-4 py-3 text-sm font-bold text-white hover:bg-[#087263]"><FiCheckCircle /> Continue to Gold Release</Link>
                </div>
              ) : (
                <>
              <label className="block text-sm font-semibold text-slate-700">Payable amount
                <span className="mt-1.5 flex min-h-12 items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-[#008577] focus-within:ring-4 focus-within:ring-emerald-700/10">
                  <span className="mr-2 text-slate-400">₹</span>
                  <input type="number" inputMode="decimal" min="0.01" max={preview.total_due} step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} disabled={!active || saving}
                    placeholder="Enter amount received" className="w-full border-0 bg-transparent text-sm font-bold text-slate-800 outline-none" />
                </span>
              </label>
              <label className="block text-sm font-semibold text-slate-700">Deposit account
                <select value={accountId} onChange={(event) => setAccountId(event.target.value)} disabled={saving || fundAccounts.length === 0}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-[#008577]">
                  <option value="">Select account</option>
                  {fundAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">Payment method
                <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} disabled={saving}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-[#008577]">
                  {["Cash", "UPI", "Card", "Bank Transfer", "Cheque", "Other"].map((method) => <option key={method} value={method}>{method}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">Reference number <span className="font-normal text-slate-400">(optional)</span>
                <input value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} maxLength={100} disabled={saving}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal text-slate-700 outline-none focus:border-[#008577]" />
              </label>
              {fundAccounts.length === 0 && <p className="text-xs text-rose-600">No active fund accounts are available. Add or activate a fund account before recording this payment.</p>}
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                Minimum interest payment: <strong>{money(preview.minimum_payment)}</strong>. Any extra payment reduces the principal; remaining balance earns interest at the saved rate for the next 11 months.
              </div>
              {paymentAmount && Number.isFinite(amount) && amount > 0 && (
                <div className="space-y-1 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs">
                  <p className="flex justify-between gap-2 text-slate-600"><span>Interest covered</span><strong>{money(Math.min(amount, preview.accrued_interest))}</strong></p>
                  <p className="flex justify-between gap-2 text-slate-600"><span>Principal reduction</span><strong>{money(principalReduction)}</strong></p>
                  <p className="flex justify-between gap-2 font-bold text-[#064A41]"><span>Principal after payment</span><strong>{money(preview.current_principal - principalReduction)}</strong></p>
                </div>
              )}
              <button type="submit" disabled={!canRenew || saving} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#064A41] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#087263] disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? "Saving payment..." : <><FiRefreshCw /> {preview.current_principal <= 0 ? "Renew Loan" : "Record Payment & Renew"}</>}
              </button>
              {!active && <p className="text-center text-xs font-semibold text-slate-500">This loan is not active and cannot be renewed.</p>}
              {active && amount > preview.total_due && <p className="text-xs text-rose-600">Payment cannot exceed the total due.</p>}
              {active && paymentAmount && amount + 0.001 < preview.minimum_payment && <p className="text-xs text-rose-600">Payment must cover the accrued interest before the loan can renew.</p>}
                </>
              )}
            </form>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3"><h2 className="font-bold text-slate-800">Renewal and payment history</h2></div>
            {!renewalData.history?.length
              ? <p className="p-4 text-xs text-slate-500">No renewals recorded for this loan.</p>
              : <div className="max-h-72 overflow-auto">
                {renewalData.history.map((item) => (
                  <article key={item.id} className="space-y-1 border-b border-slate-100 p-4 last:border-0">
                    <div className="flex justify-between gap-3 text-xs"><strong className="text-slate-800">{dateText(item.renewal_date)}</strong><span className="font-bold text-[#064A41]">{money(item.payment_amount)}</span></div>
                    <p className="text-[11px] text-slate-500">Interest {money(Number(item.interest_paid) - Number(item.late_payment_fee || 0))} · Late fee {money(item.late_payment_fee)} · Principal {money(item.principal_paid)}</p>
                    <p className="text-[11px] text-slate-500">Balance {money(item.principal_after)} · New maturity {dateText(item.new_maturity_date)}</p>
                  </article>
                ))}
              </div>}
          </section>
        </aside>
      </div>
    </main>
  );
}
