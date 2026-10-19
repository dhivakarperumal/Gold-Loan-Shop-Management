import { useCallback, useEffect, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiEdit2, FiEye, FiPlus, FiSave, FiX } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../api";
import { formatRateDate } from "../../PrivateRouter/goldRateUtils";
import useGoldRates from "../../PrivateRouter/useGoldRates";

const RATE_FIELDS = [
  { key: "gold_999", label: "Gold 24K (999)", metal: "Gold", purity: "999", unit: "gram" },
  { key: "gold_916", label: "Gold 22K (916)", metal: "Gold", purity: "916", unit: "gram" },
  { key: "gold_833", label: "Gold 20K (833)", metal: "Gold", purity: "833", unit: "gram" },
  { key: "gold_750", label: "Gold 18K (750)", metal: "Gold", purity: "750", unit: "gram" },
  { key: "gold_585", label: "Gold 14K (585)", metal: "Gold", purity: "585", unit: "gram" },
  { key: "silver_999", label: "Silver 999", metal: "Silver", purity: "999", unit: "gram" },
  { key: "platinum_950", label: "Platinum 950", metal: "Platinum", purity: "950", unit: "gram" },
  { key: "platinum_900", label: "Platinum 900", metal: "Platinum", purity: "900", unit: "gram" },
  { key: "diamond_df_vvs", label: "Diamond D–F / VVS", metal: "Diamond", purity: "D-F / VVS", unit: "carat" },
  { key: "diamond_gh_vs", label: "Diamond G–H / VS", metal: "Diamond", purity: "G-H / VS", unit: "carat" },
  { key: "diamond_ij_si", label: "Diamond I–J / SI", metal: "Diamond", purity: "I-J / SI", unit: "carat" }
];

const inputClassName = "mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#008577] focus:ring-4 focus:ring-emerald-100";
const HISTORY_PAGE_SIZE = 10;

const localDate = (date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const localDateTime = (date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

function blankForm() {
  const now = new Date();
  return {
    id: null,
    expected_updated_at: null,
    expected_version: null,
    status: "Draft",
    updated_by: null,
    updated_by_name: "",
    updated_at: null,
    rate_date: localDate(now),
    effective_from: localDateTime(now),
    making_charge_type: "Percentage",
    making_charge_value: "",
    wastage_percentage: "",
    reason: "",
    rates: Object.fromEntries(RATE_FIELDS.map(({ key }) => [key, ""]))
  };
}

function formFromBatch(batch) {
  return {
    ...blankForm(),
    id: batch.id,
    expected_updated_at: batch.updated_at,
    expected_version: batch.version,
    status: batch.status,
    updated_by: batch.updated_by,
    updated_by_name: batch.updated_by_name || "",
    updated_at: batch.updated_at,
    rate_date: String(batch.rate_date).slice(0, 10),
    effective_from: localDateTime(new Date(batch.effective_from)),
    making_charge_type: batch.making_charge_type,
    making_charge_value: String(batch.making_charge_value),
    wastage_percentage: String(batch.wastage_percentage),
    rates: Object.fromEntries(RATE_FIELDS.map(({ key, metal, purity }) => {
      const rate = batch.rates.find((item) => item.metal_type.toLowerCase() === metal.toLowerCase() && item.purity === purity);
      return [key, rate ? String(rate.rate_per_unit ?? rate.rate_per_gram) : ""];
    }))
  };
}

const currency = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2
}).format(Number(value) || 0);

