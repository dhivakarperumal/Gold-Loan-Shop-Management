import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Bell, CalendarDays, Check, CheckCircle2, ChevronLeft,
  ChevronRight, CircleDollarSign, Clock3, Eye, Mail, MapPin, MessageCircle,
  LayoutGrid, List, Package, Pencil, Phone, Plus, RotateCcw, Search, Send, Trash2, UserRound, X
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api";
import useGoldRates from "../../PrivateRouter/useGoldRates";
import { formatRateDate, getRateForPurity } from "../../PrivateRouter/goldRateUtils";

const STATUSES = ["New Enquiry", "In Progress", "Quotation Sent", "Converted", "Closed", "Not Interested"];
const TYPES = ["Gold Jewellery", "Gold Coin / Bar", "Gold Loan", "Old Gold Exchange", "Other"];
const PRIORITIES = ["Low", "Medium", "High"];
const OTHER_CATEGORY = "__other_category__";
const EMPTY_FORM = {
  customer_name: "", phone: "", alternate_phone: "", email: "", address: "",
  city: "", state: "", pincode: "", enquiry_type: "Gold Jewellery",
  product_category: "", product_id: "", product_name: "", metal_type: "Gold", purity: "", quantity: "1", weight: "",
  approx_budget: "", preferred_design: "", message: "", status: "New Enquiry",
  follow_up_date: "", follow_up_time: "", assigned_to: "", source: "",
  priority: "Medium", whatsapp_confirmation: true
};

const formForProduct = (product) => {
  const category = product.category || "";
  const categoryName = category.toLowerCase();
  const enquiryType = categoryName.includes("coin") || categoryName.includes("bar")
    ? "Gold Coin / Bar"
    : categoryName.includes("loan")
      ? "Gold Loan"
      : categoryName.includes("exchange")
        ? "Old Gold Exchange"
        : "Gold Jewellery";
  return {
    ...EMPTY_FORM,
    enquiry_type: enquiryType,
    product_category: category,
    product_id: String(product.id ?? product.product_id ?? ""),
    product_name: product.name || "",
    metal_type: product.metal_type || "Gold",
    purity: purityValueForProduct(product.purity, product.metal_type || "Gold"),
    weight: product.gross_weight == null ? "" : String(product.gross_weight),
    approx_budget: String(product.offer_price ?? product.final_selling_price ?? product.mrp ?? "")
  };
};

const statusStyle = {
  "New Enquiry": "bg-sky-100 text-sky-800",
  "In Progress": "bg-amber-100 text-amber-800",
  "Quotation Sent": "bg-violet-100 text-violet-800",
  Converted: "bg-emerald-100 text-emerald-800",
  Closed: "bg-rose-100 text-rose-800",
  "Not Interested": "bg-slate-100 text-slate-700"
};

const dateTime = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const purityValueForRate = (rate) => {
  if (rate.metal_type !== "Gold") return rate.purity;
  return ({
    "999": "24K",
    "916": "22K",
    "833": "20K",
    "750": "18K",
    "585": "14K"
  })[rate.purity] || rate.purity;
};

const purityValueForProduct = (purity, metalType = "Gold") => {
  const value = String(purity || "");
  if (metalType !== "Gold") return value;
  return ({
    "999": "24K",
    "916": "22K",
    "833": "20K",
    "750": "18K",
    "585": "14K"
  })[value] || value;
};

const purityLabelForEnquiry = (enquiry) => {
  if (enquiry.metal_type !== "Gold") return enquiry.purity;
  const karat = purityValueForRate({ metal_type: "Gold", purity: enquiry.purity });
  return karat === enquiry.purity ? enquiry.purity : `${karat} (${enquiry.purity})`;
};

const whatsAppNumber = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
};

const Field = ({ label, children, className = "" }) => (
  <label className={`block min-w-0 text-[11px] font-semibold text-slate-700 ${className}`}>
    {label}{children}
  </label>
);

