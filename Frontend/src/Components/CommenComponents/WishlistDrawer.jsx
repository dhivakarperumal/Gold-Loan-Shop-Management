import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiTrash2, FiShoppingBag } from "react-icons/fi";
import { FaHeart, FaStar } from "react-icons/fa";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import api from "../../api";

const resolveImageUrl = (image) => {
  if (image && typeof image === "object") {
    return resolveImageUrl(image.url || image.path || image.src);
  }
  if (!image || typeof image !== "string" || /^(https?:|data:|blob:)/i.test(image)) return image;
  const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
  return `${backendUrl}${image.startsWith("/") ? image : `/${image}`}`;
};

const productImages = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [value];
  }
};

const getProductImage = (product) => {
  const variantImage = productImages(product?.variants)
    .flatMap((variant) => productImages(variant?.images))[0];
  return resolveImageUrl(variantImage || productImages(product?.images)[0]);
};

const StarRating = ({ rating = 0, count = 0 }) => {
  const stars = Math.round(rating);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <FaStar
          key={s}
          size={10}
          className={s <= stars ? "text-yellow-400" : "text-gray-300"}
        />
      ))}
      <span className="ml-0.5 text-[10px] text-gray-400">({count})</span>
    </div>
  );
};

const WishlistDrawer = ({ isOpen, onClose }) => {
  const { wishlist, loadingWishlist, toggleWishlist } = useContext(StoreContext);
  const navigate = useNavigate();
  const [loadedProductDetails, setLoadedProductDetails] = useState({ key: "", details: {} });
  const wishlistProductIds = [...new Set(
    wishlist
      .map((item) => item.product_id ?? item.productId ?? item.id)
      .filter((id) => id != null)
      .map(String)
  )];
  const wishlistProductIdsKey = wishlistProductIds.join(",");
  const productDetails = loadedProductDetails.key === wishlistProductIdsKey
    ? loadedProductDetails.details
    : {};
  const loadingProductDetails = isOpen
    && wishlistProductIdsKey.length > 0
    && loadedProductDetails.key !== wishlistProductIdsKey;

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    const productIds = wishlistProductIdsKey ? wishlistProductIdsKey.split(",") : [];
    if (!isOpen || productIds.length === 0) return undefined;

    let active = true;

    Promise.all(productIds.map(async (productId) => {
      try {
        const { data } = await api.get(`/products/${productId}`);
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          throw new Error("The server returned invalid product details.");
        }
        return [productId, { product: data }];
      } catch (error) {
        console.error(`Failed to load wishlist product ${productId}:`, error);
        return [productId, {
          error: error.response?.data?.message || error.message || "Could not load product details."
        }];
      }
    })).then((entries) => {
      if (active) {
        setLoadedProductDetails({
          key: wishlistProductIdsKey,
          details: Object.fromEntries(entries)
        });
      }
    });

    return () => { active = false; };
  }, [isOpen, wishlistProductIdsKey]);

  const goTo = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <div
      className={`fixed inset-0 z-[60] overflow-hidden transition-opacity duration-300 ${
        isOpen ? "visible opacity-100" : "invisible opacity-0"
      }`}
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close favorites"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/50"
      />

      {/* Drawer Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="My Wishlist"
        className={`absolute right-0 top-0 flex h-full w-full max-w-sm flex-col shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ background: "#F7F3EE" }}
      >
        {/* ── Header ── */}
        <div
          className="relative flex items-center justify-between px-5 py-5"
          style={{
            background: "linear-gradient(135deg, #003D2E 0%, #004D40 60%, #1a5c42 100%)",
          }}
        >
          {/* Gold decorative divider top */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[2px]"
            style={{
              background:
                "linear-gradient(90deg, transparent, #D4A017 30%, #F5C45E 50%, #D4A017 70%, transparent)",
            }}
          />

          <div className="flex items-center gap-3">
            {/* Heart icon in gold circle */}
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{
                background: "linear-gradient(135deg, #D4A017, #F5C45E)",
                boxShadow: "0 2px 8px rgba(212,160,23,0.5)",
              }}
            >
              <FaHeart size={18} color="#003D2E" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">My Wishlist</h2>
              <p className="text-xs" style={{ color: "#F5C45E" }}>
                Your favourite jewellery, always close.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close wishlist"
            className="flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/20"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* ── Items Saved Badge ── */}
        {wishlist.length > 0 && !loadingWishlist && (
          <div className="flex justify-center py-3">
            <span
              className="rounded-full px-5 py-1 text-xs font-bold uppercase tracking-widest text-white"
              style={{
                background: "linear-gradient(90deg, #004D40, #0F766E)",
                letterSpacing: "0.12em",
              }}
            >
              {wishlist.length} {wishlist.length === 1 ? "item" : "items"} saved
            </span>
          </div>
        )}

        {/* ── Gold ornament divider ── */}
        {wishlist.length > 0 && !loadingWishlist && (
          <div className="flex items-center justify-center gap-2 pb-1">
            <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, transparent, #D4A017)" }} />
            <span style={{ color: "#D4A017", fontSize: "12px" }}>✦</span>
            <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, #D4A017, transparent)" }} />
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loadingWishlist || loadingProductDetails ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <div
                className="h-10 w-10 animate-spin rounded-full border-[3px] border-t-transparent"
                style={{ borderColor: "#004D40", borderTopColor: "transparent" }}
              />
              <p className="text-sm text-gray-500">Loading your collection...</p>
            </div>
          ) : wishlist.length === 0 ? (
            /* ── Empty State ── */
            <div className="flex h-full flex-col items-center justify-center text-center px-4">
              <div
                className="mb-5 flex h-20 w-20 items-center justify-center rounded-full"
                style={{ background: "rgba(0,77,64,0.08)" }}
              >
                <FaHeart size={36} style={{ color: "#004D40", opacity: 0.4 }} />
              </div>
              <h3 className="text-lg font-bold text-gray-700">No favourites yet</h3>
              <p className="mt-2 text-sm text-gray-500 max-w-[200px]">
                Save your favourite jewellery here to find it easily.
              </p>
              <button
                type="button"
                onClick={() => goTo("/explore")}
                className="mt-6 rounded-full px-8 py-3 text-sm font-bold text-white shadow transition hover:opacity-90 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #004D40, #0F766E)",
                }}
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            /* ── Wishlist Items ── */
            <div className="space-y-3">
              {wishlist.map((item) => {
                const productId = item.product_id ?? item.productId ?? item.id;
                const result = productDetails[String(productId)];
                const product = result?.product;
                const name = product?.name || result?.error || "Product details unavailable";
                const weight = product?.net_gold_weight || product?.gross_weight;
                const mrp = Number(product?.mrp) || 0;
                const offerPrice = Number(product?.offer_price) > 0
                  ? Number(product.offer_price)
                  : Number(product?.final_selling_price) > 0
                    ? Number(product.final_selling_price)
                    : mrp;
                const discount = mrp > offerPrice
                  ? Number(product?.discount) > 0
                    ? Number(product.discount)
                    : Math.round(((mrp - offerPrice) / mrp) * 100)
                  : 0;
                const totalReviews = Number(product?.total_reviews) || 0;

                return (
                  <div
                    key={item.id || item.product_id}
                    className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm"
                    style={{ border: "1px solid rgba(212,160,23,0.15)" }}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={
                          getProductImage(product) ||
                          "https://ui-avatars.com/api/?name=Jewel&background=f3f4f6&color=004D40"
                        }
                        alt={product?.name || "Product"}
                        className="h-[90px] w-[75px] rounded-xl object-cover"
                        style={{ border: "1.5px solid rgba(212,160,23,0.2)" }}
                      />
                    </div>

                    <div className="min-w-0 flex-1 py-0.5">
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="text-sm font-bold leading-snug text-gray-800 line-clamp-2">
                          {name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => toggleWishlist(item)}
                          aria-label={`Remove ${product?.name || "item"}`}
                          className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-red-400 transition hover:bg-red-50 hover:text-red-500"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>

                      {product && (product.metal_type || weight != null) && (
                        <p className="mt-0.5 text-[11px] font-medium" style={{ color: "#004D40" }}>
                          {product.metal_type || product.category}
                          {weight != null ? ` · ${weight}g` : ""}
                        </p>
                      )}

                      {product && (
                        <>
                          {totalReviews > 0 && <div className="mt-1">
                            <StarRating
                              rating={Number(product.rating) || 0}
                              count={totalReviews}
                            />
                          </div>}
                          {offerPrice > 0 && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                              <p className="text-sm font-bold" style={{ color: "#004D40" }}>
                                ₹{offerPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </p>
                              {discount > 0 && (
                                <>
                                  <p className="text-xs text-gray-400 line-through">
                                    ₹{mrp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  </p>
                                  <span className="rounded bg-[#087452] px-1.5 py-0.5 text-[10px] font-bold text-white">
                                    {discount}% OFF
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer Actions (only when items exist) ── */}
        {wishlist.length > 0 && !loadingWishlist && !loadingProductDetails && (
          <div className="shrink-0 border-t bg-white px-4 py-4 space-y-2.5" style={{ borderColor: "rgba(212,160,23,0.2)" }}>
            {/* Gold ornamental divider */}
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, transparent, #D4A017)" }} />
              <span style={{ color: "#D4A017", fontSize: "10px" }}>✦</span>
              <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, #D4A017, transparent)" }} />
            </div>

            {/* Continue Shopping — primary */}
            <button
              type="button"
              onClick={() => goTo("/explore")}
              className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-white shadow transition hover:opacity-90 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #004D40 0%, #0F766E 100%)",
              }}
            >
              <FiShoppingBag size={16} />
              Continue Shopping
            </button>

            
          </div>
        )}
      </aside>
    </div>
  );
};

export default WishlistDrawer;