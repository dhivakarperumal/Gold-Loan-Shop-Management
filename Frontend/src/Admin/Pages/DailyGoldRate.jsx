import { useCallback, useEffect, useState } from "react";
import { FiActivity, FiEdit2, FiEye, FiPlus, FiSave } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../api";
import { formatRateDate } from "../../PrivateRouter/goldRateUtils";
import useGoldRates from "../../PrivateRouter/useGoldRates";

const RATE_FIELDS = [
  ["gold_999", "Gold 24K (999)"],
  ["gold_916", "Gold 22K (916)"],
  ["gold_833", "Gold 20K (833)"],
  ["gold_750", "Gold 18K (750)"],
  ["gold_585", "Gold 14K (585)"],
  ["silver_999", "Silver 999"]
];

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
    rates: Object.fromEntries(RATE_FIELDS.map(([key]) => [key, ""]))
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
    rates: Object.fromEntries(RATE_FIELDS.map(([key]) => {
      const [metal, purity] = key.split("_");
      const rate = batch.rates.find((item) => item.metal_type.toLowerCase() === metal && item.purity === purity);
      return [key, rate ? String(rate.rate_per_gram) : ""];
    }))
  };
}

const currency = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2
}).format(Number(value) || 0);

export default function DailyGoldRate() {
  const { current, loading: currentLoading, error: currentError, refresh } = useGoldRates();
  const [form, setForm] = useState(blankForm);
  const [batches, setBatches] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      toast.error("Enter a reason for this rate change.");
      return;
    }
    setSaving(true);
    try {
      await persistDraft();
      toast.success(form.id ? "Draft rates updated." : "Draft rates saved.");
    } catch (error) {
      console.error("Failed to save gold rate draft:", error);
      toast.error(error.response?.data?.message || "Could not save these rates.");
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!form.reason.trim()) {
      toast.error("Enter a reason before activating the rates.");
      return;
    }
    if (!window.confirm("Activate these rates? Pending work may use the new rates. Previously saved bills, products and loans will not be recalculated.")) return;
    setSaving(true);
    try {
      const batch = await persistDraft();
      await api.post(`/gold-rates/${batch.id}/activate`, { reason: form.reason.trim() });
      setForm(blankForm());
      toast.success("Daily gold rates activated for future calculations.");
      const [refreshResult] = await Promise.allSettled([refresh(), loadHistory()]);
      if (refreshResult.status === "rejected") {
        toast.error("Rates were activated, but the active rate display could not be refreshed. Retry the rate refresh.");
      }
    } catch (error) {
      console.error("Failed to activate gold rates:", error);
      toast.error(error.response?.data?.message || "Could not activate these rates.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditDraft = (batch) => {
    setForm({ ...formFromBatch(batch), reason: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const rateSetStatus = currentLoading ? "Loading" : current?.status || "Not configured";

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#008577]">Settings</p>
          <h1 className="mt-1 text-2xl font-black text-[#003B3B]">Daily Gold Rate</h1>
          <p className="mt-1 text-sm text-slate-500">Manage one audited global rate set. Activation applies to new calculations only.</p>
        </div>
        <button type="button" onClick={() => setForm(blankForm())} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-[#008577]">
          <FiPlus /> New Rate Set
        </button>
      </header>

      <section className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Currently applied rate set</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {currentLoading ? "Loading current rate..." : current ? `${formatRateDate(current.rate_date)} · effective ${new Date(current.effective_from).toLocaleString()}` : "No active rate has been configured."}
            </p>
            {current && <p className="mt-1 text-xs text-slate-600">Updated by {current.updated_by_name || `Admin ${current.updated_by}`} · last updated {new Date(current.updated_at).toLocaleString()}</p>}
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-800">{rateSetStatus}</span>
        </div>
        {currentError && <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">Rate refresh failed: {currentError}</p>}
        {current && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {RATE_FIELDS.map(([key, label]) => {
            const [metal, purity] = key.split("_");
            const rate = current.rates.find((item) => item.metal_type.toLowerCase() === metal && item.purity === purity);
            return <div key={key} className="rounded-lg bg-white px-3 py-2"><p className="text-[10px] font-bold text-slate-500">{label}</p><p className="mt-1 text-sm font-extrabold text-[#003B3B]">{currency(rate?.rate_per_gram)} / g</p></div>;
          })}
        </div>}
      </section>

      <form onSubmit={handleSave} className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">{form.id ? "Update Draft Rates" : "Create Rate Set"}</h2>
            <p className="text-xs text-slate-500">All six metal rates are saved and activated as one transaction.</p>
          </div>
          {form.id && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Draft #{form.id}</span>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-bold text-slate-600">Rate Date<input className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium" type="date" required value={form.rate_date} onChange={(event) => setField("rate_date", event.target.value)} /></label>
          <label className="text-xs font-bold text-slate-600">Effective From<input className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium" type="datetime-local" required value={form.effective_from} onChange={(event) => setField("effective_from", event.target.value)} /></label>
          <label className="text-xs font-bold text-slate-600">Making Charge Type<select className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium" value={form.making_charge_type} onChange={(event) => setField("making_charge_type", event.target.value)}><option>Percentage</option><option>Fixed Amount</option></select></label>
          <label className="text-xs font-bold text-slate-600">Default Making Charge ({form.making_charge_type === "Percentage" ? "%" : "₹"})<input className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium" type="number" min="0" step="0.01" required value={form.making_charge_value} onChange={(event) => setField("making_charge_value", event.target.value)} /></label>
          <label className="text-xs font-bold text-slate-600">Wastage Percentage<input className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium" type="number" min="0" max="100" step="0.01" required value={form.wastage_percentage} onChange={(event) => setField("wastage_percentage", event.target.value)} /></label>
          {RATE_FIELDS.map(([key, label]) => <label key={key} className="text-xs font-bold text-slate-600">{label} — price per gram (₹)<input className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium" type="number" min="0.01" step="0.01" required value={form.rates[key]} onChange={(event) => setRate(key, event.target.value)} /></label>)}
        </div>

        <label className="block text-xs font-bold text-slate-600">Reason for change<input className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium" maxLength="500" required value={form.reason} onChange={(event) => setField("reason", event.target.value)} placeholder="e.g. Daily market price update" /></label>
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Before activation, review pending work. This backend has no persisted draft billing, quotation, or purchase records connected to the rate service, so it cannot automatically identify open transactions. Saved product and loan valuations are not recalculated.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="text-xs text-slate-500">
            <span>Rate status: <strong className="text-slate-700">{form.id ? form.status : "Unsaved"}</strong></span>
            {form.id && <span className="ml-4">Last updated: <strong>{new Date(form.updated_at || form.expected_updated_at).toLocaleString()}</strong></span>}
            {form.id && <span className="ml-4">Updated by: <strong>{form.updated_by_name || `Admin ${form.updated_by}`}</strong></span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#006B62] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><FiSave />{saving ? "Saving..." : form.id ? "Update Rates" : "Save Rates"}</button>
            <button type="button" disabled={saving} onClick={handleActivate} className="inline-flex items-center gap-2 rounded-lg bg-[#003B3B] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><FiActivity />Activate Rates</button>
            <button type="button" onClick={() => setHistoryOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"><FiEye />{historyOpen ? "Hide History" : "View Rate History"}</button>
          </div>
        </div>
      </form>

      {historyOpen && <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-extrabold text-slate-800">Rate Sets & Audit History</h2>
        {historyLoading ? <p className="text-sm text-slate-500">Loading rate history...</p> : <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-[#003B3B] text-xs uppercase text-white"><tr><th className="px-3 py-3">Rate date</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Effective from</th><th className="px-3 py-3">Updated by</th><th className="px-3 py-3">Last updated</th><th className="px-3 py-3">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{batches.map((batch) => <tr key={batch.batch_id}>
                <td className="px-3 py-3 font-semibold">{formatRateDate(batch.rate_date)}</td><td className="px-3 py-3">{batch.status}</td><td className="px-3 py-3">{new Date(batch.effective_from).toLocaleString()}</td><td className="px-3 py-3">{batch.updated_by_name || `Admin ${batch.updated_by}`}</td><td className="px-3 py-3">{new Date(batch.updated_at).toLocaleString()}</td><td className="px-3 py-3">{batch.status === "Draft" ? <button type="button" onClick={() => handleEditDraft(batch)} className="inline-flex items-center gap-1 font-bold text-[#008577]"><FiEdit2 />Edit</button> : "—"}</td>
              </tr>)}</tbody>
            </table>
            {!batches.length && <p className="py-5 text-sm text-slate-500">No rate sets found.</p>}
          </div>
          <div className="overflow-x-auto">
            <h3 className="mb-2 font-bold text-slate-700">Changes</h3>
            <table className="w-full min-w-[800px] text-left text-xs">
              <thead className="bg-slate-100 uppercase text-slate-600"><tr><th className="px-3 py-2">Timestamp</th><th className="px-3 py-2">Metal / purity</th><th className="px-3 py-2">Previous</th><th className="px-3 py-2">New</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">By / reason</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{history.map((item) => <tr key={item.id}><td className="px-3 py-2">{new Date(item.changed_at).toLocaleString()}</td><td className="px-3 py-2">{item.metal_type} {item.purity}</td><td className="px-3 py-2">{item.previous_rate == null ? "—" : currency(item.previous_rate)}</td><td className="px-3 py-2">{item.new_rate == null ? "—" : currency(item.new_rate)}</td><td className="px-3 py-2">{item.action}</td><td className="px-3 py-2">{item.updated_by_name || `Admin ${item.changed_by}`} · {item.reason}</td></tr>)}</tbody>
            </table>
            {!history.length && <p className="py-4 text-sm text-slate-500">No rate changes have been recorded.</p>}
          </div>
        </>}
      </section>}
    </main>
  );
}
