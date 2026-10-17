import React from "react";
import { FaHeart } from "react-icons/fa";
import { getProductImageUrl } from "./productDisplay";

const formatPrice = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const ProductCard = ({ product }) => {
  const mrp = Number(product.mrp || 0);
  const offerPrice = Number(
    product.offer_price ?? product.final_selling_price ?? product.mrp ?? 0
  );
  const details = [
    ["Metal", product.metal_type],
    ["Purity", product.purity],
    ["Weight", product.gross_weight ? `${Number(product.gross_weight)} g` : null],
    ["Category", product.category],
    ["Type", product.product_type],
  ].filter(([, value]) => value);

  return (
    <article className="group h-full overflow-hidden rounded-xl border border-[#eadfce] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#d8b46c] hover:shadow-lg">
      <div className="relative aspect-[1.12/1] overflow-hidden bg-[#f6efe4]">
        <img
          src={getProductImageUrl(product)}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-2 top-2 max-w-[70%] truncate rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#765323] shadow-sm">
          {product.category || "Jewelry"}
        </span>
        <button
          type="button"
          aria-label={`Add ${product.name} to favorites`}
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#81513b] shadow-md transition-colors hover:bg-[#fff0e8] hover:text-red-600"
        >
          <FaHeart size={15} />
        </button>
      </div>

      <div className="flex h-[190px] flex-col p-3 sm:p-4">
        <h3 className="line-clamp-2 min-h-10 font-serif text-sm font-semibold leading-5 text-[#292018] sm:text-base">
          {product.name}
        </h3>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-lg font-bold text-[#9c3218] sm:text-xl">
            {formatPrice(offerPrice)}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-[#8a8177]">
            Offer price
          </span>
        </div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className={`text-xs ${mrp > offerPrice ? "text-gray-400 line-through" : "text-gray-600"}`}>
            {formatPrice(mrp)}
          </span>
          <span className="text-[10px] text-gray-400">MRP</span>
          {mrp > offerPrice && (
            <span className="text-[10px] font-semibold text-emerald-700">
              Save {formatPrice(mrp - offerPrice)}
            </span>
          )}
        </div>

        <dl className="mt-auto grid grid-cols-2 gap-x-2 gap-y-1.5 border-t border-[#f1e8da] pt-2.5 text-[10px] sm:text-[11px]">
          {details.map(([label, value]) => (
            <div key={label} className="flex min-w-0 gap-1">
              <dt className="shrink-0 text-[#91877b]">{label}:</dt>
              <dd className="truncate font-semibold text-[#514638]" title={String(value)}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
};

export default ProductCard;
