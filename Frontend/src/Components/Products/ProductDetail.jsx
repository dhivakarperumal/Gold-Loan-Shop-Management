import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FaArrowLeft, FaCheckCircle, FaGem, FaPlayCircle } from "react-icons/fa";
import api from "../../api";

const backendUrl = (
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5000"
).replace(/\/$/, "");

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

const mediaPath = (media) => {
  if (typeof media === "string") return media;
  return media?.url || media?.path || media?.src || "";
};

const assetUrl = (path) => {
  if (!path || typeof path !== "string") return "";
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${backendUrl}${path.startsWith("/") ? path : `/${path}`}`;
};

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", {
  maximumFractionDigits: 2,
})}`;

const displayValue = (value) => {
  if (value == null || value === "") return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(displayValue).filter(Boolean).join(", ");
  if (typeof value === "object") return Object.entries(value)
    .map(([key, item]) => `${key}: ${displayValue(item)}`)
    .filter(Boolean)
    .join(" · ");
  return String(value);
};

const DetailGroup = ({ title, entries }) => {
  const visibleEntries = entries.filter(([, value]) => displayValue(value));
  if (!visibleEntries.length) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-[#eadfce] bg-white shadow-sm">
      <h2 className="border-b border-[#efe5d4] bg-[#fffaf0] px-5 py-4 font-serif text-lg font-bold text-[#174a38]">
        {title}
      </h2>
      <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
        {visibleEntries.map(([label, value]) => (
          <div key={label} className="min-w-0 border-b border-[#f3eee5] pb-3 last:border-0">
            <dt className="text-xs font-medium uppercase tracking-wide text-[#887c69]">{label}</dt>
            <dd className="mt-1 break-words text-sm font-semibold text-[#352d22]">{displayValue(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [activeImage, setActiveImage] = useState(null);
  const [loadedProductId, setLoadedProductId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    api.get(`/products/${id}`, { signal: controller.signal })
      .then(({ data }) => {
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          throw new TypeError("Product details response is invalid");
        }
        if (data.status && data.status !== "Active") {
          setProduct(null);
          setError("This product is currently unavailable.");
          return;
        }
        setProduct(data);
        setError("");
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) return;
        console.error("Failed to load product details:", fetchError);
        setProduct(null);
        setError(fetchError.response?.data?.message || "Product details could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedProductId(id);
      });

    return () => controller.abort();
  }, [id]);

  const images = useMemo(() => {
    if (!product) return [];
    const variants = parseArray(product.variants);
    const imagePaths = [
      ...parseArray(product.images),
      ...variants.flatMap((variant) => parseArray(variant.images)),
    ].map(mediaPath).filter(Boolean);
    return [...new Set(imagePaths)];
  }, [product]);

  const selectedImage = images.includes(activeImage) ? activeImage : images[0];
  const loading = loadedProductId !== id;

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-20 text-center text-sm font-semibold text-[#746b5d]" role="status">
        Loading product details...
      </main>
    );
  }

  if (!product) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="rounded-3xl border border-[#eadfce] bg-white p-8 shadow-sm">
          <FaGem className="mx-auto text-3xl text-[#bd913e]" />
          <h1 className="mt-4 font-serif text-2xl font-bold text-[#174a38]">Product unavailable</h1>
          <p className="mt-2 text-sm text-[#746b5d]" role="alert">{error || "This product could not be found."}</p>
          <Link to="/shop" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#174a38] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#10382b]">
            <FaArrowLeft /> Continue shopping
          </Link>
        </div>
      </main>
    );
  }

  const offerPrice = Number(product.offer_price ?? product.final_selling_price ?? product.mrp ?? 0);
  const mrp = Number(product.mrp || 0);
  const highlights = parseArray(product.highlights);
  const specs = parseArray(product.specifications);
  const variants = parseArray(product.variants);
  const sizeGuide = assetUrl(product.size_guide_chart);
  const certificate = assetUrl(product.certificate);
  const video = assetUrl(product.video);
  const productDetails = [
    ["Product code", product.product_code],
    ["Brand", product.brand],
    ["Category", product.category],
    ["Subcategory", product.subcategory],
    ["Product type", product.product_type],
    ["Metal", product.metal_type],
    ["Purity", product.purity],
  ];
  const materialDetails = [
    ["Gross weight", product.gross_weight != null ? `${product.gross_weight} g` : ""],
    ["Net gold weight", product.net_gold_weight != null ? `${product.net_gold_weight} g` : ""],
    ["Stone weight", product.stone_weight != null ? `${product.stone_weight} g` : ""],
    ["Stone type", product.stone_type],
    ["Gold rate / gram", product.gold_rate_per_gram != null ? money(product.gold_rate_per_gram) : ""],
    ["HUID", product.huid],
    ["Material", product.material],
    ["Artisan work", product.work_type],
  ];
  const sizeDetails = [
    ["Product size", product.product_size],
    ["Available sizes", parseArray(product.available_sizes)],
    ["Length", product.length],
    ["Width", product.width],
    ["Height", product.height],
    ["Ring size", product.ring_size],
    ["Bangle size", product.bangle_size],
    ["Chain length", product.chain_length],
    ["Age", product.age],
    ["Sleeve type", product.sleeve_type],
    ["Neck type", product.neck_type],
    ["Fit type", product.fit_type],
    ["Jewelry length", product.saree_length],
  ];
  const careDetails = [
    ["Care instructions", product.care_instructions],
    ["Wash care", product.wash_care],
    ["Warranty", product.warranty],
  ];
  const pricingDetails = [
    ["Offer", product.offer != null ? `${product.offer}%` : ""],
    ["Discount", product.discount != null ? `${product.discount}%` : ""],
    ["GST", product.gst_rate != null ? `${product.gst_rate}%` : ""],
    ["Making charge", product.making_charge != null
      ? String(product.making_charge_type).toLowerCase() === "percentage"
        ? `${product.making_charge}%`
        : money(product.making_charge)
      : ""],
    ["Wastage", product.wastage != null
      ? String(product.wastage_type).toLowerCase() === "percentage"
        ? `${product.wastage}%`
        : `${product.wastage} g`
      : ""],
    ["Price includes GST", product.price_includes_gst],
  ];
  const variantDetails = [
    ["Available colors", [...new Set(variants.map((variant) => variant.colorName || variant.color).filter(Boolean))]],
    ["Variant sizes", [...new Set(variants.flatMap((variant) => [
      ...parseArray(variant.selectedSizes),
      ...parseArray(variant.available_sizes),
    ]))]],
  ];

  return (
    <main className="min-h-screen bg-[#fffdf8] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link to="/shop" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#174a38] transition hover:text-[#a77525]">
          <FaArrowLeft /> Back to shopping
        </Link>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <section className="min-w-0">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-3xl border border-[#eadfce] bg-white p-3 shadow-sm sm:p-6">
              {images.length ? (
                <img
                  src={assetUrl(selectedImage)}
                  alt={product.name}
                  className="h-full w-full rounded-2xl object-contain"
                />
              ) : (
                <div className="text-center text-sm text-[#887c69]">
                  <FaGem className="mx-auto mb-3 text-4xl text-[#bd913e]" />
                  Product image unavailable
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setActiveImage(image)}
                    aria-label={`View product image ${index + 1}`}
                    aria-pressed={selectedImage === image}
                    className={`aspect-square overflow-hidden rounded-xl border-2 bg-white p-1 transition ${selectedImage === image ? "border-[#174a38]" : "border-[#eadfce] hover:border-[#bd913e]"}`}
                  >
                    <img src={assetUrl(image)} alt="" className="h-full w-full rounded-lg object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col">
            <div className="flex flex-wrap gap-2">
              {[product.category, product.metal_type].filter(Boolean).map((label) => (
                <span key={label} className="rounded-full bg-[#f3eee2] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#765323]">{label}</span>
              ))}
              {product.stock_status && (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">{product.stock_status}</span>
              )}
            </div>
            <h1 className="mt-4 font-serif text-3xl font-bold leading-tight text-[#252018] sm:text-4xl">{product.name}</h1>
            {product.product_code && <p className="mt-2 text-sm text-[#887c69]">Product code: {product.product_code}</p>}

            <div className="mt-6 rounded-2xl border border-[#eadfce] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-3xl font-extrabold text-[#174a38]">{money(offerPrice)}</span>
                {mrp > offerPrice && <span className="text-base text-[#887c69] line-through">{money(mrp)}</span>}
                {mrp > offerPrice && (
                  <span className="rounded-full bg-[#edf5ef] px-2.5 py-1 text-xs font-bold text-[#174a38]">
                    Save {money(mrp - offerPrice)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-[#887c69]">Inclusive of applicable taxes</p>
            </div>

            {(product.description || product.full_description) && (
              <div className="mt-6 space-y-3 text-sm leading-6 text-[#62594d]">
                {product.description && <p className="whitespace-pre-wrap">{product.description}</p>}
                {product.full_description && <p className="whitespace-pre-wrap">{product.full_description}</p>}
              </div>
            )}

            {highlights.length > 0 && (
              <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                {highlights.map((highlight, index) => (
                  <li key={`${displayValue(highlight)}-${index}`} className="flex items-start gap-2 text-sm text-[#514638]">
                    <FaCheckCircle className="mt-0.5 shrink-0 text-[#174a38]" />
                    <span>{displayValue(highlight)}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-7 space-y-4">
              <DetailGroup title="Product details" entries={productDetails} />
              <DetailGroup title="Metal & material" entries={materialDetails} />
              <DetailGroup title="Pricing & charges" entries={pricingDetails} />
              <DetailGroup title="Sizes & measurements" entries={sizeDetails} />
              <DetailGroup title="Available options" entries={variantDetails} />
              <DetailGroup title="Care & warranty" entries={careDetails} />
              {specs.length > 0 && <DetailGroup title="Specifications" entries={specs.map((item, index) => Array.isArray(item) ? item : [`Specification ${index + 1}`, item])} />}
            </div>

            {(sizeGuide || certificate) && (
              <div className="mt-5 flex flex-wrap gap-3">
                {sizeGuide && <a href={sizeGuide} target="_blank" rel="noreferrer" className="rounded-lg border border-[#174a38] px-4 py-2 text-sm font-semibold text-[#174a38] hover:bg-[#edf5ef]">View size guide</a>}
                {certificate && <a href={certificate} target="_blank" rel="noreferrer" className="rounded-lg border border-[#174a38] px-4 py-2 text-sm font-semibold text-[#174a38] hover:bg-[#edf5ef]">View certificate</a>}
              </div>
            )}
            {video && (
              <section className="mt-5 rounded-2xl border border-[#eadfce] bg-white p-4">
                <h2 className="mb-3 flex items-center gap-2 font-semibold text-[#174a38]"><FaPlayCircle /> Product video</h2>
                <video src={video} controls preload="metadata" className="max-h-96 w-full rounded-xl bg-black" />
              </section>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default ProductDetail;