const Enquiries = ({ isPopup = false, onClose, initialProduct = null, isPublicEnquiry = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const { current: activeRateSet, loading: ratesLoading, error: ratesError } = useGoldRates();
  const isCreate = isPopup || location.pathname.endsWith("/new");
  const isEditing = Boolean(editId);
  const isForm = isCreate || isEditing;
  const categoriesRef = useRef([]);
  const [enquiries, setEnquiries] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, responded: 0, closed: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 8, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [statusFilter, setStatusFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadedEditId, setLoadedEditId] = useState(null);
  const editLoading = Boolean(editId && loadedEditId !== editId);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => initialProduct ? formForProduct(initialProduct) : EMPTY_FORM);
  const [customCategory, setCustomCategory] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchEnquiries = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 8,
        search: search.trim(),
        status: statusFilter,
        product: productFilter
      };
      const response = await api.get("/enquiries/admin/all", { params });
      setEnquiries(response.data.enquiries || []);
      setStats(response.data.stats || { total: 0, pending: 0, responded: 0, closed: 0 });
      setPagination(response.data.pagination || { page, limit: 8, total: 0, totalPages: 1 });
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load enquiries.");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, productFilter]);

  useEffect(() => {
    if (!isForm) void fetchEnquiries();
  }, [isForm, fetchEnquiries]);

  useEffect(() => {
    if (!editId) return undefined;
    let active = true;
    api.get(`/enquiries/admin/${editId}`)
      .then(({ data }) => {
        if (!data.enquiry) throw new Error("The server returned an invalid enquiry.");
        const enquiry = data.enquiry;
        const productCategory = enquiry.product_category || "";
        if (active) {
          setForm({
            ...EMPTY_FORM,
            ...enquiry,
            product_id: enquiry.product_id == null
              ? (enquiry.product_name ? "custom" : "")
              : String(enquiry.product_id),
            product_category: productCategory,
            metal_type: enquiry.metal_type || "Gold",
            quantity: enquiry.quantity == null ? "" : String(enquiry.quantity),
            weight: enquiry.weight == null ? "" : String(enquiry.weight),
            approx_budget: enquiry.approx_budget == null ? "" : String(enquiry.approx_budget),
            follow_up_date: enquiry.follow_up_date ? String(enquiry.follow_up_date).slice(0, 10) : "",
            follow_up_time: enquiry.follow_up_time ? String(enquiry.follow_up_time).slice(0, 5) : "",
            whatsapp_confirmation: Boolean(enquiry.whatsapp_confirmation)
          });
          setCustomCategory(Boolean(productCategory && (
            productCategory === "Other" || !categoriesRef.current.some((category) => category.name === productCategory)
          )));
          setLoadedEditId(editId);
        }
      })
      .catch((error) => {
        if (active) {
          toast.error(error.response?.data?.message || error.message || "Unable to load enquiry.");
          navigate("/admin/enquiries", { replace: true });
        }
      });
    return () => { active = false; };
  }, [editId, navigate]);

  useEffect(() => {
    let active = true;
    api.get("/categories")
      .then((response) => {
        if (!Array.isArray(response.data)) throw new Error("The server returned an invalid category list.");
        const availableCategories = response.data.filter((category) => category.status === "Active");
        if (active) {
          categoriesRef.current = availableCategories;
          setCategories(availableCategories);
        }
      })
      .catch((error) => {
        console.error("Failed to load enquiry product categories:", error);
        toast.error(error.response?.data?.message || error.message || "Could not load product categories.");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const loadProducts = async () => {
      try {
        const firstResponse = await api.get("/products", { params: { page: 1, limit: 100, status: "Active" } });
        const firstPage = firstResponse.data;
        if (!Array.isArray(firstPage.products)) throw new Error("The server returned an invalid product list.");
        const pages = Array.from({ length: Math.max(0, (firstPage.pagination?.totalPages || 1) - 1) }, (_, index) => index + 2);
        const additionalPages = await Promise.all(pages.map((pageNumber) =>
          api.get("/products", { params: { page: pageNumber, limit: 100, status: "Active" } })
        ));
        if (active) setProducts([
          ...firstPage.products,
          ...additionalPages.flatMap((response) => response.data.products || [])
        ]);
      } catch (error) {
        console.error("Failed to load enquiry products:", error);
        toast.error(error.response?.data?.message || error.message || "Could not load products.");
      }
    };
    void loadProducts();
    return () => { active = false; };
  }, []);

  const categoryProducts = products.filter((product) =>
    product.status === "Active"
    && (!form.product_category || product.category === form.product_category)
  );
  const isCustomCategory = customCategory || Boolean(form.product_category && categories.length > 0 && (
    form.product_category === "Other" || !categories.some((category) => category.name === form.product_category)
  ));
  const metalTypes = [...new Set((activeRateSet?.rates || []).map((rate) => rate.metal_type))];
  const purityRates = (activeRateSet?.rates || []).filter((rate) => rate.metal_type === form.metal_type);
  const hasSelectedPurityOption = purityRates.some((rate) => purityValueForRate(rate) === form.purity);
  const selectedRate = getRateForPurity(activeRateSet, form.purity, form.metal_type);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const setProductCategory = (category) => {
    const isOtherCategory = category === OTHER_CATEGORY;
    setCustomCategory(isOtherCategory);
    setForm((current) => ({
      ...current,
      product_category: isOtherCategory ? "" : category,
      product_id: "",
      product_name: "",
      purity: ""
    }));
  };
  const setProductSelection = (value) => {
    if (value === "custom") {
      setForm((current) => ({ ...current, product_id: "custom", product_name: "" }));
      return;
    }
    const matchingProduct = categoryProducts.find((product) => String(product.id) === value);
    const productMetal = metalTypes.includes(matchingProduct?.metal_type) ? matchingProduct.metal_type : "";
    const productRate = matchingProduct?.purity
      ? getRateForPurity(activeRateSet, matchingProduct.purity, productMetal || form.metal_type)
      : null;
    const metalType = productRate?.metal_type || productMetal || form.metal_type;
    setForm((current) => ({
      ...current,
      product_id: matchingProduct ? String(matchingProduct.id) : "",
      product_name: matchingProduct?.name || "",
      ...(matchingProduct?.purity ? {
        metal_type: metalType,
        purity: productRate
          ? purityValueForRate(productRate)
          : purityValueForProduct(matchingProduct.purity, metalType)
      } : {})
    }));
  };
  const submitEnquiry = async (event, addAnother = false) => {
    event.preventDefault();
    setSaving(true);
    try {
      const enquiryData = {
        ...form,
        product_id: form.product_id && form.product_id !== "custom" ? Number(form.product_id) : null
      };
      if (isEditing) {
        await api.put(`/enquiries/admin/${editId}`, enquiryData);
        toast.success("Enquiry updated successfully.");
      } else {
        await api.post(isPublicEnquiry ? "/enquiries/public" : "/enquiries", enquiryData);
        toast.success(isPublicEnquiry ? "Your enquiry was sent successfully." : "Enquiry saved successfully.");
      }
      if (addAnother) {
        setForm(EMPTY_FORM);
        setCustomCategory(false);
        return;
      }
      if (isPopup) onClose?.();
      else navigate("/admin/enquiries");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save enquiry.");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (enquiry, status) => {
    try {
      await api.put(`/enquiries/admin/${enquiry.id}/status`, { status });
      toast.success("Enquiry status updated.");
      await fetchEnquiries();
      if (selected?.id === enquiry.id) setSelected({ ...selected, status });
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update enquiry.");
    }
  };

  const deleteEnquiry = async (enquiry) => {
    if (!window.confirm(`Delete enquiry #ENQ${String(enquiry.id).padStart(3, "0")}?`)) return;
    try {
      await api.delete(`/enquiries/admin/${enquiry.id}`);
      toast.success("Enquiry deleted.");
      setSelected(null);
      await fetchEnquiries();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete enquiry.");
    }
  };

  const filteredStats = useMemo(() => [
    { label: "Total Enquiries", value: stats.total, note: "All customer enquiries", icon: MessageCircle, color: "emerald" },
    { label: "Pending", value: stats.pending, note: "Awaiting follow-up", icon: Clock3, color: "amber" },
    { label: "Responded", value: stats.responded, note: "In progress or quoted", icon: Check, color: "sky" },
    { label: "Closed", value: stats.closed, note: "Closed or not interested", icon: X, color: "rose" }
  ], [stats]);

  const inputClass = "mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-800 outline-none focus:border-[#008577] focus:ring-2 focus:ring-emerald-800/10";

  if (isForm) {
    return <main
      className={isPopup
        ? "fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 sm:p-6"
        : "space-y-4 pb-5"}
      onMouseDown={isPopup ? (event) => {
        if (event.target === event.currentTarget) onClose?.();
      } : undefined}
    >
      <div
        role={isPopup ? "dialog" : undefined}
        aria-modal={isPopup ? "true" : undefined}
        aria-labelledby={isPopup ? "enquiry-form-title" : undefined}
        className={isPopup
          ? "relative max-h-[calc(100vh-1.5rem)] w-full max-w-4xl overflow-y-auto rounded-2xl bg-slate-50 p-4 shadow-2xl sm:max-h-[calc(100vh-3rem)] sm:p-6"
          : ""}
      >
      <header className={`flex w-full flex-wrap items-end justify-between gap-3 ${isPopup ? "w-[calc(100%+2rem)] -mx-4 -mt-4 mb-5 rounded-t-2xl bg-white px-4 pb-2 pt-3 pr-16 shadow-sm sm:w-[calc(100%+3rem)] sm:-mx-6 sm:-mt-6 sm:px-6 sm:pb-3 sm:pt-4 sm:pr-16" : ""}`}>
        <div className={isPopup ? "mt-1" : ""}>
         
          <h1 id={isPopup ? "enquiry-form-title" : undefined} className="mt-0  text-2xl font-black tracking-tight text-slate-900">{isEditing ? "Edit Gold Enquiry" : isPublicEnquiry ? "Enquire About This Product" : "Add Gold Enquiry"}</h1>
          <p className="mt-1 mb-5 text-sm text-slate-500">{isEditing ? "Update customer and product enquiry details." : isPublicEnquiry ? "Share your contact details and we’ll get back to you." : isPopup ? "Enter customer and product details below." : "Add a new customer enquiry for gold jewellery, coins, or other products."}</p>
        </div>
        {isPopup
          ? <button type="button" onClick={onClose} aria-label="Close add enquiry dialog" className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 sm:right-6 sm:top-6"><X size={18} /></button>
          : <Link to="/admin/enquiries" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 mb-5 text-xs font-bold text-slate-700 hover:bg-slate-50"><ArrowLeft size={15} />Back to Enquiries</Link>}
      </header>

      {editLoading ? <section className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">Loading enquiry details…</section> :
      <form onSubmit={(event) => void submitEnquiry(event)} className={`grid items-start gap-3 ${isPublicEnquiry ? "" : "xl:grid-cols-[minmax(0,1fr)_280px]"}`}>
        <div className="space-y-3">
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700"><UserRound size={17} /></span><span><h2 className="text-xs font-extrabold text-slate-900">Customer Information</h2><p className="text-[10px] text-slate-500">Enter customer personal details.</p></span></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <Field label={<>Customer Name <b className="text-rose-600">*</b></>} className="xl:col-span-3"><input required maxLength={150} value={form.customer_name} onChange={(event) => setField("customer_name", event.target.value)} placeholder="Enter customer name" className={inputClass} /></Field>
              <Field label={<>Mobile Number <b className="text-rose-600">*</b></>} className="xl:col-span-2"><input required maxLength={32} type="tel" value={form.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="Enter mobile number" className={inputClass} /></Field>
              <a href={`https://wa.me/${whatsAppNumber(form.phone)}`} target="_blank" rel="noreferrer" className={`mt-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-white xl:col-span-1 ${form.phone ? "bg-[#008577] hover:bg-[#00695C]" : "pointer-events-none bg-slate-300"}`}><MessageCircle size={15} />WhatsApp</a>
              <Field label="Email Address" className="xl:col-span-2"><input type="email" maxLength={254} value={form.email} onChange={(event) => setField("email", event.target.value)} placeholder="Enter email address" className={inputClass} /></Field>
              <Field label="Alternate Number" className="xl:col-span-2"><input type="tel" maxLength={32} value={form.alternate_phone} onChange={(event) => setField("alternate_phone", event.target.value)} placeholder="Enter alternate number" className={inputClass} /></Field>
              <Field label="Address" className="sm:col-span-2 xl:col-span-2"><textarea maxLength={2000} value={form.address} onChange={(event) => setField("address", event.target.value)} placeholder="Enter address" className={`${inputClass} min-h-[58px] resize-y`} /></Field>
              <Field label="City" className="xl:col-span-2"><input value={form.city} onChange={(event) => setField("city", event.target.value)} placeholder="City" className={inputClass} /></Field>
              <Field label="State" className="xl:col-span-2"><input value={form.state} onChange={(event) => setField("state", event.target.value)} placeholder="State" className={inputClass} /></Field>
              <Field label="Pincode" className="xl:col-span-2"><input value={form.pincode} onChange={(event) => setField("pincode", event.target.value)} placeholder="Enter pincode" className={inputClass} /></Field>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700"><CircleDollarSign size={17} /></span><span><h2 className="text-xs font-extrabold text-slate-900">Enquiry Details</h2><p className="text-[10px] text-slate-500">Enter the product and enquiry details.</p></span></div>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((type) => <button key={type} type="button" onClick={() => setField("enquiry_type", type)} className={`rounded-lg border px-3 py-2 text-[11px] font-bold transition ${form.enquiry_type === type ? "border-amber-500 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{type}</button>)}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Product Category"><select value={isCustomCategory ? OTHER_CATEGORY : form.product_category} onChange={(event) => setProductCategory(event.target.value)} className={inputClass}><option value="">Select product category</option>{categories.filter((category) => category.name !== "Other").map((category) => <option key={category.catId || category.id || category.name} value={category.name}>{category.name}</option>)}<option value={OTHER_CATEGORY}>Other</option></select>{isCustomCategory && <input required maxLength={100} value={form.product_category} onChange={(event) => setField("product_category", event.target.value)} placeholder="Enter product category" className={inputClass} />}</Field>
              <Field label="Product Name / Item"><select value={form.product_id} onChange={(event) => setProductSelection(event.target.value)} className={inputClass}><option value="">Select product</option>{categoryProducts.map((product) => <option key={product.id} value={product.id}>{product.name}{product.product_code ? ` · ${product.product_code}` : ""}</option>)}<option value="custom">Other / Custom Item</option></select>{form.product_id === "custom" && <input maxLength={200} value={form.product_name} onChange={(event) => setField("product_name", event.target.value)} placeholder="Enter product name" className={inputClass} />}</Field>
              <Field label="Metal Type"><select value={form.metal_type} onChange={(event) => setForm((current) => ({ ...current, metal_type: event.target.value, purity: "" }))} className={inputClass}><option value="">Select metal</option>{metalTypes.map((metal) => <option key={metal}>{metal}</option>)}</select></Field>
              <Field label="Purity"><select value={form.purity} onChange={(event) => setField("purity", event.target.value)} className={inputClass} disabled={ratesLoading || !form.metal_type}><option value="">Select purity</option>{form.purity && !hasSelectedPurityOption && <option value={form.purity}>{form.purity}</option>}{purityRates.map((rate) => {
                const karat = purityValueForRate(rate);
                return <option key={rate.purity} value={karat}>{karat === rate.purity ? rate.purity : `${karat} (${rate.purity})`}</option>;
              })}</select></Field>
              <div className="min-w-0 text-[11px] font-semibold text-slate-700">
                Daily Rate
                <div className="mt-1.5 flex min-h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800">
                  {ratesLoading ? "Loading daily rates…" : ratesError ? "Daily rates unavailable" : selectedRate ? `₹${Number(selectedRate.rate_per_unit ?? selectedRate.rate_per_gram).toLocaleString("en-IN")} / ${selectedRate.rate_unit || "gram"}` : activeRateSet ? "Select a purity" : "No active daily rate"}
                </div>
                {ratesError
                  ? <p role="alert" className="mt-1 text-[10px] font-normal text-rose-600">{ratesError}</p>
                  : activeRateSet && selectedRate && <p className="mt-1 text-[10px] font-normal text-slate-500">Rate date: {formatRateDate(activeRateSet.rate_date)}</p>}
              </div>
              <Field label="Quantity"><input min="0" step="0.001" type="number" value={form.quantity} onChange={(event) => setField("quantity", event.target.value)} placeholder="Enter quantity" className={inputClass} /></Field>
              <Field label="Weight (grams)"><input min="0" step="0.001" type="number" value={form.weight} onChange={(event) => setField("weight", event.target.value)} placeholder="Enter weight" className={inputClass} /></Field>
              <Field label="Approx. Budget (₹)"><input min="0" step="0.01" type="number" value={form.approx_budget} onChange={(event) => setField("approx_budget", event.target.value)} placeholder="Enter budget" className={inputClass} /></Field>
              <Field label="Preferred Design"><select value={form.preferred_design} onChange={(event) => setField("preferred_design", event.target.value)} className={inputClass}><option value="">Select design type</option>{["Traditional", "Modern", "Antique", "Custom", "Not specified"].map((design) => <option key={design}>{design}</option>)}</select></Field>
              <Field label="Enquiry Message" className="sm:col-span-2 xl:col-span-4"><textarea maxLength={5000} value={form.message} onChange={(event) => setField("message", event.target.value)} placeholder="Enter customer requirements or special notes..." className={`${inputClass} min-h-[70px] resize-y`} /></Field>
            </div>
            <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-3">
              {!isPublicEnquiry && <button type="button" onClick={() => setForm(EMPTY_FORM)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"><RotateCcw size={14} />Reset</button>}
              <div className="flex flex-wrap gap-2">
                {!isEditing && !isPublicEnquiry && <button type="button" disabled={saving} onClick={(event) => void submitEnquiry(event, true)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-amber-500 px-3 py-2 text-xs font-bold text-amber-800 disabled:opacity-50"><Plus size={14} />Save & Add Another</button>}
                <button type="submit" disabled={saving} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#00796B] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"><CheckCircle2 size={14} />{saving ? (isEditing ? "Updating…" : isPublicEnquiry ? "Sending…" : "Saving…") : (isEditing ? "Update Enquiry" : isPublicEnquiry ? "Send Enquiry" : "Save Enquiry")}</button>
              </div>
            </div>
          </section>
        </div>

        {!isPublicEnquiry && <aside className="space-y-3">
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-xs font-extrabold text-slate-900"><MessageCircle size={16} className="text-[#008577]" />Enquiry Status</h2>
            <div className="mt-3 space-y-1">
              {STATUSES.map((status) => <label key={status} className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[11px] ${form.status === status ? "bg-emerald-50 font-bold text-slate-800" : "text-slate-600"}`}><input type="radio" name="status" value={status} checked={form.status === status} onChange={() => setField("status", status)} className="accent-emerald-700" />{status}</label>)}
            </div>
          </section>
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-xs font-extrabold text-slate-900"><CalendarDays size={16} className="text-amber-600" />Follow Up Details</h2>
            <div className="mt-3 space-y-3">
              <Field label="Next Follow Up Date"><input type="date" value={form.follow_up_date} onChange={(event) => setField("follow_up_date", event.target.value)} className={inputClass} /></Field>
              <Field label="Follow Up Time"><input type="time" value={form.follow_up_time} onChange={(event) => setField("follow_up_time", event.target.value)} className={inputClass} /></Field>
              <Field label="Assign To"><input value={form.assigned_to} onChange={(event) => setField("assigned_to", event.target.value)} placeholder="Admin" className={inputClass} /></Field>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-xs font-extrabold text-slate-900"><Bell size={16} className="text-amber-600" />Additional Information</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Source"><select value={form.source} onChange={(event) => setField("source", event.target.value)} className={inputClass}><option value="">Select source</option>{["Walk-in", "Phone", "WhatsApp", "Website", "Social Media", "Referral", "Other"].map((source) => <option key={source}>{source}</option>)}</select></Field>
              <Field label="Priority"><select value={form.priority} onChange={(event) => setField("priority", event.target.value)} className={inputClass}>{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select></Field>
            </div>
            <label className="mt-4 flex items-center justify-between gap-3 text-[11px] font-semibold text-slate-700"><span className="flex items-center gap-2"><MessageCircle size={14} />Send WhatsApp Confirmation</span><input type="checkbox" checked={form.whatsapp_confirmation} onChange={(event) => setField("whatsapp_confirmation", event.target.checked)} className="h-4 w-4 accent-amber-600" /></label>
          </section>
        </aside>}
      </form>}
      </div>
    </main>;
  }

  return <main className="space-y-3 pb-5">


    <section aria-label="Enquiry summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {filteredStats.map(({ label, value, note, icon: Icon, color }) => {
        const colors = {
          emerald: {
            card: "border-l-emerald-400 bg-[#123F37]",
            icon: "bg-emerald-700 text-white",
            note: "text-emerald-300",
            dot: "bg-emerald-300",
            bars: "bg-emerald-300"
          },
          amber: {
            card: "border-l-amber-400 bg-[#3D321B]",
            icon: "bg-amber-500 text-white",
            note: "text-amber-300",
            dot: "bg-amber-300",
            bars: "bg-amber-300"
          },
          sky: {
            card: "border-l-sky-400 bg-[#173B56]",
            icon: "bg-[#00796B] text-white",
            note: "text-sky-300",
            dot: "bg-sky-300",
            bars: "bg-sky-300"
          },
          rose: {
            card: "border-l-orange-400 bg-[#4A2A24]",
            icon: "bg-amber-500 text-white",
            note: "text-orange-200",
            dot: "bg-orange-300",
            bars: "bg-orange-300"
          }
        };
        const theme = colors[color];
        return <article key={label} className={`relative isolate flex min-h-36 items-center gap-4 overflow-hidden rounded-2xl border border-white/10 border-l-4 p-5 text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${theme.card}`}>
          <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-white/70 text-slate-600"><ChevronRight size={15} /></span>
          <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-md ${theme.icon}`}><Icon size={23} /></span>
          <div className="min-w-0 pb-1">
            <p className="truncate text-xs font-semibold text-white/90">{label}</p>
            <p className="mt-1 text-2xl font-black leading-none tracking-tight">{Number(value).toLocaleString("en-IN")}</p>
            <p className={`mt-3 flex items-center gap-1.5 truncate text-[11px] font-bold ${theme.note}`}><span className={`h-2 w-2 shrink-0 rounded-full ${theme.dot}`} />{note}</p>
          </div>
          <div aria-hidden="true" className={`absolute bottom-3 right-3 flex h-7 items-end gap-1 opacity-90 ${theme.bars}`}>
            <span className="h-3 w-1 rounded-t-sm bg-current" />
            <span className="h-5 w-1 rounded-t-sm bg-current" />
            <span className="h-4 w-1 rounded-t-sm bg-current" />
            <span className="h-7 w-1 rounded-t-sm bg-current" />
          </div>
        </article>;
      })}
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex flex-col gap-2.5 border-b border-slate-100 p-3 lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1 lg:max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><span className="sr-only">Search enquiries</span><input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Search by name, phone, email, product..." className="min-h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-[#008577]" /></label>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <select aria-label="Filter by status" value={statusFilter} onChange={(event) => { setPage(1); setStatusFilter(event.target.value); }} className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-700"><option value="">All Status</option>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
          <select aria-label="Filter by product" value={productFilter} onChange={(event) => { setPage(1); setProductFilter(event.target.value); }} className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-700"><option value="">All Products</option>{categories.map((category) => <option key={category.catId || category.id || category.name} value={category.name}>{category.name}</option>)}</select>
          <div role="group" aria-label="Enquiry view mode" className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button type="button" onClick={() => setViewMode("table")} aria-label="Table mode" aria-pressed={viewMode === "table"} title="Table mode" className={`rounded-md p-1.5 transition ${viewMode === "table" ? "bg-white text-[#00796B] shadow-sm" : "text-slate-400 hover:text-slate-700"}`}><List size={16} /></button>
            <button type="button" onClick={() => setViewMode("card")} aria-label="Card mode" aria-pressed={viewMode === "card"} title="Card mode" className={`rounded-md p-1.5 transition ${viewMode === "card" ? "bg-white text-[#00796B] shadow-sm" : "text-slate-400 hover:text-slate-700"}`}><LayoutGrid size={16} /></button>
          </div>
          <Link to="/admin/enquiries/new" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#00796B] px-3 py-2 text-xs font-bold text-white"><Plus size={15} />Add Enquiry</Link>
        </div>
      </div>

      {viewMode === "table" ? <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <thead><tr className="bg-gradient-to-r from-[#07564B] via-[#064A41] to-[#043D37] text-[10px] uppercase tracking-wide text-emerald-50/90"><th className="rounded-tl-2xl px-4 py-4">S No</th><th className="px-4 py-4">Customer</th><th className="px-4 py-4">Enquiry Details</th><th className="px-4 py-4">Product</th><th className="px-4 py-4">Date &amp; Time</th><th className="px-4 py-4">Status</th><th className="rounded-tr-2xl px-4 py-4 text-right">Action</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading
              ? <tr><td colSpan="7" className="p-10 text-center text-sm text-slate-500">Loading enquiries…</td></tr>
              : enquiries.length === 0
                ? <tr><td colSpan="7" className="p-10 text-center text-sm text-slate-500">No enquiries found. Add one to get started.</td></tr>
                : enquiries.map((enquiry, index) => <tr key={enquiry.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-xs font-medium tabular-nums text-slate-500">{(page - 1) * pagination.limit + index + 1}</td>
                  <td className="px-3 py-2.5"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fuchsia-100 text-xs font-bold text-fuchsia-700">{enquiry.customer_name?.slice(0, 1)?.toUpperCase()}</span><span className="min-w-0"><strong className="block truncate text-[11px] text-slate-800">{enquiry.customer_name}</strong><a href={`tel:${enquiry.phone}`} className="block text-[10px] text-slate-500 hover:text-emerald-700">{enquiry.phone}</a><span className="block max-w-32 truncate text-[10px] text-slate-400">{enquiry.email || "No email"}</span></span></div></td>
                  <td className="max-w-40 px-3 py-2.5">{enquiry.message && enquiry.message !== enquiry.enquiry_type && <p className="line-clamp-2 text-[11px] text-slate-700">{enquiry.message}</p>}<span className="text-[10px] font-semibold text-slate-500">{enquiry.enquiry_type}</span></td>
                  <td className="px-3 py-2.5"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><Package size={16} /></span><span><strong className="block max-w-32 truncate text-[11px] text-slate-800">{enquiry.product_name || enquiry.product_category || enquiry.enquiry_type}</strong><span className="block text-[10px] text-slate-400">{enquiry.purity ? `${enquiry.metal_type || "Metal"} · ${purityLabelForEnquiry(enquiry)}` : enquiry.product_category || "Product inquiry"}</span>{enquiry.daily_rate != null && <span className="block text-[10px] font-semibold text-emerald-700">₹{Number(enquiry.daily_rate).toLocaleString("en-IN")} / {enquiry.rate_unit || "gram"}</span>}</span></div></td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[10px] text-slate-600">{dateTime(enquiry.created_at)}</td>
                  <td className="px-3 py-2.5"><select aria-label={`Change status for enquiry ${enquiry.id}`} value={enquiry.status} onChange={(event) => void updateStatus(enquiry, event.target.value)} className={`max-w-32 rounded-full border-0 px-2.5 py-1.5 text-[10px] font-bold ${statusStyle[enquiry.status] || statusStyle["New Enquiry"]}`}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></td>
                  <td className="px-3 py-2.5"><div className="flex justify-end gap-1.5">
                    <button type="button" aria-label="View enquiry" onClick={() => setSelected(enquiry)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><Eye size={14} /></button>
                    <button type="button" aria-label={`Edit enquiry ${enquiry.id}`} onClick={() => navigate(`/admin/enquiries/edit/${enquiry.id}`)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-sky-50 hover:text-sky-700"><Pencil size={14} /></button>
                    {enquiry.phone && <a aria-label="Reply on WhatsApp" href={`https://wa.me/${whatsAppNumber(enquiry.phone)}`} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"><Send size={14} /></a>}
                    <button type="button" aria-label="Delete enquiry" onClick={() => void deleteEnquiry(enquiry)} className="rounded-lg border border-rose-100 p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={14} /></button>
                  </div></td>
                </tr>)}
          </tbody>
        </table>
      </div> : <div aria-label="Enquiries in card view" className="p-3">
        {loading
          ? <p className="py-10 text-center text-sm text-slate-500">Loading enquiries…</p>
          : enquiries.length === 0
            ? <p className="py-10 text-center text-sm text-slate-500">No enquiries found. Add one to get started.</p>
            : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {enquiries.map((enquiry) => <article key={enquiry.id} className="min-w-0 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-emerald-100 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fuchsia-100 text-sm font-bold text-fuchsia-700">{enquiry.customer_name?.slice(0, 1)?.toUpperCase()}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{enquiry.customer_name}</p>
                      <a href={`tel:${enquiry.phone}`} className="block text-xs text-slate-500 hover:text-emerald-700">{enquiry.phone}</a>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-slate-500">#ENQ{String(enquiry.id).padStart(3, "0")}</span>
                </div>
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <div className="flex items-start gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><Package size={16} /></span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-800">{enquiry.product_name || enquiry.product_category || enquiry.enquiry_type}</p>
                      <p className="text-[10px] text-slate-500">{enquiry.purity ? `${enquiry.metal_type || "Metal"} · ${purityLabelForEnquiry(enquiry)}` : enquiry.product_category || "Product inquiry"}</p>
                      {enquiry.daily_rate != null && <p className="mt-0.5 text-[10px] font-semibold text-emerald-700">₹{Number(enquiry.daily_rate).toLocaleString("en-IN")} / {enquiry.rate_unit || "gram"}</p>}
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 text-xs text-slate-700">{enquiry.message || enquiry.enquiry_type}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-500">{dateTime(enquiry.created_at)}</span>
                    <select aria-label={`Change status for enquiry ${enquiry.id}`} value={enquiry.status} onChange={(event) => void updateStatus(enquiry, event.target.value)} className={`max-w-full rounded-full border-0 px-2.5 py-1.5 text-[10px] font-bold ${statusStyle[enquiry.status] || statusStyle["New Enquiry"]}`}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                  <button type="button" onClick={() => setSelected(enquiry)} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00796B] hover:underline"><Eye size={14} />View details</button>
                  <div className="flex gap-1.5">
                    <button type="button" aria-label={`Edit enquiry ${enquiry.id}`} onClick={() => navigate(`/admin/enquiries/edit/${enquiry.id}`)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-sky-50 hover:text-sky-700"><Pencil size={14} /></button>
                    {enquiry.phone && <a aria-label={`Reply to enquiry ${enquiry.id} on WhatsApp`} href={`https://wa.me/${whatsAppNumber(enquiry.phone)}`} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"><Send size={14} /></a>}
                    <button type="button" aria-label={`Delete enquiry ${enquiry.id}`} onClick={() => void deleteEnquiry(enquiry)} className="rounded-lg border border-rose-100 p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={14} /></button>
                  </div>
                </div>
              </article>)}
            </div>}
      </div>}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-3 py-3 text-[11px] text-slate-500">
        <span>Showing {pagination.total ? (page - 1) * pagination.limit + 1 : 0} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} enquiries</span>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronLeft size={14} /></button>
          {Array.from({ length: pagination.totalPages }, (_, index) => index + 1).slice(Math.max(0, page - 3), Math.max(5, page + 2)).map((pageNumber) => <button key={pageNumber} type="button" onClick={() => setPage(pageNumber)} className={`min-w-7 rounded-lg border px-2 py-1.5 text-xs ${pageNumber === page ? "border-[#00796B] bg-[#00796B] text-white" : "border-slate-200"}`}>{pageNumber}</button>)}
          <button type="button" aria-label="Next page" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronRight size={14} /></button>
        </div>
      </footer>
    </section>

    {selected && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="enquiry-dialog-title" className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-[#00796B]">#ENQ{String(selected.id).padStart(3, "0")}</p><h2 id="enquiry-dialog-title" className="mt-1 text-lg font-black text-slate-900">{selected.customer_name}</h2></div><button type="button" aria-label="Close details" onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div>
        <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
          <p className="flex items-center gap-2"><Phone size={14} className="text-slate-400" />{selected.phone}</p>
          <p className="flex items-center gap-2"><Mail size={14} className="text-slate-400" />{selected.email || "No email"}</p>
          <p className="flex items-center gap-2"><Package size={14} className="text-slate-400" />{selected.product_name || selected.product_category || selected.enquiry_type}</p>
          {selected.purity && <p className="flex items-center gap-2"><CircleDollarSign size={14} className="text-slate-400" />{selected.metal_type} · {purityLabelForEnquiry(selected)}{selected.daily_rate != null ? ` · ₹${Number(selected.daily_rate).toLocaleString("en-IN")} / ${selected.rate_unit || "gram"}` : ""}</p>}
          {selected.rate_date && <p className="flex items-center gap-2"><CalendarDays size={14} className="text-slate-400" />Rate date: {formatRateDate(selected.rate_date)}</p>}
          <p className="flex items-center gap-2"><CalendarDays size={14} className="text-slate-400" />{dateTime(selected.created_at)}</p>
          <p className="flex items-center gap-2"><Clock3 size={14} className="text-slate-400" />Follow-up: {selected.follow_up_date || "Not scheduled"} {selected.follow_up_time || ""}</p>
          <p className="flex items-center gap-2"><MapPin size={14} className="text-slate-400" />{[selected.city, selected.state].filter(Boolean).join(", ") || selected.address || "No address"}</p>
        </div>
        <p className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">{selected.message || "No message provided."}</p>
        <div className="mt-4 flex flex-wrap justify-between gap-2"><span className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-bold ${statusStyle[selected.status] || statusStyle["New Enquiry"]}`}>{selected.status}</span><div className="flex gap-2">
          {selected.phone && <a href={`https://wa.me/${whatsAppNumber(selected.phone)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[#008577] px-3 py-2 text-xs font-bold text-white"><MessageCircle size={14} />WhatsApp</a>}
          <button type="button" onClick={() => void deleteEnquiry(selected)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700"><Trash2 size={14} />Delete</button>
        </div></div>
      </section>
    </div>}
  </main>;
};

export default Enquiries;
