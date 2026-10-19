import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FaArrowRight,
  FaAward,
  FaCheckCircle,
  FaChevronDown,
  FaGem,
  FaLock,
  FaSearch,
  FaSlidersH,
  FaTimes,
} from "react-icons/fa";
import api from "../../api";
import ProductCard from "../Home/ProductCard";

const PAGE_SIZE = 100;
const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "name", label: "Name: A to Z" },
];
const QUICK_FILTERS = ["10", "20", "30", "40"];
const RATINGS = [4, 3, 2, 1];

const getProductPrice = (product) =>
  Number(product.offer_price ?? product.final_selling_price ?? product.mrp ?? 0);

const getDiscount = (product) => {
  const mrp = Number(product.mrp || 0);
  if (Number(product.discount) > 0) return Number(product.discount);
  return mrp > 0 ? Math.max(0, Math.round(((mrp - getProductPrice(product)) / mrp) * 100)) : 0;
};

const productIsInStock = (product) =>
  Number(product.total_stock ?? product.stock ?? 0) > 0;

const toggleValue = (values, value) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

const Explore = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [metals, setMetals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [openFilters, setOpenFilters] = useState({
    category: true,
    metal: true,
    offer: true,
    price: true,
    rating: true,
    availability: true,
  });
  const [offerThreshold, setOfferThreshold] = useState(0);
  const [minimumPrice, setMinimumPrice] = useState("");
  const [maximumPrice, setMaximumPrice] = useState("");
  const [minimumRating, setMinimumRating] = useState(0);
  const [availability, setAvailability] = useState("");
  const searchQuery = searchParams.get("search")?.trim() || "";
  const selectedCategories = searchParams.getAll("category");
  const selectedMetals = searchParams.getAll("metal");
  const subcategoryFilter = searchParams.get("subcategory")?.trim().toLowerCase() || "";

  useEffect(() => {
    const controller = new AbortController();

    const loadProducts = async () => {
      try {
        setLoading(true);
        setError("");
        const firstResponse = await api.get("/products", {
          params: { page: 1, limit: PAGE_SIZE, search: "", status: "Active" },
          signal: controller.signal,
        });
        if (!Array.isArray(firstResponse.data?.products)) {
          throw new TypeError("The products response must contain a products array");
        }

        const totalPages = Math.max(1, Number(firstResponse.data.pagination?.totalPages) || 1);
        const additionalResponses = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            api.get("/products", {
              params: { page: index + 2, limit: PAGE_SIZE, search: "", status: "Active" },
              signal: controller.signal,
            })
          )
        );
        const allResponses = [firstResponse, ...additionalResponses];
        const allProducts = allResponses.flatMap((response) => {
          if (!Array.isArray(response.data?.products)) {
            throw new TypeError("A products page did not contain a products array");
          }
          return response.data.products;
        });
        setProducts(allProducts);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          console.error("Failed to fetch explore products:", loadError);
          setError("Products could not be loaded. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    const loadFacets = async () => {
      const [categoryResult, metalResult] = await Promise.allSettled([
        api.get("/categories", { signal: controller.signal }),
        api.get("/metals", { signal: controller.signal }),
      ]);

      if (controller.signal.aborted) return;
      if (categoryResult.status === "fulfilled" && Array.isArray(categoryResult.value.data)) {
        setCategories(categoryResult.value.data.filter(
          (category) => (category.status || "Active") === "Active"
        ));
      } else if (categoryResult.status === "rejected" && !controller.signal.aborted) {
        console.error("Failed to load explore categories:", categoryResult.reason);
      }

      if (metalResult.status === "fulfilled" && Array.isArray(metalResult.value.data)) {
        setMetals(metalResult.value.data.filter((metal) => metal.status === "Active"));
      } else if (metalResult.status === "rejected" && !controller.signal.aborted) {
        console.error("Failed to load explore metals:", metalResult.reason);
      }
    };

    loadProducts();
    loadFacets();
    return () => controller.abort();
  }, []);

  const availableCategories = useMemo(() => {
    const productCategories = [...new Set(products.map((product) => product.category).filter(Boolean))];
    return categories.length
      ? categories.filter((category) => productCategories.includes(category.name))
      : productCategories.map((name) => ({ name }));
  }, [categories, products]);

  const availableMetals = useMemo(() => {
    const productMetals = [...new Set(products.map((product) => product.metal_type).filter(Boolean))];
    return metals.length
      ? metals.filter((metal) => productMetals.some((name) => name.toLowerCase() === metal.name.toLowerCase()))
      : productMetals.map((name) => ({ name }));
  }, [metals, products]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase();
    const result = products.filter((product) => {
      const matchesSearch = !normalizedQuery || [
        product.name,
        product.product_code,
        product.category,
        product.subcategory,
        product.metal_type,
        product.product_type,
        product.brand,
      ].some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
      const matchesCategory = !selectedCategories.length || selectedCategories.some(
        (category) => category.toLowerCase() === String(product.category || "").trim().toLowerCase()
      );
      const matchesSubcategory = !subcategoryFilter
        || subcategoryFilter === String(product.subcategory || "").trim().toLowerCase();
      const matchesMetal = !selectedMetals.length || selectedMetals.some(
        (metal) => metal.toLowerCase() === String(product.metal_type || "").trim().toLowerCase()
      );
      const matchesOffer = !offerThreshold || getDiscount(product) >= offerThreshold;
      const price = getProductPrice(product);
      const matchesMinPrice = minimumPrice === "" || price >= Number(minimumPrice);
      const matchesMaxPrice = maximumPrice === "" || price <= Number(maximumPrice);
      const matchesRating = !minimumRating || Number(product.rating || 0) >= minimumRating;
      const inStock = productIsInStock(product);
      const matchesAvailability = !availability
        || (availability === "in-stock" ? inStock : !inStock);
      return matchesSearch && matchesCategory && matchesSubcategory && matchesMetal && matchesOffer
        && matchesMinPrice && matchesMaxPrice && matchesRating && matchesAvailability;
    });

    return result.sort((first, second) => {
      if (sortBy === "price-low") return getProductPrice(first) - getProductPrice(second);
      if (sortBy === "price-high") return getProductPrice(second) - getProductPrice(first);
      if (sortBy === "name") return String(first.name || "").localeCompare(String(second.name || ""));
      const firstDate = new Date(first.created_at || 0).getTime();
      const secondDate = new Date(second.created_at || 0).getTime();
      return sortBy === "oldest" ? firstDate - secondDate : secondDate - firstDate;
    });
  }, [
    availability,
    maximumPrice,
    minimumPrice,
    minimumRating,
    offerThreshold,
    products,
    searchQuery,
    selectedCategories,
    selectedMetals,
    sortBy,
    subcategoryFilter,
  ]);

  const clearFilters = () => {
    setOfferThreshold(0);
    setMinimumPrice("");
    setMaximumPrice("");
    setMinimumRating(0);
    setAvailability("");
    setSortBy("newest");
    setSearchParams({});
  };

  const toggleQueryFilter = (key, value) => {
    const nextParams = new URLSearchParams(searchParams);
    const values = nextParams.getAll(key);
    nextParams.delete(key);
    if (key === "category") nextParams.delete("subcategory");
    const nextValues = toggleValue(values, value);
    nextValues.forEach((nextValue) => nextParams.append(key, nextValue));
    setSearchParams(nextParams);
  };

  const setSearchFilter = (value) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value) nextParams.set("search", value);
    else nextParams.delete("search");
    setSearchParams(nextParams);
  };

  const toggleFilterSection = (section) =>
    setOpenFilters((current) => ({ ...current, [section]: !current[section] }));

  const categoryCounts = useMemo(() => products.reduce((counts, product) => {
    if (product.category) counts[product.category] = (counts[product.category] || 0) + 1;
    return counts;
  }, {}), [products]);
  const metalCounts = useMemo(() => products.reduce((counts, product) => {
    if (product.metal_type) counts[product.metal_type] = (counts[product.metal_type] || 0) + 1;
    return counts;
  }, {}), [products]);

  const filterSection = (key, title, content) => (
    <section className="border-b border-[#eee7dc] py-3 last:border-b-0">
      <button
        type="button"
        onClick={() => toggleFilterSection(key)}
        aria-expanded={openFilters[key]}
        className="flex w-full items-center justify-between text-left text-sm font-bold text-[#28251f]"
      >
        {title}
        <FaChevronDown className={`text-xs text-[#777066] transition-transform ${openFilters[key] ? "" : "-rotate-90"}`} />
      </button>
      {openFilters[key] && <div className="mt-2.5 space-y-2">{content}</div>}
    </section>
  );

  const checkboxOption = (label, checked, onChange, count) => (
    <label key={label} className="flex cursor-pointer items-center gap-2 text-xs text-[#514b42]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-3.5 w-3.5 accent-[#174a38]"
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count != null && <span className="text-[10px] text-[#9a9286]">{count}</span>}
    </label>
  );

  const topSearches = availableCategories.slice(0, 8).map((category) => category.name);

  return (
    <main className="min-h-screen bg-[#fffdf8] pb-12">
      <div className="border-b border-[#f0e9dd] bg-white">
        <div className="mx-auto flex max-w-[1700px] items-center gap-2 px-4 py-2 text-xs text-[#81786b] sm:px-6 lg:px-8">
          <Link to="/" className="hover:text-[#174a38]">Home</Link>
          <FaArrowRight className="text-[9px]" />
          <span className="font-semibold text-[#30271b]">Explore</span>
          {searchQuery && <span className="ml-1 truncate text-[#81786b]">/ “{searchQuery}”</span>}
        </div>
      </div>

      <div className="mx-auto max-w-[1700px] px-4 pt-4 sm:px-6 lg:px-8">
        <section className="relative isolate min-h-[220px] overflow-hidden rounded-xl border border-[#d8b46c]/60 bg-[#f8e4b4] sm:min-h-[250px]">
          <img
            src="/images/Hero/hero.png"
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#fff5df]/95 via-[#f7e3b9]/80 to-[#143e32]/10 sm:from-[#fff5df]/95 sm:via-[#f7e3b9]/65 sm:to-transparent" />
          <div className="pointer-events-none absolute inset-2 rounded-lg border border-[#d0a747]/50" />
          <div className="relative z-10 flex min-h-[220px] flex-col justify-center px-6 py-6 sm:min-h-[250px] sm:px-10 lg:w-[62%] lg:px-14">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#9b6b18]">Sri Golds · Since 1984</p>
            <h1 className="mt-2 max-w-xl font-serif text-3xl font-bold leading-tight text-[#123c30] sm:text-4xl lg:text-5xl">
              Explore Our<br className="hidden sm:block" /> Exclusive Collection
            </h1>
            <p className="mt-2 max-w-lg text-sm text-[#514638] sm:text-base">Traditional designs for every special moment.</p>
            <a href="#explore-products" className="mt-4 inline-flex w-fit items-center gap-2 rounded-md bg-gradient-to-r from-[#f2b936] to-[#ffda78] px-4 py-2.5 text-xs font-bold text-[#3d2910] shadow-sm transition hover:-translate-y-0.5">
              Shop collection <FaArrowRight />
            </a>
          </div>
          <div className="absolute bottom-5 right-5 hidden flex-col gap-3 rounded-xl border border-white/40 bg-white/80 p-4 text-xs font-semibold text-[#273c32] shadow-sm backdrop-blur sm:flex lg:right-8">
            <span className="flex items-center gap-2"><FaCheckCircle className="text-[#a77525]" /> Certified jewellery</span>
            <span className="flex items-center gap-2"><FaAward className="text-[#a77525]" /> Trusted quality</span>
            <span className="flex items-center gap-2"><FaLock className="text-[#a77525]" /> Secure shopping</span>
          </div>
        </section>

        <section className="mt-5" aria-labelledby="top-searches-title">
          <h2 id="top-searches-title" className="flex items-center gap-2 font-serif text-lg font-bold text-[#29231c]">
            <FaSearch className="text-sm text-[#a77525]" /> Top Searches
          </h2>
          {topSearches.length ? (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
              {topSearches.map((search) => (
                <button
                  key={search}
                  type="button"
                  onClick={() => setSearchFilter(searchQuery === search ? "" : search)}
                  className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition ${searchQuery === search ? "border-[#174a38] bg-[#edf5ef] text-[#174a38]" : "border-[#eee5d6] bg-white text-[#514638] hover:border-[#d8b46c] hover:bg-[#fffaf0]"}`}
                >
                  <FaGem className="text-sm text-[#bd913e]" />
                  {search}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[#81786b]">Popular categories will appear here.</p>
          )}
        </section>

        <div id="explore-products" className="mt-4 grid scroll-mt-24 gap-5 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[245px_minmax(0,1fr)]">
          <aside className={`${filtersOpen ? "block" : "hidden"} h-fit rounded-xl border border-[#eee7dc] bg-white p-4 shadow-sm lg:block`}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-[#29231c]"><FaSlidersH className="text-sm text-[#174a38]" /> Filters</h2>
              <button type="button" onClick={clearFilters} className="text-[11px] font-semibold text-[#a77525] hover:underline">Clear All</button>
            </div>

            {filterSection("category", "Category", availableCategories.length ? (
              availableCategories.map((category) => checkboxOption(
                category.name,
                selectedCategories.includes(category.name),
                () => toggleQueryFilter("category", category.name),
                categoryCounts[category.name] || 0
              ))
            ) : <p className="text-xs text-[#81786b]">No categories found.</p>)}

            {filterSection("metal", "Metal", availableMetals.length ? (
              availableMetals.map((metal) => checkboxOption(
                metal.name,
                selectedMetals.includes(metal.name),
                () => toggleQueryFilter("metal", metal.name),
                metalCounts[metal.name] || 0
              ))
            ) : <p className="text-xs text-[#81786b]">No metals found.</p>)}

            {filterSection("offer", "Offer Percentage", (
              QUICK_FILTERS.map((threshold) => {
                const offer = Number(threshold);
                return checkboxOption(
                  `${offer}% and above`,
                  offerThreshold === offer,
                  () => setOfferThreshold((current) => current === offer ? 0 : offer)
                );
              })
            ))}

            {filterSection("price", "Price Range", (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] text-[#81786b]">
                    Min (₹)
                    <input
                      type="number"
                      min="0"
                      value={minimumPrice}
                      onChange={(event) => setMinimumPrice(event.target.value)}
                      placeholder="0"
                      className="mt-1 w-full rounded-md border border-[#e6dfd3] px-2 py-1.5 text-xs text-[#30271b] outline-none focus:border-[#174a38]"
                    />
                  </label>
                  <label className="text-[10px] text-[#81786b]">
                    Max (₹)
                    <input
                      type="number"
                      min="0"
                      value={maximumPrice}
                      onChange={(event) => setMaximumPrice(event.target.value)}
                      placeholder="No limit"
                      className="mt-1 w-full rounded-md border border-[#e6dfd3] px-2 py-1.5 text-xs text-[#30271b] outline-none focus:border-[#174a38]"
                    />
                  </label>
                </div>
                {maximumPrice !== "" && minimumPrice !== "" && Number(minimumPrice) > Number(maximumPrice) && (
                  <p className="text-[11px] text-rose-700" role="alert">Minimum price must not exceed maximum.</p>
                )}
              </>
            ))}

            {filterSection("rating", "Rating", (
              RATINGS.map((rating) => checkboxOption(
                `${rating} & above`,
                minimumRating === rating,
                () => setMinimumRating((current) => current === rating ? 0 : rating)
              ))
            ))}

            {filterSection("availability", "Availability", (
              <>
                {checkboxOption("In stock", availability === "in-stock", () => setAvailability((current) => current === "in-stock" ? "" : "in-stock"))}
                {checkboxOption("Out of stock", availability === "out-of-stock", () => setAvailability((current) => current === "out-of-stock" ? "" : "out-of-stock"))}
              </>
            ))}
          </aside>

          <section className="min-w-0">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFiltersOpen((open) => !open)}
                    className="flex items-center gap-2 rounded-lg border border-[#e8dfd1] bg-white px-3 py-2 text-xs font-semibold text-[#174a38] lg:hidden"
                  >
                    <FaSlidersH /> Filters
                  </button>
                  <h2 className="font-serif text-xl font-bold text-[#29231c] sm:text-2xl">
                    {searchQuery ? `Results for “${searchQuery}”` : "All Products"}
                  </h2>
                </div>
                <p className="mt-1 text-xs text-[#81786b]">
                  {loading ? "Loading products..." : `Found ${filteredProducts.length} ${filteredProducts.length === 1 ? "product" : "products"}`}
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs text-[#62594d]">
                Sort by:
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="rounded-md border border-[#e8dfd1] bg-white px-2.5 py-2 text-xs text-[#30271b] outline-none focus:border-[#174a38]"
                >
                  {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>

            {searchQuery && (
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-[#edf5ef] px-3 py-1 text-xs font-semibold text-[#174a38]">{searchQuery}</span>
                <button type="button" onClick={() => setSearchFilter("")} aria-label="Clear search" className="text-xs text-[#81786b] hover:text-rose-700"><FaTimes /></button>
              </div>
            )}

            {loading ? (
              <p className="rounded-xl border border-[#eee7dc] bg-white py-16 text-center text-sm text-[#81786b]" role="status">Loading the collection...</p>
            ) : error ? (
              <p className="rounded-xl border border-rose-200 bg-white py-16 text-center text-sm text-rose-700" role="alert">{error}</p>
            ) : filteredProducts.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id ?? product.product_id ?? product.product_code} product={product} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-[#eee7dc] bg-white px-5 py-16 text-center">
                <FaGem className="mx-auto text-3xl text-[#bd913e]" />
                <h3 className="mt-3 font-serif text-lg font-bold text-[#29231c]">No products match these filters</h3>
                <p className="mt-1 text-sm text-[#81786b]">Try another search or clear your filters to see more jewellery.</p>
                <button type="button" onClick={clearFilters} className="mt-4 rounded-lg bg-[#174a38] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#10382b]">Clear filters</button>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default Explore;
