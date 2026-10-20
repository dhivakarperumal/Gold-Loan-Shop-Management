import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FaChevronDown,
  FaGem,
  FaSearch,
  FaSlidersH,
  FaStar,
  FaTimes,
} from "react-icons/fa";
import api from "../../api";
import { formatCurrency } from "../../utils/currency";
import ProductCard from "../Home/ProductCard";
import { getProductImageUrl } from "../Home/productDisplay";
import PageHeader from "../CommenComponents/PageHeader";

const PAGE_SIZE = 100;
const ROWS_PER_PAGE = 3;
const MOBILE_PRODUCTS_PER_PAGE = 8;
const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "name", label: "Name: A to Z" },
];
const QUICK_FILTERS = ["10", "20", "30", "40"];
const RATINGS = [4, 3, 2, 1];
const PRICE_RANGES = [
  { label: "₹ 0 - 25K", minimum: 0, maximum: 25_000 },
  { label: "₹ 25K - 50K", minimum: 25_000, maximum: 50_000 },
  { label: "₹ 50K - 1L", minimum: 50_000, maximum: 100_000 },
  { label: "₹ 1L - 5L", minimum: 100_000, maximum: 500_000 },
  { label: "₹ 5L+", minimum: 500_000, maximum: null },
];
const PRICE_STEP = 1_000;
const formatPriceLabel = formatCurrency;

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
  const [currentPage, setCurrentPage] = useState(1);
  const [gridColumns, setGridColumns] = useState(1);
  const [categories, setCategories] = useState([]);
  const [metals, setMetals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filtersOpen, setFiltersOpen] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1024
  );
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
  useEffect(() => {
    const updateGridColumns = () => {
      const width = window.innerWidth;
      setGridColumns(width >= 1536 ? 5 : width >= 1024 ? 4 : width >= 640 ? 2 : 1);
    };

    updateGridColumns();
    window.addEventListener("resize", updateGridColumns);
    return () => window.removeEventListener("resize", updateGridColumns);
  }, []);

  const searchQuery = searchParams.get("search")?.trim() || "";
  const selectedCategories = searchParams.getAll("category");
  const selectedMetals = searchParams.getAll("metal");
  const subcategoryFilter = searchParams.get("subcategory")?.trim().toLowerCase() || "";
  const headerTitle = searchParams.get("subcategory")?.trim()
    || selectedCategories[0]
    || selectedMetals[0]
    || "Explore";
  const priceSliderMaximum = useMemo(() => {
    const highestProductPrice = products.reduce(
      (highest, product) => Math.max(highest, getProductPrice(product)),
      0
    );
    return Math.max(1_000_000, Math.ceil(highestProductPrice / 10_000) * 10_000);
  }, [products]);
  const minimumPriceValue = Math.min(Number(minimumPrice) || 0, priceSliderMaximum);
  const maximumPriceValue = maximumPrice === ""
    ? priceSliderMaximum
    : Math.min(Number(maximumPrice), priceSliderMaximum);

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

  const productsPerPage = gridColumns === 1
    ? MOBILE_PRODUCTS_PER_PAGE
    : gridColumns * ROWS_PER_PAGE;
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const activePage = Math.min(currentPage, Math.max(totalPages, 1));
  const pageStart = (activePage - 1) * productsPerPage;
  const paginatedProducts = filteredProducts.slice(pageStart, pageStart + productsPerPage);
  const visiblePageNumbers = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => Math.max(1, Math.min(activePage - 2, totalPages - 4)) + index
  );

  const clearFilters = () => {
    setCurrentPage(1);
    setOfferThreshold(0);
    setMinimumPrice("");
    setMaximumPrice("");
    setMinimumRating(0);
    setAvailability("");
    setSortBy("newest");
    setSearchParams({});
  };

  const toggleQueryFilter = (key, value) => {
    setCurrentPage(1);
    const nextParams = new URLSearchParams(searchParams);
    const values = nextParams.getAll(key);
    nextParams.delete(key);
    if (key === "category") nextParams.delete("subcategory");
    const nextValues = toggleValue(values, value);
    nextValues.forEach((nextValue) => nextParams.append(key, nextValue));
    setSearchParams(nextParams);
  };

  const setSearchFilter = (value) => {
    setCurrentPage(1);
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
  const ratingCounts = useMemo(() => products.reduce((counts, product) => {
    const rating = Number(product.rating) || 0;
    RATINGS.forEach((minimumRatingValue) => {
      if (rating >= minimumRatingValue) counts[minimumRatingValue] += 1;
    });
    return counts;
  }, Object.fromEntries(RATINGS.map((rating) => [rating, 0]))), [products]);

  const topSearchProducts = useMemo(
    () => products.filter((product) => product.name).slice(0, 8),
    [products]
  );

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

  return (
    <main className="min-h-screen bg-[#fffdf8] pb-12">
      <PageHeader title={headerTitle} breadcrumbTitle="Explore" />

      <div className={`mx-auto grid max-w-[1700px] items-start gap-x-4 px-4 pt-4 sm:px-6 lg:px-8 ${filtersOpen ? "lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[235px_minmax(0,1fr)]" : "lg:grid-cols-1"}`}>
        <section className={`mt-4 lg:row-start-1 lg:mt-3 ${filtersOpen ? "lg:col-start-2" : "lg:col-start-1"}`} aria-labelledby="top-searches-title">
          <div className="flex items-center justify-between gap-3">
            <h2 id="top-searches-title" className="flex items-center gap-2 font-serif text-base font-bold text-[#29231c]">
              <FaSearch className="text-xs text-[#a77525]" /> Top Searches
            </h2>
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              aria-controls="explore-filters"
              className="flex cursor-pointer shrink-0 items-center gap-2 rounded-lg border border-[#e8dfd1] bg-white px-3 py-2 text-xs font-semibold text-[#174a38] transition hover:border-[#d8b46c] hover:bg-[#fffaf0]"
            >
              <FaSlidersH /> {filtersOpen ? "Hide Filters" : "Show Filters"}
            </button>
          </div>
          {topSearchProducts.length ? (
            <div className="mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0 lg:grid-cols-8">
              {topSearchProducts.map((product) => {
                const productId = product.id ?? product.product_id ?? product.product_code ?? product.name;
                const image = getProductImageUrl(product);
                return (
                <button
                  key={productId}
                  type="button"
                  onClick={() => setSearchFilter(searchQuery === product.name ? "" : product.name)}
                  title={product.name}
                  className={`flex w-[min(72vw,220px)] shrink-0 snap-start items-center gap-2 rounded-lg border px-2 py-2 text-left text-[10px] font-medium transition sm:w-auto sm:min-w-0 sm:text-[11px] ${searchQuery === product.name ? "border-[#174a38] bg-[#edf5ef] text-[#174a38]" : "border-[#eee5d6] bg-white text-[#514638] hover:border-[#d8b46c] hover:bg-[#fffaf0]"}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#f8f2e8]">
                    {image
                      ? <img src={image} alt="" loading="lazy" className="h-full w-full object-contain" />
                      : <FaGem className="text-sm text-[#bd913e]" aria-hidden="true" />}
                  </span>
                  <span className="min-w-0 truncate">{product.name}</span>
                </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[#81786b]">Popular products will appear here.</p>
          )}
        </section>

        <div id="explore-products" className="mt-4 grid scroll-mt-24 gap-5 lg:contents">
          <aside id="explore-filters" className={`${filtersOpen ? "block" : "hidden"} h-fit rounded-xl border border-[#eee7dc] bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto`}>
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
                  () => {
                    setCurrentPage(1);
                    setOfferThreshold((current) => current === offer ? 0 : offer);
                  }
                );
              })
            ))}

            {filterSection("price", "Price Range", (
              <>
                <div className="px-1 pt-1">
                  <div className="relative h-5">
                    <span className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#eadfca]" />
                    <span
                      className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#d49a19]"
                      style={{
                        left: `${(minimumPriceValue / priceSliderMaximum) * 100}%`,
                        right: `${100 - (maximumPriceValue / priceSliderMaximum) * 100}%`,
                      }}
                    />
                    <input
                      type="range"
                      min="0"
                      max={maximumPriceValue}
                      step={PRICE_STEP}
                      value={minimumPriceValue}
                      aria-label="Minimum price"
                      onChange={(event) => {
                        setCurrentPage(1);
                        setMinimumPrice(event.target.value === "0" ? "" : event.target.value);
                      }}
                      className="pointer-events-none absolute inset-0 h-5 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#c98b1b] [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_#c98b1b] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#c98b1b] [&::-moz-range-thumb]:shadow-[0_0_0_1px_#c98b1b] [&::-moz-range-thumb]:cursor-pointer"
                    />
                    <input
                      type="range"
                      min={minimumPriceValue}
                      max={priceSliderMaximum}
                      step={PRICE_STEP}
                      value={maximumPriceValue}
                      aria-label="Maximum price"
                      onChange={(event) => {
                        setCurrentPage(1);
                        setMaximumPrice(
                          Number(event.target.value) >= priceSliderMaximum ? "" : event.target.value
                        );
                      }}
                      className="pointer-events-none absolute inset-0 h-5 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#c98b1b] [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_#c98b1b] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#c98b1b] [&::-moz-range-thumb]:shadow-[0_0_0_1px_#c98b1b] [&::-moz-range-thumb]:cursor-pointer"
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-[#70685d]">
                    <span>{formatPriceLabel(minimumPriceValue)}</span>
                    <span>{formatPriceLabel(priceSliderMaximum)}</span>
                  </div>
                </div>
                {maximumPrice !== "" && minimumPrice !== "" && Number(minimumPrice) > Number(maximumPrice) && (
                  <p className="text-[11px] text-rose-700" role="alert">Minimum price must not exceed maximum.</p>
                )}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {PRICE_RANGES.map((range) => {
                    const selected = minimumPriceValue === range.minimum
                      && (range.maximum === null
                        ? maximumPrice === ""
                        : maximumPriceValue === range.maximum);
                    return (
                      <button
                        key={range.label}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          setCurrentPage(1);
                          setMinimumPrice(range.minimum === 0 ? "" : String(range.minimum));
                          setMaximumPrice(range.maximum === null ? "" : String(range.maximum));
                        }}
                        className={`rounded-md border px-1.5 py-1.5 text-[9px] transition sm:text-[10px] ${selected ? "border-[#d49a19] bg-[#fff7e5] font-semibold text-[#765323]" : "border-[#eee9e0] bg-[#faf9f6] text-[#777066] hover:border-[#d8b46c] hover:bg-[#fffaf0]"}`}
                      >
                        {range.label}
                      </button>
                    );
                  })}
                </div>
              </>
            ))}

            {filterSection("rating", "Rating", (
              <div className="space-y-1.5">
                {RATINGS.map((rating) => (
                  <label key={rating} className="flex cursor-pointer items-center gap-2 text-[10px] text-[#514b42]">
                    <input
                      type="checkbox"
                      checked={minimumRating === rating}
                      onChange={() => {
                        setCurrentPage(1);
                        setMinimumRating((current) => current === rating ? 0 : rating);
                      }}
                      className="h-3.5 w-3.5 shrink-0 accent-[#c98b1b]"
                      aria-label={`${rating} stars and above`}
                    />
                    <span className="flex items-center gap-0.5" aria-hidden="true">
                      {Array.from({ length: 5 }, (_, index) => (
                        <FaStar
                          key={index}
                          className={`text-[11px] ${index < rating ? "text-[#e6a323]" : "text-[#dedbd5]"}`}
                        />
                      ))}
                    </span>
                    <span className="whitespace-nowrap">{rating} &amp; above</span>
                    <span className="ml-auto text-[10px] text-[#9a9286]">({ratingCounts[rating]})</span>
                  </label>
                ))}
              </div>
            ))}

            {filterSection("availability", "Availability", (
              <>
                {checkboxOption("In stock", availability === "in-stock", () => {
                  setCurrentPage(1);
                  setAvailability((current) => current === "in-stock" ? "" : "in-stock");
                })}
                {checkboxOption("Out of stock", availability === "out-of-stock", () => {
                  setCurrentPage(1);
                  setAvailability((current) => current === "out-of-stock" ? "" : "out-of-stock");
                })}
              </>
            ))}
          </aside>

          <section className={`min-w-0 lg:row-start-2 ${filtersOpen ? "lg:col-start-2" : "lg:col-start-1"}`}>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-xl font-bold text-[#29231c] sm:text-2xl">
                    {searchQuery ? `Results for “${searchQuery}”` : "All Products"}
                  </h2>
                </div>
                <p className="mt-1 text-xs text-[#81786b]">
                  {loading
                    ? "Loading products..."
                    : `Found ${filteredProducts.length} ${filteredProducts.length === 1 ? "product" : "products"}`}
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs text-[#62594d]">
                Sort by:
                <select
                  value={sortBy}
                  onChange={(event) => {
                    setCurrentPage(1);
                    setSortBy(event.target.value);
                  }}
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
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
                  {paginatedProducts.map((product) => (
                  <ProductCard
                    key={product.id ?? product.product_id ?? product.product_code}
                    product={product}
                    variant="explore"
                    queryString={searchParams.toString()}
                  />
                  ))}
                </div>
                {totalPages > 1 && (
                  <nav className="mt-6 flex flex-wrap items-center justify-center gap-2" aria-label="Product pages">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(Math.max(1, activePage - 1))}
                      disabled={activePage === 1}
                      className="rounded-md border border-[#e8dfd1] bg-white px-3 py-2 text-xs font-semibold text-[#514638] transition hover:border-[#d8b46c] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    {visiblePageNumbers.map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        aria-current={activePage === page ? "page" : undefined}
                        aria-label={`Page ${page}`}
                        className={`h-9 min-w-9 rounded-md border px-3 text-xs font-semibold transition ${activePage === page ? "border-[#174a38] bg-[#174a38] text-white" : "border-[#e8dfd1] bg-white text-[#514638] hover:border-[#d8b46c]"}`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(Math.min(totalPages, activePage + 1))}
                      disabled={activePage === totalPages}
                      className="rounded-md border border-[#e8dfd1] bg-white px-3 py-2 text-xs font-semibold text-[#514638] transition hover:border-[#d8b46c] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                )}
              </>
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
