import { useState } from "react";
import { CalendarDays, RotateCcw } from "lucide-react";
import { DATE_RANGE_OPTIONS, resolveDatePreset } from "./dateRange";

export default function DateRangeFilter({ onApply, className = "" }) {
  const [preset, setPreset] = useState("all");
  const [customRange, setCustomRange] = useState({ startDate: "", endDate: "" });
  const [error, setError] = useState("");

  const selectPreset = (value) => {
    setPreset(value);
    setError("");
    if (value !== "custom") onApply(resolveDatePreset(value));
  };

  const applyCustomRange = () => {
    if (!customRange.startDate || !customRange.endDate) {
      setError("Choose both start and end dates.");
      return;
    }
    if (customRange.startDate > customRange.endDate) {
      setError("Start date cannot be later than end date.");
      return;
    }
    setError("");
    onApply({ preset: "custom", ...customRange });
  };

  const clearFilter = () => {
    setPreset("all");
    setCustomRange({ startDate: "", endDate: "" });
    setError("");
    onApply(resolveDatePreset("all"));
  };

  return (
    <div className={` ${className}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="flex min-h-10 min-w-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-slate-700 focus-within:border-[#008577] focus-within:ring-2 focus-within:ring-emerald-800/10">
          <CalendarDays size={16} className="shrink-0 text-[#008577]" />
          <span className="sr-only">Filter records by date</span>
          <select value={preset} onChange={(event) => selectPreset(event.target.value)} className="w-full bg-transparent py-2 text-slate-700 outline-none [&_option]:text-slate-900">
            {DATE_RANGE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {preset !== "all" && preset !== "custom" && (
          <span className="text-xs font-medium text-slate-500">{resolveDatePreset(preset).startDate} – {resolveDatePreset(preset).endDate}</span>
        )}
        {preset !== "all" && (
          <button type="button" onClick={clearFilter} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50" aria-label="Clear date filter">
            <RotateCcw size={14} /> Clear
          </button>
        )}
      </div>
      {preset === "custom" && (
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
          <label className="text-xs font-semibold text-slate-600">
            Start Date
            <input type="date" value={customRange.startDate} onChange={(event) => setCustomRange((range) => ({ ...range, startDate: event.target.value }))} className="mt-1 min-h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-normal text-slate-700 focus:border-[#008577] focus:outline-none" />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            End Date
            <input type="date" value={customRange.endDate} min={customRange.startDate || undefined} onChange={(event) => setCustomRange((range) => ({ ...range, endDate: event.target.value }))} className="mt-1 min-h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-normal text-slate-700 focus:border-[#008577] focus:outline-none" />
          </label>
          <button type="button" onClick={applyCustomRange} className="min-h-10 rounded-lg bg-[#003B3B] px-4 text-sm font-bold text-white transition hover:bg-[#008577]">Apply Filter</button>
          <button type="button" onClick={clearFilter} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"><RotateCcw size={14} /> Clear Filter</button>
          {error && <p role="alert" className="text-xs font-semibold text-rose-600 sm:col-span-4">{error}</p>}
        </div>
      )}
    </div>
  );
}
