import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, CircleCheck, CircleX, Heart, Star, Weight } from "lucide-react";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import { getProductImageUrl } from "./productDisplay";
import { formatCurrency } from "../../utils/currency";

const formatPrice = formatCurrency;

const ProductCard = ({ product }) => {
  const { wishlist, toggleWishlist } = useContext(StoreContext);
  const productId = product.id ?? product.product_id ?? product.productId;
  const isFavorite = wishlist.some(
    (item) => String(item.product_id ?? item.productId ?? item.id) === String(productId)
  );
  const mrp = Number(product.mrp || 0);
  const offerPrice = Number(
    product.offer_price ?? product.final_selling_price ?? product.mrp ?? 0
  );
  const discount = mrp > offerPrice
    ? Number(product.discount) > 0
      ? Number(product.discount)
      : Math.round(((mrp - offerPrice) / mrp) * 100)
    : 0;
  const weight = product.gross_weight != null && product.gross_weight !== ""
    ? `${Number(product.gross_weight)} g`
    : "-";
  const purity = product.purity || "-";
  const rating = Number(product.rating) || 0;
  const totalReviews = Number(product.total_reviews) || 0;
  const inStock = Number(product.total_stock ?? product.stock ?? 0) > 0;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[14px] border border-[#eadfce] bg-white shadow-sm transition-all duration-300 hover:border-[#d8b46c] hover:shadow-lg">
      <div className="relative aspect-[1.1/1] shrink-0 overflow-hidden bg-[#f6efe4]">
        <Link
          to={`/product/${productId}`}
          aria-label={`View ${product.name} details`}
          className="block h-full w-full"
        >
          <img
            src={getProductImageUrl(product)}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>
        <span className="absolute left-2.5 top-2.5 max-w-[70%] truncate rounded-full bg-white/95 px-3 py-1 text-[9px] font-bold uppercase tracking-wide text-[#765323] shadow-sm sm:text-[10px]">
          {product.category || "Jewelry"}
        </span>
        <button
          type="button"
          aria-label={`${isFavorite ? "Remove" : "Add"} ${product.name} ${isFavorite ? "from" : "to"} favorites`}
          aria-pressed={isFavorite}
          onClick={() => toggleWishlist(product)}
          className={`absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-sm transition-colors hover:bg-[#fff0e8] hover:text-red-600 sm:h-9 sm:w-9 ${isFavorite ? "text-red-600" : "text-[#34433f]"}`}
        >
          <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="relative z-10 -mt-3 flex min-h-[76px] flex-1 flex-col rounded-t-[14px] bg-white px-3 pb-2.5 pt-2 sm:px-4 sm:pb-3">
        <h3 className="line-clamp-1 font-serif text-[13px] font-semibold leading-5 text-[#292018] transition-colors hover:text-[#174a38] sm:text-sm">
          <Link to={`/product/${productId}`} aria-label={`View ${product.name} details`}>
            {product.name}
          </Link>
        </h3>

        <div className="mt-1 flex items-center justify-between gap-2">
          <div
            className="flex min-w-0 items-center gap-1 text-[10px] text-[#716b60] sm:text-[11px]"
            aria-label={rating > 0 ? `Rated ${rating.toFixed(1)} out of 5` : "No ratings yet"}
          >
            <Star
              size={13}
              className="shrink-0 text-[#d49a19]"
              fill={rating > 0 ? "currentColor" : "none"}
              aria-hidden="true"
            />
            {rating > 0 ? (
              <>
                <span className="font-semibold text-[#514638]">{rating.toFixed(1)}</span>
                {totalReviews > 0 && <span>({totalReviews})</span>}
              </>
            ) : (
              <span>No ratings</span>
            )}
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold leading-none sm:text-[10px] ${
              inStock ? "bg-[#e8f4ed] text-[#167347]" : "bg-[#fbe9e7] text-[#b42318]"
            }`}
          >
            {inStock
              ? <CircleCheck size={11} aria-hidden="true" />
              : <CircleX size={11} aria-hidden="true" />}
            {inStock ? "In Stock" : "Out of Stock"}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-base font-bold leading-5 text-[#c51e18] sm:text-lg">
            {formatPrice(offerPrice)}
          </span>
          {mrp > offerPrice && (
            <>
              <span className="text-xs text-[#92979a] line-through">
                {formatPrice(mrp)}
              </span>
              <span className="rounded-md bg-[#087452] px-2 py-1 text-[10px] font-bold leading-none text-white sm:text-[11px]">
                {discount}% OFF
              </span>
            </>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 border-t border-[#e8e7e3] bg-[#f2f1ee] px-3 py-2 text-[9px] sm:px-4 sm:text-[10px]">
        <div className="flex min-w-0 items-center gap-2 border-r border-[#deddd8] pr-2">
          <Weight size={16} className="shrink-0 text-[#9b742e]" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="leading-3 text-[#77766f]">Weight</dt>
            <dd className="truncate font-semibold leading-4 text-[#3f403c]" title={weight}>
              {weight}
            </dd>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2 pl-2">
          <BadgeCheck size={16} className="shrink-0 text-[#9b742e]" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="leading-3 text-[#77766f]">Purity</dt>
            <dd className="truncate font-semibold leading-4 text-[#3f403c]" title={String(purity)}>
              {purity}
            </dd>
          </div>
        </div>
      </dl>
    </article>
  );
};

export default ProductCard;