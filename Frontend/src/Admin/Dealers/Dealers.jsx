import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle, ArrowDownToLine, ArrowLeft, ArrowRightLeft, Building2, Check,
  ClipboardList, Coins, Download, FileText, LoaderCircle, Plus, Printer, RefreshCw,
  Search, ShieldCheck, Truck, Wallet, X
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api";
import { formatCurrency as currency } from "../../utils/currency";
import DateRangeFilter from "../Components/DateRangeFilter";

const TEAL = "#003B3B";
const PURITIES = ["999", "916", "833", "750", "585"];
const today = () => new Date().toISOString().slice(0, 10);
const initialDealer = {
  name: "", contact_person: "", email: "", phone: "", alternate_phone: "",
  category_id: "", gstin: "", pan: "", billing_address_line1: "", billing_city: "",
  billing_state: "", billing_pincode: "", shipping_address_line1: "", shipping_city: "",
  shipping_state: "", shipping_pincode: "", opening_balance: "0", opening_balance_side: "payable",
  opening_metal_weight: "", opening_metal_type: "Gold", opening_metal_purity: "916",
  credit_limit: "0", payment_terms_days: "0", bank_name: "", bank_account_name: "",
  bank_account_number: "", bank_ifsc: "", status: "Active", notes: ""
};
const blankLine = () => ({
  description: "", metal_type: "Gold", purity: "916", quantity: "1", net_weight: "",
  rate_per_gram: "", negotiated_rate: false, unit_price: "", making_charge: "0",
  wastage_charge: "0", stone_charge: "0", discount: "0", tax_rate: "0", tax_type: "NONE"
});

function ErrorBox({ message, retry }) {
  if (!message) return null;
  return <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
    <span>{message}</span>{retry && <button type="button" onClick={retry} className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white">Retry</button>}
  </div>;
}

function Field({ label, value, onChange, type = "text", required = false, min, step, placeholder, disabled = false }) {
  return <label className="block space-y-1.5">
    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}{required && " *"}</span>
    <input type={type} value={value ?? ""} onChange={onChange} required={required} min={min} step={step} placeholder={placeholder} disabled={disabled}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#008577] focus:ring-2 focus:ring-emerald-800/10 disabled:bg-slate-100" />
  </label>;
}

function SelectField({ label, value, onChange, children, required = false }) {
  return <label className="block space-y-1.5">
    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}{required && " *"}</span>
    <select value={value ?? ""} onChange={onChange} required={required}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#008577] focus:ring-2 focus:ring-emerald-800/10">
      {children}
    </select>
  </label>;
}

