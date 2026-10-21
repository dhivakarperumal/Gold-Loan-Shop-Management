import { useCallback, useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiCalendar, FiChevronDown, FiChevronRight, FiCreditCard, FiDollarSign, FiEdit2, FiEye, FiGrid, FiImage, FiList, FiPlus, FiPrinter, FiRepeat, FiSave, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../api";
import DateRangeFilter from "../Components/DateRangeFilter";
import useGoldRates from "../../PrivateRouter/useGoldRates";
import { getReceiptSettings } from "./receiptSettings";
import { formatCurrency as currency } from "../../utils/currency";

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
const EMPTY_CUSTOMER = { name: "", phone: "", email: "", address: "" };
const EMPTY_PRODUCT = {
  product_id: "",
  product_name: "",
  category: "",
  purity: "",
  gross_weight: null,
  net_gold_weight: null,
  making_charge_type: "",
  making_charge: null,
  rate_per_gram: null,
  rate_unit: "gram",
  price: ""
};
const EMPTY_EXCHANGE = { product_name: "", category: "", category_is_other: false, metal_type: "Gold", purity: "22K", weight: "", wastage_weight: "" };
const PURITY_LABELS = { "999": "24K", "916": "22K", "833": "20K", "750": "18K", "585": "14K" };
const inputClass = "mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#008577] focus:ring-2 focus:ring-emerald-100";
const labelClass = "block text-xs font-semibold text-slate-600";

function decodeArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getProductImage(product) {
  const rawImages = product.images;
  const images = Array.isArray(rawImages) ? rawImages : decodeArray(rawImages);
  const image = images.find((value) => typeof value === "string" && value.trim())
    || (typeof rawImages === "string" && !rawImages.trim().startsWith("[") ? rawImages : "");
  if (!image) return "";
  if (/^(https?:|data:|blob:)/i.test(image)) return image;
  return `${BACKEND_URL}${image.startsWith("/") ? image : `/${image}`}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function formatWeight(value, unit = "") {
  if (value == null || value === "") return "—";
  const formatted = Number(value).toLocaleString("en-IN", { maximumFractionDigits: 3 });
  return unit ? `${formatted} ${unit}` : formatted;
}

function formatMakingCharge(product) {
  if (product.making_charge == null || product.making_charge === "") return "—";
  const value = Number(product.making_charge);
  if (!Number.isFinite(value)) return "—";
  return product.making_charge_type === "Percentage" ? `${value}%` : currency(value);
}

function resolveProductDetails(product, metalRates, activeRateSet) {
  const metalType = product.metal_type || "Gold";
  const rate = findItemRate(metalRates, metalType, product.purity);
  const storedMakingCharge = Number(product.making_charge);
  const defaultMakingCharge = Number(rate?.making_charge_value ?? activeRateSet?.making_charge_value);
  const useRateMakingCharge = (!Number.isFinite(storedMakingCharge) || storedMakingCharge === 0)
    && Number.isFinite(defaultMakingCharge)
    && defaultMakingCharge > 0;
  const storedRate = Number(product.rate_per_gram);
  const activeRate = Number(rate?.rate_per_unit ?? rate?.rate_per_gram);
  return {
    ...product,
    making_charge_type: useRateMakingCharge
      ? rate?.making_charge_type || activeRateSet?.making_charge_type
      : product.making_charge_type || rate?.making_charge_type || activeRateSet?.making_charge_type || "",
    making_charge: useRateMakingCharge ? defaultMakingCharge : product.making_charge,
    rate_per_gram: Number.isFinite(storedRate) && storedRate > 0
      ? storedRate
      : Number.isFinite(activeRate) && activeRate > 0 ? activeRate : null,
    rate_unit: Number.isFinite(storedRate) && storedRate > 0
      ? product.rate_unit || "gram"
      : rate?.rate_unit || product.rate_unit || "gram"
  };
}

function TextField({ label, value, onChange, type = "text", required = false, placeholder = "", min, step, readOnly = false }) {
  return (
    <label className={labelClass}>
      {label}{required && <span className="ml-1 text-rose-500">*</span>}
      <input
        className={inputClass}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
        min={min}
        step={step}
        readOnly={readOnly}
      />
    </label>
  );
}

function findItemRate(metalRates, metalType, purity) {
  const normalizedMetal = String(metalType || "").toLowerCase();
  const purityText = String(purity || "").toLowerCase();
  const normalizedPurity = purityText.match(/\d{3}/)?.[0]
    || ({ "24k": "999", "22k": "916", "20k": "833", "18k": "750", "14k": "585" })[purityText.match(/\d{2}k/)?.[0]];
  return metalRates.find((rate) => (
    String(rate.metal_type).toLowerCase() === normalizedMetal
    && String(rate.purity).toLowerCase() === String(normalizedPurity || purityText).toLowerCase()
  ));
}

function ItemFields({ item, onChange, onCategorySelect, onMetalSelect, categories, metalRates, exchange = false }) {
  const selectedMetalRates = exchange
    ? metalRates.filter((rate) => rate.metal_type.toLowerCase() === item.metal_type.toLowerCase())
    : [];
  const purityLabel = (purity) => item.metal_type === "Gold"
    ? PURITY_LABELS[purity] || purity
    : purity;
  const purityOptions = exchange
    ? [...new Set(selectedMetalRates.map((rate) => purityLabel(rate.purity)))]
    : ["24K", "22K", "18K"];
  const selectedMetalRate = selectedMetalRates.find((rate) => (
    purityLabel(rate.purity).toLowerCase() === item.purity.toLowerCase()
  ));
  const weightUnit = selectedMetalRate?.rate_unit === "carat" ? "carat" : "g";
  const rateUnit = selectedMetalRate?.rate_unit || "gram";
  const dailyRate = Number(selectedMetalRate?.rate_per_unit ?? selectedMetalRate?.rate_per_gram) || 0;
  const enteredRate = item.rate_per_unit === "" || item.rate_per_unit == null
    ? dailyRate
    : Number(item.rate_per_unit) || 0;
  const weight = Math.round((Number(item.weight) || 0) * 1000) / 1000;
  const wastageWeight = Math.round((Number(item.wastage_weight) || 0) * 1000) / 1000;
  const netWeight = Math.round(Math.max(0, weight - wastageWeight) * 1000) / 1000;
  const exchangeAmount = Math.round(netWeight * enteredRate * 100) / 100;

  return (
    <div className={`grid gap-3 md:grid-cols-2 ${exchange ? "xl:grid-cols-4" : "xl:grid-cols-4"}`}>
      {!exchange && <TextField label="Product Name" value={item.product_name} onChange={(value) => onChange("product_name", value)} required placeholder="Enter product name" />}
      {exchange ? (
        <div>
          <label className={labelClass}>
            Category<span className="ml-1 text-rose-500">*</span>
            <select
              className={inputClass}
              value={item.category_is_other ? "__other__" : item.category}
              onChange={(event) => {
                const isOther = event.target.value === "__other__";
                onCategorySelect(event.target.value, isOther);
              }}
              required={!item.category_is_other}
            >
              <option value="">Choose category</option>
              {categories.map((category) => <option key={category.id || category.name} value={category.name}>{category.name}</option>)}
              <option value="__other__">Other</option>
            </select>
          </label>
          {item.category_is_other && (
            <input
              className={inputClass}
              value={item.category}
              onChange={(event) => onChange("category", event.target.value)}
              required
              maxLength={100}
              placeholder="Enter category"
              aria-label="Enter other category"
            />
          )}
        </div>
      ) : (
        <TextField label="Category" value={item.category} onChange={(value) => onChange("category", value)} required placeholder="e.g. Necklace" />
      )}
      {exchange && (
        <label className={labelClass}>
          Metal Type<span className="ml-1 text-rose-500">*</span>
          <select
            className={inputClass}
            value={item.metal_type}
            onChange={(event) => {
              const selectedRates = metalRates.filter((rate) => rate.metal_type === event.target.value);
              const firstRate = selectedRates[0];
              const nextPurity = firstRate
                ? event.target.value === "Gold" ? PURITY_LABELS[firstRate.purity] || firstRate.purity : firstRate.purity
                : "";
              onMetalSelect(event.target.value, nextPurity);
            }}
            required
          >
            {[...new Set(metalRates.map((rate) => rate.metal_type))].map((metalType) => (
              <option key={metalType} value={metalType}>{metalType}</option>
            ))}
          </select>
        </label>
      )}
      <label className={labelClass}>
        {item.metal_type || "Gold"} Purity<span className="ml-1 text-rose-500">*</span>
        <select className={inputClass} value={item.purity} onChange={(event) => {
          onChange("purity", event.target.value);
          if (exchange) onChange("rate_per_unit", "");
        }} required disabled={exchange && purityOptions.length === 0}>
          {purityOptions.length === 0 && <option value="">No active purity rates</option>}
          {purityOptions.map((purity) => <option key={purity}>{purity}</option>)}
        </select>
      </label>
      {exchange ? (
        <>
          <TextField label={`${item.metal_type || "Gold"} Weight (${weightUnit})`} type="number" value={item.weight} onChange={(value) => onChange("weight", value)} required min="0" step="0.001" placeholder="Enter weight" />
          <TextField label={`${item.metal_type || "Gold"} Wastage Weight (${weightUnit})`} type="number" value={item.wastage_weight} onChange={(value) => onChange("wastage_weight", value)} min="0" step="0.001" placeholder="0.000" />
          <TextField label={`Net Weight (${weightUnit})`} type="number" value={weight > 0 ? netWeight.toFixed(3) : ""} onChange={() => {}} readOnly placeholder="Calculated weight" />
          <TextField label={`Rate (₹ / ${rateUnit})`} type="number" value={item.rate_per_unit === "" || item.rate_per_unit == null ? dailyRate || "" : item.rate_per_unit} onChange={(value) => onChange("rate_per_unit", value)} required min="0.01" step="0.01" placeholder="Enter rate" />
          <TextField label="Exchange Amount (₹)" type="number" value={weight > 0 && enteredRate > 0 ? exchangeAmount.toFixed(2) : ""} onChange={() => {}} readOnly placeholder="Calculated from rate" />
        </>
      ) : (
        <TextField label="Unit Price (₹)" type="number" value={item.price} onChange={(value) => onChange("price", value)} required min="0" step="0.01" placeholder="0.00" />
      )}
    </div>
  );
}

function CatalogProductOption({ product, selected, onClick }) {
  const image = getProductImage(product);
  const price = Number(product.final_selling_price) > 0
    ? Number(product.final_selling_price)
    : Number(product.offer_price) > 0
      ? Number(product.offer_price)
      : Number(product.mrp || 0);

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={`flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-emerald-50 ${selected ? "bg-emerald-50 text-[#00695C]" : "text-slate-700"}`}
    >
      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-slate-300">
        <FiImage size={18} aria-hidden="true" />
        {image && (
          <img
            src={image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={(event) => { event.currentTarget.style.display = "none"; }}
          />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{product.name}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">
          {product.category || "Uncategorized"} · {product.purity || "Purity not set"}
        </span>
        <span className="mt-0.5 block text-xs font-semibold text-[#00695C]">{currency(price)}</span>
      </span>
    </button>
  );
}

function CatalogProductFields({ product, catalogProducts, loading, onSelect, selectionId }) {
  const [selectionMode, setSelectionMode] = useState("select");
  const [searchTerm, setSearchTerm] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const selectedProduct = catalogProducts.find(
    (catalogProduct) => String(catalogProduct.id) === product.product_id
  );
  const filteredProducts = catalogProducts.filter((catalogProduct) =>
    [catalogProduct.name, catalogProduct.category, catalogProduct.purity, catalogProduct.product_code]
      .some((value) => String(value || "").toLowerCase().includes(searchTerm.trim().toLowerCase()))
  );

  return (
    <div className="min-w-[280px] space-y-2">
      <div>
        <span className={labelClass}>
          Choose Existing Product<span className="ml-1 text-rose-500">*</span>
        </span>
        <div className="mt-2 flex w-full rounded-lg border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Product selection method">
          {[
            { value: "select", label: "Select" },
            { value: "search", label: "Search" }
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectionMode(option.value)}
              aria-pressed={selectionMode === option.value}
              className={`flex-1 rounded-md px-4 py-2 text-xs font-semibold transition ${selectionMode === option.value ? "bg-[#00695C] text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {selectionMode === "select" ? (
        <div>
          <span className={labelClass}>Select from catalog</span>
          <button
            type="button"
            className={`${inputClass} flex items-center gap-3 text-left`}
            aria-haspopup="listbox"
            aria-expanded={catalogOpen}
            aria-controls={`catalog-options-${selectionId}`}
            disabled={loading}
            onClick={() => setCatalogOpen((open) => !open)}
          >
            {selectedProduct ? (
              <>
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-slate-300">
                  <FiImage size={16} aria-hidden="true" />
                  {getProductImage(selectedProduct) && (
                    <img
                      src={getProductImage(selectedProduct)}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(event) => { event.currentTarget.style.display = "none"; }}
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{selectedProduct.name}</span>
                  <span className="block truncate text-xs font-normal text-slate-500">
                    {selectedProduct.category || "Uncategorized"} · {selectedProduct.purity || "Purity not set"}
                  </span>
                </span>
              </>
            ) : (
              <span className="min-w-0 flex-1 font-normal text-slate-500">
                {loading ? "Loading products..." : "Choose a catalog product"}
              </span>
            )}
            <FiChevronDown className={`shrink-0 transition-transform ${catalogOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {catalogOpen && (
            <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
              <label className="relative block border-b border-slate-100 p-2">
                <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <span className="sr-only">Search catalog products</span>
                <input
                  className={`${inputClass} mt-0 pl-9`}
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search products..."
                  autoComplete="off"
                />
              </label>
              <div id={`catalog-options-${selectionId}`} className="max-h-64 overflow-y-auto" role="listbox" aria-label="Catalog products">
                {filteredProducts.length > 0 ? filteredProducts.map((catalogProduct) => (
                  <CatalogProductOption
                    key={catalogProduct.id}
                    product={catalogProduct}
                    selected={String(catalogProduct.id) === product.product_id}
                    onClick={() => {
                      onSelect(String(catalogProduct.id));
                      setSearchTerm("");
                      setCatalogOpen(false);
                    }}
                  />
                )) : (
                  <p className="px-3 py-4 text-sm text-slate-500" role="status">
                    {loading ? "Loading products..." : "No catalog products found."}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <label className={labelClass} htmlFor={`product-search-${selectionId}`}>
            Search catalog
            <span className="relative block">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id={`product-search-${selectionId}`}
                className={`${inputClass} pl-9`}
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                disabled={loading}
                placeholder={loading ? "Loading products..." : "Search by name, category, purity, or SKU"}
                autoComplete="off"
              />
            </span>
          </label>
          {searchTerm.trim() && (
            <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm" role="listbox" aria-label="Matching catalog products">
              {filteredProducts.length > 0 ? filteredProducts.map((catalogProduct) => (
                <CatalogProductOption
                  key={catalogProduct.id}
                  product={catalogProduct}
                  selected={String(catalogProduct.id) === product.product_id}
                  onClick={() => {
                    onSelect(String(catalogProduct.id));
                    setSearchTerm("");
                  }}
                />
              )) : (
                <p className="px-3 py-3 text-sm text-slate-500" role="status">No matching catalog products.</p>
              )}
            </div>
          )}
          {!searchTerm.trim() && product.product_id && (
            <p className="mt-2 text-xs text-slate-500">
              Selected: {product.product_name}. Search above to choose a different product.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function BillingManagement() {
  const [bills, setBills] = useState([]);
  const [dateRange, setDateRange] = useState({ preset: "all", startDate: "", endDate: "" });
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const { current: currentGoldRates } = useGoldRates();
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [catalogProductDetails, setCatalogProductDetails] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(() => new URLSearchParams(window.location.search).get("new") === "1");
  const [editingBillId, setEditingBillId] = useState(null);
  const [viewingBill, setViewingBill] = useState(null);
  const [fundAccounts, setFundAccounts] = useState([]);
  const [billPayment, setBillPayment] = useState(null);
  const [billSearch, setBillSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [billView, setBillView] = useState("list");
  const [todayKey] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [customers, setCustomers] = useState([{ ...EMPTY_CUSTOMER }]);
  const [products, setProducts] = useState([]);
  const [productToAdd, setProductToAdd] = useState({ ...EMPTY_PRODUCT });
  const [gstRateInput, setGstRateInput] = useState("0");
  const [discountInput, setDiscountInput] = useState("");
  const [exchanges, setExchanges] = useState([]);
  const [paymentType, setPaymentType] = useState("FULL_PAYMENT");
  const metalRates = useMemo(
    () => currentGoldRates?.rates || [],
    [currentGoldRates]
  );
  const getProductWithCatalogDetails = (product) => {
    const catalogProduct = catalogProductDetails.find(
      (item) => String(item.id) === String(product.product_id)
    );
    const useCatalogMakingCharge = !(Number(product.making_charge) > 0)
      && Number(catalogProduct?.making_charge) > 0;
    const catalogRate = Number(catalogProduct?.gold_rate_per_gram);
    return resolveProductDetails({
      ...product,
      images: product.images ?? catalogProduct?.images,
      metal_type: product.metal_type || catalogProduct?.metal_type,
      gross_weight: product.gross_weight ?? catalogProduct?.gross_weight,
      net_gold_weight: product.net_gold_weight ?? catalogProduct?.net_gold_weight,
      making_charge_type: useCatalogMakingCharge
        ? catalogProduct.making_charge_type
        : product.making_charge_type || catalogProduct?.making_charge_type,
      making_charge: useCatalogMakingCharge
        ? catalogProduct.making_charge
        : product.making_charge ?? catalogProduct?.making_charge,
      rate_per_gram: Number(product.rate_per_gram) > 0
        ? product.rate_per_gram
        : Number.isFinite(catalogRate) && catalogRate > 0
          ? catalogRate
          : product.rate_per_gram ?? catalogProduct?.gold_rate_per_gram,
      rate_unit: product.rate_unit || catalogProduct?.rate_unit
    }, metalRates, currentGoldRates);
  };

  const loadBills = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/billings", {
        params: { startDate: dateRange.startDate, endDate: dateRange.endDate }
      });
      if (!Array.isArray(response.data)) throw new Error("The server returned an invalid bills list.");
      setBills(response.data);
    } catch (error) {
      console.error("Failed to load bills:", error);
      toast.error(error.response?.data?.message || error.message || "Could not load bills.");
    } finally {
      setLoading(false);
    }
  }, [dateRange.startDate, dateRange.endDate]);

  const loadCatalogProducts = useCallback(async () => {
    setCatalogLoading(true);
    try {
      let page = 1;
      let totalPages = 1;
      const productsFromCatalog = [];
      do {
        const response = await api.get("/products", {
          params: { page, limit: 100 }
        });
        if (!Array.isArray(response.data?.products)) {
          throw new Error("The server returned an invalid product catalog.");
        }
        productsFromCatalog.push(...response.data.products);
        totalPages = Math.max(1, Number(response.data.pagination?.totalPages) || 1);
        page += 1;
      } while (page <= totalPages);
      setCatalogProductDetails(productsFromCatalog);
      setCatalogProducts(productsFromCatalog.filter((product) => product.status === "Active"));
    } catch (error) {
      console.error("Failed to load billing product catalog:", error);
      toast.error(error.response?.data?.message || error.message || "Could not load catalog products.");
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => { loadBills(); }, [loadBills]);
  useEffect(() => { loadCatalogProducts(); }, [loadCatalogProducts]);
  useEffect(() => {
    let active = true;
    api.get("/funds/accounts")
      .then(({ data }) => { if (active) setFundAccounts(data.filter((account) => account.is_active)); })
      .catch((error) => {
        console.error("Failed to load fund accounts for billing:", error);
        toast.error(error.response?.data?.message || "Could not load fund accounts.");
      });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    api.get("/categories")
      .then((response) => {
        if (!Array.isArray(response.data)) throw new Error("The server returned an invalid category list.");
        if (active) setCategories(response.data.filter((category) => category.status === "Active"));
      })
      .catch((error) => {
        console.error("Failed to load exchange item categories:", error);
        toast.error(error.response?.data?.message || error.message || "Could not load categories.");
      });
    return () => { active = false; };
  }, []);

  const subtotal = useMemo(
    () => products.reduce((sum, product) => sum + (Number(product.price) || 0), 0),
    [products]
  );
  const exchangeCredit = useMemo(
    () => paymentType === "EXCHANGE_GOLD"
      ? exchanges.reduce((sum, exchange) => {
        const rate = findItemRate(metalRates, exchange.metal_type, exchange.purity);
        const weight = Math.round((Number(exchange.weight) || 0) * 1000) / 1000;
        const wastageWeight = Math.round((Number(exchange.wastage_weight) || 0) * 1000) / 1000;
        const netWeight = Math.round(Math.max(0, weight - wastageWeight) * 1000) / 1000;
        const ratePerUnit = exchange.rate_per_unit === "" || exchange.rate_per_unit == null
          ? Number(rate?.rate_per_unit ?? rate?.rate_per_gram) || 0
          : Number(exchange.rate_per_unit) || 0;
        const credit = netWeight * ratePerUnit;
        return sum + (Number.isFinite(credit) ? Math.round(credit * 100) / 100 : 0);
      }, 0)
      : 0,
    [exchanges, metalRates, paymentType]
  );
  const discountAmount = discountInput.trim() === "" ? 0 : Number(discountInput);
  const validDiscount = Number.isFinite(discountAmount)
    && discountAmount >= 0
    && discountAmount <= subtotal
    && discountAmount + exchangeCredit <= subtotal;
  const gstRate = gstRateInput.trim() === "" ? 0 : Number(gstRateInput);
  const validGst = Number.isFinite(gstRate) && gstRate >= 0 && gstRate <= 100;
  const gst = validGst && validDiscount
    ? Math.round(Math.max(0, subtotal - discountAmount - exchangeCredit) * gstRate) / 100
    : 0;
  const total = Math.round((subtotal - discountAmount - exchangeCredit + gst) * 100) / 100;
  const totalBilled = bills.reduce((sum, bill) => sum + (Number(bill.total_amount) || 0), 0);
  const todayBilled = bills.reduce((sum, bill) => {
    if (!bill.created_at || new Date(bill.created_at).toLocaleDateString("en-CA") !== todayKey) return sum;
    return sum + (Number(bill.total_amount) || 0);
  }, 0);
  const totalExchangeAmount = bills.reduce((sum, bill) => {
    if (bill.payment_type !== "EXCHANGE_GOLD") return sum;
    return sum + decodeArray(bill.exchanges).reduce((exchangeSum, exchange) => (
      exchangeSum + (Number(exchange.credit_amount) || 0)
    ), 0);
  }, 0);
  const fullPaymentAmount = bills.reduce((sum, bill) => (
    bill.payment_type === "FULL_PAYMENT" ? sum + (Number(bill.paid_amount) || 0) : sum
  ), 0);
  const visibleBills = useMemo(() => {
    const query = billSearch.trim().toLowerCase();
    return bills.filter((bill) => {
      if (paymentFilter !== "ALL" && bill.payment_type !== paymentFilter) return false;
      if (!query) return true;
      const searchableValues = [
        bill.invoice_no,
        ...decodeArray(bill.customers).flatMap((customer) => [customer.name, customer.phone, customer.email]),
        ...decodeArray(bill.products).flatMap((product) => [product.product_name, product.sku, product.category]),
        ...decodeArray(bill.exchanges).flatMap((exchange) => [exchange.product_name, exchange.category, exchange.metal_type, exchange.purity])
      ];
      return searchableValues.some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [bills, billSearch, paymentFilter]);

  const printBill = async (bill) => {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      toast.error("Allow pop-ups to print this bill.");
      return;
    }

    const billCustomers = decodeArray(bill.customers);
    const billProducts = decodeArray(bill.products).map(getProductWithCatalogDetails);
    const billExchanges = decodeArray(bill.exchanges);
    const lineItems = [
      ...billProducts.map((product) => ({
        name: product.product_name,
        category: product.category,
        purity: product.purity,
        makingCharge: formatMakingCharge(product),
        weight: null,
        wastageWeight: null,
        netWeight: null,
        rate: product.rate_per_gram,
        rateUnit: product.rate_unit || "gram",
        amount: Number(product.price) || 0,
        isExchange: false
      })),
      ...billExchanges.map((exchange) => ({
        name: exchange.product_name || "Exchange item",
        category: exchange.category,
        purity: `${exchange.metal_type || ""} ${exchange.purity || ""}`.trim(),
        makingCharge: "—",
        weight: exchange.weight,
        wastageWeight: exchange.wastage_weight,
        netWeight: exchange.net_weight,
        rate: exchange.rate_per_unit,
        rateUnit: exchange.rate_unit || "gram",
        amount: -(Number(exchange.credit_amount) || 0),
        isExchange: true
      }))
    ];
    const rows = lineItems.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td class="${item.isExchange ? "exchange" : ""}">${escapeHtml(item.name || "—")}</td>
        <td>${escapeHtml(item.category || "—")}</td>
        <td>${escapeHtml(item.purity || "—")}</td>
        <td>${escapeHtml(item.makingCharge)}</td>
        <td>${item.isExchange ? formatWeight(item.weight, item.rateUnit === "carat" ? "carat" : "g") : "—"}</td>
        <td>${item.isExchange ? formatWeight(item.wastageWeight, item.rateUnit === "carat" ? "carat" : "g") : "—"}</td>
        <td>${item.isExchange ? formatWeight(item.netWeight, item.rateUnit === "carat" ? "carat" : "g") : "—"}</td>
        <td class="amount">${item.rate == null || item.rate === "" ? "—" : `${currency(item.rate)} / ${escapeHtml(item.rateUnit)}`}</td>
        <td class="amount ${item.isExchange ? "exchange" : ""}">${item.isExchange ? "−" : ""}${currency(Math.abs(item.amount))}</td>
      </tr>
    `).join("");
    const customerDetails = billCustomers.map((customer) => `
      <div class="customer">
        <strong>${escapeHtml(customer.name || "Customer")}</strong>
        ${customer.phone ? `<div>${escapeHtml(customer.phone)}</div>` : ""}
        ${customer.email ? `<div>${escapeHtml(customer.email)}</div>` : ""}
        ${customer.address ? `<div>${escapeHtml(customer.address)}</div>` : ""}
      </div>
    `).join("");
    const exchangeTotal = billExchanges.reduce((sum, item) => sum + (Number(item.credit_amount) || 0), 0);
    const date = bill.created_at ? new Date(bill.created_at).toLocaleDateString("en-IN") : "—";
    let receiptSettings;
    try {
      receiptSettings = await getReceiptSettings();
    } catch (error) {
      printWindow.close();
      console.error("Failed to load receipt settings for printing:", error);
      toast.error(error.response?.data?.message || "Could not load receipt settings.");
      return;
    }
    let logoUrl = "";
    if (receiptSettings.logoUrl) {
      try {
        if (/^data:image\/(?:png|jpeg|webp);base64,/i.test(receiptSettings.logoUrl)) {
          logoUrl = receiptSettings.logoUrl;
        } else {
          const parsedLogoUrl = new URL(receiptSettings.logoUrl, window.location.origin);
          if (!["http:", "https:"].includes(parsedLogoUrl.protocol)) {
            throw new Error("Logo URL must use HTTP or HTTPS.");
          }
          logoUrl = parsedLogoUrl.href;
        }
      } catch (error) {
        toast.error("Receipt logo URL is invalid.");
        console.error("Invalid receipt logo URL:", error);
        printWindow.close();
        return;
      }
    }
    const shopName = escapeHtml(receiptSettings.shopName);
    const shopAddress = escapeHtml(receiptSettings.address);
    const shopGstNumber = escapeHtml(receiptSettings.gstNumber);
    const footerMessage = escapeHtml(receiptSettings.footerMessage);

    try {
      printWindow.document.open();
      printWindow.document.write(`<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Bill ${escapeHtml(bill.invoice_no)}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 36px; color: #1e293b; font: 14px Arial, sans-serif; }
            header { display: flex; flex-direction: column; align-items: center; gap: 12px; padding-bottom: 12px; text-align: center; }
            .brand { display: flex; flex-direction: column; align-items: center; gap: 6px; }
            .logo { display: block; width: 96px; height: 76px; object-fit: contain; }
            h1 { margin: 0 0 6px; color: #00695c; font-size: 26px; }
            .address { max-width: 620px; color: #475569; line-height: 1.5; }
            .invoice-meta { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 12px 0; border-top: 1px solid #cbd5e1; border-bottom: 2px solid #00695c; }
            .invoice-meta-right { text-align: right; }
            h2 { margin: 24px 0 10px; font-size: 16px; }
            p { margin: 4px 0; }
            .customers { display: flex; flex-wrap: wrap; gap: 20px; }
            .customer { min-width: 200px; line-height: 1.6; }
            table { width: 100%; margin-top: 12px; border-collapse: collapse; }
            th, td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: left; }
            th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; }
            .amount { text-align: right; white-space: nowrap; }
            .exchange { color: #be123c; font-weight: 600; }
            th.amount { text-align: right; }
            .totals { width: min(100%, 340px); margin: 20px 0 0 auto; }
            .total-row { display: flex; justify-content: space-between; gap: 20px; padding: 6px 0; }
            .grand-total { margin-top: 6px; padding-top: 12px; border-top: 2px solid #cbd5e1; font-size: 18px; font-weight: 700; }
            footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #cbd5e1; color: #475569; text-align: center; line-height: 1.6; }
            footer strong { display: block; margin-bottom: 4px; color: #00695c; font-size: 15px; }
            footer .thanks { color: #1e293b; font-weight: 600; }
            @page { margin: 0; }
            @media print { body { padding: 12mm; } }
          </style>
        </head>
        <body>
          <header>
            <div class="brand">
              ${logoUrl ? `<img id="shop-logo" class="logo" src="${escapeHtml(logoUrl)}" alt="${shopName} logo" />` : ""}
              <div>
                <h1>${shopName}</h1>
                ${shopAddress ? `<p class="address">${shopAddress}</p>` : ""}
                ${shopGstNumber ? `<p class="address"><strong>GSTIN:</strong> ${shopGstNumber}</p>` : ""}
              </div>
            </div>
          </header>
          <div class="invoice-meta">
            <p>Invoice No: <strong>${escapeHtml(bill.invoice_no || "—")}</strong></p>
            <div class="invoice-meta-right">
              <p>Date: ${escapeHtml(date)}</p>
              <p>Payment: ${bill.payment_type === "EXCHANGE_GOLD" ? "Exchange Gold" : "Full Payment"}</p>
            </div>
          </div>
          <h2>Customer${billCustomers.length === 1 ? "" : "s"}</h2>
          <div class="customers">${customerDetails || "<p>No customer details</p>"}</div>
          <h2>Items</h2>
          <table>
            <thead><tr><th>S.No.</th><th>Item</th><th>Category</th><th>Purity</th><th>Making Charge</th><th>Weight</th><th>Wastage</th><th>Net Weight</th><th class="amount">Rate</th><th class="amount">Amount</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="10">No items</td></tr>'}</tbody>
          </table>
          <div class="totals">
            <div class="total-row"><span>Sub-Total</span><span>${currency(bill.sub_total)}</span></div>
            ${Number(bill.discount_amount) > 0 ? `<div class="total-row"><span>Discount</span><span>−${currency(bill.discount_amount)}</span></div>` : ""}
            ${exchangeTotal > 0 ? `<div class="total-row"><span>Exchange Amount</span><span>−${currency(exchangeTotal)}</span></div>` : ""}
            <div class="total-row"><span>GST</span><span>${currency(bill.gst_amount)}</span></div>
            <div class="total-row grand-total"><span>Total</span><span>${currency(bill.total_amount)}</span></div>
          </div>
          <footer>
            ${footerMessage ? `<div class="thanks">${footerMessage}</div>` : ""}
          </footer>
        </body>
      </html>`);
      printWindow.document.close();
      printWindow.focus();
      let printStarted = false;
      const startPrint = () => {
        if (printStarted || printWindow.closed) return;
        printStarted = true;
        printWindow.focus();
        printWindow.print();
      };
      const logo = printWindow.document.getElementById("shop-logo");
      if (!logo || logo.complete) startPrint();
      else {
        logo?.addEventListener("load", startPrint, { once: true });
        logo?.addEventListener("error", startPrint, { once: true });
        printWindow.setTimeout(startPrint, 1000);
      }
    } catch (error) {
      printWindow.close();
      console.error("Failed to open bill print dialog:", error);
      toast.error("Could not open the print dialog. Please try again.");
    }
  };

  const resetForm = () => {
    setEditingBillId(null);
    setCustomers([{ ...EMPTY_CUSTOMER }]);
    setProducts([]);
    setProductToAdd({ ...EMPTY_PRODUCT });
    setGstRateInput("0");
    setDiscountInput("");
    setExchanges([]);
    setPaymentType("FULL_PAYMENT");
  };

  const editBill = (bill) => {
    const billCustomers = decodeArray(bill.customers);
    const billProducts = decodeArray(bill.products);
    const billExchanges = decodeArray(bill.exchanges);
    const billSubtotal = Number(bill.sub_total) || 0;
    const billDiscount = Number(bill.discount_amount) || 0;
    const exchangeTotal = billExchanges.reduce((sum, exchange) => sum + (Number(exchange.credit_amount) || 0), 0);
    const taxableSubtotal = Math.max(0, billSubtotal - billDiscount - exchangeTotal);
    const savedGstRate = taxableSubtotal > 0
      ? Math.round((Number(bill.gst_amount || 0) / taxableSubtotal) * 10000) / 100
      : 0;

    setEditingBillId(bill.id);
    setCustomers(billCustomers.length ? billCustomers : [{ ...EMPTY_CUSTOMER }]);
    setProducts(billProducts.map((product) => ({
      ...product,
      product_id: String(product.product_id || "")
    })));
    setProductToAdd({ ...EMPTY_PRODUCT });
    setExchanges(billExchanges.map((exchange) => ({
      ...EMPTY_EXCHANGE,
      ...exchange,
      category_is_other: !categories.some((category) => category.name === exchange.category),
      weight: String(exchange.weight ?? ""),
      wastage_weight: String(exchange.wastage_weight ?? ""),
      rate_per_unit: String(exchange.rate_per_unit ?? "")
    })));
    setPaymentType(bill.payment_type);
    setGstRateInput(String(savedGstRate));
    setDiscountInput(billDiscount ? String(billDiscount) : "");
    setShowForm(true);
  };

  const deleteBill = async (bill) => {
    if (!window.confirm(`Delete bill ${bill.invoice_no}? This cannot be undone.`)) return;
    try {
      await api.delete(`/billings/${bill.id}`);
      toast.success("Bill deleted.");
      await loadBills();
    } catch (error) {
      console.error("Failed to delete bill:", error);
      toast.error(error.response?.data?.message || "Could not delete bill.");
    }
  };

  const openBillPayment = (bill, paymentKind = "PAYMENT") => {
    setBillPayment({
      bill,
      payment_kind: paymentKind,
      amount: paymentKind === "PAYMENT" ? String(Number(bill.balance_due || 0)) : String(Number(bill.paid_amount || 0)),
      account_id: fundAccounts[0] ? String(fundAccounts[0].id) : "",
      payment_method: "Cash",
      payment_date: new Date().toLocaleString("sv-SE").replace(" ", "T").slice(0, 16),
      reference_number: ""
    });
  };

  const saveBillPayment = async (event) => {
    event.preventDefault();
    if (!billPayment) return;
    setSaving(true);
    try {
      const { bill, ...payment } = billPayment;
      const { data } = await api.post(`/billings/${bill.id}/payments`, {
        ...payment,
        amount: Number(payment.amount),
        account_id: Number(payment.account_id),
        idempotency_key: crypto.randomUUID()
      });
      setBills((current) => current.map((item) => item.id === data.id ? data : item));
      if (viewingBill?.id === data.id) setViewingBill(data);
      setBillPayment(null);
      toast.success(payment.payment_kind === "PAYMENT" ? "Payment recorded and added to the fund ledger." : "Refund recorded and deducted from the fund ledger.");
    } catch (error) {
      console.error("Failed to record bill payment:", error);
      toast.error(error.response?.data?.message || "Could not record this bill payment.");
    } finally {
      setSaving(false);
    }
  };

  const updateRow = (setter, rows, index, field, value) => {
    setter(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  };

  const selectCatalogProduct = (productId) => {
    const selected = catalogProducts.find((item) => String(item.id) === productId);
    if (!selected) {
      setProductToAdd({ ...EMPTY_PRODUCT });
      return;
    }
    const price = Number(selected.final_selling_price) > 0
      ? Number(selected.final_selling_price)
      : Number(selected.offer_price) > 0
        ? Number(selected.offer_price)
        : Number(selected.mrp || 0);
    setProductToAdd(resolveProductDetails({
      product_id: String(selected.id),
      product_name: selected.name,
      category: selected.category,
      purity: selected.purity || "",
      metal_type: selected.metal_type || "Gold",
      gross_weight: selected.gross_weight ?? null,
      net_gold_weight: selected.net_gold_weight ?? null,
      making_charge_type: selected.making_charge_type || "",
      making_charge: selected.making_charge ?? null,
      rate_per_gram: selected.gold_rate_per_gram ?? null,
      rate_unit: selected.rate_unit || "gram",
      price
    }, metalRates, currentGoldRates));
  };

  const addSelectedProduct = () => {
    if (!productToAdd.product_id) {
      toast.error("Choose a catalog product before adding it.");
      return;
    }
    setProducts((rows) => [...rows, productToAdd]);
    setProductToAdd({ ...EMPTY_PRODUCT });
  };

  const saveBill = async (event) => {
    event.preventDefault();
    if (products.length === 0) {
      toast.error("Add at least one product.");
      return;
    }
    if (products.some((product) => !product.product_id)) {
      toast.error("Select a catalog product for each product row.");
      return;
    }
    if (paymentType === "EXCHANGE_GOLD" && exchanges.length === 0) {
      toast.error("Add at least one exchange item.");
      return;
    }
    if (paymentType === "EXCHANGE_GOLD" && exchanges.some((exchange) => (
      !Number.isFinite(Number(exchange.weight))
      || Number(exchange.weight) <= 0
      || !Number.isFinite(Number(exchange.wastage_weight || 0))
      || Number(exchange.wastage_weight || 0) < 0
      || Number(exchange.wastage_weight || 0) > Number(exchange.weight)
    ))) {
      toast.error("Enter a valid weight and wastage weight for each exchange item.");
      return;
    }
    if (paymentType === "EXCHANGE_GOLD" && exchanges.some((exchange) => {
      const currentRate = findItemRate(metalRates, exchange.metal_type, exchange.purity);
      const rate = exchange.rate_per_unit === "" || exchange.rate_per_unit == null
        ? Number(currentRate?.rate_per_unit ?? currentRate?.rate_per_gram)
        : Number(exchange.rate_per_unit);
      return !Number.isFinite(rate) || rate <= 0;
    })) {
      toast.error("Enter a valid rate for each exchange item.");
      return;
    }
    if (exchangeCredit > subtotal) {
      toast.error("Exchange amount cannot exceed the purchased products subtotal.");
      return;
    }
    if (!validDiscount) {
      toast.error("Discount and exchange credit cannot exceed the purchased products subtotal.");
      return;
    }
    if (!validGst) {
      toast.error("Enter a valid GST percentage between 0 and 100.");
      return;
    }
    setSaving(true);
    try {
      const billingPayload = {
        customers,
        products: products.map((product) => ({ product_id: Number(product.product_id) })),
        exchanges: paymentType === "EXCHANGE_GOLD"
          ? exchanges.map((exchange) => ({
            product_name: `${exchange.metal_type || "Gold"} ${exchange.purity || ""} exchange item`.trim(),
            category: exchange.category,
            metal_type: exchange.metal_type,
            purity: exchange.purity,
            weight: Number(exchange.weight),
            wastage_weight: Number(exchange.wastage_weight || 0),
            rate_per_unit: Number(exchange.rate_per_unit === "" || exchange.rate_per_unit == null
              ? findItemRate(metalRates, exchange.metal_type, exchange.purity)?.rate_per_unit
                ?? findItemRate(metalRates, exchange.metal_type, exchange.purity)?.rate_per_gram
              : exchange.rate_per_unit)
          }))
          : [],
        payment_type: paymentType,
        gst_rate: gstRate,
        discount_amount: discountAmount
      };
      if (editingBillId) {
        await api.put(`/billings/${editingBillId}`, billingPayload);
        toast.success("Bill updated.");
      } else {
        await api.post("/billings", billingPayload);
        toast.success("Bill saved.");
      }
      resetForm();
      setShowForm(false);
      await loadBills();
    } catch (error) {
      console.error("Failed to save bill:", error);
      toast.error(error.response?.data?.message || "Could not save bill.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen space-y-5 bg-[#F4F7F6] py-1 text-slate-800">
      {!showForm ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Billing totals">
            {[
              { label: "Total Amount", value: totalBilled, trend: `${bills.length} bill${bills.length === 1 ? "" : "s"} recorded`, icon: <FiDollarSign />, color: "green" },
              { label: "Today's Amount", value: todayBilled, trend: "Today's billing total", icon: <FiCalendar />, color: "blue" },
              { label: "Exchange Amount", value: totalExchangeAmount, trend: "Exchange items total", icon: <FiRepeat />, color: "amber" },
              { label: "Full Payment Amount", value: fullPaymentAmount, trend: "Full payment bills", icon: <FiCreditCard />, color: "red" }
            ].map((card) => (
              <article
                key={card.label}
                className={`relative flex h-[160px] min-w-0 items-center gap-3 overflow-hidden rounded-xl border-y border-r border-l-4 p-3 shadow-[0_3px_12px_rgba(30,41,59,0.1)] transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  card.color === "green" ? "border-l-emerald-500 border-y-emerald-900/20 border-r-emerald-900/20 bg-[#123f35]" :
                  card.color === "blue" ? "border-l-sky-500 border-y-sky-900/20 border-r-sky-900/20 bg-[#173750]" :
                  card.color === "amber" ? "border-l-amber-500 border-y-amber-900/20 border-r-amber-900/20 bg-[#40351c]" :
                  "border-l-rose-500 border-y-rose-900/20 border-r-rose-900/20 bg-[#4a2a22]"
                }`}
              >
                <div className={`z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl text-white shadow-md ${
                  card.color === "green" ? "bg-emerald-700" :
                  card.color === "blue" ? "bg-cyan-700" :
                  card.color === "amber" ? "bg-amber-500" : "bg-rose-700"
                }`}>
                  {card.icon}
                </div>
                <div className="relative z-10 min-w-0 self-center">
                  <h2 className="truncate text-[11px] font-semibold text-slate-200">{card.label}</h2>
                  <p className="mt-1 truncate text-[19px] font-black leading-tight tracking-tight text-white">{currency(card.value)}</p>
                  <div className="mt-2 flex items-center gap-1 text-[11px] font-extrabold text-emerald-300">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                    <span className="truncate">{card.trend}</span>
                  </div>
                  <p className="mt-0.5 text-[9px] font-medium text-slate-300">Based on saved bills</p>
                </div>
                <span aria-hidden="true" className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border border-black/5 bg-white/65 text-[10px] text-slate-700">
                  <FiChevronRight />
                </span>
                <div aria-hidden="true" className={`absolute bottom-3 right-3 flex h-7 items-end gap-[3px] ${
                  card.color === "green" ? "text-emerald-300" :
                  card.color === "blue" ? "text-sky-300" :
                  card.color === "amber" ? "text-amber-300" : "text-rose-300"
                }`}>
                  {[11, 17, 13, 23].map((height, index) => (
                    <span key={index} className="w-[4px] rounded-t-sm bg-current" style={{ height: `${height}px` }} />
                  ))}
                </div>
              </article>
            ))}
          </section>
          <section aria-label="Search and filter bills" className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <label className="relative min-w-[220px] flex-1 sm:max-w-[480px]">
              <FiSearch aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={billSearch}
                onChange={(event) => setBillSearch(event.target.value)}
                placeholder="Search bills by invoice, customer, phone..."
                aria-label="Search bills"
                className="h-[52px] w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-11 pr-4 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#00695C] focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
              <DateRangeFilter onApply={setDateRange} />
              <select
                value={paymentFilter}
                onChange={(event) => setPaymentFilter(event.target.value)}
                aria-label="Filter bills by payment type"
                className="h-[52px] min-w-[160px] rounded-xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-semibold text-slate-600 outline-none focus:border-[#00695C] focus:ring-2 focus:ring-emerald-100"
              >
                <option value="ALL">All Payment Types</option>
                <option value="FULL_PAYMENT">Full Payment</option>
                <option value="EXCHANGE_GOLD">Exchange Gold</option>
              </select>
              <div role="group" aria-label="Bill view" className="flex h-[52px] items-center rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setBillView("list")}
                  aria-label="Show bills as a list"
                  aria-pressed={billView === "list"}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${billView === "list" ? "bg-[#004D40] text-white shadow-sm" : "text-slate-500 hover:bg-white"}`}
                >
                  <FiList size={19} />
                </button>
                <button
                  type="button"
                  onClick={() => setBillView("grid")}
                  aria-label="Show bills as cards"
                  aria-pressed={billView === "grid"}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${billView === "grid" ? "bg-[#004D40] text-white shadow-sm" : "text-slate-500 hover:bg-white"}`}
                >
                  <FiGrid size={18} />
                </button>
              </div>
              <button type="button" onClick={() => setShowForm(true)} className="inline-flex h-[52px] items-center gap-2 rounded-xl bg-[#004D40] px-5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(0,77,64,0.2)] transition hover:bg-[#00695C]">
                <FiPlus size={18} /> New Bill
              </button>
            </div>
          </section>
          <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            {billView === "list" ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-[#00695C] text-xs uppercase tracking-wide text-white">
                  <tr>
                    <th className="px-4 py-4">S.No.</th>
                    <th className="px-4 py-4">Invoice</th>
                    <th className="px-4 py-4">Customer(s)</th>
                    <th className="px-4 py-4">Items</th>
                    <th className="px-4 py-4">Payment</th>
                    <th className="px-4 py-4">Date</th>
                    <th className="px-4 py-4 text-right">Total</th>
                    <th className="px-4 py-4 text-right">Paid / Due</th>
                    <th className="px-4 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan="9" className="px-4 py-12 text-center text-sm text-slate-500">Loading bills...</td></tr>
                  ) : visibleBills.length === 0 ? (
                    <tr><td colSpan="9" className="px-4 py-12 text-center text-sm text-slate-500">{bills.length === 0 ? "No bills yet. Create your first bill." : "No bills match your search or payment filter."}</td></tr>
                  ) : visibleBills.map((bill, index) => {
                    const billCustomers = decodeArray(bill.customers);
                    const billProducts = decodeArray(bill.products);
                    return (
                      <tr key={bill.id} className="text-sm">
                        <td className="px-4 py-4 text-slate-500">{index + 1}</td>
                        <td className="px-4 py-4 font-bold text-[#00695C]">{bill.invoice_no}</td>
                        <td className="px-4 py-4 text-slate-700">{billCustomers.map((customer) => customer.name).join(", ")}</td>
                        <td className="px-4 py-4 text-slate-600">{billProducts.length} item{billProducts.length === 1 ? "" : "s"}</td>
                        <td className="px-4 py-4 text-slate-600">{bill.payment_type === "EXCHANGE_GOLD" ? "Exchange Gold" : "Full Payment"}</td>
                        <td className="px-4 py-4 text-slate-500">{bill.created_at ? new Date(bill.created_at).toLocaleDateString("en-IN") : "—"}</td>
                        <td className="px-4 py-4 text-right font-bold text-slate-900">{currency(bill.total_amount)}</td>
                        <td className="px-4 py-4 text-right"><span className="block font-semibold text-emerald-700">{currency(bill.paid_amount)}</span><span className="mt-1 block text-xs text-slate-500">Due {currency(bill.balance_due)}</span></td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-1">
                            {Number(bill.balance_due) > 0 && <button type="button" onClick={() => openBillPayment(bill)} className="rounded-md px-2 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50" aria-label={`Collect payment for ${bill.invoice_no}`} title="Collect payment">Collect</button>}
                            {Number(bill.paid_amount) > 0 && <button type="button" onClick={() => openBillPayment(bill, "REFUND")} className="rounded-md px-2 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50" aria-label={`Refund bill ${bill.invoice_no}`} title="Refund">Refund</button>}
                            <button type="button" onClick={() => setViewingBill(bill)} className="rounded-md p-2 text-sky-700 hover:bg-sky-50" aria-label={`View bill ${bill.invoice_no}`} title="View"><FiEye /></button>
                            <button type="button" onClick={() => printBill(bill)} className="rounded-md p-2 text-[#00695C] hover:bg-emerald-50" aria-label={`Print bill ${bill.invoice_no}`} title="Print"><FiPrinter /></button>
                            {Number(bill.paid_amount) === 0 && <button type="button" onClick={() => editBill(bill)} className="rounded-md p-2 text-amber-700 hover:bg-amber-50" aria-label={`Edit bill ${bill.invoice_no}`} title="Edit"><FiEdit2 /></button>}
                            <button type="button" onClick={() => deleteBill(bill)} className="rounded-md p-2 text-rose-600 hover:bg-rose-50" aria-label={`Delete bill ${bill.invoice_no}`} title="Delete"><FiTrash2 /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            ) : (
              <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {loading ? (
                  <p className="col-span-full py-10 text-center text-sm text-slate-500">Loading bills...</p>
                ) : visibleBills.length === 0 ? (
                  <p className="col-span-full py-10 text-center text-sm text-slate-500">{bills.length === 0 ? "No bills yet. Create your first bill." : "No bills match your search or payment filter."}</p>
                ) : visibleBills.map((bill, index) => {
                  const billCustomers = decodeArray(bill.customers);
                  const billProducts = decodeArray(bill.products);
                  return (
                    <article key={bill.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-400">Bill #{index + 1}</p>
                          <h2 className="mt-1 truncate font-bold text-[#00695C]">{bill.invoice_no}</h2>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${bill.payment_type === "EXCHANGE_GOLD" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                          {bill.payment_type === "EXCHANGE_GOLD" ? "Exchange Gold" : "Full Payment"}
                        </span>
                      </div>
                      <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm">
                        <p className="truncate text-slate-700">{billCustomers.map((customer) => customer.name).join(", ") || "No customer name"}</p>
                        <p className="text-slate-500">{billProducts.length} item{billProducts.length === 1 ? "" : "s"} · {bill.created_at ? new Date(bill.created_at).toLocaleDateString("en-IN") : "—"}</p>
                        <p className="text-lg font-extrabold text-slate-900">{currency(bill.total_amount)}</p>
                        <p className="text-xs text-slate-600">Paid {currency(bill.paid_amount)} · Due {currency(bill.balance_due)}</p>
                      </div>
                      <div className="mt-3 flex justify-end gap-1 border-t border-slate-100 pt-2">
                        {Number(bill.balance_due) > 0 && <button type="button" onClick={() => openBillPayment(bill)} className="rounded-md px-2 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50">Collect</button>}
                        {Number(bill.paid_amount) > 0 && <button type="button" onClick={() => openBillPayment(bill, "REFUND")} className="rounded-md px-2 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50">Refund</button>}
                        <button type="button" onClick={() => setViewingBill(bill)} className="rounded-md p-2 text-sky-700 hover:bg-sky-50" aria-label={`View bill ${bill.invoice_no}`} title="View"><FiEye /></button>
                        <button type="button" onClick={() => printBill(bill)} className="rounded-md p-2 text-[#00695C] hover:bg-emerald-50" aria-label={`Print bill ${bill.invoice_no}`} title="Print"><FiPrinter /></button>
                        {Number(bill.paid_amount) === 0 && <button type="button" onClick={() => editBill(bill)} className="rounded-md p-2 text-amber-700 hover:bg-amber-50" aria-label={`Edit bill ${bill.invoice_no}`} title="Edit"><FiEdit2 /></button>}
                        <button type="button" onClick={() => deleteBill(bill)} className="rounded-md p-2 text-rose-600 hover:bg-rose-50" aria-label={`Delete bill ${bill.invoice_no}`} title="Delete"><FiTrash2 /></button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : (
        <form onSubmit={saveBill} className="space-y-5">
          <header className="flex items-center gap-3">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50" aria-label="Back to bills"><FiArrowLeft /></button>
            <div>
              <p className="text-xs font-medium text-slate-500">Admin / Billing / New Bill</p>
              <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{editingBillId ? "Edit Bill" : "New Bill"}</h1>
            </div>
          </header>

          <div className="grid items-start gap-5 lg:grid-cols-2">
            <section className="space-y-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><h2 className="font-bold text-slate-900">Customer Details</h2><p className="text-xs text-slate-500">Add everyone associated with this invoice.</p></div>
              </div>
              {customers.map((customer, index) => (
                <div key={`customer-${index}`} className="space-y-3 rounded-lg border border-slate-100 p-4">
                  {customers.length > 1 && <div className="flex justify-end"><button type="button" onClick={() => setCustomers((rows) => rows.filter((_, rowIndex) => rowIndex !== index))} className="text-rose-500" aria-label={`Remove customer ${index + 1}`}><FiTrash2 /></button></div>}
                  <div className="grid gap-3 md:grid-cols-2">
                    <TextField label="Customer Name" value={customer.name} onChange={(value) => updateRow(setCustomers, customers, index, "name", value)} required placeholder="Enter customer name" />
                    <TextField label="Phone Number" value={customer.phone} onChange={(value) => updateRow(setCustomers, customers, index, "phone", value)} type="tel" placeholder="Enter phone number" />
                    <TextField label="Email Address" value={customer.email} onChange={(value) => updateRow(setCustomers, customers, index, "email", value)} type="email" placeholder="Enter email address" />
                    <label className={labelClass}>
                      Address
                      <textarea
                        className={`${inputClass} min-h-20`}
                        value={customer.address}
                        onChange={(event) => updateRow(setCustomers, customers, index, "address", event.target.value)}
                        rows="2"
                        maxLength={500}
                        placeholder="Enter customer address"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </section>

            <div className="space-y-4">
              <section className="flex min-h-[300px] flex-col space-y-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <div>
                  <h2 className="font-bold text-slate-900">Add Product</h2>
                  <p className="text-xs text-slate-500">Choose a catalog product, then add it to this bill.</p>
                </div>
                <CatalogProductFields
                  product={productToAdd}
                  catalogProducts={catalogProducts}
                  loading={catalogLoading}
                  selectionId="new"
                  onSelect={selectCatalogProduct}
                />
                <div className="mt-auto flex justify-end">
                  <button type="button" onClick={addSelectedProduct} disabled={!productToAdd.product_id} className="inline-flex items-center gap-1.5 rounded-lg bg-[#00695C] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#008577] disabled:cursor-not-allowed disabled:opacity-50">
                    <FiPlus /> Add Product
                  </button>
                </div>
              </section>

            </div>
          </div>

          <section className="w-full space-y-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <div>
              <h2 className="font-bold text-slate-900">Products in Bill</h2>
              <p className="text-xs text-slate-500">Products you add will appear in this table.</p>
            </div>
            {products.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">No products have been added to this bill.</p>
            ) : (
              <div className="w-full overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[900px] border-collapse text-left">
                  <thead className="bg-gradient-to-r from-[#07564B] via-[#064A41] to-[#043D37] text-xs uppercase tracking-wide text-white">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Product</th>
                      <th className="px-4 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 font-semibold">Purity</th>
                      <th className="px-4 py-3 text-right font-semibold">Making Charge</th>
                      <th className="px-4 py-3 text-right font-semibold">Net Weight</th>
                      <th className="px-4 py-3 text-right font-semibold">Gram Rate</th>
                      <th className="px-4 py-3 font-semibold">Unit Price</th>
                      <th className="px-4 py-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((savedProduct, index) => {
                      const product = getProductWithCatalogDetails(savedProduct);
                      const productImage = getProductImage(product);
                      return (
                      <tr key={`${product.product_id}-${index}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-slate-300">
                              <FiImage size={18} aria-hidden="true" />
                              {productImage && (
                                <img
                                  src={productImage}
                                  alt={product.product_name || "Product"}
                                  className="absolute inset-0 h-full w-full object-cover"
                                  onError={(event) => { event.currentTarget.style.display = "none"; }}
                                />
                              )}
                            </div>
                            <span className="text-sm font-medium text-slate-800">{product.product_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{product.category || "—"}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{product.purity || "—"}</td>
                        <td className="px-4 py-3 text-right text-sm text-slate-700">{formatMakingCharge(product)}</td>
                        <td className="px-4 py-3 text-right text-sm text-slate-700">{product.net_gold_weight == null ? "—" : formatWeight(product.net_gold_weight, "g")}</td>
                        <td className="px-4 py-3 text-right text-sm text-slate-700">{product.rate_per_gram == null ? "—" : `${currency(product.rate_per_gram)} / ${product.rate_unit || "gram"}`}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-800">{currency(product.price)}</td>
                        <td className="px-4 py-3 text-right">
                          <button type="button" onClick={() => setProducts((rows) => rows.filter((_, rowIndex) => rowIndex !== index))} className="rounded-md p-2 text-rose-500 hover:bg-rose-50" aria-label={`Remove product ${index + 1}`}><FiTrash2 /></button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <div><h2 className="font-bold text-slate-900">Payment Method</h2><p className="text-xs text-slate-500">GST is calculated using the rate entered below.</p></div>
            <div className="flex flex-wrap gap-3">
              {[["FULL_PAYMENT", "Full Payment"], ["EXCHANGE_GOLD", "Exchange Gold"]].map(([value, label]) => (
                <label key={value} className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${paymentType === value ? "border-[#008577] bg-emerald-50 text-[#00695C]" : "border-slate-200 text-slate-600"}`}>
                  <input type="radio" name="payment_type" value={value} checked={paymentType === value} onChange={() => setPaymentType(value)} className="accent-[#008577]" />{label}
                </label>
              ))}
            </div>
            {paymentType === "EXCHANGE_GOLD" && (
              <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><h3 className="font-bold text-slate-800">Exchange Gold Items</h3><p className="text-xs text-slate-500">Exchange amount is calculated from net weight and today's rate.</p></div>
                  <button type="button" onClick={() => setExchanges((rows) => [...rows, { ...EMPTY_EXCHANGE }])} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100"><FiPlus /> Add Multiple Exchange Items</button>
                </div>
                {exchanges.map((exchange, index) => (
                  <div key={`exchange-${index}`} className="space-y-3 rounded-lg border border-amber-100 bg-white p-4">
                    <div className="flex justify-end"><button type="button" onClick={() => setExchanges((rows) => rows.filter((_, rowIndex) => rowIndex !== index))} className="text-rose-500" aria-label={`Remove exchange item ${index + 1}`}><FiTrash2 /></button></div>
                    <ItemFields
                      item={exchange}
                      categories={categories}
                      metalRates={metalRates}
                      exchange
                      onChange={(field, value) => updateRow(setExchanges, exchanges, index, field, value)}
                      onCategorySelect={(value, isOther) => setExchanges((rows) => rows.map((row, rowIndex) => rowIndex === index ? {
                        ...row,
                        category_is_other: isOther,
                        category: isOther ? "" : value
                      } : row))}
                      onMetalSelect={(metalType, purity) => setExchanges((rows) => rows.map((row, rowIndex) => rowIndex === index ? {
                        ...row,
                        metal_type: metalType,
                        purity,
                        rate_per_unit: ""
                      } : row))}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="ml-auto max-w-lg space-y-3 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">Bill Summary</h2>
            <div className="flex justify-between text-sm text-slate-600"><span>Sub-Total</span><span>{currency(subtotal)}</span></div>
            <label className="flex items-center justify-between gap-4 text-sm font-medium text-slate-600">
              Discount (₹)
              <input
                className={`${inputClass} mt-0 max-w-40 text-right`}
                type="number"
                min="0"
                max={subtotal}
                step="0.01"
                value={discountInput}
                onChange={(event) => setDiscountInput(event.target.value)}
                placeholder="0.00"
                aria-invalid={!validDiscount}
              />
            </label>
            {!validDiscount && <p className="text-xs font-semibold text-rose-600">Discount and exchange credit cannot exceed the products subtotal.</p>}
            {paymentType === "EXCHANGE_GOLD" && <div className="flex justify-between text-sm text-amber-700"><span>Exchange Amount</span><span>−{currency(exchangeCredit)}</span></div>}
            <label className="flex items-center justify-between gap-4 text-sm font-medium text-slate-600">
              GST Rate (%)
              <input
                className={`${inputClass} mt-0 max-w-40 text-right`}
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={gstRateInput}
                onChange={(event) => setGstRateInput(event.target.value)}
                placeholder="0"
                aria-invalid={!validGst}
              />
            </label>
            <div className="flex justify-between text-sm text-slate-600">
              <span>GST Amount ({gstRateInput || "0"}%)</span>
              <span>{validDiscount && validGst ? currency(gst) : "—"}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3 text-lg font-extrabold text-slate-900"><span>Total Bill</span><span>{validDiscount && validGst ? currency(total) : "—"}</span></div>
            {paymentType === "EXCHANGE_GOLD" && exchangeCredit > subtotal && <p className="text-xs font-semibold text-rose-600">Exchange amount cannot exceed subtotal.</p>}
          </section>
          <footer className="flex justify-end">
            <button type="submit" disabled={saving || !validGst || !validDiscount || (paymentType === "EXCHANGE_GOLD" && exchangeCredit > subtotal)} className="inline-flex items-center gap-2 rounded-lg bg-[#00695C] px-5 py-3 text-sm font-bold text-white hover:bg-[#008577] disabled:cursor-not-allowed disabled:opacity-60"><FiSave />{saving ? (editingBillId ? "Updating Bill..." : "Saving Bill...") : (editingBillId ? "Update Bill" : "Save Bill")}</button>
          </footer>
        </form>
      )}
      {viewingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setViewingBill(null);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="bill-view-title" className="max-h-[90vh] w-full max-w-3xl space-y-5 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <header className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500">Bill Details</p>
                <h2 id="bill-view-title" className="mt-1 text-xl font-extrabold text-slate-900">{viewingBill.invoice_no}</h2>
              </div>
              <button type="button" onClick={() => setViewingBill(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close bill details"><FiX /></button>
            </header>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-4">
                <h3 className="mb-2 text-sm font-bold text-slate-800">Customer(s)</h3>
                {decodeArray(viewingBill.customers).map((customer, index) => (
                  <div key={`${customer.email || customer.name}-${index}`} className="mb-3 text-sm text-slate-600 last:mb-0">
                    <p className="font-semibold text-slate-800">{customer.name}</p>
                    {customer.phone && <p>{customer.phone}</p>}
                    {customer.email && <p>{customer.email}</p>}
                    {customer.address && <p>{customer.address}</p>}
                  </div>
                ))}
              </div>
              <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                <h3 className="mb-2 font-bold text-slate-800">Bill Information</h3>
                <p>Payment: {viewingBill.payment_type === "EXCHANGE_GOLD" ? "Exchange Gold" : "Full Payment"}</p>
                <p>Date: {viewingBill.created_at ? new Date(viewingBill.created_at).toLocaleDateString("en-IN") : "—"}</p>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[1350px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">S.No.</th>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Purity</th>
                    <th className="px-3 py-2 text-right">Making Charge</th>
                    <th className="px-3 py-2 text-right">Weight</th>
                    <th className="px-3 py-2 text-right">Wastage</th>
                    <th className="px-3 py-2 text-right">Net Weight</th>
                    <th className="px-3 py-2 text-right">Rate</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {decodeArray(viewingBill.products).map((savedProduct, index) => {
                    const product = getProductWithCatalogDetails(savedProduct);
                    const productImage = getProductImage(product);
                    return (
                      <tr key={`view-product-${index}`}>
                        <td className="px-3 py-2 text-slate-500">{index + 1}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-slate-300">
                              <FiImage size={16} aria-hidden="true" />
                              {productImage && (
                                <img
                                  src={productImage}
                                  alt={product.product_name || "Product"}
                                  className="absolute inset-0 h-full w-full object-cover"
                                  onError={(event) => { event.currentTarget.style.display = "none"; }}
                                />
                              )}
                            </div>
                            <span>{product.product_name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">{product.category || "—"}</td>
                        <td className="px-3 py-2">{product.purity || "—"}</td>
                        <td className="px-3 py-2 text-right">{formatMakingCharge(product)}</td>
                        <td className="px-3 py-2 text-right">—</td>
                        <td className="px-3 py-2 text-right">—</td>
                        <td className="px-3 py-2 text-right">—</td>
                        <td className="px-3 py-2 text-right">{product.rate_per_gram == null ? "—" : `${currency(product.rate_per_gram)} / ${product.rate_unit || "gram"}`}</td>
                        <td className="px-3 py-2 text-right">{currency(product.price)}</td>
                      </tr>
                    );
                  })}
                  {decodeArray(viewingBill.exchanges).map((exchange, index) => (
                    <tr key={`view-exchange-${index}`} className="text-rose-700">
                      <td className="px-3 py-2 text-slate-500">{decodeArray(viewingBill.products).length + index + 1}</td>
                      <td className="px-3 py-2">{exchange.product_name || "Exchange item"}</td>
                      <td className="px-3 py-2">{exchange.category || "—"}</td>
                      <td className="px-3 py-2">{exchange.metal_type} {exchange.purity}</td>
                      <td className="px-3 py-2 text-right">—</td>
                      <td className="px-3 py-2 text-right">{formatWeight(exchange.weight, exchange.weight_unit === "carat" ? "carat" : "g")}</td>
                      <td className="px-3 py-2 text-right">{formatWeight(exchange.wastage_weight, exchange.weight_unit === "carat" ? "carat" : "g")}</td>
                      <td className="px-3 py-2 text-right">{formatWeight(exchange.net_weight, exchange.weight_unit === "carat" ? "carat" : "g")}</td>
                      <td className="px-3 py-2 text-right">{currency(exchange.rate_per_unit)} / {exchange.rate_unit || "gram"}</td>
                      <td className="px-3 py-2 text-right font-semibold">−{currency(exchange.credit_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ml-auto max-w-sm space-y-2 text-sm">
              <div className="flex justify-between text-slate-600"><span>Sub-Total</span><span>{currency(viewingBill.sub_total)}</span></div>
              {Number(viewingBill.discount_amount) > 0 && <div className="flex justify-between text-emerald-700"><span>Discount</span><span>−{currency(viewingBill.discount_amount)}</span></div>}
              {decodeArray(viewingBill.exchanges).length > 0 && <div className="flex justify-between text-amber-700"><span>Exchange Amount</span><span>−{currency(decodeArray(viewingBill.exchanges).reduce((sum, item) => sum + (Number(item.credit_amount) || 0), 0))}</span></div>}
              <div className="flex justify-between text-slate-600"><span>GST</span><span>{currency(viewingBill.gst_amount)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-extrabold text-slate-900"><span>Total</span><span>{currency(viewingBill.total_amount)}</span></div>
              <div className="flex justify-between text-emerald-700"><span>Paid</span><span>{currency(viewingBill.paid_amount)}</span></div>
              <div className="flex justify-between font-bold text-rose-700"><span>Balance due</span><span>{currency(viewingBill.balance_due)}</span></div>
            </div>
          </section>
        </div>
      )}
      {billPayment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setBillPayment(null);
        }}>
          <form onSubmit={saveBillPayment} className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <p className={`text-xs font-bold uppercase tracking-widest ${billPayment.payment_kind === "PAYMENT" ? "text-emerald-700" : "text-rose-700"}`}>
                  {billPayment.payment_kind === "PAYMENT" ? "Billing collection" : "Bill refund"}
                </p>
                <h2 className="mt-1 text-xl font-black">{billPayment.bill.invoice_no}</h2>
                <p className="mt-1 text-xs text-slate-500">Paid {currency(billPayment.bill.paid_amount)} · Due {currency(billPayment.bill.balance_due)}</p>
              </div>
              <button type="button" onClick={() => setBillPayment(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close payment dialog"><FiX /></button>
            </header>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <label className={labelClass}>Amount received (₹)
                <input className={inputClass} type="number" required min="0.01" max={billPayment.payment_kind === "REFUND" ? Number(billPayment.bill.paid_amount) : undefined} step="0.01" value={billPayment.amount} onChange={(event) => setBillPayment({ ...billPayment, amount: event.target.value })} />
              </label>
              <label className={labelClass}>Fund account
                <select className={inputClass} required value={billPayment.account_id} onChange={(event) => setBillPayment({ ...billPayment, account_id: event.target.value })}>
                  <option value="">Select account</option>{fundAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </label>
              <label className={labelClass}>Payment method
                <select className={inputClass} value={billPayment.payment_method} onChange={(event) => setBillPayment({ ...billPayment, payment_method: event.target.value })}>
                  {["Cash", "UPI", "Card", "Bank Transfer", "Cheque", "Other"].map((method) => <option key={method}>{method}</option>)}
                </select>
              </label>
              <label className={labelClass}>Date and time
                <input className={inputClass} type="datetime-local" required value={billPayment.payment_date} onChange={(event) => setBillPayment({ ...billPayment, payment_date: event.target.value })} />
              </label>
              <label className={`${labelClass} sm:col-span-2`}>Reference number / transaction ID
                <input className={inputClass} maxLength={100} value={billPayment.reference_number} onChange={(event) => setBillPayment({ ...billPayment, reference_number: event.target.value })} />
              </label>
              {billPayment.payment_kind === "PAYMENT" && Number(billPayment.amount) > Number(billPayment.bill.balance_due) && <p className="text-xs text-amber-700 sm:col-span-2">Amount exceeds the invoice balance; the extra amount will be recorded as customer advance.</p>}
              <p className="text-xs text-slate-500 sm:col-span-2">The invoice and fund ledger are updated together after confirmation. Unpaid invoice amounts are not counted as received funds.</p>
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-100 p-5">
              <button type="button" onClick={() => setBillPayment(null)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold">Cancel</button>
              <button disabled={saving || fundAccounts.length === 0} className={`rounded-lg px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-50 ${billPayment.payment_kind === "PAYMENT" ? "bg-[#00695C]" : "bg-rose-700"}`}>
                {saving ? "Saving…" : billPayment.payment_kind === "PAYMENT" ? "Confirm Collection" : "Confirm Refund"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </main>
  );
}
