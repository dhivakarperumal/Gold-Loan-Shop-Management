import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaGem,
  FaHeart,
  FaPlayCircle,
  FaShoppingBag,
  FaStar
} from "react-icons/fa";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import PageContainer from "../CommenComponents/PageContainer";
import PageHeader from "../CommenComponents/PageHeader";
import api from "../../api";
import { Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import ProductCard from "../Home/ProductCard";
import MetalProducts from "./MetalProducts";
import CategoryProducts from "./CategoryProducts";

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
      <dl className="divide-y divide-[#f3eee5] px-5">
        {visibleEntries.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-4 py-3">
            <dt className="text-xs text-[#887c69]">{label}</dt>
            <dd className="break-words text-sm font-semibold text-[#352d22]">{displayValue(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

const tabs = [
  ["information", "Information"],
  ["pricing", "Pricing & Stock"],
  ["images", "Images"],
  ["variants", "Variants"],
  ["specifications", "Specifications"],
  ["additional", "Additional Details"],
  ["reviews", "Reviews"]
];

const ProductDetail = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { wishlist, toggleWishlist, addToCart } = useContext(StoreContext);
  const [product, setProduct] = useState(null);
  const [loadedProductId, setLoadedProductId] = useState(null);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("information");
  const [zoom, setZoom] = useState(2.5);
  const [imagePointer, setImagePointer] = useState({ x: 0.5, y: 0.5 });
  const [isImageHovered, setIsImageHovered] = useState(false);
  const imageViewportRef = useRef(null);

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
        setActiveImage(0);
        setActiveVariantIndex(0);
        setActiveTab("information");
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

  const variants = useMemo(() => parseArray(product?.variants), [product]);
  const currentVariant = variants[activeVariantIndex] || null;
  const availableVariantSizes = [
    ...new Set([
      ...parseArray(currentVariant?.selectedSizes),
      ...parseArray(currentVariant?.available_sizes),
      ...parseArray(product?.available_sizes)
    ])
  ];
  const [selectedSize, setSelectedSize] = useState("");
  const activeSize = availableVariantSizes.includes(selectedSize)
    ? selectedSize
    : availableVariantSizes[0] || "";

  const images = useMemo(() => {
    if (!product) return [];
    const variantImages = variants.flatMap((variant) => parseArray(variant.images));
    const imagePaths = [
      ...parseArray(product.images),
      ...variantImages
    ].map(mediaPath).filter(Boolean);
    return [...new Set(imagePaths)];
  }, [product, variants]);

  const selectedImage = images[activeImage] || images[0];
  const updateImagePointer = (event) => {
    if (event.pointerType === "touch" || !imageViewportRef.current) return;
    const bounds = imageViewportRef.current.getBoundingClientRect();
    setImagePointer({
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height))
    });
  };
  const loading = loadedProductId !== id;

  if (loading) {
    return (
      <main className="bg-[#fffdf8]" role="status">
        <PageHeader title="Product Details" breadcrumbs={["Explore"]} />
        <PageContainer className="py-20 text-center text-sm font-semibold text-[#746b5d]">
          Loading product details...
        </PageContainer>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="bg-[#fffdf8]">
        <PageHeader title="Product Details" breadcrumbs={["Explore"]} />
        <PageContainer className="py-20 text-center">
          <div className="mx-auto max-w-2xl rounded-3xl border border-[#eadfce] bg-white p-8 shadow-sm">
            <FaGem className="mx-auto text-3xl text-[#bd913e]" />
            <h1 className="mt-4 font-serif text-2xl font-bold text-[#174a38]">Product unavailable</h1>
            <p className="mt-2 text-sm text-[#746b5d]" role="alert">{error || "This product could not be found."}</p>
            <Link to="/explore" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#174a38] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#10382b]">
              <FaArrowLeft /> Continue shopping
            </Link>
          </div>
        </PageContainer>
      </main>
    );
  }

  const offerPrice = Number(product.offer_price ?? product.final_selling_price ?? product.mrp ?? 0);
  const mrp = Number(product.mrp || 0);
  const discount = Number(product.discount) > 0
    ? Number(product.discount)
    : mrp > offerPrice ? Math.round(((mrp - offerPrice) / mrp) * 100) : 0;
  const highlights = parseArray(product.highlights);
  const specs = parseArray(product.specifications);
  const sizeGuide = assetUrl(product.size_guide_chart);
  const certificate = assetUrl(product.certificate);
  const video = assetUrl(product.video);
  const productId = product.id ?? product.product_id ?? id;
  const isFavorite = wishlist.some(
    (item) => String(item.product_id ?? item.productId ?? item.id) === String(productId)
  );
  const selectedVariantStock = currentVariant?.sizesStock?.[activeSize]
    ?? currentVariant?.total_stock
    ?? currentVariant?.stock;
  const stock = Number(selectedVariantStock ?? product.total_stock ?? 0);
  const inStock = stock > 0;
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
    ["Available sizes", availableVariantSizes],
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
  const additionalDetails = [
    ["Care instructions", product.care_instructions],
    ["Wash care", product.wash_care],
    ["Warranty", product.warranty],
    ["Certificate", product.certificate ? "Available" : ""],
    ["Product status", product.status]
  ];
  const specsEntries = specs.map((item, index) => (
    Array.isArray(item) ? item : [`Specification ${index + 1}`, item]
  ));

  return (
    <main className="min-h-screen bg-[#fffdf8]">
      <PageHeader title={product.name || "Product Details"} breadcrumbs={["Explore"]} />
      <PageContainer className="py-6">
        {/* <div className="mb-4 flex justify-end">
          <Link to={searchParams.toString() ? `/explore?${searchParams.toString()}` : "/explore"} className="inline-flex items-center gap-2 rounded-full border border-[#ece6da] bg-white px-4 py-2 text-xs font-semibold text-[#34443e] shadow-sm transition hover:border-[#174a38]">
            <FaArrowLeft /> Back to Products
          </Link>
        </div> */}

        <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr] mt-4">
          <section className="min-w-0 rounded-2xl border border-[#eee8dc] bg-white p-3 shadow-sm">
            <div
              ref={imageViewportRef}
              onPointerEnter={(event) => {
                if (event.pointerType !== "touch") setIsImageHovered(true);
              }}
              onPointerMove={updateImagePointer}
              onPointerLeave={() => setIsImageHovered(false)}
              className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-[#f8f6ef] ${isImageHovered && zoom > 1 ? "cursor-zoom-in" : ""}`}
            >
              {images.length ? (
                <img
                  src={assetUrl(selectedImage)}
                  alt={product.name}
                  className="h-full w-full object-cover transition-none"
                  style={{
                    transform: `scale(${isImageHovered ? zoom : 1})`,
                    transformOrigin: `${imagePointer.x * 100}% ${imagePointer.y * 100}%`
                  }}
                />
              ) : (
                <div className="text-center text-sm text-[#887c69]">
                  <FaGem className="mx-auto mb-3 text-4xl text-[#bd913e]" />
                  Product image unavailable
                </div>
              )}
              {selectedImage && (
                <>
                  <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-full border border-white/80 bg-white/95 p-1 text-sm font-semibold text-[#34443e] shadow-md">
                    <button
                      type="button"
                      onClick={() => setZoom((current) => Math.max(1, current - 0.5))}
                      disabled={zoom <= 1}
                      aria-label="Decrease image zoom"
                      className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-[#f4f0e7] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span aria-hidden="true">−</span>
                    </button>
                    <span className="min-w-10 text-center text-xs">{zoom}x</span>
                    <button
                      type="button"
                      onClick={() => setZoom((current) => Math.min(4, current + 0.5))}
                      disabled={zoom >= 4}
                      aria-label="Increase image zoom"
                      className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-[#f4f0e7] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span aria-hidden="true">+</span>
                    </button>
                  </div>
                </>
              )}
              {(product.best_seller || product.featured) && (
                <span className="absolute left-3 top-3 rounded-full bg-[#f4c84a] px-3 py-1.5 text-xs font-bold text-[#4e390f]">
                  {product.best_seller ? "Bestseller" : "Featured"}
                </span>
              )}
              <button
                type="button"
                onClick={() => toggleWishlist(product, currentVariant, activeSize)}
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                aria-pressed={isFavorite}
                className={`absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/95 shadow transition hover:text-rose-600 ${isFavorite ? "text-rose-600" : "text-[#40514a]"}`}
              >
                <FaHeart className={isFavorite ? "text-lg" : "text-lg"} />
              </button>
              {images.length > 1 && (
                <>
                  <button type="button" aria-label="Previous product image" onClick={() => setActiveImage((activeImage + images.length - 1) % images.length)} className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-[#174a38] shadow transition hover:bg-white">
                    <FaChevronLeft />
                  </button>
                  <button type="button" aria-label="Next product image" onClick={() => setActiveImage((activeImage + 1) % images.length)} className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-[#174a38] shadow transition hover:bg-white">
                    <FaChevronRight />
                  </button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-2 grid grid-cols-5 gap-2">
                {images.slice(0, 5).map((image, index) => (
                  <button key={`${image}-${index}`} type="button" onClick={() => setActiveImage(index)} aria-label={`View product image ${index + 1}`} aria-pressed={activeImage === index} className={`aspect-square overflow-hidden rounded-lg border-2 bg-white transition ${activeImage === index ? "border-[#1c765d]" : "border-transparent hover:border-[#d8b46c]"}`}>
                    <img src={assetUrl(image)} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="flex min-w-0 flex-col rounded-2xl border border-[#eee8dc] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-md bg-[#f5f3f5] px-2 py-1 text-[11px] font-semibold text-[#6c6571]">PRODUCT ID: #{product.product_code || product.id}</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${inStock ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}>
                <span className="h-2 w-2 rounded-full bg-current" />{inStock ? "In Stock" : "Out of Stock"}
              </span>
            </div>
            <h1 className="mt-3 font-serif text-2xl font-bold leading-tight text-[#173f38] sm:text-3xl">{product.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64716b]">
              {Number(product.rating) > 0 ? (
                <span className="inline-flex items-center gap-1 font-semibold text-[#394741]">
                  <FaStar className="text-[#f5a900]" /> {Number(product.rating).toFixed(1)}
                  {Number(product.total_reviews) > 0 && <span>({product.total_reviews} reviews)</span>}
                </span>
              ) : <span className="text-[#78817c]">No ratings yet</span>}
              {product.total_stock != null && <span>{Number(product.total_stock)} available</span>}
            </div>

            {(product.description || product.full_description) && (
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#59645e]">{product.description || product.full_description}</p>
            )}

            <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-3xl font-extrabold text-[#c12b19] sm:text-4xl">{money(product.final_selling_price ?? offerPrice)}</span>
              {mrp > offerPrice && <span className="text-sm text-[#858b87] line-through">{money(mrp)}</span>}
              {discount > 0 && <span className="rounded-full bg-[#fff0ee] px-3 py-1 text-xs font-bold text-[#d33627]">{discount}% OFF</span>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#737d77]">
              {product.purity && <span>{product.metal_type || "Gold"} ({product.purity})</span>}
              {product.gross_weight != null && <><span>|</span><span>Weight: {product.gross_weight} g</span></>}
              {product.making_charge != null && <><span>|</span><span>Making Charges: {Number(product.making_charge) === 0 ? "Included" : "Available"}</span></>}
            </div>
            <p className="mt-1 text-xs text-[#887c69]">Inclusive of applicable taxes</p>

            {variants.length > 0 && (
              <div className="mt-4 space-y-3">
                <div>
                  <p className="mb-2 text-xs font-semibold text-[#59645e]">Choose option</p>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((variant, index) => (
                      <button key={`${variant.colorName || variant.color || index}`} type="button" onClick={() => { setActiveVariantIndex(index); setActiveImage(0); }} aria-pressed={activeVariantIndex === index} className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${activeVariantIndex === index ? "border-[#174a38] bg-[#edf5ef] text-[#174a38]" : "border-[#e8e1d5] text-[#5d675f] hover:border-[#bd913e]"}`}>
                        {variant.colorName || variant.color || `Option ${index + 1}`}
                      </button>
                    ))}
                  </div>
                </div>
                {availableVariantSizes.length > 0 && (
                  <label className="block max-w-xs text-xs font-semibold text-[#59645e]">
                    Size
                    <select value={activeSize} onChange={(event) => setSelectedSize(event.target.value)} className="mt-1.5 block w-full rounded-lg border border-[#e8e1d5] bg-white px-3 py-2.5 text-sm font-medium text-[#34443e] outline-none focus:border-[#174a38]">
                      {availableVariantSizes.map((size) => <option key={size} value={size}>{size}</option>)}
                    </select>
                  </label>
                )}
              </div>
            )}

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {/* <button type="button" disabled={!inStock} onClick={() => addToCart(product, currentVariant, activeSize)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#174a3f] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#10382f] disabled:cursor-not-allowed disabled:bg-slate-300">
                <FaShoppingBag /> {inStock ? "Add to Cart" : "Out of Stock"}
              </button> */}
              <button type="button" onClick={() => toggleWishlist(product, currentVariant, activeSize)} className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition ${isFavorite ? "border-rose-200 bg-rose-50 text-rose-700" : "border-[#e8e1d5] text-[#40514a] hover:bg-[#fbfaf7]"}`}>
                <FaHeart /> {isFavorite ? "Saved to Wishlist" : "Add to Wishlist"}
              </button>
            </div>

            {highlights.length > 0 && (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {highlights.map((highlight, index) => (
                  <li key={`${displayValue(highlight)}-${index}`} className="flex items-start gap-2 text-xs text-[#514638]">
                    <FaCheckCircle className="mt-0.5 shrink-0 text-[#174a38]" />
                    <span>{displayValue(highlight)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <nav aria-label="Product details sections" className="hide-scrollbar mt-4 overflow-x-auto rounded-xl border border-[#eee8dc] bg-white shadow-sm">
          <div className="flex min-w-max">
            {tabs.map(([tabId, label]) => (
              <button key={tabId} type="button" onClick={() => setActiveTab(tabId)} aria-current={activeTab === tabId ? "page" : undefined} className={`border-b-2 px-4 py-3.5 text-xs font-semibold transition sm:px-5 ${activeTab === tabId ? "border-[#174a3f] bg-[#174a3f] text-white" : "border-transparent text-[#66726c] hover:bg-[#faf9f5] hover:text-[#174a3f]"}`}>
                {label}
              </button>
            ))}
          </div>
        </nav>

        <div className="mt-3">
          {activeTab === "information" && (
            <div className="grid items-start gap-3 lg:grid-cols-[1.35fr_0.9fr_0.9fr]">
              <DetailGroup title="Basic Information" entries={productDetails} />
              <DetailGroup title="Pricing Information" entries={[
                ["Gold Rate", product.gold_rate_per_gram != null ? `${money(product.gold_rate_per_gram)} / g` : ""],
                ["Product Weight", product.gross_weight != null ? `${product.gross_weight} g` : ""],
                ["Gold Amount", product.net_gold_weight != null && product.gold_rate_per_gram != null
                  ? money(Number(product.net_gold_weight) * Number(product.gold_rate_per_gram))
                  : ""],
                ["Making Charges", pricingDetails.find(([label]) => label === "Making charge")?.[1]],
                ["Wastage", pricingDetails.find(([label]) => label === "Wastage")?.[1]],
                ["Offer Price", money(offerPrice)],
                ["Discount", discount ? `${discount}%` : ""],
                ["Final Price", money(product.final_selling_price ?? offerPrice)]
              ]} />
              <DetailGroup title="Additional Details" entries={[
                ["Brand", product.brand],
                ["Collection", product.category],
                ["Product Type", product.product_type],
                ["Metal", product.metal_type],
                ["Purity", product.purity],
                ["Care", product.care_instructions]
              ]} />
            </div>
          )}

          {activeTab === "pricing" && (
            <div className="grid items-start gap-3 lg:grid-cols-2">
              <DetailGroup title="Pricing & Charges" entries={pricingDetails} />
              <DetailGroup title="Stock Information" entries={[
                ["Stock Status", inStock ? "In Stock" : "Out of Stock"],
                ["Available Quantity", product.total_stock],
                ["Selected Option Stock", selectedVariantStock],
                ["SKU", product.product_code],
                ["Price Includes GST", product.price_includes_gst]
              ]} />
            </div>
          )}

          {activeTab === "images" && (
            <section className="rounded-xl border border-[#eee8dc] bg-white p-4 shadow-sm">
              <h2 className="mb-4 font-serif text-lg font-bold text-[#174a38]">Product Images</h2>
              {images.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {images.map((image, index) => (
                    <button key={`${image}-${index}`} type="button" onClick={() => { setActiveImage(index); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="aspect-square overflow-hidden rounded-lg border border-[#eee8dc] bg-[#f8f6ef]">
                      <img src={assetUrl(image)} alt={`${product.name} image ${index + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : <p className="text-sm text-[#746b5d]">Product images are not available.</p>}
            </section>
          )}

          {activeTab === "variants" && (
            <div className="grid items-start gap-3 lg:grid-cols-2">
              <DetailGroup title="Material & Measurements" entries={materialDetails} />
              <DetailGroup title="Available Options" entries={[
                ["Available colors", [...new Set(variants.map((variant) => variant.colorName || variant.color).filter(Boolean))]],
                ["Available sizes", [...new Set(variants.flatMap((variant) => [
                  ...parseArray(variant.selectedSizes),
                  ...parseArray(variant.available_sizes)
                ]))]],
                ["Selected color", currentVariant?.colorName || currentVariant?.color],
                ["Selected size", activeSize]
              ]} />
            </div>
          )}

          {activeTab === "specifications" && (
            <div className="grid items-start gap-3 lg:grid-cols-2">
              <DetailGroup title="Sizes & Measurements" entries={sizeDetails} />
              <DetailGroup title="Specifications" entries={specsEntries} />
            </div>
          )}

          {activeTab === "additional" && (
            <div className="grid items-start gap-3 lg:grid-cols-2">
              <DetailGroup title="Additional Details" entries={additionalDetails} />
              <DetailGroup title="Description" entries={[
                ["Description", product.description],
                ["Full description", product.full_description],
                ["Highlights", highlights]
              ]} />
              {(sizeGuide || certificate) && (
                <section className="rounded-xl border border-[#eee8dc] bg-white p-4 shadow-sm">
                  <h2 className="mb-3 font-serif text-lg font-bold text-[#174a38]">Product Documents</h2>
                  <div className="flex flex-wrap gap-3">
                    {sizeGuide && <a href={sizeGuide} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#174a38] hover:underline">View size guide</a>}
                    {certificate && <a href={certificate} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#174a38] hover:underline">View certificate</a>}
                  </div>
                </section>
              )}
              {video && (
                <section className="rounded-xl border border-[#eee8dc] bg-white p-4 shadow-sm">
                  <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-bold text-[#174a38]"><FaPlayCircle /> Product Video</h2>
                  <video src={video} controls preload="metadata" className="max-h-96 w-full rounded-xl bg-black" />
                </section>
              )}
            </div>
          )}

          {activeTab === "reviews" && (
            <DetailGroup title="Customer Reviews" entries={[
              ["Average Rating", Number(product.rating) > 0 ? `${Number(product.rating).toFixed(1)} / 5` : "No ratings yet"],
              ["Total Reviews", product.total_reviews ?? 0]
            ]} />
          )}
        </div>
      </PageContainer>

      {/* Metal Products — same metal type (e.g. Gold) */}
      <MetalProducts
        currentProductId={productId}
        metalType={product.metal_type}
      />

      {/* Category Products — same category (e.g. Chain) */}
      <CategoryProducts
        currentProductId={productId}
        category={product.category}
      />
    </main>
  );
};

export default ProductDetail;
