import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiCheck, FiCheckCircle, FiEdit2, FiEye, FiGrid, FiLayers, FiList, FiPauseCircle, FiPlus, FiRefreshCw, FiSearch, FiTrash2 } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../api";

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2
}).format(Number(value || 0));
const dateText = (value) => value ? new Date(value).toLocaleDateString("en-IN") : "—";

export default function AllLoans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState("table");
  const loadLoans = async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
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
  useEffect(() => { loadLoans({ showLoading: false }); }, []);

  const loanCounts = loans.reduce((counts, loan) => {
    const status = String(loan.loan_status || "").trim().toLowerCase();
    if (status === "active") counts.active += 1;
    if (status === "inactive") counts.inactive += 1;
    if (status === "completed") counts.completed += 1;
    return counts;
  }, { active: 0, inactive: 0, completed: 0 });
  const summaryCards = [
    { label: "Total Loans", value: loans.length, icon: FiLayers, color: "bg-teal-50 text-[#008577]" },
    { label: "Active Loans", value: loanCounts.active, icon: FiCheckCircle, color: "bg-emerald-50 text-emerald-700" },
    { label: "Inactive Loans", value: loanCounts.inactive, icon: FiPauseCircle, color: "bg-amber-50 text-amber-700" },
    { label: "Completed Loans", value: loanCounts.completed, icon: FiCheck, color: "bg-slate-100 text-slate-600" }
  ];
  const filteredLoans = loans.filter((loan) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = !query || [
      loan.loan_number,
      loan.customer_name,
      loan.customer_code,
      loan.customer_mobile
    ].some((value) => String(value || "").toLowerCase().includes(query));
    const matchesStatus = statusFilter === "All"
      || String(loan.loan_status || "").trim().toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });
  const getStatusStyle = (status) => {
    switch (String(status || "").trim().toLowerCase()) {
      case "active": return "bg-emerald-50 text-emerald-700";
      case "inactive": return "bg-amber-50 text-amber-700";
      case "completed": return "bg-slate-100 text-slate-600";
      case "pending": return "bg-blue-50 text-blue-700";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <main className="space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#003B3B]">All Loans</h1>
          <p className="mt-1 text-sm text-slate-500">Registered gold loans linked to their customers.</p>
        </div>
        <button type="button" onClick={loadLoans} disabled={loading} aria-label="Refresh loans" title="Refresh loans" className="rounded-lg bg-[#008577] p-3 text-white hover:bg-[#00695C] disabled:opacity-60">
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
        </button>
      </header>
      <section aria-label="Loan summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, icon: Icon, color }) => (
          <article key={label} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-extrabold text-[#003B3B]">{loading ? "—" : value}</p>
            </div>
            <span className={`rounded-xl p-3 ${color}`}><Icon size={22} aria-hidden="true" /></span>
          </article>
        ))}
      </section>
      <section aria-label="Loan list controls" className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <label className="relative min-w-0 sm:w-1/3 sm:flex-none">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <span className="sr-only">Search loans</span>
          <input
            type="search"
            placeholder="Search loans by number, customer..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-[#008577] focus:bg-white"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:ml-auto sm:justify-start">
          <select
            aria-label="Filter loans by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 outline-none focus:border-[#008577]"
          >
            <option value="All">Select Status</option>
            {["Active", "Inactive", "Completed", "Pending"].map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1">
            <button type="button" onClick={() => setViewMode("table")} aria-label="List view" aria-pressed={viewMode === "table"} className={`rounded-lg p-2 transition-all ${viewMode === "table" ? "bg-[#003B3B] text-white shadow-sm" : "text-slate-400 hover:text-slate-600"}`}><FiList size={17} /></button>
            <button type="button" onClick={() => setViewMode("grid")} aria-label="Card view" aria-pressed={viewMode === "grid"} className={`rounded-lg p-2 transition-all ${viewMode === "grid" ? "bg-[#003B3B] text-white shadow-sm" : "text-slate-400 hover:text-slate-600"}`}><FiGrid size={17} /></button>
          </div>
          <Link to="/admin/loans/createloan" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#003B3B] px-4 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#008577]"><FiPlus size={16} /> Create Loan</Link>
        </div>
      </section>
      {viewMode === "table" ? (
        <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left">
              <thead><tr className="bg-[#003B3B] text-xs font-bold uppercase tracking-wide text-white">
                {["S No", "Loan Number", "Customer", "Mobile", "Loan Amount", "Interest", "Maturity", "Status", "Actions"].map((title) => <th key={title} className="px-4 py-4">{title}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan="9" className="px-4 py-12 text-center text-sm text-slate-400">Loading loans...</td></tr>
                  : filteredLoans.length === 0 ? <tr><td colSpan="9" className="px-4 py-12 text-center text-sm text-slate-400">{loans.length === 0 ? "No loans created yet." : "No loans match your search or status filter."}</td></tr>
                    : filteredLoans.map((loan, index) => (
                      <tr key={loan.id} className="text-sm hover:bg-emerald-50/40">
                        <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                        <td className="px-4 py-3 font-bold text-[#003B3B]">{loan.loan_number}</td>
                        <td className="px-4 py-3"><p className="font-semibold">{loan.customer_name}</p><p className="text-xs text-slate-500">{loan.customer_code}</p></td>
                        <td className="px-4 py-3">{loan.customer_mobile}</td>
                        <td className="px-4 py-3 font-semibold">{money(loan.principal_amount)}</td>
                        <td className="px-4 py-3">{loan.interest_rate}% · {String(loan.interest_type).replaceAll("_", " ")}</td>
                        <td className="px-4 py-3">{dateText(loan.maturity_date)}</td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${getStatusStyle(loan.loan_status)}`}>{loan.loan_status}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Link to={`/admin/loans/details/${loan.id}`} aria-label={`View loan ${loan.loan_number}`} title="View loan" className="rounded-lg p-2 text-slate-500 hover:bg-teal-50 hover:text-[#008577]"><FiEye size={16} /></Link>
                            <Link to={`/admin/loans/edit/${loan.id}`} aria-label={`Edit loan ${loan.loan_number}`} title="Edit loan" className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"><FiEdit2 size={16} /></Link>
                            <button type="button" onClick={() => handleDeleteLoan(loan)} aria-label={`Delete loan ${loan.loan_number}`} title="Delete loan" className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><FiTrash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        loading ? <section className="rounded-xl border border-slate-100 bg-white px-4 py-12 text-center text-sm text-slate-400">Loading loans...</section>
          : filteredLoans.length === 0 ? <section className="rounded-xl border border-slate-100 bg-white px-4 py-12 text-center text-sm text-slate-400">{loans.length === 0 ? "No loans created yet." : "No loans match your search or status filter."}</section>
            : <section aria-label="Loans in card view" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredLoans.map((loan) => (
                <article key={loan.id} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Loan Number</p><h2 className="mt-1 font-extrabold text-[#003B3B]">{loan.loan_number}</h2></div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${getStatusStyle(loan.loan_status)}`}>{loan.loan_status}</span>
                  </div>
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="font-semibold text-slate-800">{loan.customer_name}</p>
                    <p className="mt-1 text-xs text-slate-500">{loan.customer_code} · {loan.customer_mobile}</p>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div><dt className="text-xs text-slate-500">Loan Amount</dt><dd className="mt-1 font-bold text-[#003B3B]">{money(loan.principal_amount)}</dd></div>
                      <div><dt className="text-xs text-slate-500">Maturity</dt><dd className="mt-1 font-semibold text-slate-700">{dateText(loan.maturity_date)}</dd></div>
                      <div className="col-span-2"><dt className="text-xs text-slate-500">Interest</dt><dd className="mt-1 font-semibold text-slate-700">{loan.interest_rate}% · {String(loan.interest_type).replaceAll("_", " ")}</dd></div>
                    </dl>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <Link to={`/admin/loans/details/${loan.id}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#008577] hover:underline"><FiEye /> View</Link>
                      <div className="flex items-center gap-1">
                        <Link to={`/admin/loans/edit/${loan.id}`} aria-label={`Edit loan ${loan.loan_number}`} title="Edit loan" className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"><FiEdit2 size={16} /></Link>
                        <button type="button" onClick={() => handleDeleteLoan(loan)} aria-label={`Delete loan ${loan.loan_number}`} title="Delete loan" className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><FiTrash2 size={16} /></button>
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
