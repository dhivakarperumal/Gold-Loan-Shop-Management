import { useEffect, useState } from "react";
import { FiArrowLeft, FiImage, FiSave, FiRotateCcw, FiUpload, FiX } from "react-icons/fi";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  DEFAULT_RECEIPT_SETTINGS,
  getReceiptSettings,
  saveReceiptSettings
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
  const [settings, setSettings] = useState({ ...DEFAULT_RECEIPT_SETTINGS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewDate] = useState(() => new Date().toLocaleDateString("en-IN"));
  const [previewInvoiceNumber] = useState(() => (
    `BILL-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  ));

  useEffect(() => {
    let active = true;
    getReceiptSettings()
      .then((savedSettings) => {
        if (active) setSettings(savedSettings);
      })
      .catch((error) => {
        console.error("Failed to load receipt settings:", error);
        toast.error(error.response?.data?.message || "Could not load receipt settings.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

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

  const saveSettings = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!settings.shopName.trim()) {
      toast.error("Shop name is required.");
      return;
    }
    setSaving(true);
    try {
      const savedSettings = await saveReceiptSettings({
        ...settings,
        shopName: settings.shopName.trim(),
        logoUrl: settings.logoUrl.trim(),
        address: settings.address.trim(),
        gstNumber: settings.gstNumber.trim(),
        phone: settings.phone.trim(),
        email: settings.email.trim(),
        footerMessage: settings.footerMessage.trim()
      });
      setSettings(savedSettings);
      toast.success("Receipt settings saved.");
    } catch (error) {
      console.error("Failed to save receipt settings:", error);
      toast.error(error.response?.data?.message || "Could not save receipt settings.");
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const savedSettings = await saveReceiptSettings({ ...DEFAULT_RECEIPT_SETTINGS });
      setSettings(savedSettings);
      toast.success("Default receipt settings restored.");
    } catch (error) {
      console.error("Failed to reset receipt settings:", error);
      toast.error(error.response?.data?.message || "Could not restore receipt settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-2xl bg-gradient-to-r from-[#003B3B] via-[#00594f] to-[#087568] px-5 py-6 text-white shadow-lg sm:px-7">
        <Link to="/admin/settings" className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 transition hover:text-white">
          <FiArrowLeft /> All Settings
        </Link>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Print preferences</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">Receipt Settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/75">Set the shop logo, name, contact details, address, and footer shown on printed bills.</p>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <form onSubmit={saveSettings} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <section className="space-y-5">
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
                <input id="receipt-logo-upload" type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadLogo} disabled={loading || saving} className="sr-only" />
                {settings.logoUrl && (
                  <button type="button" onClick={removeLogo} disabled={loading || saving} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
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
                  disabled={loading || saving}
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
                  disabled={loading || saving}
                  className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-800 outline-none transition focus:border-[#008577] focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              )}
            </label>
          ))}
        </section>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
          <button type="button" onClick={resetSettings} disabled={saving || loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
            <FiRotateCcw /> Restore Defaults
          </button>
          <button type="submit" disabled={saving || loading} className="inline-flex items-center gap-2 rounded-xl bg-[#00695C] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#008577] disabled:opacity-50">
            <FiSave /> {loading ? "Loading..." : saving ? "Saving..." : "Save Receipt Settings"}
          </button>
        </div>
        </form>

        <aside className="space-y-3 xl:sticky xl:top-6">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Receipt Preview</h2>
            <p className="mt-1 text-xs text-slate-500">Preview updates as you edit. Example customer, items, and amounts are for illustration.</p>
          </div>
          <section aria-label="Live receipt preview" className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <header className="flex flex-col items-center gap-2 text-center">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="" className="h-[76px] w-24 object-contain" />
              ) : (
                <span className="flex h-[76px] w-24 items-center justify-center text-slate-300"><FiImage size={30} /></span>
              )}
              <h3 className="text-2xl font-black text-[#00695C]">{settings.shopName || "Shop Name"}</h3>
              {settings.address && <p className="max-w-lg whitespace-pre-line text-xs leading-relaxed text-slate-600">{settings.address}</p>}
              {settings.gstNumber && <p className="text-xs text-slate-600"><strong>GSTIN:</strong> {settings.gstNumber}</p>}
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-600">
                {settings.phone && <span>Phone: {settings.phone}</span>}
                {settings.email && <span>Email: {settings.email}</span>}
              </div>
            </header>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-3 border-y border-slate-200 py-3 text-xs text-slate-600">
              <p>Invoice No: <strong className="text-slate-800">{previewInvoiceNumber}</strong></p>
              <div className="text-left sm:text-right">
                <p>Date: {previewDate}</p>
                <p className="mt-1">Payment: Full Payment</p>
              </div>
            </div>

            <div className="py-4">
              <h4 className="mb-2 text-sm font-bold text-slate-800">Customer</h4>
              <p className="text-sm font-semibold text-slate-800">Sample Customer</p>
              <p className="text-xs text-slate-500">Customer contact details appear here</p>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[740px] text-left text-xs">
                <thead className="bg-slate-50 uppercase text-slate-500">
                  <tr>
                    <th className="px-2 py-2">S.No.</th>
                    <th className="px-2 py-2">Item</th>
                    <th className="px-2 py-2">Category / Purity</th>
                    <th className="px-2 py-2 text-right">Making Charge</th>
                    <th className="px-2 py-2 text-right">Weight in gross</th>
                    <th className="px-2 py-2 text-right">Rate</th>
                    <th className="px-2 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-100">
                    <td className="px-2 py-2">1</td>
                    <td className="px-2 py-2">Gold Necklace</td>
                    <td className="px-2 py-2">Necklace · 22K</td>
                    <td className="px-2 py-2 text-right">₹2,500.00</td>
                    <td className="px-2 py-2 text-right">10 g</td>
                    <td className="px-2 py-2 text-right">₹8,250.00 / g</td>
                    <td className="px-2 py-2 text-right">₹85,000.00</td>
                  </tr>
                  <tr className="border-t border-slate-100 text-rose-700">
                    <td className="px-2 py-2">2</td>
                    <td className="px-2 py-2">Exchange Gold</td>
                    <td className="px-2 py-2">Gold · 22K · 10 g</td>
                    <td className="px-2 py-2 text-right">—</td>
                    <td className="px-2 py-2 text-right">—</td>
                    <td className="px-2 py-2 text-right">₹2,000.00 / g</td>
                    <td className="px-2 py-2 text-right">−₹20,000.00</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="ml-auto mt-4 max-w-xs space-y-2 text-sm">
              <div className="flex justify-between text-slate-600"><span>Sub-Total</span><span>₹85,000.00</span></div>
              <div className="flex justify-between text-rose-700"><span>Exchange Amount</span><span>−₹20,000.00</span></div>
              <div className="flex justify-between text-slate-600"><span>GST</span><span>₹1,950.00</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-extrabold text-slate-900"><span>Total</span><span>₹66,950.00</span></div>
            </div>

            <footer className="mt-6 border-t border-slate-200 pt-4 text-center text-xs leading-relaxed text-slate-600">
              {settings.footerMessage && <p className="font-semibold text-slate-800">{settings.footerMessage}</p>}
            </footer>
          </section>
        </aside>
      </div>
    </main>
  );
};

export default ReceiptSettings;
