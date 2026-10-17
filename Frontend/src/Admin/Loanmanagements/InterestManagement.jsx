import { useEffect, useState } from "react";
import { FiPercent } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../api";

export default function InterestManagement() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/loans/interest-types")
      .then(({ data }) => {
        if (!Array.isArray(data)) throw new Error("The server returned invalid interest methods.");
        if (active) setTypes(data.map((type) => ({ ...type, enabled: Boolean(type.enabled) })));
      })
      .catch((error) => {
        console.error("Failed to load interest methods:", error);
        if (active) toast.error(error.response?.data?.message || error.message || "Could not load interest methods.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const toggleType = async (type) => {
    setSavingType(type.type_key);
    try {
      const enabled = !type.enabled;
      await api.patch(`/loans/interest-types/${type.type_key}`, { enabled });
      setTypes((current) => current.map((item) => item.type_key === type.type_key ? { ...item, enabled } : item));
      toast.success(`${type.label} ${enabled ? "enabled" : "disabled"} for new loans.`);
    } catch (error) {
      console.error("Failed to update interest method:", error);
      toast.error(error.response?.data?.message || "Could not update this interest method.");
    } finally {
      setSavingType("");
    }
  };

  return (
    <main className="space-y-5 p-4 sm:p-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-[#003B3B]"><FiPercent /> Interest Management</h1>
        <p className="mt-1 text-sm text-slate-500">Choose which interest methods administrators can select for new loans. Existing loan terms remain unchanged.</p>
      </header>
      <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="grid grid-cols-[1fr_auto] gap-3 bg-[#003B3B] px-4 py-4 text-xs font-bold uppercase tracking-wide text-white">
          <span>Interest Method</span><span>Available for new loans</span>
        </div>
        {loading ? <p className="p-6 text-sm text-slate-500">Loading interest methods...</p>
          : types.map((type) => (
            <label key={type.type_key} className="flex cursor-pointer items-center justify-between gap-4 border-t border-slate-100 px-4 py-4 hover:bg-emerald-50/40">
              <span><span className="block text-sm font-semibold text-slate-800">{type.label}</span><span className="mt-0.5 block text-xs text-slate-500">{type.type_key.replaceAll("_", " ")}</span></span>
              <input
                type="checkbox"
                checked={type.enabled}
                disabled={savingType === type.type_key}
                onChange={() => toggleType(type)}
                aria-label={`Enable ${type.label} for new loans`}
                className="h-5 w-5 accent-[#008577] disabled:opacity-50"
              />
            </label>
          ))}
      </section>
      <p className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
        Interest rates and contract terms are entered and preserved on each loan. Confirm your approved rate policy and disclosures before creating or servicing lending contracts.
      </p>
    </main>
  );
}
