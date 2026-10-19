import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { QRCodeCanvas } from "qrcode.react";
import {
  FiArrowLeft,
  FiEdit,
  FiExternalLink,
  FiPackage,
  FiRefreshCw,
  FiTrash2
} from "react-icons/fi";
import { BsQrCode } from "react-icons/bs";
import api from "../../api";
import { formatRateDate, getRateForPurity } from "../../PrivateRouter/goldRateUtils";
import useGoldRates from "../../PrivateRouter/useGoldRates";

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2
}).format(Number(value) || 0);
const optionalMoney = (value) => value == null || value === "" ? "" : money(value);

function assetUrl(path) {
  if (!path || typeof path !== "string") return "";
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${BACKEND_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function parseArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function imagePath(image) {
  if (typeof image === "string") return image;
  return image?.url || image?.path || image?.src || "";
}

function displayValue(value) {
  if (value == null || value === "") return "";
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function dateText(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? String(value) : date.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });
}

function DetailSection({ title, fields, columns = "sm:grid-cols-2 lg:grid-cols-3" }) {
  const visibleFields = fields.filter(([, value]) => displayValue(value) !== "");
  if (visibleFields.length === 0) return null;
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-[#003B3B]/5 px-5 py-4">
        <h2 className="font-bold text-[#003B3B]">{title}</h2>
      </div>
      <dl className={`grid gap-3 p-5 ${columns}`}>
        {visibleFields.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-xl bg-slate-50 p-3">
            <dt className="text-xs font-medium text-slate-500">{label}</dt>
            <dd className="mt-1 break-words text-sm font-semibold text-slate-800">{displayValue(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadedProductId, setLoadedProductId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeVariant, setActiveVariant] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const { current: activeRateSet, error: rateError } = useGoldRates();

  useEffect(() => {
    let active = true;
    api.get(`/products/${id}`)
      .then(({ data }) => {
        if (!active) return;
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          throw new Error("The server returned invalid product details.");
        }
        setProduct(data);
        setLoadedProductId(id);
        setActiveVariant(0);
        setActiveImage(0);
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

  useEffect(() => {
    let active = true;
    api.get(`/products/${id}/price-history`)
      .then(({ data }) => {
        if (active) setPriceHistory(Array.isArray(data.history) ? data.history : []);
      })
      .catch((error) => {
        if (active) console.error("Failed to load product price history:", error);
      });
    return () => { active = false; };
  }, [id, refreshKey]);

  const refreshProduct = () => {
    setLoading(true);
    setErrorMessage("");
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

  if (loading || loadedProductId !== id) {
    return <div className="py-20 text-center text-sm font-semibold text-slate-500">Loading product details...</div>;
  }
  if (!product) {
    return (
      <main className="mx-auto max-w-2xl rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
        <FiPackage className="mx-auto text-3xl text-slate-300" />
        <h1 className="mt-3 text-xl font-bold text-[#003B3B]">Product details unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">{errorMessage || "This product may have been removed."}</p>
        <div className="mt-5 flex justify-center gap-3">
          <button type="button" onClick={refreshProduct} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <FiRefreshCw /> Retry
          </button>
          <Link to="/admin/products/all" className="rounded-lg bg-[#003B3B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#008577]">All Products</Link>
        </div>
      </main>
    );
  }

  const variants = parseArray(product.variants);
  const mainImages = parseArray(product.images).map(imagePath).filter(Boolean);
  const currentVariant = variants[activeVariant] || {};
  const variantImages = parseArray(currentVariant.images).map(imagePath).filter(Boolean);
  const displayImages = variantImages.length ? variantImages : mainImages;
  const selectedImage = displayImages[activeImage] || displayImages[0] || "";
  const currentPurityRate = getRateForPurity(activeRateSet, product.purity);
  const detailsLink = typeof window !== "undefined" ? window.location.href : `/admin/products/${id}`;
  const documentFields = [
    ["Size Guide", product.size_guide_chart],
    ["Certificate", product.certificate]
  ].filter(([, value]) => value);
  const productInfo = [
    ["SKU / Product Code", product.product_code],
    ["Brand", product.brand],
    ["Category", product.category],
    ["Subcategory", product.subcategory],
    ["Product Type", product.product_type],
    ["Metal Type", product.metal_type],
    ["Purity", product.purity],
    ["Status", product.status]
  ];
  const goldInfo = [
    ["Gross Weight", product.gross_weight != null ? `${product.gross_weight} g` : ""],
    ["Net Gold Weight", product.net_gold_weight != null ? `${product.net_gold_weight} g` : ""],
    ["Stone Weight", product.stone_weight != null ? `${product.stone_weight} g` : ""],
    ["Stone Type", product.stone_type],
    ["Applied Rate Snapshot / Gram", product.gold_rate_per_gram != null ? money(product.gold_rate_per_gram) : ""],
    ["Rate Snapshot Date", product.gold_rate_date ? dateText(product.gold_rate_date) : ""],
    ["HUID", product.huid]
  ];
  const measurements = [
    ["Product Size", product.product_size],
    ["Available Sizes", parseArray(product.available_sizes).join(", ")],
    ["Length", product.length],
    ["Width", product.width],
    ["Height", product.height],
    ["Ring Size", product.ring_size],
    ["Bangle Size", product.bangle_size],
    ["Chain Length", product.chain_length],
    ["Age", product.age],
    ["Material / Fabric", product.material],
    ["Artisan Work", product.work_type],
    ["Jewelry Length", product.saree_length],
    ["Blouse Length", product.blouse_length],
    ["Top Length", product.top_length],
    ["Bottom Length", product.bottom_length],
    ["Dupatta Length", product.dupatta_length],
    ["Gown Length", product.gown_length],
    ["Sleeve Type", product.sleeve_type],
    ["Neck Type", product.neck_type],
    ["Fit Type", product.fit_type],
    ["Zari Color", product.zari_color]
  ];
  const pricing = [
    ["MRP", optionalMoney(product.mrp)],
    ["Offer", product.offer != null ? `${product.offer}%` : ""],
    ["Offer Price", optionalMoney(product.offer_price)],
    ["Discount", product.discount != null ? `${product.discount}%` : ""],
    ["GST Rate", product.gst_rate != null ? `${product.gst_rate}%` : ""],
    ["Final Selling Price", optionalMoney(product.final_selling_price)],
    ["Price Includes GST", product.price_includes_gst],
    ["Making Charge Type", product.making_charge_type],
    ["Stone Charges", product.stone_charges != null ? money(product.stone_charges) : ""],
    ["Making Charge", product.making_charge != null ? (
      String(product.making_charge_type).toLowerCase() === "percentage"
        ? `${product.making_charge}%`
        : optionalMoney(product.making_charge)
    ) : ""],
    ["Wastage Type", product.wastage_type],
    ["Wastage", product.wastage != null ? (
      String(product.wastage_type).toLowerCase() === "percentage"
        ? `${product.wastage}%`
        : `${product.wastage} g`
    ) : ""]
  ];
  const inventory = [
    ["Stock Quantity", product.total_stock != null ? `${product.total_stock} units` : ""],
    ["Stock Status", product.stock_status],
    ["Warehouse / Location", product.warehouse],
    ["SKU Barcode", product.sku_barcode],
    ["Rating", product.rating != null ? `${product.rating} / 5` : ""],
    ["Total Reviews", product.total_reviews],
    ["Featured Product", Boolean(product.featured)],
    ["New Arrival", Boolean(product.new_arrival)],
    ["Best Seller", Boolean(product.best_seller)],
    ["Created", dateText(product.created_at)],
    ["Last Updated", dateText(product.updated_at)]
  ];

  return (
    <main className="space-y-5 pb-10">
      <header className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/admin/products/all" aria-label="Back to all products" className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:border-[#008577] hover:text-[#008577]">
            <FiArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-extrabold text-[#003B3B] sm:text-2xl">{product.name || "Unnamed Product"}</h1>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${product.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{product.status || "Unknown"}</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{product.product_code || `Product ID ${product.id}`} · {product.category || "Uncategorized"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={refreshProduct} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50" aria-label="Refresh product details">
            <FiRefreshCw /> Refresh
          </button>
          <Link to={`/admin/products/edit/${id}`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#003B3B] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#008577]">
            <FiEdit /> Edit Product
          </Link>
          <button type="button" onClick={handleDelete} disabled={deleting} className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60">
            <FiTrash2 /> {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </header>

      <section className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Saved product price snapshot</p>
        <p className="mt-1 text-sm font-semibold text-slate-800">
          Applied rate {product.gold_rate_per_gram == null ? "—" : `${money(product.gold_rate_per_gram)} / g`}
          {product.gold_rate_date && ` · ${formatRateDate(product.gold_rate_date)}`}
          {product.gold_value != null && <> · Gold value {money(product.gold_value)}</>}
          {product.final_selling_price != null && <> · Final price {money(product.final_selling_price)}</>}
        </p>
        {currentPurityRate && Number(currentPurityRate.rate_per_gram) !== Number(product.gold_rate_per_gram) && (
          <p className="mt-2 text-xs font-semibold text-amber-800">
            Current rate is {money(currentPurityRate.rate_per_gram)} / g. The saved price is updated when the rate batch is activated.
          </p>
        )}
        {!currentPurityRate && <p className="mt-2 text-xs text-slate-600">{activeRateSet ? `No current rate is configured for ${product.purity}.` : "No active global rate is configured."}</p>}
        {rateError && <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">Could not refresh the active rate: {rateError}</p>}
        <p className="mt-1 text-xs text-slate-600">Rate changes update stored product prices and do not alter historical invoices.</p>
      </section>

      <div className="grid gap-5 lg:grid-cols-12">
        <section className="space-y-3 lg:col-span-5">
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-slate-50">
              {selectedImage ? (
                <img src={assetUrl(selectedImage)} alt={product.name || "Product"} className="h-full w-full object-contain" />
              ) : (
                <div className="text-center text-sm font-medium text-slate-400"><FiPackage className="mx-auto mb-2 text-3xl" />No product images</div>
              )}
            </div>
          </div>
          {displayImages.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {displayImages.map((image, index) => (
                <button key={`${image}-${index}`} type="button" onClick={() => setActiveImage(index)} aria-label={`Show product image ${index + 1}`} aria-pressed={activeImage === index} className={`aspect-square overflow-hidden rounded-lg border-2 bg-white ${activeImage === index ? "border-[#008577]" : "border-transparent"}`}>
                  <img src={assetUrl(image)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {product.video && (
            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="mb-3 font-bold text-[#003B3B]">Product Video</h2>
              <video src={assetUrl(product.video)} controls preload="metadata" className="max-h-80 w-full rounded-lg bg-black" />
            </section>
          )}
          {documentFields.length > 0 && (
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="mb-3 font-bold text-[#003B3B]">Product Documents</h2>
              <div className="flex flex-wrap gap-2">
                {documentFields.map(([label, path]) => (
                  <a key={label} href={assetUrl(path)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-[#008577] hover:bg-emerald-50">
                    {label} <FiExternalLink />
                  </a>
                ))}
              </div>
            </section>
          )}
        </section>

        <section className="space-y-5 lg:col-span-7">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["MRP", money(product.mrp)],
              ["Offer Price", money(product.offer_price)],
              ["Stock", `${Number(product.total_stock) || 0} units`]
            ].map(([label, value]) => (
              <article key={label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-extrabold text-[#003B3B]">{value}</p>
              </article>
            ))}
          </div>

          {(product.description || product.full_description) && (
            <section className="space-y-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-[#003B3B]">Description</h2>
              {product.description && <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{product.description}</p>}
              {product.full_description && <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{product.full_description}</p>}
            </section>
          )}
          <DetailSection title="Product Information" fields={productInfo} />
          <DetailSection title="Gold & Material Details" fields={goldInfo} />
          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-[#003B3B]/5 px-5 py-4">
              <h2 className="font-bold text-[#003B3B]">Price History</h2>
            </div>
            {priceHistory.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">No price recalculation history yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Changed</th>
                      <th className="px-5 py-3">Previous Price</th>
                      <th className="px-5 py-3">New Price</th>
                      <th className="px-5 py-3">Rate / g</th>
                      <th className="px-5 py-3">Reason</th>
                      <th className="px-5 py-3">Changed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {priceHistory.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-5 py-3 text-slate-600">{dateText(entry.changed_at)}</td>
                        <td className="px-5 py-3 text-slate-600">{entry.previous_price == null ? "—" : money(entry.previous_price)}</td>
                        <td className="px-5 py-3 font-bold text-[#003B3B]">{money(entry.new_price)}</td>
                        <td className="px-5 py-3 text-slate-600">{money(entry.rate_per_gram)}</td>
                        <td className="px-5 py-3 text-slate-600">{entry.reason}</td>
                        <td className="px-5 py-3 text-slate-600">{entry.changed_by_name || "System"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <DetailSection title="Pricing & Charges" fields={pricing} />
          <DetailSection title="Sizes & Measurements" fields={measurements} />
          <DetailSection title="Inventory & Publishing" fields={inventory} />
          <DetailSection title="Care & Warranty" fields={[
            ["Care Instructions", product.care_instructions],
            ["Wash Care", product.wash_care],
            ["Warranty", product.warranty]
          ]} columns="sm:grid-cols-1" />
          {parseArray(product.highlights).length > 0 && (
            <DetailSection title="Product Highlights" fields={parseArray(product.highlights).map((highlight, index) => [`Highlight ${index + 1}`, highlight])} />
          )}
          {product.specifications && (
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-bold text-[#003B3B]">Specifications</h2>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{product.specifications}</p>
            </section>
          )}
          {variants.length > 0 && (
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-bold text-[#003B3B]">Variants & Size Stock</h2>
              <div className="space-y-3">
                {variants.map((variant, index) => {
                  const stockBySize = variant.sizesStock && typeof variant.sizesStock === "object"
                    ? Object.entries(variant.sizesStock)
                    : [];
                  const selectedSizes = parseArray(variant.selectedSizes);
                  const variantStock = stockBySize.reduce((total, [, quantity]) => total + (Number(quantity) || 0), 0);
                  return (
                    <button key={`${variant.colorName || variant.color || "variant"}-${index}`} type="button" onClick={() => { setActiveVariant(index); setActiveImage(0); }} className={`w-full rounded-xl border p-4 text-left transition ${activeVariant === index ? "border-[#008577] bg-emerald-50/60" : "border-slate-100 bg-slate-50 hover:border-slate-300"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {variant.color && <span className="h-7 w-7 rounded-lg border border-slate-200" style={{ backgroundColor: variant.color }} />}
                          <span className="font-semibold text-slate-800">{variant.colorName || variant.color || `Variant ${index + 1}`}</span>
                        </div>

                        <span className="text-xs font-semibold text-slate-500">{variantStock ? `${variantStock} units` : ""}</span>
                      </div>
                      {selectedSizes.length > 0 && <p className="mt-2 text-xs text-slate-500">Sizes: {selectedSizes.join(", ")}</p>}
                      {stockBySize.length > 0 && <p className="mt-1 text-xs text-slate-500">{stockBySize.map(([size, quantity]) => `${size}: ${quantity}`).join(" · ")}</p>}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
          <section className="flex flex-col items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row">
            <div className="rounded-xl border border-slate-100 bg-white p-3"><QRCodeCanvas value={detailsLink} size={104} level="H" includeMargin /></div>
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center gap-2 text-[#003B3B] sm:justify-start"><BsQrCode /><h2 className="font-bold">Product Record QR</h2></div>
              <p className="mt-1 text-xs text-slate-500">Scan to open this product record.</p>
              <p className="mt-2 text-xs font-semibold text-slate-600">Added {dateText(product.created_at)} · Updated {dateText(product.updated_at)}</p>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

export default ProductDetail;
