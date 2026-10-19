import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiCalendar, FiCheckCircle, FiChevronRight, FiRefreshCw, FiSearch } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api, { getPrivateFile } from "../../api";

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2
}).format(Number(value || 0));

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

function Info({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-800">{value || "—"}</dd>
    </div>
  );
}

export default function LoanRenewal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [renewalData, setRenewalData] = useState(null);
  const [search, setSearch] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [goldImage, setGoldImage] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    const request = id
      ? api.get(`/loans/${id}/renewal`).then(({ data }) => {
        if (active) setRenewalData(data);
      })
      : api.get("/loans").then(({ data }) => {
        if (!Array.isArray(data)) throw new Error("The server returned an invalid loan list.");
        if (active) {
          setLoans(data.filter((loan) =>
            loan.loan_status === "Active"
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
  }, [id]);

  const loan = renewalData?.loan;
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
    return !query || [
      item.loan_number, item.customer_name, item.customer_code, item.customer_mobile
    ].some((value) => String(value || "").toLowerCase().includes(query));
  });

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
      const { data } = await api.post(`/loans/${id}/renewal`, { payment_amount: amount });
      setRenewalData(data);
      setPaymentAmount("");
      if (data.preview.current_principal === 0) {
        toast.success("Loan paid in full. Complete and record the gold release.");
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

  if (!id) {
    return (
      <main className="space-y-6 p-4 sm:p-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#008577]">Loan Management</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Loan Renewal</h1>
            <p className="mt-1 text-sm text-slate-500">Select a loan to review its balance, collect payment, and renew its term.</p>
          </div>
          <span className="text-xs font-semibold text-slate-400">{loans.length} loans</span>
        </header>
        <label className="relative block max-w-xl">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <span className="sr-only">Search loans</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search loan number, customer, mobile..."
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-[#008577] focus:ring-4 focus:ring-emerald-700/10" />
        </label>
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-slate-800">Choose an active loan</h2>
            <p className="mt-0.5 text-xs text-slate-500">Select a row to open its renewal and payment details.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-separate border-spacing-0 text-left">
              <thead><tr className="bg-[#064A41] text-[11px] font-bold uppercase tracking-wide text-emerald-50/90">
                {["Loan Number", "Customer", "Mobile", "Principal", "Balance", "Interest", "Maturity", ""].map((label) =>
                  <th key={label} className="whitespace-nowrap px-4 py-3 first:pl-5">{label}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading
                  ? <tr><td colSpan="8" className="px-4 py-14 text-center text-sm text-slate-400">Loading loans...</td></tr>
                  : filteredLoans.length === 0
                    ? <tr><td colSpan="8" className="px-4 py-14 text-center text-sm text-slate-400">{loans.length ? "No loans match your search." : "No active loans are available for renewal."}</td></tr>
                    : filteredLoans.map((item) => (
                      <tr key={item.id} className={`text-sm transition-colors ${item.loan_status === "Active" ? "cursor-pointer hover:bg-emerald-50/60" : "opacity-60"}`}
                        onClick={() => item.loan_status === "Active" && navigate(Number(item.outstanding_principal ?? item.principal_amount) === 0 ? `/admin/loans/completeloan/${item.id}` : `/admin/loans/loanreniwel/${item.id}`)}>
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
                              ? <Link to={`/admin/loans/loanreniwel/${item.id}`} onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">Renew <FiChevronRight /></Link>
                            : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">{item.loan_status}</span>}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </section>
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

  return (
    <main className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6">
      <Link to="/admin/loans/loanreniwel" className="inline-flex items-center gap-2 text-sm font-semibold text-[#008577]"><FiArrowLeft /> All loans for renewal</Link>
      <header className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-br from-[#064A41] to-[#087568] p-5 text-white shadow-lg sm:flex-row sm:items-center sm:p-6">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Loan Renewal</p><h1 className="mt-1 text-2xl font-extrabold">{loan.loan_number}</h1><p className="mt-1 text-sm text-white/75">{loan.customer_name} · {loan.customer_mobile || "No mobile"}</p></div>
        <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${active ? "bg-emerald-300/20 text-emerald-50" : "bg-white/15 text-white"}`}>{loan.loan_status}</span>
      </header>

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
              <Info label="Current maturity" value={dateText(loan.maturity_date)} />
              <Info label="Renewal date" value={dateText(preview.renewal_date)} />
              <Info label="Compounding frequency" value={loan.compounding_frequency} />
              <Info label="Payment frequency" value={loan.payment_frequency} />
              <Info label="Custom interest period" value={loan.custom_period_days == null ? "—" : `${loan.custom_period_days} days`} />
              <Info label="Grace period" value={`${loan.grace_period_days || 0} days`} />
              <Info label="Interest-free period" value={`${loan.interest_free_days || 0} days`} />
              <Info label="Late payment rate" value={loan.late_payment_interest_rate == null ? "Not set" : rateText(loan.late_payment_interest_rate)} />
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
              <div className="flex justify-between gap-3 text-slate-600"><span>Interest accrued</span><strong className="text-slate-800">{money(preview.accrued_interest)}</strong></div>
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
                    <p className="text-[11px] text-slate-500">Interest {money(item.interest_paid)} · Principal {money(item.principal_paid)}</p>
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
