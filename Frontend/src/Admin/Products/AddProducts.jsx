import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import {
  FiArrowLeft,
  FiCheck,
  FiImage,
  FiSave,
  FiTrash2,
  FiUploadCloud,
  FiX
} from "react-icons/fi";
import api from "../../api";
import { formatRateDate, getRateForPurity } from "../../PrivateRouter/goldRateUtils";
import useGoldRates from "../../PrivateRouter/useGoldRates";

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
const GOLD_SHOP = "Sri Gold";
const FALLBACK_PURITY_OPTIONS = {
  gold: ["24K / 999", "22K / 916", "20K / 833", "18K / 750", "14K / 585"],
  silver: ["999"],
  platinum: ["950", "900"],
  diamond: ["D-F / VVS", "G-H / VS", "I-J / SI"]
};
const GOLD_PURITY_LABELS = {
  "999": "24K / 999",
  "916": "22K / 916",
  "833": "20K / 833",
  "750": "18K / 750",
  "585": "14K / 585"
};

function getPurityOptions(metalType, rateSet, metalList) {
  const type = String(metalType || "").toLowerCase();
  const activeRates = rateSet?.rates?.filter((rate) => rate.metal_type.toLowerCase() === type) || [];
  const configuredPurities = activeRates.length
    ? activeRates.map((rate) => rate.purity)
    : (metalList.find((metal) => metal.name.toLowerCase() === type)?.purity || "")
      .split(",").map((purity) => purity.trim()).filter(Boolean);
  const purities = configuredPurities.length
    ? configuredPurities
    : FALLBACK_PURITY_OPTIONS[type] || [];
  const formattedPurities = purities.map((purity) => GOLD_PURITY_LABELS[purity] || purity);
  return [...new Set(formattedPurities.length ? formattedPurities : ["Other"])];
}

const EMPTY_PRODUCT = {
  name: "",
  product_code: "",
  brand: GOLD_SHOP,
  category: "",
  metal_type: "",
  product_type: "Traditional",
  purity: "22K / 916",
  gross_weight: "",
  net_gold_weight: "",
  gold_rate_per_gram: "",
  making_charge_type: "Percentage",
  making_charge: "",
  wastage_type: "Percentage",
  wastage: "",
  stone_weight: "0",
  stone_charges: "0",
  other_charges: "0",
  stone_type: "None",
  huid: "",
  available_sizes: [],
  product_size: "",
  length: "",
  width: "",
  height: "",
  ring_size: "",
  bangle_size: "",
  chain_length: "",
  size_guide_chart: "",
  mrp: "",
  offer: "0",
  offer_type: "Percentage",
  offer_price: "",
  fixed_discount_amount: "0",
  discount: "0",
  gst_rate: "",
  final_selling_price: "",
  price_includes_gst: true,
  description: "",
  full_description: "",
  highlights: [],
  specifications: "",
  care_instructions: "",
  warranty: "",
  images: [],
  video: "",
  certificate: "",
  rating: "0",
  total_reviews: "0",
  total_stock: "0",
  stock_status: "Out of Stock",
  sku_barcode: "",
  warehouse: "Main Shop",
  status: "Active",
  featured: false,
  new_arrival: false,
  best_seller: false
};

const inputClass = "mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100";
const labelClass = "block text-xs font-bold uppercase tracking-wide text-gray-500";

