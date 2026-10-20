
import React, { useContext, useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Heart,
  ShoppingBag,
  UserRound,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Gem,
  Truck,
  ShieldCheck,
  Headset,
  Phone,
  MapPin,
  LogOut,
} from "lucide-react";
import PageContainer from "./PageContainer";
import WishlistDrawer from "./WishlistDrawer";
import { useAuth } from "../../PrivateRouter/AuthContext";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import api from "../../api";
import { formatCurrency } from "../../utils/currency";

const INFO_PAGES = [
  { label: "About Us", to: "/about" },
  { label: "Contact Us", to: "/contactus" },
  { label: "Privacy Policy", to: "/privacy-policy" },
];

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, profileName } = useAuth();
  const { cart, wishlist } = useContext(StoreContext);

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [metals, setMetals] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const wishlistCount = wishlist.length;
  const cartCount = cart.length;
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const currentParams = new URLSearchParams(location.search);
  const selectedCategories = currentParams.getAll("category");
  const selectedMetals = currentParams.getAll("metal");
  const isCategoryActive = (name) =>
    selectedCategories.some((category) => category.toLowerCase() === name.toLowerCase());
  const isMetalActive = (name) =>
    selectedMetals.some((metal) => metal.toLowerCase() === name.toLowerCase());
  const hasCategoryFilter = selectedCategories.length > 0;
  const hasMetalFilter = selectedMetals.length > 0;
  const hasCollectionFilter = hasCategoryFilter || hasMetalFilter;
  const isInfoPageActive = INFO_PAGES.some((page) => page.to === location.pathname);

  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) return undefined;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError(false);

      try {
        const response = await api.get("/products", {
          params: { page: 1, limit: 8, search: query, status: "Active" },
          signal: controller.signal,
        });
        if (!Array.isArray(response.data?.products)) {
          throw new TypeError("The product search response must contain a products array");
        }
        setSearchResults(response.data.products);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Failed to search products:", error);
          setSearchResults([]);
          setSearchError(true);
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();

    const loadNavigationOptions = async () => {
      const [categoryResult, metalResult] = await Promise.allSettled([
        api.get("/categories", { signal: controller.signal }),
        api.get("/metals", { signal: controller.signal }),
      ]);

      if (controller.signal.aborted) return;

      if (categoryResult.status === "fulfilled" && Array.isArray(categoryResult.value.data)) {
        const activeCategories = categoryResult.value.data
          .filter((category) => (category.status || "Active") === "Active")
          .sort((first, second) => Number(first.id) - Number(second.id));
        setCategories(activeCategories);
        setSelectedCategory(activeCategories[0] || null);
      } else if (categoryResult.status === "rejected") {
        console.error("Failed to load navbar categories:", categoryResult.reason);
      } else {
        console.error("Navbar category response must be an array");
      }

      if (metalResult.status === "fulfilled" && Array.isArray(metalResult.value.data)) {
        setMetals(metalResult.value.data.filter((metal) => metal.status === "Active"));
      } else if (metalResult.status === "rejected") {
        console.error("Failed to load navbar metals:", metalResult.reason);
      } else {
        console.error("Navbar metal response must be an array");
      }
    };

    loadNavigationOptions();
    return () => controller.abort();
  }, []);

  const navLinkClass = ({ isActive }) =>
    `relative flex h-[76px] items-center justify-center whitespace-nowrap px-3 text-[15px] font-semibold transition-all duration-300 xl:px-4
    after:absolute after:bottom-3 after:left-1/2 after:h-[2px] after:-translate-x-1/2 after:bg-[#d2a348] after:transition-all after:duration-300
    ${
      isActive
        ? "text-[#b77b19] after:w-8"
        : "text-[#173f33] after:w-0 hover:text-[#b77b19] hover:after:w-7"
    }`;

  const iconButtonClass =
    "relative flex min-w-[52px] flex-col items-center gap-1 text-[#173f33] transition duration-300 hover:text-[#b77b19]";

  const iconCircleClass =
    "flex h-10 w-10 items-center justify-center rounded-full border border-[#e9dfc9] bg-white/80 shadow-sm transition duration-300 group-hover:border-[#d4aa59] group-hover:bg-[#fff7e6]";

  const handleSearch = (event) => {
    event.preventDefault();

    const query = search.trim();
    if (!query) return;

    // Keep this route aligned with your existing shop search implementation.
    navigate(`/explore?search=${encodeURIComponent(query)}`);
  };

  const getSearchProductImage = (product) => {
    const variantImage = product.variants?.find(
      (variant) => Array.isArray(variant.images) && variant.images.length > 0
    )?.images?.[0];
    const productImage = Array.isArray(product.images) ? product.images[0] : null;
    return getImageUrl(variantImage || productImage);
  };

  const openProductDetails = (product) => {
    const productId = product.id ?? product.product_id ?? product.productId;
    if (!productId) {
      console.error("Cannot open a search result without a product ID:", product);
      return;
    }
    navigate(`/product/${productId}`);
  };

  const renderSearchResults = (id) => {
    if (search.trim().length < 2) return null;

    return (
      <div
        id={id}
        className="absolute inset-x-0 top-full z-[70] mt-2 max-h-[min(60vh,420px)] overflow-y-auto rounded-xl border border-[#eadfce] bg-white p-2 text-left shadow-xl"
        role="listbox"
        aria-label="Matching products"
      >
        {searching ? (
          <p className="px-3 py-4 text-sm text-[#746b5d]" role="status">Searching products...</p>
        ) : searchError ? (
          <p className="px-3 py-4 text-sm text-rose-700" role="alert">Could not load product matches. Try again.</p>
        ) : searchResults.length ? (
          searchResults.map((product) => {
            const productId = product.id ?? product.product_id ?? product.productId;
            const image = getSearchProductImage(product);
            return (
              <button
                key={productId || product.product_code || product.name}
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => openProductDetails(product)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-[#f5f7f2] focus:bg-[#f5f7f2] focus:outline-none"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f6efe4]">
                  {image ? (
                    <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <Gem size={18} className="text-[#174a38]" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[#30271b]">{product.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-[#746b5d]">
                    {[product.category, product.metal_type, product.product_code].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-bold text-[#174a38]">
                  {formatCurrency(product.offer_price ?? product.final_selling_price ?? product.mrp ?? 0)}
                </span>
              </button>
            );
          })
        ) : (
          <p className="px-3 py-4 text-sm text-[#746b5d]">No matching active products found.</p>
        )}
      </div>
    );
  };

  const closeMenus = () => {
    setOpenDropdown(null);
    setMobileMenuOpen(false);
    setAccountOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      closeMenus();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleCategoryClick = (category, subcategory) => {
    closeMenus();
    const params = new URLSearchParams({ category: category.name });
    if (subcategory) params.set("subcategory", subcategory);
    navigate(`/explore?${params.toString()}`);
  };

  const handleMetalClick = (metalName) => {
    closeMenus();
    navigate(`/explore?metal=${encodeURIComponent(metalName)}`);
  };

  const getImageUrl = (image) => {
    if (!image || /^(https?:|data:|blob:)/i.test(image)) return image || "";
    const backendUrl = (
      import.meta.env.VITE_BACKEND_URL ||
      import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
      "http://localhost:5000"
    ).replace(/\/$/, "");
    return `${backendUrl}${image.startsWith("/") ? image : `/${image}`}`;
  };

  const getCategoryImage = (category) => {
    const images = Array.isArray(category.images) ? category.images : [];
    return getImageUrl(images[0]);
  };

  const getCategorySubcategories = (category) =>
    Array.isArray(category?.subcategory) ? category.subcategory.filter(Boolean) : [];

  return (
    <>
    <header className="sticky top-0 z-50 w-full [&_a]:cursor-pointer [&_button]:cursor-pointer">

      

      {/* Main navbar */}
      <nav className="relative border-b-2 border-[#d4aa59] bg-gradient-to-r from-[#f8f0df] via-[#fffdf7] to-[#f7efdc] shadow-[0_5px_18px_rgba(75,55,20,0.10)]">

        {/* Subtle ornamental background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute -left-12 -top-20 h-48 w-48 rounded-full border border-[#d4aa59]/30" />
          <div className="absolute -right-12 -top-20 h-48 w-48 rounded-full border border-[#d4aa59]/30" />
        </div>

        <PageContainer>
          <div className="relative flex min-h-[65px] items-center justify-between gap-3 py-1 lg:min-h-[74px] lg:gap-4">

            {/* Logo */}
            <Link
              to="/"
              onClick={closeMenus}
              className="flex shrink-0 items-center"
              aria-label="Sri Golds home"
            >
              <img
                src="/images/logo.png"
                alt="Sri Golds"
                className="h-12 w-24 object-contain sm:h-14 sm:w-28 lg:h-[62px] lg:w-36"
              />
            </Link>

            {/* Desktop navigation */}
            <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex">

              <NavLink to="/" end className={navLinkClass}>
                Home
              </NavLink>

              <NavLink
                to="/explore"
                className={(navState) => navLinkClass({
                  ...navState,
                  isActive: navState.isActive && !hasCollectionFilter,
                })}
              >
                Explore
              </NavLink>

              {/* Category dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setOpenDropdown("categories")}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button
                  type="button"
                  onClick={() => {
                    const next = openDropdown === "categories" ? null : "categories";
                    setOpenDropdown(next);
                    if (next) setSelectedCategory(categories[0] || null);
                  }}
                  aria-expanded={openDropdown === "categories"}
                  className={`relative flex h-[76px] items-center gap-2 px-3 text-[15px] font-semibold transition duration-300 after:absolute after:bottom-3 after:left-1/2 after:h-[2px] after:-translate-x-1/2 after:bg-[#d2a348] after:transition-all xl:px-4 ${
                    openDropdown === "categories" || hasCategoryFilter
                      ? "text-[#b77b19] after:w-8"
                      : "text-[#173f33] after:w-0 hover:text-[#b77b19] hover:after:w-7"
                  }`}
                >
                  Category
                  <ChevronDown
                    size={17}
                    className={`transition-transform duration-300 ${
                      openDropdown === "categories" ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {openDropdown === "categories" && (
                  <div className="absolute left-0 top-full z-50 flex min-w-[300px] rounded-xl border border-[#e6d5b2] bg-[#fffdf7] p-2 shadow-[0_12px_28px_rgba(30,50,35,0.16)]">
                    <div className="max-h-[min(70vh,520px)] w-[275px] overflow-y-auto">
                      {categories.map((category) => {
                        const categoryId = category.id || category.catId;
                        const selectedId = selectedCategory?.id || selectedCategory?.catId;
                        const image = getCategoryImage(category);

                        return (
                          <div
                            key={categoryId}
                            onMouseEnter={() => setSelectedCategory(category)}
                            onFocus={() => setSelectedCategory(category)}
                            className={`flex items-center rounded-lg pr-2 transition ${
                              selectedId === categoryId || isCategoryActive(category.name)
                                ? "bg-[#fff0cf]"
                                : "hover:bg-[#fffaf0]"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleCategoryClick(category)}
                              aria-current={isCategoryActive(category.name) ? "page" : undefined}
                              className={`flex min-w-0 flex-1 items-center gap-3 px-2 py-2.5 text-left text-sm font-medium ${
                                isCategoryActive(category.name) ? "text-[#8c5e13]" : "text-[#30271b]"
                              }`}
                            >
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#fbf5e9]">
                                {image ? (
                                  <img src={image} alt="" className="h-8 w-8 object-contain" loading="lazy" />
                                ) : (
                                  <Gem size={17} className="text-[#174a38]" aria-hidden="true" />
                                )}
                              </span>
                              <span className="truncate">{category.name}</span>
                            </button>
                            <button
                              type="button"
                              aria-label={`Show ${category.name} subcategories`}
                              onClick={() => setSelectedCategory(category)}
                              className="rounded-md p-2 text-[#b47a25] transition hover:text-[#7c5318]"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {selectedCategory && (
                      <div className="ml-2 w-[230px] border-l border-[#efe5d4] py-1 pl-2">
                        <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#9a7a42]">
                          {selectedCategory.name}
                        </p>
                        {getCategorySubcategories(selectedCategory).length ? (
                          getCategorySubcategories(selectedCategory).map((subcategory) => (
                            <button
                              key={subcategory}
                              type="button"
                              onClick={() => handleCategoryClick(selectedCategory, subcategory)}
                              className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-[#514638] transition hover:bg-[#fff8e9] hover:text-[#8c5e13]"
                            >
                              {subcategory}
                            </button>
                          ))
                        ) : (
                          <p className="px-3 py-2 text-sm text-[#8a8174]">No subcategories</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Metal dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setOpenDropdown("metals")}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenDropdown(
                      openDropdown === "metals" ? null : "metals"
                    )
                  }
                  aria-expanded={openDropdown === "metals"}
                  className={`relative flex h-[76px] items-center gap-2 px-3 text-[15px] font-semibold transition duration-300 after:absolute after:bottom-3 after:left-1/2 after:h-[2px] after:-translate-x-1/2 after:bg-[#d2a348] after:transition-all xl:px-4 ${
                    openDropdown === "metals" || hasMetalFilter
                      ? "text-[#b77b19] after:w-8"
                      : "text-[#173f33] after:w-0 hover:text-[#b77b19] hover:after:w-7"
                  }`}
                >
                  Metal
                  <ChevronDown
                    size={17}
                    className={`transition-transform duration-300 ${
                      openDropdown === "metals" ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {openDropdown === "metals" && (
                  <div className="absolute left-0 top-full z-50 w-[250px] rounded-xl border border-[#e6d5b2] bg-[#fffdf7] p-2 shadow-[0_12px_28px_rgba(30,50,35,0.16)]">
                    <div className="border-b border-[#eee4d0] px-4 py-3">
                      <p className="font-serif text-base text-[#064638]">
                        Shop by Metal
                      </p>
                    </div>

                    {metals.map((metal) => (
                      <button
                        key={metal.id}
                        type="button"
                        onClick={() => handleMetalClick(metal.name)}
                        aria-current={isMetalActive(metal.name) ? "page" : undefined}
                        className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm font-medium transition hover:bg-[#fff8e9] hover:text-[#8c5e13] ${
                          isMetalActive(metal.name) ? "bg-[#fff0cf] text-[#8c5e13]" : "text-[#30271b]"
                        }`}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#efe5d4] bg-[#fbf5e9]">
                          {metal.image ? (
                            <img src={getImageUrl(metal.image)} alt="" className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <Gem size={17} className="text-[#174a38]" aria-hidden="true" />
                          )}
                        </span>
                        {metal.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div
                className="relative"
                onMouseEnter={() => setOpenDropdown("pages")}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === "pages" ? null : "pages")}
                  aria-expanded={openDropdown === "pages"}
                  aria-haspopup="true"
                  className={`relative flex h-[76px] items-center gap-2 px-3 text-[15px] font-semibold transition duration-300 after:absolute after:bottom-3 after:left-1/2 after:h-[2px] after:-translate-x-1/2 after:bg-[#d2a348] after:transition-all xl:px-4 ${
                    openDropdown === "pages" || isInfoPageActive
                      ? "text-[#b77b19] after:w-8"
                      : "text-[#173f33] after:w-0 hover:text-[#b77b19] hover:after:w-7"
                  }`}
                >
                  Pages
                  <ChevronDown
                    size={17}
                    className={`transition-transform duration-300 ${
                      openDropdown === "pages" ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openDropdown === "pages" && (
                  <div className="absolute left-0 top-full z-50 w-[210px] rounded-xl border border-[#e6d5b2] bg-[#fffdf7] p-2 shadow-[0_12px_28px_rgba(30,50,35,0.16)]">
                    {INFO_PAGES.map((page) => (
                      <NavLink
                        key={page.to}
                        to={page.to}
                        onClick={closeMenus}
                        className={({ isActive }) =>
                          `block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                            isActive
                              ? "bg-[#fff0cf] text-[#8c5e13]"
                              : "text-[#30271b] hover:bg-[#fff8e9] hover:text-[#8c5e13]"
                          }`
                        }
                      >
                        {page.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Desktop search and actions */}
            <div className="hidden shrink-0 items-center gap-3 lg:flex xl:gap-5">

              <div className="relative">
                <form
                  onSubmit={handleSearch}
                  className="flex w-[210px] items-center overflow-hidden rounded-full border border-[#d4aa59] bg-white/80 p-1 shadow-sm transition focus-within:ring-2 focus-within:ring-[#d4aa59]/20 xl:w-[260px] 2xl:w-[300px]"
                >
                  <Search
                    size={20}
                    className="ml-2 shrink-0 text-[#174638]"
                  />

                  <input
                    type="search"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setSearchResults([]);
                      setSearchError(false);
                      setSearching(event.target.value.trim().length >= 2);
                    }}
                    placeholder="Search for jewellery..."
                    aria-label="Search jewellery"
                    aria-controls="desktop-product-search-results"
                    aria-autocomplete="list"
                    className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-xs text-[#173f33] outline-none placeholder:text-[#8a8d81]"
                  />

                  <button
                    type="submit"
                    aria-label="Submit search"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#064638] text-[#f3d795] transition hover:bg-[#0b5948]"
                  >
                    <Search size={20} />
                  </button>
                </form>
                {renderSearchResults("desktop-product-search-results")}
              </div>

              {/* Wishlist */}
              <button
                type="button"
                onClick={() => setWishlistOpen(true)}
                className="group relative flex min-w-[48px] flex-col items-center gap-1 text-[#173f33] transition hover:text-[#b77b19]"
                aria-label={`Wishlist, ${wishlistCount} items`}
              >
                <span className={iconCircleClass}>
                  <Heart size={21} />
                </span>
                {wishlistCount > 0 && (
                  <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#c78b20] px-1 text-[10px] font-bold text-white">
                    {wishlistCount}
                  </span>
                )}
                <span className="text-xs font-medium">Wishlist</span>
              </button>

             

              {/* Account */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountOpen(!accountOpen)}
                  aria-expanded={accountOpen}
                  className="group flex min-w-[48px] flex-col items-center gap-1 text-[#173f33] transition hover:text-[#b77b19]"
                >
                  <span className={iconCircleClass}>
                    {user ? (
                      <span className="text-base font-semibold uppercase">
                        {profileName.trim().charAt(0) || "U"}
                      </span>
                    ) : (
                      <UserRound size={21} />
                    )}
                  </span>
                  <span className="max-w-20 truncate text-xs font-medium">
                    {user ? profileName : "Account"}
                  </span>
                </button>

                {accountOpen && (
                  <div className="absolute right-0 top-full z-50 mt-3 w-52 rounded-xl border border-[#e6d5b2] bg-[#fffdf7] p-2 text-[#173f33] shadow-xl">
                    {user ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setAccountOpen(false);
                            navigate("/profile");
                          }}
                          className="w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[#f8f0df]"
                        >
                          My Profile
                        </button>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setAccountOpen(false);
                              navigate("/admin");
                            }}
                            className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#174a38] hover:bg-[#f8f0df]"
                          >
                            Admin Panel
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          <LogOut size={16} />
                          Logout
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAccountOpen(false);
                          navigate("/login");
                        }}
                        className="w-full rounded-lg bg-[#064638] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b5948]"
                      >
                        Login / Register
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile actions */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => {
                  closeMenus();
                  setWishlistOpen(true);
                }}
                aria-label="Wishlist"
                className="relative rounded-full p-2 text-[#064638] hover:bg-[#eee3cc]"
              >
                <Heart size={21} />
                {wishlistCount > 0 && (
                  <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c78b20] px-1 text-[9px] text-white">
                    {wishlistCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                className="rounded-full border border-[#e4d3af] p-2 text-[#064638] transition hover:bg-[#f3e7cc]"
              >
                {mobileMenuOpen ? <X size={23} /> : <Menu size={23} />}
              </button>
            </div>
          </div>

          {/* Mobile search */}
          <div className="relative z-30 mb-3 lg:hidden">
            <form
              onSubmit={handleSearch}
              className="flex items-center overflow-hidden rounded-full border border-[#d4aa59] bg-white/90 p-1"
            >
              <Search size={19} className="ml-3 shrink-0 text-[#174638]" />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setSearchResults([]);
                  setSearchError(false);
                  setSearching(event.target.value.trim().length >= 2);
                }}
                placeholder="Search for jewellery..."
                aria-label="Search jewellery"
                aria-controls="mobile-product-search-results"
                aria-autocomplete="list"
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-[#173f33] outline-none placeholder:text-[#8a8d81]"
              />
              <button
                type="submit"
                aria-label="Submit search"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#064638] text-[#f3d795]"
              >
                <Search size={18} />
              </button>
            </form>
            {renderSearchResults("mobile-product-search-results")}
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="relative z-20 border-t border-[#dfc68f] pb-5 pt-3 lg:hidden">

              <NavLink
                to="/"
                end
                onClick={closeMenus}
                className={({ isActive }) =>
                  `block rounded-lg px-4 py-3 text-sm font-semibold ${
                    isActive
                      ? "bg-[#064638] text-[#f3d795]"
                      : "text-[#173f33] hover:bg-[#f1e5cb]"
                  }`
                }
              >
                Home
              </NavLink>

              <NavLink
                to="/explore"
                onClick={closeMenus}
                className={({ isActive }) =>
                  `block rounded-lg px-4 py-3 text-sm font-semibold ${
                    isActive && !hasCollectionFilter
                      ? "bg-[#064638] text-[#f3d795]"
                      : "text-[#173f33] hover:bg-[#f1e5cb]"
                  }`
                }
              >
                Explore
              </NavLink>

              <button
                type="button"
                onClick={() =>
                  setOpenDropdown(
                    openDropdown === "categories" ? null : "categories"
                  )
                }
                className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold hover:bg-[#f1e5cb] ${
                  hasCategoryFilter ? "bg-[#fff0cf] text-[#8c5e13]" : "text-[#173f33]"
                }`}
              >
                Category
                <ChevronDown
                  size={17}
                  className={`transition ${
                    openDropdown === "categories" ? "rotate-180" : ""
                  }`}
                />
              </button>

              {openDropdown === "categories" && (
                <div className="ml-4 border-l-2 border-[#d4aa59] pl-3">
                  {categories.map((category) => (
                    <button
                      key={category.id || category.catId}
                      type="button"
                      onClick={() => handleCategoryClick(category)}
                      aria-current={isCategoryActive(category.name) ? "page" : undefined}
                      className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[#f1e5cb] ${
                        isCategoryActive(category.name) ? "bg-[#fff0cf] font-semibold text-[#8c5e13]" : "text-[#365547]"
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  setOpenDropdown(
                    openDropdown === "metals" ? null : "metals"
                  )
                }
                className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold hover:bg-[#f1e5cb] ${
                  hasMetalFilter ? "bg-[#fff0cf] text-[#8c5e13]" : "text-[#173f33]"
                }`}
              >
                Metal
                <ChevronDown
                  size={17}
                  className={`transition ${
                    openDropdown === "metals" ? "rotate-180" : ""
                  }`}
                />
              </button>

              {openDropdown === "metals" && (
                <div className="ml-4 border-l-2 border-[#d4aa59] pl-3">
                  {metals.map((metal) => (
                    <button
                      key={metal.id}
                      type="button"
                      onClick={() => handleMetalClick(metal.name)}
                      aria-current={isMetalActive(metal.name) ? "page" : undefined}
                      className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[#f1e5cb] ${
                        isMetalActive(metal.name) ? "bg-[#fff0cf] font-semibold text-[#8c5e13]" : "text-[#365547]"
                      }`}
                    >
                      {metal.name}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === "pages" ? null : "pages")}
                aria-expanded={openDropdown === "pages"}
                className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold hover:bg-[#f1e5cb] ${
                  isInfoPageActive ? "bg-[#fff0cf] text-[#8c5e13]" : "text-[#173f33]"
                }`}
              >
                Pages
                <ChevronDown
                  size={17}
                  className={`transition ${openDropdown === "pages" ? "rotate-180" : ""}`}
                />
              </button>

              {openDropdown === "pages" && (
                <div className="ml-4 border-l-2 border-[#d4aa59] pl-3">
                  {INFO_PAGES.map((page) => (
                    <NavLink
                      key={page.to}
                      to={page.to}
                      onClick={closeMenus}
                      className={({ isActive }) =>
                        `block rounded-lg px-3 py-2.5 text-sm transition ${
                          isActive
                            ? "bg-[#fff0cf] font-semibold text-[#8c5e13]"
                            : "text-[#365547] hover:bg-[#f1e5cb]"
                        }`
                      }
                    >
                      {page.label}
                    </NavLink>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  closeMenus();
                  navigate(user ? "/profile" : "/login");
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#064638] px-4 py-3 text-sm font-semibold text-[#f3d795]"
              >
                <UserRound size={17} />
                {user ? "My Account" : "Login / Register"}
              </button>
            </div>
          )}
        </PageContainer>

        {/* Gold bottom border */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#b8872e]/30 via-[#e8c574] to-[#b8872e]/30" />
      </nav>
    </header>
    <WishlistDrawer isOpen={wishlistOpen} onClose={() => setWishlistOpen(false)} />
    </>
  );
};

export default Navbar;
