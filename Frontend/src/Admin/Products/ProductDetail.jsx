import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  FiActivity,
  FiArrowLeft,
  FiBookmark,
  FiChevronLeft,
  FiChevronRight,
  FiDollarSign,
  FiEdit,
  FiExternalLink,
  FiGrid,
  FiImage,
  FiInfo,
  FiLayers,
  FiPackage,
  FiRefreshCw,
  FiShare2,
  FiStar,
  FiTrash2
} from "react-icons/fi";
import api from "../../api";

const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5000"
).replace(/\/$/, "");

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
}).format(Number(value) || 0);

const parseArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const imagePath = (image) => {
  if (typeof image === "string") return image;
  return image?.url || image?.path || image?.src || "";
};

const assetUrl = (path) => {
  if (!path || typeof path !== "string") return "";
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${BACKEND_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

const displayValue = (value) => {
  if (value == null || value === "") return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(displayValue).filter(Boolean).join(", ");
  return String(value);
};

const dateText = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? String(value)
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

function DetailCard({ title, icon: Icon, fields, className = "" }) {
  const visibleFields = fields.filter(([, value]) => displayValue(value) !== "");
  if (!visibleFields.length) return null;

  return (
    <section className={`overflow-hidden rounded-xl border border-[#eee8dc] bg-white shadow-sm ${className}`}>
      <h2 className="flex items-center gap-2 border-b border-[#f1ebdf] bg-[#fffdf8] px-4 py-3 font-semibold text-[#173f38]">
        {Icon && <Icon className="shrink-0 text-[#c99435]" />}
        {title}
      </h2>
      <dl className="divide-y divide-[#f1eee8] px-4">
        {visibleFields.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-3 py-2.5 text-xs sm:text-sm">
            <dt className="text-[#7d817d]">{label}</dt>
            <dd className="break-words font-semibold text-[#344541]">{displayValue(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const tabs = [
  { id: "information", label: "Information", icon: FiInfo },
  { id: "pricing", label: "Pricing & Stock", icon: FiDollarSign },
  { id: "images", label: "Images", icon: FiImage },
  { id: "variants", label: "Variants", icon: FiGrid },
  { id: "specifications", label: "Specifications", icon: FiLayers },
  { id: "additional", label: "Additional Details", icon: FiBookmark },
  { id: "reviews", label: "Reviews", icon: FiStar },
  { id: "activity", label: "Activity Log", icon: FiActivity }
];

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadedProductId, setLoadedProductId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState("information");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    api.get(`/products/${id}`)
      .then(({ data }) => {
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          throw new Error("The server returned invalid product details.");
        }
        if (!active) return;
        setProduct(data);
        setLoadedProductId(id);
        setActiveImage(0);
        setActiveTab("information");
        setErrorMessage("");
      })
      .catch((error) => {
        if (!active) return;
        console.error("Failed to load product details:", error);
        const message = error.response?.data?.message || error.message || "Could not load product details.";
        setErrorMessage(message);
        toast.error(message);
        setProduct(null);
        setLoadedProductId(id);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id, refreshKey]);

  const refreshProduct = () => {
    setErrorMessage("");
    setLoading(true);
    setRefreshKey((current) => current + 1);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${product.name}"? This action cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/products/${id}`);
      toast.success("Product deleted.");
      navigate("/admin/products/all");
    } catch (error) {
      console.error("Failed to delete product:", error);
      toast.error(error.response?.data?.message || "Could not delete product.");
      setDeleting(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/product/${id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Product link copied.");
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Failed to share product:", error);
        toast.error("Could not share the product link.");
      }
    }
  };

  if (loading || loadedProductId !== id) {
    return <div className="py-20 text-center text-sm font-semibold text-slate-500" role="status">Loading product details...</div>;
  }
  if (!product) {
    return (
      <main className="mx-auto max-w-2xl rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
        <FiPackage className="mx-auto text-3xl text-slate-300" />
        <h1 className="mt-3 text-xl font-bold text-[#173f38]">Product details unavailable</h1>
        <p className="mt-2 text-sm text-slate-500" role="alert">{errorMessage || "This product may have been removed."}</p>
        <div className="mt-5 flex justify-center gap-3">
          <button type="button" onClick={refreshProduct} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <FiRefreshCw /> Retry
          </button>
          <Link to="/admin/products/all" className="rounded-lg bg-[#174a3f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#10382f]">All Products</Link>
        </div>
      </main>
    );
  }

  const variants = parseArray(product.variants);
  const images = [
    ...parseArray(product.images).map(imagePath),
    ...variants.flatMap((variant) => parseArray(variant.images).map(imagePath))
  ].filter(Boolean).filter((image, index, allImages) => allImages.indexOf(image) === index);
  const selectedImage = images[activeImage] || images[0] || "";
  const offerPrice = Number(product.offer_price ?? product.final_selling_price ?? product.mrp ?? 0);
  const mrp = Number(product.mrp || 0);
  const discount = Number(product.discount || product.offer || (mrp > offerPrice ? ((mrp - offerPrice) / mrp) * 100 : 0));
  const stockStatus = product.stock_status || (Number(product.total_stock) > 0 ? "In Stock" : "Out of Stock");
  const productInfo = [
    ["Product Name", product.name],
    ["Category", product.category],
    ["Sub Category", product.subcategory],
    ["Metal Type", product.metal_type],
    ["Purity", product.purity],
    ["SKU", product.product_code],
    ["Stock Status", stockStatus],
    ["Created At", dateText(product.created_at)],
    ["Updated At", dateText(product.updated_at)]
  ];
  const pricingInfo = [
    ["Gold Rate", product.gold_rate_per_gram != null ? `${money(product.gold_rate_per_gram)} / g` : ""],
    ["Product Weight", product.gross_weight != null ? `${product.gross_weight} g` : ""],
    ["Gold Amount", product.net_gold_weight != null && product.gold_rate_per_gram != null
      ? money(Number(product.net_gold_weight) * Number(product.gold_rate_per_gram))
      : ""],
    ["Making Charges", product.making_charge != null
      ? String(product.making_charge_type).toLowerCase() === "percentage"
        ? `${product.making_charge}%`
        : money(product.making_charge)
      : ""],
    ["Stone Charges", product.stone_charges != null ? money(product.stone_charges) : ""],
    ["Wastage", product.wastage != null
      ? String(product.wastage_type).toLowerCase() === "percentage"
        ? `${product.wastage}%`
        : `${product.wastage} g`
      : ""],
    ["GST", product.gst_rate != null ? `${product.gst_rate}%` : ""],
    ["Offer Price", money(offerPrice)],
    ["Discount", discount ? `${discount.toFixed(0)}%` : ""],
    ["MRP", mrp > offerPrice ? money(mrp) : ""],
    ["Final Price", money(product.final_selling_price ?? offerPrice)]
  ];
  const additionalInfo = [
    ["Brand", product.brand],
    ["Product Type", product.product_type],
    ["Stone Type", product.stone_type],
    ["Stone Weight", product.stone_weight != null ? `${product.stone_weight} g` : ""],
    ["HUID", product.huid],
    ["Material", product.material],
    ["Artisan Work", product.work_type],
    ["Care Instructions", product.care_instructions],
    ["Wash Care", product.wash_care],
    ["Warranty", product.warranty],
    ["Certificate", product.certificate ? "Available" : ""],
    ["Price Includes GST", product.price_includes_gst]
  ];

  return (
    <main className="space-y-5 pb-8 text-[#35443f]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium text-[#78817c] sm:text-sm">
          <Link to="/admin/products/all" className="hover:text-[#174a3f]">Products</Link>
          <span>›</span>
          <Link to="/admin/products/all" className="hover:text-[#174a3f]">All Products</Link>
          <span>›</span>
          <span className="font-semibold text-[#34443e]">Product Details</span>
        </div>
        <Link to="/admin/products/all" className="inline-flex items-center gap-2 rounded-full border border-[#ece6da] bg-white px-4 py-2 text-xs font-semibold text-[#34443e] shadow-sm transition hover:border-[#174a3f]">
          <FiArrowLeft /> Back to Products
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <section className="min-w-0 rounded-2xl border border-[#eee8dc] bg-white p-3 shadow-sm xl:col-span-5">
          <div className="relative flex aspect-[1.08/1] items-center justify-center overflow-hidden rounded-xl bg-[#f8f6ef]">
            {selectedImage ? (
              <img src={assetUrl(selectedImage)} alt={product.name || "Product"} className="h-full w-full object-cover" />
            ) : (
              <div className="text-center text-sm font-medium text-slate-400"><FiPackage className="mx-auto mb-2 text-4xl" />No product images</div>
            )}
            {(product.best_seller || product.featured) && (
              <span className="absolute left-3 top-3 rounded-full bg-[#f5c94d] px-3 py-1.5 text-xs font-bold text-[#49350d]">
                {product.best_seller ? "Bestseller" : "Featured"}
              </span>
            )}
            {images.length > 1 && (
              <>
                <button type="button" aria-label="Previous product image" onClick={() => setActiveImage((activeImage + images.length - 1) % images.length)} className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-[#174a3f] shadow transition hover:bg-white">
                  <FiChevronLeft size={20} />
                </button>
                <button type="button" aria-label="Next product image" onClick={() => setActiveImage((activeImage + 1) % images.length)} className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-[#174a3f] shadow transition hover:bg-white">
                  <FiChevronRight size={20} />
                </button>
              </>
            )}
          </div>
          {images.length > 0 && (
            <div className="mt-2 grid grid-cols-5 gap-2">
              {images.slice(0, 5).map((image, index) => (
                <button key={`${image}-${index}`} type="button" onClick={() => setActiveImage(index)} aria-label={`Show product image ${index + 1}`} aria-pressed={activeImage === index} className={`aspect-square overflow-hidden rounded-lg border-2 bg-white transition ${activeImage === index ? "border-[#1c765d]" : "border-transparent hover:border-[#d6c59d]"}`}>
                  <img src={assetUrl(image)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-2xl border border-[#eee8dc] bg-white p-4 shadow-sm sm:p-5 xl:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-md bg-[#f5f3f5] px-2 py-1 text-[11px] font-semibold text-[#6c6571]">PRODUCT ID: #{product.product_code || product.id}</span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${stockStatus.toLowerCase().includes("stock") && !stockStatus.toLowerCase().includes("out") ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}>
              <span className="h-2 w-2 rounded-full bg-current" />{stockStatus}
            </span>
          </div>
          <h1 className="mt-3 font-serif text-2xl font-bold leading-tight text-[#173f38] sm:text-3xl">{product.name || "Unnamed Product"}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64716b]">
            {product.rating != null && (
              <span className="inline-flex items-center gap-1 font-semibold text-[#394741]">
                <FiStar className="fill-[#f5a900] text-[#f5a900]" />
                {Number(product.rating).toFixed(1)}
                {product.total_reviews != null && <span>({product.total_reviews} reviews)</span>}
              </span>
            )}
            {product.total_stock != null && <span>{Number(product.total_stock).toLocaleString("en-IN")} in stock</span>}
          </div>

          {(product.description || product.full_description) && (
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#59645e]">{product.description || product.full_description}</p>
          )}

          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-3xl font-extrabold text-[#c12b19] sm:text-4xl">{money(product.final_selling_price ?? offerPrice)}</span>
            {mrp > offerPrice && <span className="text-sm text-[#858b87] line-through">{money(mrp)}</span>}
            {discount > 0 && <span className="rounded-full bg-[#fff0ee] px-3 py-1 text-xs font-bold text-[#d33627]">{discount.toFixed(0)}% OFF</span>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#737d77]">
            {product.purity && <span>{product.metal_type || "Gold"} ({product.purity})</span>}
            {product.gross_weight != null && <><span>|</span><span>Weight: {product.gross_weight} g</span></>}
            {product.making_charge != null && <><span>|</span><span>Making Charges: {product.making_charge === 0 ? "Included" : "Available"}</span></>}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Link to={`/admin/products/edit/${id}`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#174a3f] px-3 py-3 text-sm font-bold text-white transition hover:bg-[#10382f]">
              <FiEdit /> Edit Product
            </Link>
            <button type="button" onClick={refreshProduct} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#ece7dd] bg-[#fbfaf7] px-3 py-3 text-sm font-semibold text-[#40514a] transition hover:bg-[#f3f0e8]">
              <FiRefreshCw /> Refresh
            </button>
            <button type="button" onClick={handleDelete} disabled={deleting} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fff0ee] px-3 py-3 text-sm font-bold text-[#d43125] transition hover:bg-[#ffe3df] disabled:cursor-not-allowed disabled:opacity-60">
              <FiTrash2 /> {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link to={`/product/${id}`} target="_blank" className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#ece7dd] px-3 py-3 text-sm font-semibold text-[#40514a] transition hover:bg-[#fbfaf7]">
              <FiExternalLink /> View on Website
            </Link>
            <button type="button" onClick={handleShare} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#ece7dd] px-3 py-3 text-sm font-semibold text-[#40514a] transition hover:bg-[#fbfaf7]">
              <FiShare2 /> Share Product
            </button>
          </div>
        </section>
      </div>

      <nav aria-label="Product details sections" className="hide-scrollbar overflow-x-auto rounded-xl border border-[#eee8dc] bg-white shadow-sm">
        <div className="flex min-w-max">
          {tabs.map(({ id: tabId, label, icon: Icon }) => (
            <button key={tabId} type="button" onClick={() => setActiveTab(tabId)} aria-current={activeTab === tabId ? "page" : undefined} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3.5 text-xs font-semibold transition sm:px-5 ${activeTab === tabId ? "border-[#174a3f] bg-[#174a3f] text-white" : "border-transparent text-[#66726c] hover:bg-[#faf9f5] hover:text-[#174a3f]"}`}>
              <Icon className="text-sm" />{label}
            </button>
          ))}
        </div>
      </nav>

      {activeTab === "information" && (
        <div className="grid items-start gap-3 lg:grid-cols-[1.35fr_0.9fr_0.9fr]">
          <DetailCard title="Basic Information" icon={FiPackage} fields={productInfo} />
          <DetailCard title="Pricing Information" icon={FiDollarSign} fields={pricingInfo} />
          <DetailCard title="Additional Details" icon={FiBookmark} fields={additionalInfo} />
        </div>
      )}

      {activeTab === "pricing" && (
        <div className="grid items-start gap-3 lg:grid-cols-2">
          <DetailCard title="Pricing Information" icon={FiDollarSign} fields={pricingInfo} />
          <DetailCard title="Stock & Publishing" icon={FiPackage} fields={[
            ["Stock Quantity", product.total_stock != null ? `${product.total_stock} units` : ""],
            ["Stock Status", stockStatus],
            ["Warehouse / Location", product.warehouse],
            ["Product Status", product.status],
            ["Featured Product", product.featured],
            ["New Arrival", product.new_arrival],
            ["Best Seller", product.best_seller]
          ]} />
        </div>
      )}

      {activeTab === "images" && (
        <section className="rounded-xl border border-[#eee8dc] bg-white p-4 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-[#173f38]"><FiImage className="text-[#c99435]" />Product Images</h2>
          {images.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {images.map((image, index) => (
                <button key={`${image}-${index}`} type="button" onClick={() => { setActiveImage(index); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="aspect-square overflow-hidden rounded-lg border border-[#eee8dc] bg-[#f8f6ef]">
                  <img src={assetUrl(image)} alt={`${product.name} ${index + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500">No product images have been added.</p>}
          {product.video && <video src={assetUrl(product.video)} controls preload="metadata" className="mt-5 max-h-96 w-full rounded-xl bg-black" />}
          {product.certificate && <a href={assetUrl(product.certificate)} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#174a3f]"><FiExternalLink />View certificate</a>}
        </section>
      )}

      {activeTab === "variants" && (
        <section className="rounded-xl border border-[#eee8dc] bg-white p-4 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-[#173f38]"><FiGrid className="text-[#c99435]" />Variants & Size Stock</h2>
          {variants.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {variants.map((variant, index) => {
                const sizes = variant.sizesStock && typeof variant.sizesStock === "object" ? Object.entries(variant.sizesStock) : [];
                const selectedSizes = parseArray(variant.selectedSizes);
                return (
                  <article key={`${variant.colorName || variant.color || "variant"}-${index}`} className="rounded-xl border border-[#eee8dc] bg-[#fffdf8] p-4">
                    <div className="flex items-center gap-2 font-semibold text-[#34443e]">
                      {variant.color && <span className="h-5 w-5 rounded-full border border-slate-200" style={{ backgroundColor: variant.color }} />}
                      {variant.colorName || variant.color || `Variant ${index + 1}`}
                    </div>
                    {selectedSizes.length > 0 && <p className="mt-2 text-xs text-[#69756f]">Sizes: {selectedSizes.join(", ")}</p>}
                    {sizes.length > 0 && <p className="mt-1 text-xs text-[#69756f]">{sizes.map(([size, quantity]) => `${size}: ${quantity}`).join(" · ")}</p>}
                    {parseArray(variant.images).length > 0 && <p className="mt-2 text-xs font-medium text-[#69756f]">{parseArray(variant.images).length} image(s)</p>}
                  </article>
                );
              })}
            </div>
          ) : <p className="text-sm text-slate-500">No product variants have been added.</p>}
        </section>
      )}

      {activeTab === "specifications" && (
        <div className="grid items-start gap-3 lg:grid-cols-2">
          <DetailCard title="Specifications" icon={FiLayers} fields={[
            ["Product Size", product.product_size],
            ["Available Sizes", parseArray(product.available_sizes)],
            ["Length", product.length],
            ["Width", product.width],
            ["Height", product.height],
            ["Ring Size", product.ring_size],
            ["Bangle Size", product.bangle_size],
            ["Chain Length", product.chain_length],
            ["Saree Length", product.saree_length],
            ["Blouse Length", product.blouse_length],
            ["Top Length", product.top_length],
            ["Bottom Length", product.bottom_length],
            ["Dupatta Length", product.dupatta_length],
            ["Gown Length", product.gown_length],
            ["Sleeve Type", product.sleeve_type],
            ["Neck Type", product.neck_type],
            ["Fit Type", product.fit_type],
            ["Zari Color", product.zari_color],
            ["Age", product.age]
          ]} />
          <section className="rounded-xl border border-[#eee8dc] bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-[#173f38]"><FiLayers className="text-[#c99435]" />Product Specifications</h2>
            <p className="whitespace-pre-wrap text-sm leading-6 text-[#59645e]">{product.specifications || "No specifications have been added."}</p>
          </section>
        </div>
      )}

      {activeTab === "additional" && (
        <div className="grid items-start gap-3 lg:grid-cols-2">
          <DetailCard title="Additional Details" icon={FiBookmark} fields={additionalInfo} />
          <DetailCard title="Product Description" icon={FiInfo} fields={[
            ["Short Description", product.description],
            ["Full Description", product.full_description],
            ["Highlights", parseArray(product.highlights)]
          ]} />
          {(product.size_guide_chart || product.certificate) && (
            <section className="rounded-xl border border-[#eee8dc] bg-white p-4 shadow-sm">
              <h2 className="mb-3 font-semibold text-[#173f38]">Product Documents</h2>
              <div className="flex flex-wrap gap-3">
                {product.size_guide_chart && <a href={assetUrl(product.size_guide_chart)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-[#174a3f]"><FiExternalLink />Size guide</a>}
                {product.certificate && <a href={assetUrl(product.certificate)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-[#174a3f]"><FiExternalLink />Certificate</a>}
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === "reviews" && (
        <DetailCard title="Customer Reviews" icon={FiStar} fields={[
          ["Average Rating", product.rating != null ? `${Number(product.rating).toFixed(1)} / 5` : ""],
          ["Total Reviews", product.total_reviews]
        ]} />
      )}

      {activeTab === "activity" && (
        <DetailCard title="Activity Log" icon={FiActivity} fields={[
          ["Product Created", dateText(product.created_at)],
          ["Last Updated", dateText(product.updated_at)],
          ["Current Status", product.status],
          ["Product ID", product.id]
        ]} />
      )}
    </main>
  );
}

export default ProductDetail;