function TablePagination({ page, pageSize, total, onPageChange }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const firstItem = total ? (currentPage - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(currentPage * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium text-slate-500">
        Showing <span className="font-bold text-slate-700">{firstItem}–{lastItem}</span> of <span className="font-bold text-slate-700">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous page"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:text-[#006B62] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FiChevronLeft /> Previous
        </button>
        <span className="min-w-16 text-center text-xs font-bold text-slate-600">Page {currentPage} of {pageCount}</span>
        <button
          type="button"
          aria-label="Next page"
          disabled={currentPage >= pageCount}
          onClick={() => onPageChange(currentPage + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:text-[#006B62] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next <FiChevronRight />
        </button>
      </div>
    </div>
  );
}

export default function DailyGoldRate() {
  const { current, loading: currentLoading, error: currentError, refresh } = useGoldRates();
  const [form, setForm] = useState(blankForm);
  const [batches, setBatches] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [reasonOption, setReasonOption] = useState("");
  const [batchPage, setBatchPage] = useState(1);
  const [changePage, setChangePage] = useState(1);

  const batchPageCount = Math.max(1, Math.ceil(batches.length / HISTORY_PAGE_SIZE));
  const changePageCount = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));
  const visibleBatchPage = Math.min(batchPage, batchPageCount);
  const visibleChangePage = Math.min(changePage, changePageCount);
  const visibleBatches = batches.slice((visibleBatchPage - 1) * HISTORY_PAGE_SIZE, visibleBatchPage * HISTORY_PAGE_SIZE);
  const visibleHistory = history.slice((visibleChangePage - 1) * HISTORY_PAGE_SIZE, visibleChangePage * HISTORY_PAGE_SIZE);

  const loadHistory = useCallback(async () => {
    try {
      const response = await api.get("/gold-rates/history");
      const rateBatches = Array.isArray(response.data.batches) ? response.data.batches : [];
      setBatches(rateBatches);
      setForm((existingForm) => {
        const draft = rateBatches.find((batch) => batch.status === "Draft");
        return existingForm.id || !draft ? existingForm : formFromBatch(draft);
      });
      setHistory(Array.isArray(response.data.history) ? response.data.history : []);
    } catch (error) {
      console.error("Failed to load gold rate history:", error);
      toast.error(error.response?.data?.message || "Could not load rate history.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  useEffect(() => {
    if (!formOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving) setFormOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [formOpen, saving]);

  const setField = (name, value) => setForm((previous) => ({ ...previous, [name]: value }));
  const setRate = (key, value) => setForm((previous) => ({
    ...previous,
    rates: { ...previous.rates, [key]: value }
  }));

  const requestBody = () => ({
    ...form,
    making_charge_value: Number(form.making_charge_value),
    wastage_percentage: Number(form.wastage_percentage),
    rates: Object.fromEntries(Object.entries(form.rates).map(([key, value]) => [key, Number(value)]))
  });

  const persistDraft = async () => {
    const payload = requestBody();
    const response = form.id
      ? await api.put(`/gold-rates/${form.id}`, { ...payload, expected_version: form.expected_version })
      : await api.post("/gold-rates", payload);
    setForm(formFromBatch(response.data));
    await loadHistory();
    return response.data;
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form.reason.trim()) {
      toast.error("Select or enter a reason for this rate change.");
      return;
    }
    const missingRate = RATE_FIELDS.find(({ key }) => !form.rates[key] || Number(form.rates[key]) <= 0);
    if (missingRate) {
      toast.error(`Enter a valid positive rate for ${missingRate.label}.`);
      return;
    }
    if (!window.confirm("Save and activate these rates? Pending work may use the new rates. Previously saved bills, products and loans will not be recalculated.")) return;
    setSaving(true);
    try {
      const batch = await persistDraft();
      await api.post(`/gold-rates/${batch.id}/activate`, { reason: form.reason.trim() });
      setForm(blankForm());
      toast.success("Daily gold rates activated for future calculations.");
      const [refreshResult] = await Promise.allSettled([refresh(), loadHistory()]);
      setFormOpen(false);
      if (refreshResult.status === "rejected") {
        toast.error("Rates were activated, but the active rate display could not be refreshed. Retry the rate refresh.");
      }
    } catch (error) {
      console.error("Failed to save and activate gold rates:", error);
      toast.error(error.response?.data?.message || "Could not save and activate these rates.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditDraft = (batch) => {
    setForm({ ...formFromBatch(batch), reason: "" });
    setReasonOption("");
    setFormOpen(true);
  };

  const rateSetStatus = currentLoading ? "Loading" : current?.status || "Not configured";

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-7">
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#003B3B] via-[#00594f] to-[#087568] px-5 py-6 text-white shadow-lg sm:px-7">
        <div className="pointer-events-none absolute -right-10 -top-20 h-60 w-60 rounded-full border-[28px] border-white/5" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Settings · Pricing</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">Daily Precious Rates</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/75">Manage audited Gold, Silver, Platinum and Diamond rates. Activation applies to new calculations only.</p>
          </div>
          <button type="button" onClick={() => { setForm(blankForm()); setReasonOption(""); setFormOpen(true); }} className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-white/20">
            <FiPlus /> New Rate Set
          </button>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-gradient-to-br from-[#003B3B] to-[#00675d] p-5 text-white shadow-md sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-200">Currently applied rate set</p>
            <p className="mt-2 text-lg font-bold">
              {currentLoading ? "Loading current rate..." : current ? `${formatRateDate(current.rate_date)} · effective ${new Date(current.effective_from).toLocaleString()}` : "No active rate has been configured."}
            </p>
            {current && <p className="mt-1 text-xs text-white/70">Updated by {current.updated_by_name || `Admin ${current.updated_by}`} · last updated {new Date(current.updated_at).toLocaleString()}</p>}
          </div>
          <span className="rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-emerald-100">{rateSetStatus}</span>
        </div>
        {currentError && <p role="alert" className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-100">Rate refresh failed: {currentError}</p>}
        {current && <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {RATE_FIELDS.map(({ key, label, metal, purity, unit }) => {
            const rate = current.rates.find((item) => item.metal_type.toLowerCase() === metal.toLowerCase() && item.purity === purity);
            return <div key={key} className="rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur-sm"><p className="text-[11px] font-semibold text-white/70">{label}</p><p className="mt-1 text-base font-extrabold text-white">{rate ? <>{currency(rate.rate_per_unit ?? rate.rate_per_gram)}<span className="ml-1 text-[11px] font-medium text-white/70">/ {unit === "carat" ? "ct" : "g"}</span></> : <span className="text-sm font-semibold text-white/60">Not set</span>}</p></div>;
          })}
        </div>}
        {current && <div className="mt-5 border-t border-white/15 pt-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-emerald-200">Making & wastage charges</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold text-white/70">Default Making Charge</p>
              <p className="mt-1 text-base font-extrabold text-white">
                {current.making_charge_type === "Percentage"
                  ? `${Number(current.making_charge_value).toLocaleString("en-IN")}%`
                  : currency(current.making_charge_value)}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold text-white/70">Wastage</p>
              <p className="mt-1 text-base font-extrabold text-white">{Number(current.wastage_percentage).toLocaleString("en-IN")}%</p>
            </div>
          </div>
        </div>}
      </section>

      <div className="flex justify-end">
        <button type="button" onClick={() => setHistoryOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"><FiEye />{historyOpen ? "Hide Rate History" : "View Rate History"}</button>
      </div>

      {formOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setFormOpen(false); }}>
      <form onSubmit={handleSave} className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#008577]">{form.id ? "Draft rate set" : "New rate set"}</p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">{form.id ? "Update Draft Rates" : "Create Rate Set"}</h2>
            <p className="mt-1 text-sm text-slate-500">Enter rate details and save as a draft before activation.</p>
          </div>
          <div className="flex items-center gap-3">
            {form.id && <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">Draft #{form.id}</span>}
            <button type="button" disabled={saving} onClick={() => setFormOpen(false)} aria-label="Close rate set form" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"><FiX size={18} /></button>
          </div>
        </div>

        <div className="space-y-7 overflow-y-auto p-5 sm:p-7">
          <section>
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-sm font-black text-[#006b62]">01</span>
              <div><h3 className="font-bold text-slate-900">Schedule & charges</h3><p className="text-xs text-slate-500">Choose when this rate takes effect and set default jewellery charges.</p></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <label className="text-xs font-bold text-slate-600">Rate Date<input className={inputClassName} type="date" required value={form.rate_date} onChange={(event) => setField("rate_date", event.target.value)} /></label>
              <label className="text-xs font-bold text-slate-600">Effective From<input className={inputClassName} type="datetime-local" required value={form.effective_from} onChange={(event) => setField("effective_from", event.target.value)} /></label>
              <label className="text-xs font-bold text-slate-600">Making Charge Type<select className={inputClassName} value={form.making_charge_type} onChange={(event) => setField("making_charge_type", event.target.value)}><option>Percentage</option><option>Fixed Amount</option></select></label>
              <label className="text-xs font-bold text-slate-600">Default Making Charge ({form.making_charge_type === "Percentage" ? "%" : "₹"})<input className={inputClassName} type="number" min="0" step="0.01" required value={form.making_charge_value} onChange={(event) => setField("making_charge_value", event.target.value)} placeholder="0.00" /></label>
              <label className="text-xs font-bold text-slate-600">Wastage Percentage<input className={inputClassName} type="number" min="0" max="100" step="0.01" required value={form.wastage_percentage} onChange={(event) => setField("wastage_percentage", event.target.value)} placeholder="0.00" /></label>
            </div>
          </section>

          <section className="border-t border-slate-100 pt-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-sm font-black text-amber-700">02</span>
              <div><h3 className="font-bold text-slate-900">Metal & diamond prices</h3><p className="text-xs text-slate-500">Enter metals per gram and diamond quality rates per carat.</p></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {RATE_FIELDS.map(({ key, label, unit }) => (
                <label key={key} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs font-bold text-slate-700 transition focus-within:border-[#008577] focus-within:bg-emerald-50/30">
                  <span className="flex items-center justify-between gap-2"><span>{label}</span><span className="rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-slate-500">₹ / {unit}</span></span>
                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">₹</span>
                    <input className="block w-full rounded-lg border border-slate-200 bg-white py-3 pl-8 pr-3 text-sm font-bold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#008577] focus:ring-4 focus:ring-emerald-100" type="number" min="0.01" step="0.01" required value={form.rates[key]} onChange={(event) => setRate(key, event.target.value)} placeholder="Enter price" />
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section className="border-t border-slate-100 pt-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-50 text-sm font-black text-sky-700">03</span>
              <div><h3 className="font-bold text-slate-900">Audit & activation</h3><p className="text-xs text-slate-500">Record why the rate set is changing for a clear audit trail.</p></div>
            </div>
            <label className="block text-xs font-bold text-slate-600">
              Reason for change
              <select
                className={inputClassName}
                required
                value={reasonOption}
                onChange={(event) => {
                  const option = event.target.value;
                  setReasonOption(option);
                  setField("reason", option === "Other" ? "" : option);
                }}
              >
                <option value="">Select a reason</option>
                <option value="Daily market price update">Daily market price update</option>
                <option value="Market price correction">Market price correction</option>
                <option value="Other">Other</option>
              </select>
            </label>
            {reasonOption === "Other" && (
              <label className="mt-4 block text-xs font-bold text-slate-600">
                Enter reason
                <input
                  className={inputClassName}
                  maxLength="500"
                  required
                  value={form.reason}
                  onChange={(event) => setField("reason", event.target.value)}
                  placeholder="Enter the reason for this rate change"
                />
              </label>
            )}
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">
              Review pending work before activation. The system cannot identify open transactions automatically. Previously saved product and loan valuations are not recalculated.
            </p>
          </section>
        </div>

        <div className="flex shrink-0 flex-col gap-4 border-t border-slate-100 bg-slate-50/95 px-5 py-5 sm:px-7">
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
            <span>Rate status: <strong className="text-slate-700">{form.id ? form.status : "Unsaved"}</strong></span>
            {form.id && <span>Last updated: <strong>{new Date(form.updated_at || form.expected_updated_at).toLocaleString()}</strong></span>}
            {form.id && <span>Updated by: <strong>{form.updated_by_name || `Admin ${form.updated_by}`}</strong></span>}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" disabled={saving} onClick={() => setFormOpen(false)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#006B62] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#00564f] disabled:cursor-not-allowed disabled:opacity-50"><FiSave />{saving ? "Saving..." : "Save"}</button>
          </div>
        </div>
      </form>
      </div>}

      {historyOpen && <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#008577]">Audit log</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">Rate Sets & Change History</h2></div>
        {historyLoading ? <p className="text-sm text-slate-500">Loading rate history...</p> : <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-[#003B3B] text-xs uppercase tracking-wide text-white"><tr><th className="px-4 py-4">Rate date</th><th className="px-4 py-4">Status</th><th className="px-4 py-4">Effective from</th><th className="px-4 py-4">Updated by</th><th className="px-4 py-4">Last updated</th><th className="px-4 py-4">Action</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{visibleBatches.map((batch) => <tr key={batch.batch_id} className="transition hover:bg-emerald-50/40">
                  <td className="px-4 py-3 font-semibold text-slate-800">{formatRateDate(batch.rate_date)}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${batch.status === "Active" ? "bg-emerald-50 text-emerald-700" : batch.status === "Draft" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{batch.status}</span></td><td className="px-4 py-3 text-slate-600">{new Date(batch.effective_from).toLocaleString()}</td><td className="px-4 py-3 text-slate-600">{batch.updated_by_name || `Admin ${batch.updated_by}`}</td><td className="px-4 py-3 text-slate-600">{new Date(batch.updated_at).toLocaleString()}</td><td className="px-4 py-3">{batch.status === "Draft" ? <button type="button" onClick={() => handleEditDraft(batch)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-bold text-[#008577] transition hover:bg-emerald-50"><FiEdit2 />Edit</button> : <span className="text-slate-400">—</span>}</td>
                </tr>)}</tbody>
              </table>
              {!batches.length && <p className="px-4 py-6 text-center text-sm text-slate-500">No rate sets found.</p>}
            </div>
            <TablePagination page={visibleBatchPage} pageSize={HISTORY_PAGE_SIZE} total={batches.length} onPageChange={setBatchPage} />
          </div>
          <div>
            <h3 className="mb-3 font-bold text-slate-700">Changes</h3>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-xs">
                  <thead className="bg-slate-100 uppercase tracking-wide text-slate-600"><tr><th className="px-4 py-4">Timestamp</th><th className="px-4 py-4">Metal / grade / unit</th><th className="px-4 py-4">Previous</th><th className="px-4 py-4">New</th><th className="px-4 py-4">Action</th><th className="px-4 py-4">By / reason</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{visibleHistory.map((item) => <tr key={item.id} className="transition hover:bg-slate-50"><td className="px-4 py-3 whitespace-nowrap text-slate-600">{new Date(item.changed_at).toLocaleString()}</td><td className="px-4 py-3 font-semibold text-slate-700">{item.metal_type} {item.purity} <span className="font-normal text-slate-500">/ {item.rate_unit === "carat" ? "ct" : "g"}</span></td><td className="px-4 py-3">{item.previous_rate == null ? "—" : currency(item.previous_rate)}</td><td className="px-4 py-3 font-semibold">{item.new_rate == null ? "—" : currency(item.new_rate)}</td><td className="px-4 py-3">{item.action}</td><td className="max-w-sm px-4 py-3 text-slate-600">{item.updated_by_name || `Admin ${item.changed_by}`} · {item.reason}</td></tr>)}</tbody>
                </table>
                {!history.length && <p className="px-4 py-6 text-center text-sm text-slate-500">No rate changes have been recorded.</p>}
              </div>
              <TablePagination page={visibleChangePage} pageSize={HISTORY_PAGE_SIZE} total={history.length} onPageChange={setChangePage} />
            </div>
          </div>
        </>}
      </section>}
    </main>
  );
}
