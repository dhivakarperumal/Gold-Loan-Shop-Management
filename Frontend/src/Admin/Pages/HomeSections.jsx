import { useEffect, useState } from "react";
import { FiArrowDown, FiArrowUp, FiSave } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../api";

const HomeSections = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api.get("/home-sections", { signal: controller.signal })
      .then(({ data }) => {
        if (!Array.isArray(data?.sections)) {
          throw new TypeError("The home sections response must contain a sections array");
        }
        setSections(data.sections);
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        console.error("Failed to load home section settings:", requestError);
        setError(requestError.response?.data?.message || "Home section settings could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const toggleSection = (key) => {
    setSections((current) => current.map((section) => (
      section.key === key ? { ...section, visible: !section.visible } : section
    )));
  };

  const moveSection = (index, direction) => {
    setSections((current) => {
      const destination = index + direction;
      if (destination < 0 || destination >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
      return reordered;
    });
  };

  const saveSections = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await api.put("/home-sections", {
        sections: sections.map((section, index) => ({
          key: section.key,
          visible: section.visible,
          order: index + 1
        }))
      });
      if (!Array.isArray(response.data?.sections)) {
        throw new TypeError("The saved home sections response must contain a sections array");
      }
      setSections(response.data.sections);
      toast.success("Home product sections saved.");
    } catch (requestError) {
      console.error("Failed to save home section settings:", requestError);
      setError(requestError.response?.data?.message || "Home section settings could not be saved.");
      toast.error(requestError.response?.data?.message || "Home section settings could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="space-y-6">
      <header className="rounded-2xl bg-gradient-to-r from-[#003B3B] via-[#00594f] to-[#087568] px-5 py-6 text-white shadow-lg sm:px-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Storefront settings</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">Home Product Sections</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/75">
          Choose which metal collections appear on the home page and set their display order.
        </p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

      {loading ? (
        <p className="rounded-xl bg-white p-6 text-sm text-slate-500" role="status">Loading home section settings...</p>
      ) : sections.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-sm text-slate-500">No home section settings are available.</p>
      ) : (
        <section aria-label="Home product section order" className="space-y-3">
          {sections.map((section, index) => (
            <article key={section.key} className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-black text-[#00695C]">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-slate-900">{section.label}</h2>
                <p className={`mt-1 text-xs font-semibold ${section.visible ? "text-emerald-700" : "text-slate-400"}`}>
                  {section.visible ? "Visible on home page" : "Hidden on home page"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">View</span>
                <button
                  type="button"
                  onClick={() => toggleSection(section.key)}
                  role="switch"
                  aria-checked={section.visible}
                  aria-label={`View ${section.label} on home page`}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087568] focus-visible:ring-offset-2 ${
                    section.visible ? "bg-[#087568]" : "bg-slate-300"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      section.visible ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${section.label} up`}
                  className="rounded-lg border border-slate-200 p-2 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FiArrowUp aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(index, 1)}
                  disabled={index === sections.length - 1}
                  aria-label={`Move ${section.label} down`}
                  className="rounded-lg border border-slate-200 p-2 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FiArrowDown aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={saveSections}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#003B3B] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#087568] disabled:cursor-wait disabled:opacity-60"
            >
              <FiSave aria-hidden="true" />
              {saving ? "Saving..." : "Save Home Layout"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
};

export default HomeSections;
