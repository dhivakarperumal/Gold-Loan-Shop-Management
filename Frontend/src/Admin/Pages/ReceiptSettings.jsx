import { useState } from "react";
import { FiArrowLeft, FiImage, FiSave, FiRotateCcw, FiUpload, FiX } from "react-icons/fi";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  DEFAULT_RECEIPT_SETTINGS,
  getReceiptSettings,
  RECEIPT_SETTINGS_KEY
} from "./receiptSettings";

const fields = [
  { key: "shopName", label: "Shop Name", placeholder: "Sri Golds", required: true },
  { key: "address", label: "Shop Address", placeholder: "Enter the address printed on receipts", multiline: true },
  { key: "gstNumber", label: "GST Number", placeholder: "Enter GSTIN" },
  { key: "phone", label: "Contact Phone", placeholder: "Enter shop phone number", type: "tel" },
  { key: "email", label: "Contact Email", placeholder: "Enter shop email", type: "email" },
  { key: "footerMessage", label: "Receipt Footer Message", placeholder: "Thank you for shopping with us", multiline: true }
];

const ReceiptSettings = () => {
  const [settings, setSettings] = useState(getReceiptSettings);

  const updateField = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const uploadLogo = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Choose a PNG, JPG, or WebP logo image.");
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error("Logo image must be 1 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        toast.error("Could not read the selected logo image.");
        return;
      }
      updateField("logoUrl", reader.result);
      toast.success("Logo uploaded. Save receipt settings to apply it.");
    };
    reader.onerror = () => {
      console.error("Failed to read receipt logo file:", reader.error);
      toast.error("Could not read the selected logo image.");
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => updateField("logoUrl", "");

  const saveSettings = (event) => {
    event.preventDefault();
    if (!settings.shopName.trim()) {
      toast.error("Shop name is required.");
      return;
    }
    try {
      window.localStorage.setItem(RECEIPT_SETTINGS_KEY, JSON.stringify({
        ...settings,
        shopName: settings.shopName.trim(),
        logoUrl: settings.logoUrl.trim(),
        address: settings.address.trim(),
        gstNumber: settings.gstNumber.trim(),
        phone: settings.phone.trim(),
        email: settings.email.trim(),
        footerMessage: settings.footerMessage.trim()
      }));
      toast.success("Receipt settings saved.");
    } catch (error) {
      console.error("Failed to save receipt settings:", error);
      toast.error("Could not save receipt settings in this browser.");
    }
  };

  const resetSettings = () => {
    try {
      window.localStorage.removeItem(RECEIPT_SETTINGS_KEY);
      setSettings({ ...DEFAULT_RECEIPT_SETTINGS });
      toast.success("Default receipt settings restored.");
    } catch (error) {
      console.error("Failed to reset receipt settings:", error);
      toast.error("Could not restore receipt settings.");
    }
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-2xl bg-gradient-to-r from-[#003B3B] via-[#00594f] to-[#087568] px-5 py-6 text-white shadow-lg sm:px-7">
        <Link to="/admin/settings" className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 transition hover:text-white">
          <FiArrowLeft /> All Settings
        </Link>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Print preferences</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">Receipt Settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/75">Set the shop logo, name, contact details, address, and footer shown on printed bills.</p>
      </header>

      <form onSubmit={saveSettings} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <section className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700" htmlFor="receipt-logo-upload">Shop Logo</label>
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Receipt logo preview" className="h-20 w-28 rounded-lg border border-slate-200 bg-white object-contain p-2" />
              ) : (
                <span className="flex h-20 w-28 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-300">
                  <FiImage size={28} />
                </span>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="receipt-logo-upload" className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#00695C] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#008577]">
                  <FiUpload /> Upload Logo
                </label>
                <input id="receipt-logo-upload" type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadLogo} className="sr-only" />
                {settings.logoUrl && (
                  <button type="button" onClick={removeLogo} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50">
                    <FiX /> Remove
                  </button>
                )}
                <p className="basis-full text-xs text-slate-500">PNG, JPG, or WebP · maximum 1 MB. Uploading a file replaces the current logo path.</p>
              </div>
            </div>
          </div>
          {fields.map((field) => (
            <label key={field.key} className="block text-sm font-semibold text-slate-700">
              {field.label}{field.required && <span className="ml-1 text-rose-500">*</span>}
              {field.multiline ? (
                <textarea
                  value={settings[field.key]}
                  onChange={(event) => updateField(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-800 outline-none transition focus:border-[#008577] focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              ) : (
                <input
                  type={field.type || "text"}
                  value={settings[field.key]}
                  onChange={(event) => updateField(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  maxLength={field.key === "shopName" ? 120 : 500}
                  className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-800 outline-none transition focus:border-[#008577] focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              )}
            </label>
          ))}
        </section>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
          <button type="button" onClick={resetSettings} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
            <FiRotateCcw /> Restore Defaults
          </button>
          <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#00695C] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#008577]">
            <FiSave /> Save Receipt Settings
          </button>
        </div>
      </form>
    </main>
  );
};

export default ReceiptSettings;
