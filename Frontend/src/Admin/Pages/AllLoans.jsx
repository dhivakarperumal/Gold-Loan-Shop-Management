import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiPlus, FiRefreshCw } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../api";

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2
}).format(Number(value || 0));
const dateText = (value) => value ? new Date(value).toLocaleDateString("en-IN") : "—";

export default function AllLoans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const loadLoans = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/loans");
      if (!Array.isArray(data)) throw new Error("The server returned an invalid loan list.");
      setLoans(data);
    } catch (error) {
      console.error("Failed to load loans:", error);
      toast.error(error.response?.data?.message || error.message || "Could not load loans.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadLoans(); }, []);

  return (
    <main className="space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold text-[#003B3B]">All Loans</h1><p className="mt-1 text-sm text-slate-500">Registered gold loans linked to their customers.</p></div>
        <div className="flex gap-2">
          <button type="button" onClick={loadLoans} disabled={loading} aria-label="Refresh loans" title="Refresh loans" className="rounded-lg bg-[#008577] p-3 text-white hover:bg-[#00695C] disabled:opacity-60"><FiRefreshCw className={loading ? "animate-spin" : ""} /></button>
          <Link to="/admin/loans/createloan" className="inline-flex items-center gap-2 rounded-lg bg-[#003B3B] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#008577]"><FiPlus /> Create Loan</Link>
        </div>
      </header>
      <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left">
            <thead><tr className="bg-[#003B3B] text-xs font-bold uppercase tracking-wide text-white">
              {["S No", "Loan Number", "Customer", "Mobile", "Loan Amount", "Interest", "Maturity", "Status", ""].map((title) => <th key={title} className="px-4 py-4">{title}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan="9" className="px-4 py-12 text-center text-sm text-slate-400">Loading loans...</td></tr>
                : loans.length === 0 ? <tr><td colSpan="9" className="px-4 py-12 text-center text-sm text-slate-400">No loans created yet.</td></tr>
                  : loans.map((loan, index) => (
                    <tr key={loan.id} className="text-sm hover:bg-emerald-50/40">
                      <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                      <td className="px-4 py-3 font-bold text-[#003B3B]">{loan.loan_number}</td>
                      <td className="px-4 py-3"><p className="font-semibold">{loan.customer_name}</p><p className="text-xs text-slate-500">{loan.customer_code}</p></td>
                      <td className="px-4 py-3">{loan.customer_mobile}</td>
                      <td className="px-4 py-3 font-semibold">{money(loan.principal_amount)}</td>
                      <td className="px-4 py-3">{loan.interest_rate}% · {String(loan.interest_type).replaceAll("_", " ")}</td>
                      <td className="px-4 py-3">{dateText(loan.maturity_date)}</td>
                      <td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{loan.loan_status}</span></td>
                      <td className="px-4 py-3"><Link to={`/admin/loans/details/${loan.id}`} className="font-semibold text-[#008577] hover:underline">Details</Link></td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
