import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiArrowLeft, FiCalendar, FiUser } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api, { getPrivateFile } from "../../api";

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2
}).format(Number(value || 0));
const dateText = (value) => value ? new Date(value).toLocaleDateString("en-IN") : "—";

function Detail({ label, value }) {
  return <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-semibold text-slate-800">{value || "—"}</p></div>;
}

export default function LoanDetails() {
  const { id } = useParams();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [goldImage, setGoldImage] = useState(null);

  useEffect(() => {
    let active = true;
    api.get(`/loans/${id}`)
      .then(({ data }) => { if (active) setLoan(data); })
      .catch((error) => {
        console.error("Failed to load loan details:", error);
        if (active) toast.error(error.response?.data?.message || "Could not load loan details.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!loan?.gold_image_url) return undefined;
    let active = true;
    let objectUrl = "";
    getPrivateFile(loan.gold_image_url, { responseType: "blob" })
      .then(({ data }) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(data);
        setGoldImage({ reference: loan.gold_image_url, url: objectUrl });
      })
      .catch((error) => {
        console.error("Failed to load pledged gold image:", error);
        if (active) toast.error(error.response?.data?.message || "Could not load the gold image.");
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [loan?.gold_image_url]);

  const goldImageUrl = goldImage && goldImage.reference === loan?.gold_image_url ? goldImage.url : "";

  if (loading) return <main className="p-6 text-sm text-slate-500">Loading loan details...</main>;
  if (!loan) return <main className="p-6"><p className="text-slate-600">Loan not found.</p><Link to="/admin/loans/allloans" className="mt-3 inline-block text-sm font-semibold text-[#008577]">Back to all loans</Link></main>;

  return (
    <main className="space-y-5 p-4 sm:p-6">
      <Link to="/admin/loans/allloans" className="inline-flex items-center gap-2 text-sm font-semibold text-[#008577]"><FiArrowLeft /> All Loans</Link>
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#003B3B] p-5 text-white shadow-sm">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-emerald-100">Gold Loan</p><h1 className="mt-1 text-2xl font-extrabold">{loan.loan_number}</h1><p className="mt-1 text-sm text-white/75">Created {dateText(loan.created_at)}</p></div>
        <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold">{loan.loan_status}</span>
      </header>

      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 font-bold text-[#003B3B]"><FiUser /> Customer</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Customer ID" value={loan.customer_code || loan.customer_id} />
          <Detail label="Full Name" value={loan.customer_name} />
          <Detail label="Mobile" value={loan.customer_mobile} />
          <Detail label="KYC Status" value={loan.customer_kyc_status} />
          <div className="sm:col-span-2 lg:col-span-4"><Detail label="Address" value={[loan.customer_address, loan.customer_city, loan.customer_district].filter(Boolean).join(", ")} /></div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-bold text-[#003B3B]">Pledged Jewellery & Loan Amount</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Gold Pledge Number" value={loan.gold_pledge_number} />
          <Detail label="Jewellery Type" value={loan.jewellery_type} />
          <Detail label="Gold Purity" value={loan.gold_purity} />
          <Detail label="Gross Weight" value={`${loan.gross_weight} g`} />
          <Detail label="Stone Weight" value={`${loan.stone_weight} g`} />
          <Detail label="Net Gold Weight" value={`${loan.net_gold_weight} g`} />
          <Detail label="Gold Valuation" value={money(loan.gold_valuation)} />
          {loan.gold_rate_per_gram != null && <Detail label="Applied Rate Snapshot" value={`${money(loan.gold_rate_per_gram)} / g`} />}
          {loan.gold_rate_date && <Detail label="Rate Date" value={dateText(loan.gold_rate_date)} />}
          <Detail label="Loan Amount" value={money(loan.principal_amount)} />
        </div>
      </section>
      {goldImageUrl && (
        <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-bold text-[#003B3B]">Pledged Gold Image</h2>
          <img src={goldImageUrl} alt={`Pledged ${loan.jewellery_type}`} className="max-h-96 w-auto rounded-lg border border-slate-200 object-contain" />
        </section>
      )}

      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 font-bold text-[#003B3B]"><FiCalendar /> Contract Terms</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Interest Type" value={String(loan.interest_type || "").replaceAll("_", " ")} />
          <Detail label="Interest Rate" value={`${loan.interest_rate}% / ${String(loan.interest_frequency || "").replaceAll("_", " ")}`} />
          {loan.custom_period_days != null && <Detail label="Custom Interest Period" value={`${loan.custom_period_days} days`} />}
          <Detail label="Calculation Start" value={dateText(loan.interest_calculation_start_date)} />
          <Detail label="Day-Count Convention" value={loan.day_count_convention} />
          <Detail label="Compounding Frequency" value={loan.compounding_frequency} />
          <Detail label="Grace Period" value={`${loan.grace_period_days} days`} />
          <Detail label="Interest-Free Period" value={`${loan.interest_free_days} days`} />
          <Detail label="Late Payment Rate" value={loan.late_payment_interest_rate == null ? "Not set" : `${loan.late_payment_interest_rate}%`} />
          <Detail label="Processing Fee" value={money(loan.processing_fee)} />
          <Detail label="Other Charges" value={money(loan.other_charges)} />
          <Detail label="Loan Date" value={dateText(loan.loan_date)} />
          <Detail label="Maturity Date" value={dateText(loan.maturity_date)} />
          <Detail label="Payment Frequency" value={loan.payment_frequency} />
          {loan.fixed_interest_amount != null && <Detail label="Fixed Interest Amount" value={money(loan.fixed_interest_amount)} />}
          {loan.minimum_interest_amount != null && <Detail label="Minimum Interest" value={money(loan.minimum_interest_amount)} />}
          {loan.maximum_interest_amount != null && <Detail label="Maximum Interest" value={money(loan.maximum_interest_amount)} />}
        </div>
        {loan.notes && <div className="mt-3"><Detail label="Notes" value={loan.notes} /></div>}
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">This page shows the terms saved at loan creation. A live outstanding or settlement balance requires a repayment ledger, which is not yet configured.</p>
      </section>
    </main>
  );
}