const Dealers = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const section = location.pathname.endsWith("/purchases") ? "purchases"
    : location.pathname.endsWith("/jobs") ? "jobs"
      : location.pathname.endsWith("/refining") ? "refining" : "dealers";
  const [dealers, setDealers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [linkedInvoices, setLinkedInvoices] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [oldGoldReceipts, setOldGoldReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dateRange, setDateRange] = useState({ preset: "all", startDate: "", endDate: "" });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [dialog, setDialog] = useState("");
  const [editingDealer, setEditingDealer] = useState(null);
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [statement, setStatement] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialDealer);
  const [purchaseForm, setPurchaseForm] = useState({
    dealer_id: "", document_type: "invoice", supplier_invoice_number: "",
    document_date: today(), due_date: "", notes: "", lines: [blankLine()]
  });
  const [paymentForm, setPaymentForm] = useState({
    dealer_id: "", amount: "", payment_date: today(), method: "Bank", reference: "", purchase_id: "", allocation: ""
  });
  const [outstanding, setOutstanding] = useState([]);
  const [jobForm, setJobForm] = useState({ dealer_id: "", description: "", due_date: "", labour_charge: "0", approved_wastage: "0" });
  const [metalForm, setMetalForm] = useState({ job_id: "", metal_type: "Gold", purity: "916", weight: "", receipt_type: "finished", labour_charge: "0" });
  const [reconcileForm, setReconcileForm] = useState({ job_id: "", approved_loss: "0", reason: "" });
  const [oldGoldForm, setOldGoldForm] = useState({ dealer_id: "", gross_weight: "", stone_weight: "0", net_weight: "", tested_purity: "916", agreed_rate: "", rate_source: "Global" });
  const [refiningForm, setRefiningForm] = useState({ dealer_id: "", old_gold_receipt_id: "", recovered_metal_type: "Gold", recovered_purity: "999", recovered_weight: "", refining_charges: "0" });
  const [documentForm, setDocumentForm] = useState({ type: "GST Certificate", file: null });

  const fetchDealers = useCallback(async () => {
    const response = await api.get("/dealers", { params: {
      page, limit: 25, search: search.trim(),
      status: statusFilter === "All" ? undefined : statusFilter,
      category_id: categoryFilter === "All" ? undefined : categoryFilter,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    } });
    setDealers(response.data.dealers || []);
    setPagination(response.data.pagination || { total: 0, totalPages: 1 });
  }, [page, search, statusFilter, categoryFilter, dateRange.startDate, dateRange.endDate]);

  const fetchAll = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [categoriesResult, summaryResult] = await Promise.all([
        api.get("/dealers/categories"), api.get("/dealers/summary")
      ]);
      setCategories(categoriesResult.data || []);
      setSummary(summaryResult.data);
      if (section === "dealers") await fetchDealers();
      if (section === "purchases") {
        const result = await api.get("/dealers/purchases", { params: { page: 1, limit: 50, startDate: dateRange.startDate, endDate: dateRange.endDate } });
        setPurchases(result.data.purchases || []);
      }
      if (section === "jobs") {
        const result = await api.get("/dealers/jobs", { params: { page: 1, limit: 50, startDate: dateRange.startDate, endDate: dateRange.endDate } });
        setJobs(result.data.jobs || []);
      }
      if (section === "refining") {
        const [receiptsResult, jobResult] = await Promise.all([
          api.get("/dealers/old-gold", { params: { page: 1, limit: 100, startDate: dateRange.startDate, endDate: dateRange.endDate } }),
          api.get("/dealers/jobs", { params: { page: 1, limit: 100, startDate: dateRange.startDate, endDate: dateRange.endDate } })
        ]);
        setOldGoldReceipts(receiptsResult.data.receipts || []);
        setJobs(jobResult.data.jobs || []);
      }
    } catch (requestError) {
      console.error("Dealer management load failed:", requestError);
      const message = requestError.response?.data?.message || "Unable to load dealer management data";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [fetchDealers, section, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    const timeout = setTimeout(() => { void fetchAll(); }, 250);
    return () => clearTimeout(timeout);
  }, [fetchAll]);

  useEffect(() => {
    if (dialog !== "purchase" || purchaseForm.document_type === "invoice" || !purchaseForm.dealer_id) return;
    api.get("/dealers/purchases", { params: { dealer_id: purchaseForm.dealer_id, page: 1, limit: 100 } })
      .then((response) => setLinkedInvoices((response.data.purchases || []).filter((item) => item.document_type === "invoice")))
      .catch((requestError) => {
        console.error("Dealer invoices could not be loaded for adjustment:", requestError);
        toast.error(requestError.response?.data?.message || "Unable to load supplier invoices for linking");
      });
  }, [dialog, purchaseForm.dealer_id, purchaseForm.document_type]);

  const refresh = async () => {
    await fetchAll();
  };

  const setDealerField = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const setPurchaseLine = (index, key, value) => setPurchaseForm((previous) => ({
    ...previous, lines: previous.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [key]: value } : line)
  }));

  const startDealerEdit = (dealer = null) => {
    setEditingDealer(dealer);
    const address = dealer?.billing_address || {};
    const shipping = dealer?.shipping_address || {};
    const bank = dealer?.bank_details || {};
    setForm(dealer ? {
      ...initialDealer, ...dealer,
      billing_address_line1: address.line1 || "", billing_city: address.city || "",
      billing_state: address.state || "", billing_pincode: address.pincode || "",
      shipping_address_line1: shipping.line1 || "", shipping_city: shipping.city || "",
      shipping_state: shipping.state || "", shipping_pincode: shipping.pincode || "",
      bank_name: bank.bank_name || "", bank_account_name: bank.account_name || "",
      bank_account_number: bank.account_number || "", bank_ifsc: bank.ifsc || ""
    } : { ...initialDealer, category_id: categories[0]?.id || "" });
    setDialog("dealer");
  };

  const submitDealer = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      category_id: Number(form.category_id),
      billing_address: { line1: form.billing_address_line1, city: form.billing_city, state: form.billing_state, pincode: form.billing_pincode },
      shipping_address: { line1: form.shipping_address_line1, city: form.shipping_city, state: form.shipping_state, pincode: form.shipping_pincode },
      bank_details: { bank_name: form.bank_name, account_name: form.bank_account_name, account_number: form.bank_account_number, ifsc: form.bank_ifsc }
    };
    payload.opening_metal_balances = form.opening_metal_weight ? [{
      metal_type: form.opening_metal_type, purity: form.opening_metal_purity, weight: Number(form.opening_metal_weight)
    }] : [];
    try {
      if (editingDealer) {
        await api.put(`/dealers/${editingDealer.id}`, payload);
        toast.success("Dealer profile updated");
      } else {
        await api.post("/dealers", payload);
        toast.success("Dealer registered with opening balances");
      }
      setDialog("");
      await refresh();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to save dealer");
    } finally {
      setSaving(false);
    }
  };

  const openStatement = async (dealer) => {
    try {
      const response = await api.get(`/dealers/${dealer.id}/statement`);
      setSelectedDealer(dealer);
      setStatement(response.data);
      setDialog("statement");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to load dealer statement");
    }
  };

  const exportCsv = (rows, filename) => {
    const csvEscape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const printStatement = () => {
    if (!statement || !selectedDealer) return;
    const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
    const rows = statement.financial.map((entry) => `<tr><td>${safe(new Date(entry.created_at).toLocaleDateString())}</td><td>${safe(entry.entry_number)}</td><td>${safe(entry.description)}</td><td>${currency(entry.payable_delta)}</td><td>${currency(entry.receivable_delta)}</td><td>${currency(entry.payable_balance)}</td></tr>`).join("");
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return toast.error("Allow pop-ups to print the statement");
    printWindow.document.write(`<html><head><title>Dealer Statement</title><style>body{font:14px Arial;padding:30px;color:#1e293b}h1{color:#003B3B}table{border-collapse:collapse;width:100%;margin-top:20px}th,td{border:1px solid #cbd5e1;padding:9px;text-align:left}th{background:#003B3B;color:white}@media print{button{display:none}}</style></head><body><h1>Sri Vengateswara Gold Shop</h1><h2>Dealer Statement - ${safe(selectedDealer.name)} (${safe(selectedDealer.dealer_code)})</h2><p>Generated ${safe(new Date(statement.generated_at).toLocaleString())}</p><table><thead><tr><th>Date</th><th>Entry</th><th>Description</th><th>Payable Δ</th><th>Receivable Δ</th><th>Payable balance</th></tr></thead><tbody>${rows}</tbody></table><script>window.print()</script></body></html>`);
    printWindow.document.close();
  };

  const reversePaymentEntry = async (entry) => {
    const reason = window.prompt(`Enter the reason for reversing this posted payment (${entry.entry_number}):`);
    if (!reason?.trim()) return;
    try {
      await api.post(`/dealers/payments/${entry.source_id}/reverse`, { reason: reason.trim() });
      toast.success("Payment reversed; invoice allocations and dealer balances were adjusted");
      if (selectedDealer) await openStatement(selectedDealer);
      await fetchAll();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to reverse payment");
    }
  };

  const submitPurchase = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...purchaseForm,
        dealer_id: Number(purchaseForm.dealer_id),
        lines: purchaseForm.lines.map((line) => ({
          ...line, quantity: Number(line.quantity || 1), net_weight: Number(line.net_weight || 0),
          rate_per_gram: Number(line.rate_per_gram || 0), unit_price: Number(line.unit_price || 0),
          making_charge: Number(line.making_charge || 0), wastage_charge: Number(line.wastage_charge || 0),
          stone_charge: Number(line.stone_charge || 0), discount: Number(line.discount || 0),
          tax_rate: Number(line.tax_rate || 0)
        }))
      };
      const response = await api.post("/dealers/purchases", payload);
      toast.success(`Posted ${response.data.document_number} for ${currency(response.data.total)}`);
      setDialog("");
      setPurchaseForm({ dealer_id: "", document_type: "invoice", supplier_invoice_number: "", document_date: today(), due_date: "", notes: "", lines: [blankLine()] });
      await refresh();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to post purchase document");
    } finally {
      setSaving(false);
    }
  };

  const openPayment = async () => {
    try {
      const response = await api.get("/dealers/purchases", { params: { page: 1, limit: 100 } });
      setOutstanding((response.data.purchases || []).filter((item) => item.document_type === "invoice" && Number(item.outstanding) > 0));
      setPaymentForm({ dealer_id: "", amount: "", payment_date: today(), method: "Bank", reference: "", purchase_id: "", allocation: "", idempotency_key: crypto.randomUUID() });
      setDialog("payment");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to load outstanding invoices");
    }
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post("/dealers/payments", {
        dealer_id: Number(paymentForm.dealer_id),
        amount: Number(paymentForm.amount),
        payment_date: paymentForm.payment_date,
        method: paymentForm.method,
        reference: paymentForm.reference,
        idempotency_key: paymentForm.idempotency_key,
        allocations: paymentForm.purchase_id && paymentForm.allocation
          ? [{ purchase_id: Number(paymentForm.purchase_id), amount: Number(paymentForm.allocation) }] : []
      });
      toast.success("Payment posted to the immutable dealer ledger");
      setDialog("");
      await refresh();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to post payment");
    } finally {
      setSaving(false);
    }
  };

  const loadDealerRate = async (metal, purity, setRate) => {
    try {
      const response = await api.get("/dealers/global-rate", { params: { metal_type: metal, purity } });
      setRate(String(response.data.rate_per_gram));
    } catch (requestError) {
      setRate("");
      toast.error(requestError.response?.data?.message || "No current rate found; enter an authorized negotiated rate");
    }
  };

  const submitJob = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await api.post("/dealers/jobs", { ...jobForm, dealer_id: Number(jobForm.dealer_id), labour_charge: Number(jobForm.labour_charge), approved_wastage: Number(jobForm.approved_wastage) });
      toast.success(`Job order ${response.data.job_number} created`);
      setDialog("");
      await refresh();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to create job order");
    } finally { setSaving(false); }
  };

  const submitMetal = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (dialog === "issue") await api.post("/dealers/jobs/issue", { ...metalForm, job_id: Number(metalForm.job_id), weight: Number(metalForm.weight) });
      else await api.post("/dealers/jobs/receipt", { ...metalForm, job_id: Number(metalForm.job_id), weight: Number(metalForm.weight), labour_charge: Number(metalForm.labour_charge) });
      toast.success(dialog === "issue" ? "Metal issue voucher posted" : "Finished goods / scrap receipt posted");
      setDialog("");
      await refresh();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to post job-work movement");
    } finally { setSaving(false); }
  };

  const submitReconciliation = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await api.post(`/dealers/jobs/${reconcileForm.job_id}/reconcile`, {
        approved_loss: Number(reconcileForm.approved_loss), reason: reconcileForm.reason.trim()
      });
      if (response.data.status === "Pending" && reconcileForm.reason.trim()) {
        await api.post(`/dealers/jobs/${reconcileForm.job_id}/reconcile/approve`, { reason: reconcileForm.reason.trim() });
      }
      toast.success(`Reconciliation ${response.data.status === "Pending" && reconcileForm.reason.trim() ? "approved" : response.data.status.toLowerCase()} with variance ${Number(response.data.variance).toFixed(3)} fine grams`);
      setDialog("");
      await refresh();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to reconcile job");
    } finally { setSaving(false); }
  };

  const approveReconciliation = async (job) => {
    const reason = window.prompt(`Authorize reconciliation variance of ${Number(job.reconciliation_variance).toFixed(3)} fine grams. Enter the approval reason:`);
    if (!reason?.trim()) return;
    try {
      await api.post(`/dealers/jobs/${job.id}/reconcile/approve`, { reason: reason.trim() });
      toast.success(`Reconciliation for ${job.job_number} approved`);
      await refresh();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to approve reconciliation");
    }
  };

  const submitOldGold = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await api.post("/dealers/old-gold", {
        ...oldGoldForm, dealer_id: Number(oldGoldForm.dealer_id), gross_weight: Number(oldGoldForm.gross_weight),
        stone_weight: Number(oldGoldForm.stone_weight), net_weight: Number(oldGoldForm.net_weight),
        agreed_rate: Number(oldGoldForm.agreed_rate)
      });
      toast.success(`Receipt ${response.data.receipt_number} posted; settlement ${currency(response.data.settlement_amount)}`);
      setDialog("");
      setRefiningForm((current) => ({ ...current, dealer_id: oldGoldForm.dealer_id, old_gold_receipt_id: response.data.id }));
      await refresh();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to record old gold");
    } finally { setSaving(false); }
  };

  const submitRefining = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await api.post("/dealers/refining", {
        ...refiningForm, dealer_id: Number(refiningForm.dealer_id),
        old_gold_receipt_id: Number(refiningForm.old_gold_receipt_id),
        recovered_weight: Number(refiningForm.recovered_weight), refining_charges: Number(refiningForm.refining_charges)
      });
      toast.success(`Refining receipt ${response.data.refining_number} recorded; fine recovery variance ${Number(response.data.recovery_variance).toFixed(3)} g`);
      setDialog("");
      await refresh();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to record refining receipt");
    } finally { setSaving(false); }
  };

  const openDealerDocs = async (dealer) => {
    try {
      const [detail, docs, audit] = await Promise.all([
        api.get(`/dealers/${dealer.id}`), api.get(`/dealers/${dealer.id}/documents`), api.get(`/dealers/${dealer.id}/audit`)
      ]);
      setSelectedDealer({ ...detail.data, documents: docs.data, audit: audit.data });
      setDialog("profile");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to load dealer profile");
    }
  };

  const uploadDealerDocument = async (event) => {
    event.preventDefault();
    if (!selectedDealer || !documentForm.file) return;
    const payload = new FormData();
    payload.append("document", documentForm.file);
    payload.append("document_type", documentForm.type);
    try {
      await api.post(`/dealers/${selectedDealer.id}/documents`, payload);
      toast.success("Private dealer document uploaded");
      await openDealerDocs(selectedDealer);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to upload document");
    }
  };

  const downloadDealerDocument = async (documentRecord) => {
    try {
      const response = await api.get(`/dealers/documents/${documentRecord.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = documentRecord.original_name;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to download private document");
    }
  };

  const removeDealerDocument = async (documentRecord) => {
    if (!window.confirm(`Delete private document "${documentRecord.original_name}"?`)) return;
    try {
      await api.delete(`/dealers/documents/${documentRecord.id}`);
      toast.success("Dealer document deleted");
      await openDealerDocs(selectedDealer);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to delete document");
    }
  };

  const visibleDealers = useMemo(() => dealers, [dealers]);
  const openJobs = jobs.filter((job) => !["Reconciled", "Cancelled"].includes(job.status));
  const tabs = [
    ["dealers", "Dealer Master", "/admin/dealers"],
    ["purchases", "Purchases & Payables", "/admin/dealers/purchases"],
    ["refining", "Old Gold & Refining", "/admin/dealers/refining"]
  ];

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#008577]">Sri Vengateswara Gold Shop</p>
        <h1 className="mt-1 text-2xl font-black text-slate-900">Dealer Management</h1>
        <p className="mt-1 text-sm text-slate-500">Supplier accounts, metal custody, job work and settlements</p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"><RefreshCw size={16} /> Refresh</button>
        {section === "dealers" && <button type="button" onClick={() => startDealerEdit()} className="inline-flex items-center gap-2 rounded-lg bg-[#003B3B] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#008577]"><Plus size={17} /> Register Dealer</button>}
        {section === "purchases" && <><button type="button" onClick={openPayment} className="inline-flex items-center gap-2 rounded-lg border border-[#003B3B] px-4 py-2.5 text-sm font-bold text-[#003B3B]"><Wallet size={16} /> Record Payment</button><button type="button" onClick={() => setDialog("purchase")} className="inline-flex items-center gap-2 rounded-lg bg-[#003B3B] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#008577]"><Plus size={17} /> New Purchase</button></>}
        {section === "jobs" && <button type="button" onClick={() => setDialog("job")} className="inline-flex items-center gap-2 rounded-lg bg-[#003B3B] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#008577]"><Plus size={17} /> Create Job Order</button>}
        {section === "refining" && <><button type="button" onClick={() => setDialog("oldGold")} className="inline-flex items-center gap-2 rounded-lg bg-[#003B3B] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#008577]"><Plus size={17} /> Receive Old Gold</button><button type="button" onClick={() => setDialog("refining")} className="inline-flex items-center gap-2 rounded-lg border border-[#003B3B] px-4 py-2.5 text-sm font-bold text-[#003B3B]"><ArrowDownToLine size={16} /> Refining Receipt</button></>}
      </div>
    </div>

    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5">
      {tabs.map(([key, label, route]) => <button key={key} type="button" onClick={() => navigate(route)}
        className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-bold transition ${section === key ? "bg-[#003B3B] text-white" : "text-slate-500 hover:bg-slate-50 hover:text-[#003B3B]"}`}>{label}</button>)}
    </nav>

    <DateRangeFilter onApply={(range) => { setPage(1); setDateRange(range); }} />

    <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
      {[
        ["Active dealers", summary?.dealers?.active ?? "—", Truck],
        ["Supplier payables", summary ? currency(summary.payables) : "—", Wallet],
        ["Dealer receivables", summary ? currency(summary.receivables) : "—", ArrowRightLeft],
        ["Purchases this month", summary ? currency(summary.purchases_this_month) : "—", Coins],
        ["Overdue invoices", summary ? `${summary.overdue.count} · ${currency(summary.overdue.amount)}` : "—", AlertTriangle],
        ["Open job orders", summary?.pending_jobs ?? "—", ClipboardList]
      ].map(([label, value, Icon]) => <div key={label} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-500">{label}</span><Icon size={17} className="text-[#008577]" /></div>
        <p className="mt-2 truncate text-xl font-black text-slate-900">{value}</p>
      </div>)}
    </div>

    {summary?.metal_outstanding?.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-amber-900"><Coins size={17} /> Metal outstanding by purity</div>
      <div className="flex flex-wrap gap-2">{summary.metal_outstanding.map((metal) => <span key={`${metal.metal_type}-${metal.purity}`} className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700">
        {metal.metal_type} {metal.purity}: {Number(metal.weight).toFixed(3)} g <span className="text-slate-400">({Number(metal.fine_gold_weight).toFixed(3)} fine g)</span>
      </span>)}</div>
    </div>}

    <ErrorBox message={error} retry={() => void fetchAll()} />
    {loading ? <div className="flex min-h-64 items-center justify-center gap-3 rounded-xl border border-slate-100 bg-white text-sm font-bold text-slate-500"><LoaderCircle className="animate-spin" /> Loading dealer records...</div> : <>
      {section === "dealers" && <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="relative w-full max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Search dealer, code, contact, GSTIN..." className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#008577]" /></div>
          <div className="flex gap-2">
            <select value={statusFilter} onChange={(event) => { setPage(1); setStatusFilter(event.target.value); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option>All</option><option>Active</option><option>Inactive</option><option>On Hold</option></select>
            <select value={categoryFilter} onChange={(event) => { setPage(1); setCategoryFilter(event.target.value); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="All">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <button type="button" onClick={async () => {
              const name = window.prompt("New dealer category");
              if (!name?.trim()) return;
              try { await api.post("/dealers/categories", { name: name.trim() }); toast.success("Dealer category added"); await fetchAll(); }
              catch (requestError) { toast.error(requestError.response?.data?.message || "Unable to add category"); }
            }} className="rounded-lg border border-[#003B3B] px-3 py-2 text-xs font-bold text-[#003B3B]">Add category</button>
          </div>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left">
          <thead><tr className="bg-gradient-to-r from-[#003B3B] to-[#008577] text-xs uppercase tracking-wide text-white">
            <th className="px-4 py-3">Dealer</th><th className="px-4 py-3">Category / GSTIN</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3 text-right">Payable</th><th className="px-4 py-3 text-right">Receivable</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th>
          </tr></thead>
          <tbody>{visibleDealers.length === 0 ? <tr><td colSpan="7" className="p-10 text-center text-sm text-slate-400">No dealer records match your search.</td></tr> : visibleDealers.map((dealer) => <tr key={dealer.id} className="border-b border-slate-100 hover:bg-emerald-50/30">
            <td className="px-4 py-3"><button type="button" onClick={() => void openDealerDocs(dealer)} className="text-left font-bold text-[#003B3B] hover:underline">{dealer.name}</button><p className="text-xs text-slate-400">{dealer.dealer_code}</p></td>
            <td className="px-4 py-3 text-sm text-slate-700">{dealer.category_name}<p className="text-xs text-slate-400">{dealer.gstin || "GSTIN not recorded"}</p></td>
            <td className="px-4 py-3 text-sm text-slate-700">{dealer.contact_person}<p className="text-xs text-slate-400">{dealer.phone} · {dealer.email || "No email"}</p></td>
            <td className="px-4 py-3 text-right font-bold text-slate-800">{currency(dealer.payable_balance)}</td>
            <td className="px-4 py-3 text-right font-bold text-slate-800">{currency(dealer.receivable_balance)}</td>
            <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${dealer.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>{dealer.status}</span></td>
            <td className="px-4 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => void openStatement(dealer)} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700">Statement</button><button type="button" onClick={() => startDealerEdit(dealer)} className="rounded-md bg-[#003B3B] px-2.5 py-1.5 text-xs font-bold text-white">Edit</button></div></td>
          </tr>)}</tbody>
        </table></div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span>{pagination.total} dealer records</span><div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded border px-2 py-1 disabled:opacity-40">Previous</button><span>Page {page} of {pagination.totalPages}</span><button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)} className="rounded border px-2 py-1 disabled:opacity-40">Next</button></div>
        </div>
      </section>}

      {section === "purchases" && <section className="overflow-hidden rounded-xl border border-slate-100 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 p-4"><div><h2 className="font-black text-slate-800">Purchase documents & accounts payable</h2><p className="text-xs text-slate-500">Posted documents retain invoice-rate and tax snapshots.</p></div><button type="button" onClick={() => exportCsv([["Document","Dealer","Type","Date","Due date","Total","Paid","Outstanding"], ...purchases.map((row) => [row.document_number,row.dealer_name,row.document_type,row.document_date,row.due_date,row.total,row.paid_amount,row.outstanding])], "dealer-purchases.csv")} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"><Download size={15} /> Export CSV</button></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead><tr className="bg-[#003B3B] text-xs uppercase text-white"><th className="p-3">Document</th><th className="p-3">Dealer</th><th className="p-3">Invoice ref</th><th className="p-3">Date / Due</th><th className="p-3 text-right">Amount</th><th className="p-3 text-right">Paid</th><th className="p-3 text-right">Outstanding</th></tr></thead><tbody>{purchases.length ? purchases.map((item) => <tr key={item.id} className="border-b text-sm"><td className="p-3 font-bold text-[#003B3B]">{item.document_number}<p className="text-[10px] font-normal uppercase text-slate-400">{item.document_type.replaceAll("_"," ")}</p></td><td className="p-3">{item.dealer_name}</td><td className="p-3">{item.supplier_invoice_number || "—"}</td><td className="p-3">{item.document_date}<p className="text-xs text-slate-400">Due {item.due_date || "—"}</p></td><td className="p-3 text-right">{currency(item.total)}</td><td className="p-3 text-right">{currency(item.paid_amount)}</td><td className="p-3 text-right font-bold">{currency(item.outstanding)}</td></tr>) : <tr><td colSpan="7" className="p-10 text-center text-slate-400">No purchase documents posted.</td></tr>}</tbody></table></div>
      </section>}

      {section === "jobs" && <section className="overflow-hidden rounded-xl border border-slate-100 bg-white">
        <div className="border-b border-slate-100 p-4"><h2 className="font-black text-slate-800">Goldsmith issue, receipt & reconciliation</h2><p className="text-xs text-slate-500">Weights are tracked by purity and fine-gold equivalent. Unexplained variance requires approval reason.</p>{jobs.filter((job) => job.reconciliation_status === "Pending").map((job) => <div key={job.id} className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm"><span>{job.job_number} has a pending fine-gold variance of {Number(job.reconciliation_variance).toFixed(3)} g.</span><button type="button" onClick={() => void approveReconciliation(job)} className="rounded bg-amber-700 px-3 py-1.5 text-xs font-bold text-white">Approve with reason</button></div>)}</div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead><tr className="bg-[#003B3B] text-xs uppercase text-white"><th className="p-3">Job / Dealer</th><th className="p-3">Due</th><th className="p-3 text-right">Issued fine g</th><th className="p-3 text-right">Returned fine g</th><th className="p-3">Status / Variance</th><th className="p-3 text-right">Post movement</th></tr></thead><tbody>{jobs.length ? jobs.map((job) => <tr key={job.id} className="border-b text-sm"><td className="p-3 font-bold">{job.job_number}<p className="text-xs font-normal text-slate-500">{job.dealer_name}</p></td><td className="p-3">{job.due_date || "—"}</td><td className="p-3 text-right">{Number(job.issued_fine_weight).toFixed(3)}</td><td className="p-3 text-right">{Number(job.returned_fine_weight).toFixed(3)}</td><td className="p-3">{job.status}{job.reconciliation_variance != null && <p className="text-xs font-bold text-amber-700">Variance {Number(job.reconciliation_variance).toFixed(3)} fine g</p>}</td><td className="p-3"><div className="flex justify-end gap-1"><button type="button" disabled={!["Open","Issued"].includes(job.status)} onClick={() => { setMetalForm({ ...metalForm, job_id: String(job.id), weight: "" }); setDialog("issue"); }} className="rounded border px-2 py-1 text-[10px] font-bold disabled:opacity-40">Issue</button><button type="button" disabled={!["Issued","Partially Received"].includes(job.status)} onClick={() => { setMetalForm({ ...metalForm, job_id: String(job.id), weight: "" }); setDialog("receipt"); }} className="rounded border px-2 py-1 text-[10px] font-bold disabled:opacity-40">Receive</button><button type="button" disabled={["Reconciled","Cancelled"].includes(job.status)} onClick={() => { setReconcileForm({ job_id: job.id, approved_loss: "0", reason: "" }); setDialog("reconcile"); }} className="rounded bg-[#003B3B] px-2 py-1 text-[10px] font-bold text-white disabled:opacity-40">Reconcile</button></div></td></tr>) : <tr><td colSpan="6" className="p-10 text-center text-slate-400">No job orders recorded.</td></tr>}</tbody></table></div>
      </section>}

      {section === "refining" && <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-100 bg-white p-5"><h2 className="font-black text-slate-800">Old-gold intake and settlement</h2><p className="mb-4 mt-1 text-xs text-slate-500">Record tested purity, net gold, negotiated/current rate and resulting settlement.</p><button type="button" onClick={() => setDialog("oldGold")} className="rounded-lg bg-[#003B3B] px-4 py-2 text-sm font-bold text-white">Record old-gold receipt</button></section>
        <section className="rounded-xl border border-slate-100 bg-white p-5"><h2 className="font-black text-slate-800">Refining / recovered metal</h2><p className="mb-4 mt-1 text-xs text-slate-500">Link recovered inventory to its source old-gold receipt and review fine-metal variance.</p><button type="button" onClick={() => setDialog("refining")} className="rounded-lg border border-[#003B3B] px-4 py-2 text-sm font-bold text-[#003B3B]">Record refining receipt</button></section>
        <section className="rounded-xl border border-slate-100 bg-white p-5 xl:col-span-2"><h2 className="mb-3 font-black text-slate-800">Old-gold receipts & refining reconciliation</h2><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="bg-[#003B3B] text-white"><th className="p-3">Receipt</th><th className="p-3">Dealer</th><th className="p-3">Received</th><th className="p-3 text-right">Net / Fine gold</th><th className="p-3 text-right">Rate snapshot</th><th className="p-3 text-right">Settlement</th><th className="p-3 text-right">Recovered fine gold</th></tr></thead><tbody>{oldGoldReceipts.map((item) => <tr key={item.id} className="border-b"><td className="p-3 font-bold">{item.receipt_number}</td><td className="p-3">{item.dealer_name}</td><td className="p-3">{new Date(item.received_at).toLocaleDateString()}</td><td className="p-3 text-right">{Number(item.net_weight).toFixed(3)} / {Number(item.fine_gold_weight).toFixed(3)} g</td><td className="p-3 text-right">{currency(item.agreed_rate)} / g<p className="text-xs text-slate-400">{item.gold_rate_date || item.rate_source}</p></td><td className="p-3 text-right">{currency(item.settlement_amount)}</td><td className="p-3 text-right">{Number(item.recovered_fine_gold).toFixed(3)} g</td></tr>)}</tbody></table>{oldGoldReceipts.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No old-gold receipts have been posted yet.</p>}</div></section>
      </div>}
    </>}

    {dialog === "dealer" && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4">
      <form onSubmit={submitDealer} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4"><div><h2 className="text-xl font-black text-slate-900">{editingDealer ? "Update dealer profile" : "Register jewellery trade partner"}</h2><p className="text-xs text-slate-500">Financial and metal opening balances post once to separate ledgers.</p></div><button type="button" onClick={() => setDialog("")} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X /></button></div>
        <div className="grid gap-5 p-6 md:grid-cols-3">
          <Field label="Dealer / firm name" required value={form.name} onChange={(e) => setDealerField("name", e.target.value)} />
          <SelectField label="Dealer category" required value={form.category_id} onChange={(e) => setDealerField("category_id", e.target.value)}><option value="">Choose category</option>{categories.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>
          <SelectField label="Status" value={form.status} onChange={(e) => setDealerField("status", e.target.value)}><option>Active</option><option>Inactive</option><option>On Hold</option></SelectField>
          <Field label="Contact person" required value={form.contact_person} onChange={(e) => setDealerField("contact_person", e.target.value)} />
          <Field label="Phone" required value={form.phone} onChange={(e) => setDealerField("phone", e.target.value)} />
          <Field label="Alternate phone" value={form.alternate_phone} onChange={(e) => setDealerField("alternate_phone", e.target.value)} />
          <Field label="Email" type="email" value={form.email} onChange={(e) => setDealerField("email", e.target.value)} />
          <Field label="GSTIN" value={form.gstin} onChange={(e) => setDealerField("gstin", e.target.value.toUpperCase())} />
          <Field label="PAN" value={form.pan} onChange={(e) => setDealerField("pan", e.target.value.toUpperCase())} />
          <Field label="Billing address" value={form.billing_address_line1} onChange={(e) => setDealerField("billing_address_line1", e.target.value)} />
          <Field label="Billing city" value={form.billing_city} onChange={(e) => setDealerField("billing_city", e.target.value)} />
          <Field label="Billing state" value={form.billing_state} onChange={(e) => setDealerField("billing_state", e.target.value)} />
          <Field label="Billing pincode" value={form.billing_pincode} onChange={(e) => setDealerField("billing_pincode", e.target.value)} />
          <Field label="Shipping address" value={form.shipping_address_line1} onChange={(e) => setDealerField("shipping_address_line1", e.target.value)} />
          <Field label="Shipping city" value={form.shipping_city} onChange={(e) => setDealerField("shipping_city", e.target.value)} />
          <Field label="Shipping state" value={form.shipping_state} onChange={(e) => setDealerField("shipping_state", e.target.value)} />
          <Field label="Shipping pincode" value={form.shipping_pincode} onChange={(e) => setDealerField("shipping_pincode", e.target.value)} />
          <Field label="Credit limit (₹)" type="number" min="0" step="0.01" value={form.credit_limit} onChange={(e) => setDealerField("credit_limit", e.target.value)} />
          <Field label="Payment terms (days)" type="number" min="0" step="1" value={form.payment_terms_days} onChange={(e) => setDealerField("payment_terms_days", e.target.value)} />
          <Field label="Bank name" value={form.bank_name} onChange={(e) => setDealerField("bank_name", e.target.value)} />
          <Field label="Account holder" value={form.bank_account_name} onChange={(e) => setDealerField("bank_account_name", e.target.value)} />
          <Field label="Account number" value={form.bank_account_number} onChange={(e) => setDealerField("bank_account_number", e.target.value)} />
          <Field label="IFSC" value={form.bank_ifsc} onChange={(e) => setDealerField("bank_ifsc", e.target.value.toUpperCase())} />
          {!editingDealer && <><SelectField label="Opening financial balance side" value={form.opening_balance_side} onChange={(e) => setDealerField("opening_balance_side", e.target.value)}><option value="payable">Payable to dealer</option><option value="receivable">Receivable from dealer</option></SelectField><Field label="Opening financial balance (₹)" type="number" min="0" step="0.01" value={form.opening_balance} onChange={(e) => setDealerField("opening_balance", e.target.value)} /><SelectField label="Opening metal type" value={form.opening_metal_type} onChange={(e) => setDealerField("opening_metal_type", e.target.value)}><option>Gold</option><option>Silver</option></SelectField><SelectField label="Opening metal purity" value={form.opening_metal_purity} onChange={(e) => setDealerField("opening_metal_purity", e.target.value)}>{PURITIES.map((purity) => <option key={purity}>{purity}</option>)}</SelectField><Field label="Opening metal weight (g, optional)" type="number" min="0.001" step="0.001" value={form.opening_metal_weight} onChange={(e) => setDealerField("opening_metal_weight", e.target.value)} /></>}
          <label className="block space-y-1.5 md:col-span-3"><span className="text-[11px] font-bold uppercase text-slate-500">Account notes</span><textarea value={form.notes} onChange={(e) => setDealerField("notes", e.target.value)} rows="3" className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-[#008577]" /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 bg-slate-50 p-4"><button type="button" onClick={() => setDialog("")} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold">Cancel</button><button disabled={saving} className="rounded-lg border border-gray-200 bg-[#003B3B] px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : editingDealer ? "Save profile" : "Create dealer"}</button></div>
      </form>
    </div>}

    {dialog === "purchase" && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={submitPurchase} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4"><div><h2 className="text-xl font-black">Post supplier document</h2><p className="text-xs text-slate-500">Rates and taxes are captured on each line when posted.</p></div><button type="button" onClick={() => setDialog("")}><X /></button></div>
      <div className="grid gap-4 p-6 md:grid-cols-3">
        <SelectField label="Dealer" required value={purchaseForm.dealer_id} onChange={(e) => setPurchaseForm({ ...purchaseForm, dealer_id: e.target.value, linked_document_id: "" })}><option value="">Select active dealer</option>{dealers.filter((item) => item.status === "Active").map((item) => <option key={item.id} value={item.id}>{item.dealer_code} — {item.name}</option>)}</SelectField>
        <SelectField label="Document type" value={purchaseForm.document_type} onChange={(e) => setPurchaseForm({ ...purchaseForm, document_type: e.target.value, linked_document_id: "" })}><option value="invoice">Supplier invoice</option><option value="purchase_return">Purchase return</option><option value="debit_note">Debit note (reduces payable)</option><option value="credit_note">Credit note (increases payable)</option></SelectField>
        <Field label="Supplier invoice number" required={purchaseForm.document_type === "invoice"} value={purchaseForm.supplier_invoice_number} onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier_invoice_number: e.target.value })} />
        <Field label="Document date" type="date" required value={purchaseForm.document_date} onChange={(e) => setPurchaseForm({ ...purchaseForm, document_date: e.target.value })} />
        <Field label="Due date" type="date" value={purchaseForm.due_date} onChange={(e) => setPurchaseForm({ ...purchaseForm, due_date: e.target.value })} />
        {purchaseForm.document_type !== "invoice" && <SelectField label="Original supplier invoice" required value={purchaseForm.linked_document_id || ""} onChange={(e) => setPurchaseForm({ ...purchaseForm, linked_document_id: e.target.value })}><option value="">Select original invoice</option>{linkedInvoices.map((item) => <option key={item.id} value={item.id}>{item.document_number} · {item.supplier_invoice_number} · {currency(item.total)}</option>)}</SelectField>}
      </div>
      <div className="space-y-4 px-6 pb-5">{purchaseForm.lines.map((line, index) => <div key={index} className="rounded-xl border border-gray-200 p-4">
        <div className="mb-3 flex items-center justify-between"><p className="text-sm font-black text-[#003B3B]">Invoice line {index + 1}</p>{purchaseForm.lines.length > 1 && <button type="button" onClick={() => setPurchaseForm((current) => ({ ...current, lines: current.lines.filter((_, i) => i !== index) }))} className="text-xs font-bold text-rose-600">Remove line</button>}</div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Description" required value={line.description} onChange={(e) => setPurchaseLine(index, "description", e.target.value)} />
          <SelectField label="Metal" value={line.metal_type} onChange={(e) => setPurchaseLine(index, "metal_type", e.target.value)}><option>Gold</option><option>Silver</option><option>Other</option></SelectField>
          {line.metal_type !== "Other" && <SelectField label="Purity" value={line.purity} onChange={(e) => { setPurchaseLine(index, "purity", e.target.value); setPurchaseLine(index, "rate_per_gram", ""); }}><option value="">Choose</option>{(line.metal_type === "Gold" ? PURITIES : ["999"]).map((purity) => <option key={purity}>{purity}</option>)}</SelectField>}
          <Field label={line.metal_type === "Other" ? "Quantity" : "Net weight (g)"} type="number" min="0.001" step="0.001" required value={line.metal_type === "Other" ? line.quantity : line.net_weight} onChange={(e) => setPurchaseLine(index, line.metal_type === "Other" ? "quantity" : "net_weight", e.target.value)} />
          {line.metal_type !== "Other" && <div className="space-y-1.5"><span className="text-[11px] font-bold uppercase text-slate-500">Active rate ₹/g</span><div className="flex gap-1"><input type="number" min="0.01" step="0.01" value={line.rate_per_gram} onChange={(e) => { setPurchaseLine(index, "rate_per_gram", e.target.value); setPurchaseLine(index, "negotiated_rate", true); }} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm" placeholder="Load current rate" /><button type="button" onClick={() => { setPurchaseLine(index, "negotiated_rate", false); void loadDealerRate(line.metal_type, line.purity, (value) => setPurchaseLine(index, "rate_per_gram", value)); }} className="rounded border px-2 text-xs font-bold">Current</button></div></div>}
          {line.metal_type === "Other" && <Field label="Unit price (₹)" type="number" min="0" step="0.01" value={line.unit_price} onChange={(e) => setPurchaseLine(index, "unit_price", e.target.value)} />}
          <Field label="Making charge (₹)" type="number" min="0" step="0.01" value={line.making_charge} onChange={(e) => setPurchaseLine(index, "making_charge", e.target.value)} />
          <Field label="Wastage charge (₹)" type="number" min="0" step="0.01" value={line.wastage_charge} onChange={(e) => setPurchaseLine(index, "wastage_charge", e.target.value)} />
          <Field label="Stone charge (₹)" type="number" min="0" step="0.01" value={line.stone_charge} onChange={(e) => setPurchaseLine(index, "stone_charge", e.target.value)} />
          <Field label="Discount (₹)" type="number" min="0" step="0.01" value={line.discount} onChange={(e) => setPurchaseLine(index, "discount", e.target.value)} />
          <Field label="GST rate (%)" type="number" min="0" max="100" step="0.001" value={line.tax_rate} onChange={(e) => setPurchaseLine(index, "tax_rate", e.target.value)} />
          <SelectField label="Tax treatment" value={line.tax_type} onChange={(e) => setPurchaseLine(index, "tax_type", e.target.value)}><option value="NONE">No tax</option><option value="CGST_SGST">Intra-state CGST + SGST</option><option value="IGST">Inter-state IGST</option></SelectField>
        </div>
      </div>)}
        <button type="button" onClick={() => setPurchaseForm((current) => ({ ...current, lines: [...current.lines, blankLine()] }))} className="rounded-lg border border-[#003B3B] px-3 py-2 text-xs font-bold text-[#003B3B]"><Plus size={14} className="mr-1 inline" /> Add line item</button>
        <Field label="Internal notes" value={purchaseForm.notes} onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 border-t border-gray-200 bg-slate-50 p-4"><button type="button" onClick={() => setDialog("")} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold">Cancel</button><button disabled={saving} className="rounded-lg border border-gray-200 bg-[#003B3B] px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "Posting…" : "Post document"}</button></div>
    </form></div>}

    {dialog === "payment" && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={submitPayment} className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex justify-between border-b border-gray-200 pb-3"><div><h2 className="text-xl font-black">Record dealer payment</h2><p className="text-xs text-slate-500">Unallocated remainder is posted as dealer advance/receivable.</p></div><button type="button" onClick={() => setDialog("")}><X /></button></div>
      <SelectField label="Dealer" required value={paymentForm.dealer_id} onChange={(e) => setPaymentForm({ ...paymentForm, dealer_id: e.target.value, purchase_id: "", allocation: "" })}><option value="">Select dealer</option>{dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.name}</option>)}</SelectField>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Payment amount (₹)" type="number" min="0.01" step="0.01" required value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} /><Field label="Payment date" type="date" required value={paymentForm.payment_date} onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} /><SelectField label="Method" value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}><option>Bank</option><option>UPI</option><option>Cheque</option><option>Cash</option></SelectField><Field label="Payment reference" value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} /></div>
      <SelectField label="Allocate to invoice (optional)" value={paymentForm.purchase_id} onChange={(e) => { const found = outstanding.find((item) => String(item.id) === e.target.value); setPaymentForm({ ...paymentForm, purchase_id: e.target.value, allocation: found ? String(found.outstanding) : "" }); }}><option value="">Keep as unallocated advance</option>{outstanding.filter((item) => String(item.dealer_id) === paymentForm.dealer_id).map((item) => <option key={item.id} value={item.id}>{item.document_number} · due {currency(item.outstanding)}</option>)}</SelectField>
      {paymentForm.purchase_id && <Field label="Allocation amount (₹)" type="number" min="0.01" step="0.01" value={paymentForm.allocation} onChange={(e) => setPaymentForm({ ...paymentForm, allocation: e.target.value })} />}
      <div className="flex justify-end gap-2 border-t border-gray-200 pt-4"><button type="button" onClick={() => setDialog("")} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold">Cancel</button><button disabled={saving} className="rounded-lg border border-gray-200 bg-[#003B3B] px-5 py-2 text-sm font-bold text-white">{saving ? "Posting…" : "Post payment"}</button></div>
    </form></div>}

    {dialog === "job" && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={submitJob} className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex justify-between border-b border-gray-200 pb-3"><h2 className="text-xl font-black">Create goldsmith job order</h2><button type="button" onClick={() => setDialog("")}><X /></button></div>
      <SelectField label="Goldsmith / job worker" required value={jobForm.dealer_id} onChange={(e) => setJobForm({ ...jobForm, dealer_id: e.target.value })}><option value="">Select dealer</option>{dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.name}</option>)}</SelectField>
      <Field label="Work description" required value={jobForm.description} onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })} />
      <div className="grid gap-3 sm:grid-cols-3"><Field label="Due date" type="date" value={jobForm.due_date} onChange={(e) => setJobForm({ ...jobForm, due_date: e.target.value })} /><Field label="Labour charge (₹)" type="number" min="0" step="0.01" value={jobForm.labour_charge} onChange={(e) => setJobForm({ ...jobForm, labour_charge: e.target.value })} /><Field label="Approved wastage (g)" type="number" min="0" step="0.001" value={jobForm.approved_wastage} onChange={(e) => setJobForm({ ...jobForm, approved_wastage: e.target.value })} /></div>
      <div className="flex justify-end gap-2 border-t border-gray-200 pt-4"><button type="button" onClick={() => setDialog("")} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold">Cancel</button><button disabled={saving} className="rounded-lg border border-gray-200 bg-[#003B3B] px-5 py-2 text-sm font-bold text-white">{saving ? "Saving…" : "Create job order"}</button></div>
    </form></div>}

    {(dialog === "issue" || dialog === "receipt") && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={submitMetal} className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex justify-between border-b border-gray-200 pb-3"><div><h2 className="text-xl font-black">{dialog === "issue" ? "Gold issue voucher" : "Finished goods / scrap receipt"}</h2><p className="text-xs text-slate-500">Fine metal equivalent is recorded against the job and dealer metal ledger.</p></div><button type="button" onClick={() => setDialog("")}><X /></button></div>
      <SelectField label="Job order" required value={metalForm.job_id} onChange={(e) => setMetalForm({ ...metalForm, job_id: e.target.value })}><option value="">Select job</option>{jobs.filter((job) => dialog === "issue" ? ["Open","Issued"].includes(job.status) : ["Issued","Partially Received"].includes(job.status)).map((job) => <option key={job.id} value={job.id}>{job.job_number} — {job.dealer_name}</option>)}</SelectField>
      {dialog === "receipt" && <SelectField label="Receipt type" value={metalForm.receipt_type} onChange={(e) => setMetalForm({ ...metalForm, receipt_type: e.target.value })}><option value="finished">Finished jewellery</option><option value="scrap">Recoverable scrap</option><option value="dust">Dust return</option></SelectField>}
      <div className="grid gap-3 sm:grid-cols-3"><SelectField label="Metal" value={metalForm.metal_type} onChange={(e) => setMetalForm({ ...metalForm, metal_type: e.target.value })}><option>Gold</option><option>Silver</option></SelectField><SelectField label="Purity" value={metalForm.purity} onChange={(e) => setMetalForm({ ...metalForm, purity: e.target.value })}>{(metalForm.metal_type === "Gold" ? PURITIES : ["999"]).map((purity) => <option key={purity}>{purity}</option>)}</SelectField><Field label="Weight (g)" type="number" min="0.001" step="0.001" required value={metalForm.weight} onChange={(e) => setMetalForm({ ...metalForm, weight: e.target.value })} /></div>
      {dialog === "receipt" && <Field label="Labour charge (₹)" type="number" min="0" step="0.01" value={metalForm.labour_charge} onChange={(e) => setMetalForm({ ...metalForm, labour_charge: e.target.value })} />}
      <div className="flex justify-end gap-2 border-t border-gray-200 pt-4"><button type="button" onClick={() => setDialog("")} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold">Cancel</button><button disabled={saving} className="rounded-lg border border-gray-200 bg-[#003B3B] px-5 py-2 text-sm font-bold text-white">{saving ? "Posting…" : dialog === "issue" ? "Post issue voucher" : "Post receipt"}</button></div>
    </form></div>}

    {dialog === "reconcile" && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={submitReconciliation} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex justify-between border-b border-gray-200 pb-3"><div><h2 className="text-xl font-black">Reconcile metal balance</h2><p className="text-xs text-slate-500">Review issued vs finished, scrap and dust fine-gold equivalent.</p></div><button type="button" onClick={() => setDialog("")}><X /></button></div>
      <SelectField label="Job order" required value={reconcileForm.job_id} onChange={(e) => setReconcileForm({ ...reconcileForm, job_id: e.target.value })}><option value="">Select job</option>{openJobs.map((job) => <option key={job.id} value={job.id}>{job.job_number} — {job.dealer_name} (variance {((Number(job.issued_fine_weight) || 0) - (Number(job.returned_fine_weight) || 0)).toFixed(3)} fine g)</option>)}</SelectField>
      <Field label="Approved process loss (g)" type="number" min="0" step="0.001" value={reconcileForm.approved_loss} onChange={(e) => setReconcileForm({ ...reconcileForm, approved_loss: e.target.value })} />
      <label className="block space-y-1.5"><span className="text-[11px] font-bold uppercase text-slate-500">Approval reason (required for unexplained variance)</span><textarea value={reconcileForm.reason} onChange={(e) => setReconcileForm({ ...reconcileForm, reason: e.target.value })} rows="3" className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-[#008577]" /></label>
      <div className="flex justify-end gap-2 border-t border-gray-200 pt-4"><button type="button" onClick={() => setDialog("")} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold">Cancel</button><button disabled={saving} className="rounded-lg border border-gray-200 bg-[#003B3B] px-5 py-2 text-sm font-bold text-white">{saving ? "Reconciling…" : "Approve reconciliation"}</button></div>
    </form></div>}

    {dialog === "oldGold" && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={submitOldGold} className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex justify-between border-b border-gray-200 pb-3"><div><h2 className="text-xl font-black">Old-gold receipt & settlement</h2><p className="text-xs text-slate-500">Fine gold is net tested weight × assay purity / 1000.</p></div><button type="button" onClick={() => setDialog("")}><X /></button></div>
      <SelectField label="Old-gold dealer" required value={oldGoldForm.dealer_id} onChange={(e) => setOldGoldForm({ ...oldGoldForm, dealer_id: e.target.value })}><option value="">Select dealer</option>{dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.name}</option>)}</SelectField>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Gross weight (g)" type="number" min="0.001" step="0.001" required value={oldGoldForm.gross_weight} onChange={(e) => setOldGoldForm({ ...oldGoldForm, gross_weight: e.target.value, net_weight: String(Math.max(0, Number(e.target.value || 0) - Number(oldGoldForm.stone_weight || 0))) })} /><Field label="Stone weight (g)" type="number" min="0" step="0.001" value={oldGoldForm.stone_weight} onChange={(e) => setOldGoldForm({ ...oldGoldForm, stone_weight: e.target.value, net_weight: String(Math.max(0, Number(oldGoldForm.gross_weight || 0) - Number(e.target.value || 0))) })} /><Field label="Net tested gold weight (g)" type="number" min="0.001" step="0.001" required value={oldGoldForm.net_weight} onChange={(e) => setOldGoldForm({ ...oldGoldForm, net_weight: e.target.value })} /><SelectField label="Tested purity" value={oldGoldForm.tested_purity} onChange={(e) => { const purity = e.target.value; setOldGoldForm({ ...oldGoldForm, tested_purity: purity, agreed_rate: "", rate_source: "Global" }); }}><option value="">Choose</option>{PURITIES.map((purity) => <option key={purity}>{purity}</option>)}</SelectField></div>
      <div className="grid gap-3 sm:grid-cols-2"><SelectField label="Rate source" value={oldGoldForm.rate_source} onChange={(e) => setOldGoldForm({ ...oldGoldForm, rate_source: e.target.value, agreed_rate: "" })}><option>Global</option><option>Negotiated</option></SelectField><div className="space-y-1.5"><span className="text-[11px] font-bold uppercase text-slate-500">Agreed rate (₹/tested g)</span><div className="flex gap-2"><input required={oldGoldForm.rate_source === "Negotiated"} readOnly={oldGoldForm.rate_source === "Global"} type="number" min="0.01" step="0.01" value={oldGoldForm.agreed_rate} onChange={(e) => setOldGoldForm({ ...oldGoldForm, agreed_rate: e.target.value })} className="w-full rounded-lg border px-3 py-2.5 text-sm read-only:bg-slate-100" /><button type="button" disabled={oldGoldForm.rate_source !== "Global"} onClick={() => void loadDealerRate("Gold", oldGoldForm.tested_purity, (value) => setOldGoldForm((current) => ({ ...current, agreed_rate: value })))} className="rounded border px-2 text-xs font-bold disabled:opacity-40">Current</button></div></div></div>
      <div className="flex justify-end gap-2 border-t border-gray-200 pt-4"><button type="button" onClick={() => setDialog("")} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold">Cancel</button><button disabled={saving} className="rounded-lg border border-gray-200 bg-[#003B3B] px-5 py-2 text-sm font-bold text-white">{saving ? "Posting…" : "Post receipt & payable"}</button></div>
    </form></div>}

    {dialog === "refining" && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={submitRefining} className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex justify-between border-b border-gray-200 pb-3"><div><h2 className="text-xl font-black">Refining recovery receipt</h2><p className="text-xs text-slate-500">Links recovered fine gold and refining charges to intake.</p></div><button type="button" onClick={() => setDialog("")}><X /></button></div>
      <SelectField label="Dealer" required value={refiningForm.dealer_id} onChange={(e) => setRefiningForm({ ...refiningForm, dealer_id: e.target.value, old_gold_receipt_id: "" })}><option value="">Select dealer</option>{dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.name}</option>)}</SelectField>
      <SelectField label="Source old-gold receipt" required value={refiningForm.old_gold_receipt_id} onChange={(e) => setRefiningForm({ ...refiningForm, old_gold_receipt_id: e.target.value })}><option value="">Select source receipt</option>{oldGoldReceipts.filter((item) => String(item.dealer_id) === refiningForm.dealer_id && Number(item.fine_gold_weight) - Number(item.recovered_fine_gold) > 0.005).map((item) => <option key={item.id} value={item.id}>{item.receipt_number} · remaining {(Number(item.fine_gold_weight) - Number(item.recovered_fine_gold)).toFixed(3)} fine g</option>)}</SelectField>
      <div className="grid gap-3 sm:grid-cols-3"><SelectField label="Recovered metal" value={refiningForm.recovered_metal_type} onChange={(e) => setRefiningForm({ ...refiningForm, recovered_metal_type: e.target.value })}><option>Gold</option><option>Silver</option></SelectField><SelectField label="Purity" value={refiningForm.recovered_purity} onChange={(e) => setRefiningForm({ ...refiningForm, recovered_purity: e.target.value })}>{(refiningForm.recovered_metal_type === "Gold" ? PURITIES : ["999"]).map((purity) => <option key={purity}>{purity}</option>)}</SelectField><Field label="Recovered weight (g)" type="number" min="0.001" step="0.001" value={refiningForm.recovered_weight} onChange={(e) => setRefiningForm({ ...refiningForm, recovered_weight: e.target.value })} /></div>
      <Field label="Refining charge (₹)" type="number" min="0" step="0.01" value={refiningForm.refining_charges} onChange={(e) => setRefiningForm({ ...refiningForm, refining_charges: e.target.value })} />
      <div className="flex justify-end gap-2 border-t border-gray-200 pt-4"><button type="button" onClick={() => setDialog("")} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold">Cancel</button><button disabled={saving} className="rounded-lg border border-gray-200 bg-[#003B3B] px-5 py-2 text-sm font-bold text-white">{saving ? "Posting…" : "Post refining receipt"}</button></div>
    </form></div>}

    {dialog === "profile" && selectedDealer && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"><div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white p-5"><div><h2 className="text-xl font-black">{selectedDealer.name}</h2><p className="text-xs text-slate-500">{selectedDealer.dealer_code} · {selectedDealer.category_name}</p></div><button type="button" onClick={() => setDialog("")}><X /></button></div>
      <div className="grid gap-3 p-5 md:grid-cols-3"><div className="rounded-lg bg-slate-50 p-3"><span className="text-xs text-slate-500">Payable</span><p className="font-black">{currency(selectedDealer.payable_balance)}</p></div><div className="rounded-lg bg-slate-50 p-3"><span className="text-xs text-slate-500">Receivable</span><p className="font-black">{currency(selectedDealer.receivable_balance)}</p></div><div className="rounded-lg bg-slate-50 p-3"><span className="text-xs text-slate-500">Credit terms</span><p className="font-black">{selectedDealer.payment_terms_days} days · {currency(selectedDealer.credit_limit)}</p></div></div>
      <div className="space-y-5 p-5">
        <form onSubmit={uploadDealerDocument} className="flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 p-4"><SelectField label="Document type" value={documentForm.type} onChange={(e) => setDocumentForm({ ...documentForm, type: e.target.value })}><option>GST Certificate</option><option>PAN Card</option><option>Bank Proof</option><option>Agreement</option><option>Other</option></SelectField><label className="block flex-1 space-y-1.5"><span className="text-[11px] font-bold uppercase text-slate-500">Private PDF/image (max 10 MB)</span><input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" required onChange={(e) => setDocumentForm({ ...documentForm, file: e.target.files?.[0] || null })} className="block w-full text-sm" /></label><button className="rounded-lg bg-[#003B3B] px-4 py-2.5 text-sm font-bold text-white">Upload</button></form>
        <div><h3 className="mb-2 font-black">Private dealer documents</h3>{selectedDealer.documents?.length ? selectedDealer.documents.map((doc) => <div key={doc.id} className="flex items-center justify-between border-b py-2 text-sm"><span><FileText className="mr-2 inline text-[#008577]" />{doc.document_type}: {doc.original_name}</span><span className="flex gap-2"><button type="button" onClick={() => void downloadDealerDocument(doc)} className="text-xs font-bold text-[#003B3B]">Download</button><button type="button" onClick={() => void removeDealerDocument(doc)} className="text-xs font-bold text-rose-600">Delete</button></span></div>) : <p className="text-sm text-slate-400">No documents on file.</p>}</div>
        <div><h3 className="mb-2 font-black">Account audit history</h3>{selectedDealer.audit?.data?.length ? selectedDealer.audit.data.map((item) => <div key={item.id} className="border-b py-2 text-sm"><span className="font-bold">{item.action}</span> by {item.actor} · {new Date(item.created_at).toLocaleString()} {item.reason && <span>· {item.reason}</span>}</div>) : <p className="text-sm text-slate-400">No account changes recorded.</p>}</div>
        <button type="button" onClick={() => void openStatement(selectedDealer)} className="rounded-lg border border-[#003B3B] px-4 py-2 text-sm font-bold text-[#003B3B]">Open dealer statement</button>
      </div>
    </div></div>}

    {dialog === "statement" && statement && selectedDealer && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"><div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white p-5"><div><h2 className="text-xl font-black">Dealer statement — {selectedDealer.name}</h2><p className="text-xs text-slate-500">{selectedDealer.dealer_code} · money and metal ledgers are shown separately</p></div><div className="flex gap-2"><button type="button" onClick={printStatement} className="inline-flex items-center gap-1 rounded border border-gray-200 px-3 py-2 text-xs font-bold"><Printer size={14} /> Print</button><button type="button" onClick={() => exportCsv([["Date","Entry","Type","Description","Payable delta","Receivable delta","Closing payable"], ...statement.financial.map((row) => [row.created_at,row.entry_number,row.entry_type,row.description,row.payable_delta,row.receivable_delta,row.payable_balance])], `${selectedDealer.dealer_code}-statement.csv`)} className="inline-flex items-center gap-1 rounded border border-gray-200 px-3 py-2 text-xs font-bold"><Download size={14} /> CSV</button><button type="button" onClick={() => setDialog("")} className="rounded border border-gray-200 p-2"><X /></button></div></div>
      <div className="p-5"><h3 className="mb-2 font-black text-[#003B3B]">Financial ledger (₹)</h3><div className="mb-6 overflow-x-auto"><table className="w-full min-w-[800px] text-left text-xs"><thead><tr className="bg-[#003B3B] text-white"><th className="p-2">Date</th><th className="p-2">Entry</th><th className="p-2">Description</th><th className="p-2 text-right">Payable Δ</th><th className="p-2 text-right">Receivable Δ</th><th className="p-2 text-right">Balance payable</th><th className="p-2 text-right">Actions</th></tr></thead><tbody>{statement.financial.map((row) => <tr key={row.id} className="border-b"><td className="p-2">{new Date(row.created_at).toLocaleDateString()}</td><td className="p-2">{row.entry_number}</td><td className="p-2">{row.description}</td><td className="p-2 text-right">{currency(row.payable_delta)}</td><td className="p-2 text-right">{currency(row.receivable_delta)}</td><td className="p-2 text-right font-bold">{currency(row.payable_balance)}</td><td className="p-2 text-right">{row.source_type === "payment" && !row.is_reversed && <button type="button" onClick={() => void reversePaymentEntry(row)} className="font-bold text-rose-700 hover:underline">Reverse</button>}{row.source_type === "payment" && row.is_reversed && <span className="text-slate-400">Reversed</span>}</td></tr>)}</tbody></table>{statement.financial.length === 0 && <p className="p-4 text-center text-sm text-slate-400">No financial ledger entries for this period.</p>}</div>
      <h3 className="mb-2 font-black text-[#003B3B]">Metal ledger (grams by purity)</h3><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead><tr className="bg-[#003B3B] text-white"><th className="p-2">Date</th><th className="p-2">Voucher</th><th className="p-2">Metal / purity</th><th className="p-2">Movement</th><th className="p-2 text-right">Weight Δ</th><th className="p-2 text-right">Fine-gold Δ</th><th className="p-2">Reconciliation</th><th className="p-2 text-right">Closing weight</th></tr></thead><tbody>{statement.metal.map((row) => <tr key={row.id} className="border-b"><td className="p-2">{new Date(row.created_at).toLocaleDateString()}</td><td className="p-2">{row.entry_number}</td><td className="p-2">{row.metal_type} {row.purity}</td><td className="p-2">{row.movement}</td><td className="p-2 text-right">{Number(row.weight_delta).toFixed(3)}</td><td className="p-2 text-right">{Number(row.fine_gold_delta).toFixed(3)}</td><td className="p-2">{row.reconciliation_status}</td><td className="p-2 text-right font-bold">{Number(row.closing_weight).toFixed(3)}</td></tr>)}</tbody></table>{statement.metal.length === 0 && <p className="p-4 text-center text-sm text-slate-400">No metal ledger entries for this period.</p>}</div></div>
    </div></div>}
  </div>;
};

export default Dealers;
