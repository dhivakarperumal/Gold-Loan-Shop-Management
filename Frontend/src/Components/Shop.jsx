import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiHeart, FiShoppingBag } from "react-icons/fi";
import api from "../api";
import { StoreContext } from "../PrivateRouter/StoreContext";
import { getProductImageUrl } from "./Home/productDisplay";

const Shop = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const { addToCart, toggleWishlist, wishlist } = useContext(StoreContext);
  const metalFilter = searchParams.get("metal")?.trim().toLowerCase() || "";

  useEffect(() => {
    const controller = new AbortController();

    api.get("/products", {
      params: { page: 1, limit: 100, status: "Active" },
      signal: controller.signal,
    }).then(({ data }) => {
      if (!Array.isArray(data?.products)) {
        throw new TypeError("The products response must contain a products array");
      }
      setProducts(data.products.filter((product) => !product.status || product.status === "Active"));
      setError("");
    }).catch((fetchError) => {
      if (controller.signal.aborted) return;
      console.error("Failed to load shop products:", fetchError);
      setError("Products could not be loaded. Please try again.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => controller.abort();
  }, []);

  const visibleProducts = useMemo(() => products.filter((product) => {
    const fields = [product.name, product.category, product.subcategory, product.metal_type, product.purity];
    const matchesMetal = !metalFilter || fields.some((value) =>
      String(value || "").toLowerCase().includes(metalFilter)
    );
    const matchesSearch = !search.trim() || fields.some((value) =>
      String(value || "").toLowerCase().includes(search.trim().toLowerCase())
    );
    return matchesMetal && matchesSearch;
  }), [metalFilter, products, search]);

  return (
    <main className="mx-auto min-h-[60vh] max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-[#eadfce] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a77525]">Our collection</p>
          <h1 className="mt-2 font-serif text-3xl font-bold text-[#174a38] sm:text-4xl">Shop Jewellery</h1>
          {metalFilter && <p className="mt-2 text-sm text-[#746b5d]">Showing: {searchParams.get("metal")}</p>}
        </div>
        <label className="w-full sm:max-w-xs">
          <span className="sr-only">Search products</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search jewellery..."
            className="w-full rounded-lg border border-[#dfd2bd] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#a77525]"
          />
        </label>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-[#746b5d]" role="status">Loading products...</p>
      ) : error ? (
        <p className="py-16 text-center text-sm text-red-700" role="alert">{error}</p>
      ) : visibleProducts.length === 0 ? (
        <p className="py-16 text-center text-sm text-[#746b5d]">No matching products were found.</p>
      ) : (
        <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visibleProducts.map((product) => {
            const productId = product.id ?? product.product_id;
            const price = Number(product.offer_price ?? product.final_selling_price ?? product.mrp ?? 0);
            const saved = wishlist.some((item) => String(item.product_id) === String(productId));
            return (
              <article key={productId} className="overflow-hidden rounded-xl border border-[#eadfce] bg-white shadow-sm">
                <div className="relative aspect-square bg-[#f6efe4]">
                  <Link to={`/product/${productId}`} aria-label={`View ${product.name}`}>
                    <img
                      src={getProductImageUrl(product)}
                      alt={product.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggleWishlist(product)}
                    aria-label={`${saved ? "Remove" : "Add"} ${product.name} ${saved ? "from" : "to"} favorites`}
                    className={`absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow ${saved ? "text-red-600" : "text-[#81513b]"}`}
                  >
                    <FiHeart />
                  </button>
                </div>
                <div className="p-3 sm:p-4">
                  <Link to={`/product/${productId}`} className="line-clamp-2 min-h-10 font-serif text-sm font-semibold text-[#292018] hover:text-[#174a38]">
                    {product.name}
                  </Link>
                  <p className="mt-2 font-semibold text-[#9c3218]">₹{price.toLocaleString("en-IN")}</p>
                  <button
                    type="button"
                    onClick={() => addToCart(product)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#174a38] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#10382b] sm:text-sm"
                  >
                    <FiShoppingBag />
                    Add to cart
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
};

export default Shop;