const imageUrl = (path) => {
  if (!path) return "";
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${BACKEND_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

const Section = ({ title, children }) => (
  <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
    <div className="border-b border-gray-100 bg-[#003B3B]/5 px-5 py-4">
      <h2 className="text-sm font-extrabold text-[#003B3B]">{title}</h2>
    </div>
    <div className="p-5">{children}</div>
  </section>
);

const Field = ({ label, name, value, onChange, type = "text", placeholder = "", required = false, min, step, readOnly = false }) => (
  <label className={labelClass}>
    {label}{required && <span className="ml-1 text-red-500">*</span>}
    <input
      className={`${inputClass} ${readOnly ? "cursor-not-allowed bg-gray-100" : ""}`}
      type={type}
      name={name}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      min={min}
      step={step}
      readOnly={readOnly}
    />
  </label>
);

const SelectField = ({ label, name, value, onChange, options, required = false }) => (
  <label className={labelClass}>
    {label}{required && <span className="ml-1 text-red-500">*</span>}
    <select className={inputClass} name={name} value={value ?? ""} onChange={onChange} required={required}>
      {options.map((option) => {
        const item = typeof option === "string" ? { value: option, label: option } : option;
        return <option key={item.value} value={item.value}>{item.label}</option>;
      })}
    </select>
  </label>
);

const AddProducts = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [metals, setMetals] = useState([]);
  const [formData, setFormData] = useState(EMPTY_PRODUCT);
  const [originalPurity, setOriginalPurity] = useState(null);
  const [originalMetalType, setOriginalMetalType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [uploading, setUploading] = useState(false);
  const { current: activeRateSet, loading: ratesLoading, error: ratesError } = useGoldRates();

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const categoryRequest = api.get("/categories");
        const metalRequest = api.get("/metals");
        const productRequest = isEdit
          ? api.get(`/products/${id}`)
          : api.get("/products/latest-code");
        const [categoryResponse, metalResponse, productResponse] = await Promise.all([
          categoryRequest,
          metalRequest,
          productRequest
        ]);
        if (!active) return;
        const categoryList = Array.isArray(categoryResponse.data) ? categoryResponse.data : [];
        const metalList = Array.isArray(metalResponse.data) ? metalResponse.data : [];
        setCategories(categoryList);
        setMetals(metalList.filter((metal) => metal.status === "Active"));
        if (isEdit) {
          const product = productResponse.data;
          setOriginalPurity(product.purity || "");
          setOriginalMetalType(product.metal_type || "");
          setFormData({
            ...EMPTY_PRODUCT,
            ...product,
            product_code: product.product_code || "",
            available_sizes: Array.isArray(product.available_sizes) ? product.available_sizes : [],
            highlights: Array.isArray(product.highlights) ? product.highlights : [],
            images: Array.isArray(product.images) ? product.images : [],
            offer: String(product.offer ?? "0"),
            offer_type: product.offer_type || (Number(product.offer) > 0 ? "Percentage" : "None"),
            fixed_discount_amount: String(product.fixed_discount_amount ?? "0"),
            offer_price: String(product.offer_price ?? ""),
            mrp: String(product.mrp ?? ""),
            total_stock: String(product.total_stock ?? "0"),
            price_includes_gst: Boolean(product.price_includes_gst)
          });
        } else {
          const category = categoryList.find((item) => item.name === "Gold Jewellery") || categoryList[0];
          setFormData((current) => ({
            ...current,
            category: category?.name || "",
            subcategory: Array.isArray(category?.subcategory) ? category.subcategory[0] || "" : "",
            metal_type: metalList.find((metal) => metal.status === "Active" && metal.name.toLowerCase() === "gold")?.name
              || metalList.find((metal) => metal.status === "Active")?.name || "",
            product_code: productResponse.data.latestCode || "GOLD-PRD-001"
          }));
        }
      } catch (error) {
        console.error("Failed to load product form data:", error);
        toast.error(error.response?.data?.message || "Could not load product form data.");
      } finally {
        if (active) setFetching(false);
      }
    };
    load();
    return () => { active = false; };
  }, [id, isEdit]);

  const configuredPurities = getPurityOptions(formData.metal_type, activeRateSet, metals);
  const purityOptions = formData.purity && !configuredPurities.includes(formData.purity)
    ? [formData.purity, ...configuredPurities]
    : configuredPurities;
  const isDiamond = formData.metal_type.toLowerCase() === "diamond";
  const grossWeight = Number(formData.gross_weight) || 0;
  const stoneWeight = Number(formData.stone_weight) || 0;
  const effectiveNetMetalWeight = isDiamond
    ? Number(formData.net_gold_weight) || 0
    : Math.max(0, grossWeight - stoneWeight);
  const activePurityRate = getRateForPurity(activeRateSet, formData.purity, formData.metal_type || "Gold");
  const rateUnit = activePurityRate?.rate_unit === "carat" || isDiamond ? "Carat" : "Gram";
  const purityChanged = isEdit && originalPurity !== null
    && (formData.purity !== originalPurity || formData.metal_type !== originalMetalType);
  const effectiveGoldRate = (!isEdit || purityChanged) && activePurityRate
    ? Number(activePurityRate.rate_per_gram)
    : Number(formData.gold_rate_per_gram) || 0;
  const effectiveMakingChargeType = !isEdit && !formData.making_charge && activeRateSet
    ? activeRateSet.making_charge_type
    : formData.making_charge_type;
  const effectiveMakingCharge = !isEdit && !formData.making_charge && activeRateSet
    ? String(activeRateSet.making_charge_value)
    : formData.making_charge;
  const effectiveWastage = !isEdit && !formData.wastage && activeRateSet
    ? String(activeRateSet.wastage_percentage)
    : formData.wastage;
  const effectiveWastageType = !isEdit && !formData.wastage && activeRateSet
    ? "Percentage"
    : formData.wastage_type;

  const selectedCategory = categories.find((category) => category.name === formData.category);
  const subcategories = Array.isArray(selectedCategory?.subcategory) ? selectedCategory.subcategory : [];

  const goldValue = useMemo(
    () => effectiveNetMetalWeight * effectiveGoldRate,
    [effectiveNetMetalWeight, effectiveGoldRate]
  );

  const estimatedPrice = useMemo(() => {
    const metalValue = goldValue;
    const makingCharge = effectiveMakingChargeType === "Percentage"
      ? metalValue * (Number(effectiveMakingCharge) || 0) / 100
      : Number(effectiveMakingCharge) || 0;
    const wastageWeight = effectiveWastageType === "Percentage"
      ? effectiveNetMetalWeight * (Number(effectiveWastage) || 0) / 100
      : Number(effectiveWastage) || 0;
    const wastageCharge = wastageWeight * effectiveGoldRate;
    const subtotal = metalValue + makingCharge + wastageCharge + (Number(formData.stone_charges) || 0) + (Number(formData.other_charges) || 0);
    const tax = subtotal * (Number(formData.gst_rate) || 0) / 100;
    return {
      metalValue, makingCharge, wastageCharge,
      stoneCharges: Number(formData.stone_charges) || 0,
      tax, total: formData.price_includes_gst ? subtotal : subtotal + tax
    };
  }, [effectiveGoldRate, effectiveMakingCharge, effectiveMakingChargeType, effectiveNetMetalWeight, effectiveWastage, effectiveWastageType, formData, goldValue]);

  const pricing = useMemo(() => {
    const preDiscountPrice = estimatedPrice.total;
    const offerType = formData.offer_type || "None";
    const requestedDiscount = offerType === "Percentage"
      ? preDiscountPrice * (Number(formData.offer) || 0) / 100
      : offerType === "Fixed Amount" ? Number(formData.fixed_discount_amount) || 0 : 0;
    const discount = Math.min(preDiscountPrice, requestedDiscount);
    const offerPrice = Math.max(0, preDiscountPrice - discount);
    return { preDiscountPrice, offerPrice, discount, finalPrice: offerPrice };
  }, [estimatedPrice.total, formData.offer_type, formData.offer, formData.fixed_discount_amount]);
  const effectiveMrp = formData.mrp === "" ? estimatedPrice.total : Number(formData.mrp) || 0;

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    const nextValue = type === "checkbox" ? checked : value;
    setFormData((current) => {
      if (name === "category") {
        const category = categories.find((item) => item.name === value);
        const categorySubcategories = Array.isArray(category?.subcategory) ? category.subcategory : [];
        return {
          ...current,
          category: value,
          subcategory: categorySubcategories.includes(current.subcategory) ? current.subcategory : categorySubcategories[0] || ""
        };
      }
      if (name === "metal_type") {
        const nextPurities = getPurityOptions(value, activeRateSet, metals);
        return {
          ...current,
          metal_type: value,
          purity: nextPurities.includes(current.purity) ? current.purity : nextPurities[0] || ""
        };
      }
      return { ...current, [name]: nextValue };
    });
  };

  const updateFormField = (name, value) => {
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleUpload = async (event, field) => {
    const input = event.currentTarget;
    const files = Array.from(input.files || []);
    input.value = "";
    if (files.length === 0) return;
    const isImage = field === "images";
    const isVideo = field === "video";
    const acceptedTypes = isImage || field === "size_guide_chart" || field === "certificate"
      ? ["image/png", "image/jpeg", ...(isVideo ? ["video/mp4"] : []), ...(field !== "images" ? ["application/pdf"] : [])]
      : ["video/mp4"];
    const invalidType = files.find((file) => !acceptedTypes.includes(file.type));
    if (invalidType) {
      toast.error(isVideo ? "Choose an MP4 video." : "Choose PNG/JPG images or a PDF document.");
      return;
    }
    const maxBytes = isVideo ? 25 * 1024 * 1024 : 5 * 1024 * 1024;
    if (files.some((file) => file.size > maxBytes)) {
      toast.error(isVideo ? "Video must be 25 MB or smaller." : "Each upload must be 5 MB or smaller.");
      return;
    }
    if (isImage && formData.images.length + files.length > 10) {
      toast.error("Upload up to 10 product images.");
      return;
    }

    const payload = new FormData();
    files.forEach((file) => payload.append(field, file));
    try {
      setUploading(true);
      const response = await api.post("/products/upload-media", payload);
      if (isImage) {
        updateFormField("images", [...formData.images, ...(response.data.images || [])]);
      } else {
        updateFormField(field, response.data[field]);
      }
      toast.success("Upload complete.");
    } catch (error) {
      console.error("Product media upload failed:", error);
      toast.error(error.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    updateFormField("images", formData.images.filter((_, imageIndex) => imageIndex !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.name.trim() || !formData.product_code.trim() || !formData.category) {
      toast.error("Product name, SKU, and category are required.");
      return;
    }
    if (!isDiamond && stoneWeight > grossWeight) {
      toast.error("Stone weight cannot exceed gross weight.");
      return;
    }
    const stock = Math.max(0, Math.floor(Number(formData.total_stock) || 0));
    const offerPrice = pricing.offerPrice;
    const gst = Number(formData.gst_rate) || 0;
    const finalPrice = pricing.finalPrice;
    const product = {
      ...formData,
      name: formData.name.trim(),
      product_code: formData.product_code.trim(),
      brand: formData.brand.trim() || GOLD_SHOP,
      total_stock: stock,
      stock_status: stock <= 0 ? "Out of Stock" : stock < 10 ? "Low Stock" : "In Stock",
      mrp: Number(effectiveMrp.toFixed(2)),
      offer: Number(formData.offer) || 0,
      offer_type: formData.offer_type || "None",
      fixed_discount_amount: Number(formData.fixed_discount_amount) || 0,
      offer_price: offerPrice,
      discount: pricing.discount,
      gst_rate: gst,
      final_selling_price: Number(finalPrice.toFixed(2)),
      gross_weight: Number(formData.gross_weight) || 0,
      net_gold_weight: effectiveNetMetalWeight,
      gold_rate_per_gram: effectiveGoldRate,
      making_charge_type: effectiveMakingChargeType,
      making_charge: Number(effectiveMakingCharge) || 0,
      wastage_type: effectiveWastageType,
      wastage: Number(effectiveWastage) || 0,
      stone_weight: Number(formData.stone_weight) || 0,
      stone_charges: Number(formData.stone_charges) || 0,
      other_charges: Number(formData.other_charges) || 0,
      rating: Number(formData.rating) || 0,
      total_reviews: Number(formData.total_reviews) || 0,
      price_includes_gst: Boolean(formData.price_includes_gst),
      images: formData.images,
      variants: [{ images: formData.images }]
    };
    try {
      setLoading(true);
      if (isEdit) {
        await api.put(`/products/${id}`, product);
        toast.success("Product updated.");
      } else {
        await api.post("/products", product);
        toast.success("Product added.");
      }
      navigate("/admin/products/all");
    } catch (error) {
      console.error("Product save failed:", error);
      toast.error(error.response?.data?.message || "Could not save the product.");
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="py-20 text-center text-sm font-semibold text-gray-500">Loading product details...</div>;
  }

  const uploadButton = (field, label, accept, multiple = false) => (
    <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-5 text-center transition hover:border-amber-400 hover:bg-amber-50/40">
      <FiUploadCloud className="mb-2 text-2xl text-amber-600" />
      <span className="text-sm font-bold text-slate-700">{uploading ? "Uploading..." : label}</span>
      <span className="mt-1 text-xs text-gray-500">{accept}</span>
      <input type="file" accept={field === "video" ? "video/mp4" : "image/png,image/jpeg,application/pdf"} multiple={multiple} disabled={uploading} onChange={(event) => handleUpload(event, field)} className="sr-only" />
    </label>
  );

  return (
    <div className="space-y-5 pb-12">
      <Toaster position="top-right" />
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Go back" className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-500 shadow-sm transition hover:text-[#003B3B]">
          <FiArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-black text-[#003B3B]">{isEdit ? "Edit Product" : "Add Product"}</h1>
          <p className="text-xs text-gray-500">Manage product details, metal pricing, media, and inventory.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 items-start gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Section title="1. Basic Information">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Product Name" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Classic Gold Chain" required />
              <Field label="SKU / Product Code (Auto-generated)" name="product_code" value={formData.product_code} onChange={handleChange} placeholder="Generating..." required readOnly />
              <SelectField label="Category" name="category" value={formData.category} onChange={handleChange} required options={[
                { value: "", label: "Select category" },
                ...categories.map((category) => ({ value: category.name, label: category.name }))
              ]} />
              <SelectField label="Subcategory" name="subcategory" value={formData.subcategory} onChange={handleChange} options={[
                { value: "", label: "Select subcategory" },
                ...subcategories.map((subcategory) => ({ value: subcategory, label: subcategory }))
              ]} />
              <SelectField label="Metal Type" name="metal_type" value={formData.metal_type} onChange={handleChange} options={[
                { value: "", label: "Select metal type" },
                ...metals.map((metal) => ({ value: metal.name, label: metal.purity ? `${metal.name} (${metal.purity})` : metal.name }))
              ]} />
              <SelectField label="Product Type" name="product_type" value={formData.product_type} onChange={handleChange} options={["Traditional", "Daily Wear", "Bridal", "Designer"]} />
            </div>
          </Section>

          <Section title={`2. ${isDiamond ? "Diamond" : "Metal"} Details`}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <SelectField label={isDiamond ? "Diamond Grade" : "Purity"} name="purity" value={formData.purity} onChange={handleChange} options={purityOptions} />
              <Field label="Gross Weight (g)" name="gross_weight" type="number" min="0" step="0.001" value={formData.gross_weight} onChange={handleChange} placeholder="10" />
              <Field
                label={isDiamond ? "Net Diamond Weight (ct)" : "Net Metal Weight (g)"}
                name="net_gold_weight"
                type="number"
                min="0"
                step="0.001"
                value={isDiamond
                  ? formData.net_gold_weight
                  : formData.gross_weight
                    ? effectiveNetMetalWeight.toFixed(3)
                    : ""}
                onChange={handleChange}
                placeholder={isDiamond ? "e.g. 0.50" : "Auto-calculated"}
                readOnly={!isDiamond}
              />
              <Field label={`Rate / ${rateUnit} (₹)`} name="gold_rate_per_gram" type="number" min="0" step="0.01" value={effectiveGoldRate || ""} onChange={handleChange} placeholder={ratesLoading ? "Loading current rate..." : "No active rate"} readOnly />
              <SelectField label="Making Charge Type" name="making_charge_type" value={effectiveMakingChargeType} onChange={handleChange} options={["Percentage", "Fixed Amount"]} />
              <Field label={effectiveMakingChargeType === "Percentage" ? "Making Charge (%)" : "Making Charge (₹)"} name="making_charge" type="number" min="0" step="0.01" value={effectiveMakingCharge} onChange={handleChange} placeholder={effectiveMakingChargeType === "Percentage" ? "10" : "500"} />
              <SelectField label="Wastage Type" name="wastage_type" value={effectiveWastageType} onChange={handleChange} options={["Percentage", "Grams"]} />
              <Field label={effectiveWastageType === "Percentage" ? "Wastage (%)" : "Wastage (g)"} name="wastage" type="number" min="0" step="0.001" value={effectiveWastage} onChange={handleChange} placeholder={effectiveWastageType === "Percentage" ? "e.g. 5" : "e.g. 0.5"} />
              <Field label="Stone Weight (g)" name="stone_weight" type="number" min="0" step="0.001" value={formData.stone_weight} onChange={handleChange} placeholder="0" />
              <Field label="Stone Charges (₹)" name="stone_charges" type="number" min="0" step="0.01" value={formData.stone_charges} onChange={handleChange} placeholder="0" />
              <SelectField label="Stone Type" name="stone_type" value={formData.stone_type} onChange={handleChange} options={["None", "Diamond", "Ruby", "Other"]} />
              <Field label="Hallmark / HUID" name="huid" value={formData.huid} onChange={handleChange} placeholder="Verified HUID" />
            </div>
            {activeRateSet && (
              <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900">
                Active precious metal rates · effective {formatRateDate(activeRateSet.rate_date)}. Existing product rate snapshots remain unchanged.
              </p>
            )}
            {ratesError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Could not refresh rates: {ratesError}</p>}
            {!ratesLoading && !ratesError && !activePurityRate && formData.net_gold_weight && (
              <p role="alert" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">No active rate matches this {formData.metal_type || "metal"} purity. Configure and activate it under Settings → Daily Precious Rates.</p>
            )}
            {goldValue > 0 && (
              <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <p className="mt-1 text-xs">Metal ₹{estimatedPrice.metalValue.toFixed(2)} + making ₹{estimatedPrice.makingCharge.toFixed(2)} + wastage ₹{estimatedPrice.wastageCharge.toFixed(2)} + stones ₹{estimatedPrice.stoneCharges.toFixed(2)} + applicable tax ₹{estimatedPrice.tax.toFixed(2)}{formData.price_includes_gst ? " (included)" : ""}.</p>
                <p className="mt-1 text-xs">
                  {formData.mrp === ""
                    ? "MRP is estimated automatically. Enter a value in the MRP field to override it."
                    : "MRP uses your entered value; daily rate changes will not overwrite it."}
                </p>
              </div>
            )}
          </Section>

          <Section title="3. Size & Dimensions">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Available Sizes" name="available_sizes_text" value={formData.available_sizes.join(", ")} onChange={(event) => updateFormField("available_sizes", event.target.value.split(",").map((size) => size.trim()).filter(Boolean))} placeholder="12, 14, 16, 18 inches" />
              <SelectField label="Product Size" name="product_size" value={formData.product_size} onChange={handleChange} options={[
                { value: "", label: "Select size" }, "Small", "Medium", "Large", "Free Size"
              ]} />
              <Field label="Length" name="length" value={formData.length} onChange={handleChange} placeholder="18 inches" />
              <Field label="Width" name="width" value={formData.width} onChange={handleChange} placeholder="5 mm" />
              <Field label="Height / Thickness" name="height" value={formData.height} onChange={handleChange} placeholder="2 mm" />
              <Field label="Ring Size" name="ring_size" value={formData.ring_size} onChange={handleChange} placeholder="As applicable" />
              <Field label="Bangle Size" name="bangle_size" value={formData.bangle_size} onChange={handleChange} placeholder="As applicable" />
              <Field label="Chain Length" name="chain_length" value={formData.chain_length} onChange={handleChange} placeholder="18 inches" />
            </div>
            <div className="mt-4">
              <p className={`${labelClass} mb-2`}>Size Guide Chart</p>
              {formData.size_guide_chart ? (
                <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                  {/\.pdf(?:$|[?#])/i.test(formData.size_guide_chart) ? (
                    <iframe
                      className="h-32 w-full sm:h-40"
                      src={imageUrl(formData.size_guide_chart)}
                      title="Size guide chart preview"
                    />
                  ) : (
                    <img
                      className="h-32 w-full bg-white object-contain sm:h-40"
                      src={imageUrl(formData.size_guide_chart)}
                      alt="Size guide chart preview"
                    />
                  )}
                  <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-3 py-2">
                    <a className="text-sm font-semibold text-[#003B3B] underline" href={imageUrl(formData.size_guide_chart)} target="_blank" rel="noreferrer">Open size guide</a>
                    <button type="button" onClick={() => updateFormField("size_guide_chart", "")} aria-label="Remove size guide" className="text-red-500"><FiX /></button>
                  </div>
                </div>
              ) : uploadButton("size_guide_chart", "Upload size chart image or PDF", "PNG, JPG, PDF up to 5 MB")}
            </div>
          </Section>

          <Section title="4. Pricing & Offers">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <span className={labelClass}>MRP (₹)<span className="ml-1 text-red-500">*</span></span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">₹</span>
                  <input
                    className={`${inputClass} pl-8`}
                    type="number"
                    inputMode="decimal"
                    name="mrp"
                    min="0"
                    step="0.01"
                    value={formData.mrp || (estimatedPrice.total > 0 ? estimatedPrice.total.toFixed(2) : "")}
                    onChange={handleChange}
                    placeholder="Enter MRP"
                    required
                  />
                </div>
                <p className="mt-1 text-[11px] font-medium text-gray-500">
                  Estimated jewellery price: ₹{estimatedPrice.total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}. Edit the value above to set a different MRP.
                </p>
              </div>
              <label className={labelClass}>Offer Type
                <select className={inputClass} name="offer_type" value={formData.offer_type} onChange={handleChange}>
                  <option value="None">No offer</option>
                  <option value="Percentage">Percentage discount</option>
                  <option value="Fixed Amount">Fixed amount discount</option>
                </select>
              </label>
              {formData.offer_type === "Percentage" && <Field label="Discount (%)" name="offer" type="number" min="0" max="100" step="0.01" value={formData.offer} onChange={handleChange} placeholder="5" />}
              {formData.offer_type === "Fixed Amount" && <Field label="Fixed Discount (₹)" name="fixed_discount_amount" type="number" min="0" step="0.01" value={formData.fixed_discount_amount} onChange={handleChange} placeholder="500" />}
              <Field label="Offer Price (₹)" name="offer_price" type="number" value={pricing.offerPrice.toFixed(2)} onChange={() => {}} readOnly />
              <Field label="Other Charges (₹)" name="other_charges" type="number" min="0" step="0.01" value={formData.other_charges} onChange={handleChange} />
              <Field label="GST (%)" name="gst_rate" type="number" min="0" step="0.01" value={formData.gst_rate} onChange={handleChange} placeholder="Applicable GST" />
            </div>
            <label className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" name="price_includes_gst" checked={formData.price_includes_gst} onChange={handleChange} className="h-4 w-4 accent-[#003B3B]" />
              Price includes GST
            </label>
          </Section>

          <Section title="5. Product Content">
            <div className="space-y-4">
              <label className={labelClass}>Full Description
                <textarea className={inputClass} rows="4" name="full_description" value={formData.full_description} onChange={handleChange} placeholder="Detailed product description..." />
              </label>
              <label className={labelClass}>Care Instructions
                <textarea className={inputClass} rows="2" name="care_instructions" value={formData.care_instructions} onChange={handleChange} placeholder="Store safely and clean appropriately..." />
              </label>
            </div>
          </Section>

          <Section title="6. Media & Uploads">
            <div>
              <p className={`${labelClass} mb-2`}>Main Product Images</p>
              {formData.images.length > 0 && (
                <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {formData.images.map((image, index) => (
                    <div key={`${image}-${index}`} className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200">
                      <img src={imageUrl(image)} alt={`Product ${index + 1}`} className="h-full w-full object-cover" />
                      <button type="button" onClick={() => removeImage(index)} aria-label="Remove product image" className="absolute right-2 top-2 rounded-full bg-white p-1.5 text-red-500 opacity-0 shadow transition group-hover:opacity-100"><FiTrash2 /></button>
                    </div>
                  ))}
                </div>
              )}
              {formData.images.length < 10 && uploadButton("images", "Upload product images", "JPG / PNG up to 5 MB each", true)}
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className={`${labelClass} mb-2`}>Product Video</p>
                {formData.video ? (
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                    <video className="h-32 w-full bg-black object-contain sm:h-40" src={imageUrl(formData.video)} controls preload="metadata">
                      Your browser does not support video playback.
                    </video>
                    <div className="flex justify-end border-t border-gray-200 bg-white px-3 py-2">
                      <button type="button" onClick={() => updateFormField("video", "")} aria-label="Remove video" className="text-red-500"><FiX /></button>
                    </div>
                  </div>
                ) : uploadButton("video", "Upload optional MP4 video", "MP4 up to 25 MB")}
              </div>
              <div>
                <p className={`${labelClass} mb-2`}>Certificate Upload</p>
                {formData.certificate ? (
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                    {/\.pdf(?:$|[?#])/i.test(formData.certificate) ? (
                      <iframe
                        className="h-32 w-full sm:h-40"
                        src={imageUrl(formData.certificate)}
                        title="Certificate preview"
                      />
                    ) : (
                      <img
                        className="h-32 w-full bg-white object-contain sm:h-40"
                        src={imageUrl(formData.certificate)}
                        alt="Certificate preview"
                      />
                    )}
                    <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-3 py-2">
                      <a className="text-sm font-semibold text-[#003B3B] underline" href={imageUrl(formData.certificate)} target="_blank" rel="noreferrer">Open certificate</a>
                      <button type="button" onClick={() => updateFormField("certificate", "")} aria-label="Remove certificate" className="text-red-500"><FiX /></button>
                    </div>
                  </div>
                ) : uploadButton("certificate", "Upload certificate", "PNG, JPG, PDF up to 5 MB")}
              </div>
            </div>
          </Section>

          <Section title="7. Ratings & Reviews">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Average Rating (1–5)" name="rating" type="number" min="0" step="0.1" value={formData.rating} onChange={handleChange} placeholder="0" />
            </div>
          </Section>

          <Section title="8. Inventory & Publishing">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Stock Quantity" name="total_stock" type="number" min="0" step="1" value={formData.total_stock} onChange={handleChange} placeholder="5" />
              <SelectField label="Stock Status" name="stock_status" value={formData.stock_status} onChange={handleChange} options={["In Stock", "Out of Stock", "Low Stock"]} />
              <Field label="Warehouse / Location" name="warehouse" value={formData.warehouse} onChange={handleChange} placeholder="Main Shop" />
              <SelectField label="Product Status" name="status" value={formData.status} onChange={handleChange} options={["Active", "Draft", "Inactive"]} />
            </div>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
              {[
                ["featured", "Featured Product"],
                ["new_arrival", "New Arrival"],
                ["best_seller", "Best Seller"]
              ].map(([name, label]) => (
                <label key={name} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" name={name} checked={Boolean(formData[name])} onChange={handleChange} className="h-4 w-4 accent-[#003B3B]" />
                  {label}
                </label>
              ))}
            </div>
          </Section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <FiImage className="text-[#003B3B]" />
              <h2 className="text-sm font-extrabold text-[#003B3B]">Product Snapshot</h2>
            </div>
            {formData.images[0] ? (
              <img src={imageUrl(formData.images[0])} alt={formData.name || "Product preview"} className="aspect-square w-full rounded-xl bg-gray-50 object-contain" />
            ) : (
              <div className="flex aspect-square w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400">
                <FiImage size={30} />
                <span className="mt-2 text-xs font-semibold">Product image preview</span>
              </div>
            )}
            <p className="mt-4 truncate font-bold text-slate-800">{formData.name || "Product name"}</p>
            <p className="mt-1 text-xs text-gray-500">{formData.product_code || "SKU"} · {formData.purity}</p>
            <div className="mt-4 flex items-baseline justify-between border-t border-gray-100 pt-4">
              <span className="text-xs font-semibold text-gray-500">Final selling price</span>
              <span className="font-black text-[#003B3B]">₹{pricing.finalPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
            </div>
            <p className="mt-2 text-xs text-gray-500">Stock: {formData.total_stock || 0} · {formData.stock_status}</p>
          </div>
          <div className="flex gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <button type="button" onClick={() => navigate(-1)} className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading || uploading} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#003B3B] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#008577] disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? <FiCheck /> : <FiSave />}
              {loading ? "Saving..." : isEdit ? "Update Product" : "Save Product"}
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
};

export default AddProducts;
