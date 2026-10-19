
import React, { useContext, useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
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

const Navbar = () => {
  const navigate = useNavigate();
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
    navigate(`/shop?search=${encodeURIComponent(query)}`);
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
                  ₹{Number(product.offer_price ?? product.final_selling_price ?? product.mrp ?? 0).toLocaleString("en-IN")}
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
    navigate(`/shop?search=${encodeURIComponent(subcategory || category.name)}`);
  };

  const handleMetalClick = (metalName) => {
    closeMenus();
    navigate(`/shop?search=${encodeURIComponent(metalName)}`);
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

      )}
      <div
        className={`fixed inset-0 z-[60] transition-[visibility] duration-300 lg:hidden ${
          mobileMenu ? "visible pointer-events-auto" : "invisible pointer-events-none"
        }`}
        aria-hidden={!mobileMenu}
      >
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={closeMobileMenu}
            tabIndex={mobileMenu ? 0 : -1}
            className={`absolute inset-0 h-full w-full bg-slate-950/45 backdrop-blur-[2px] transition-opacity duration-300 ${
              mobileMenu ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          />
          <aside
            id="store-mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Store navigation"
            inert={!mobileMenu}
            className={`absolute inset-0 flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl transition-transform duration-300 ease-out ${
              mobileMenu ? "translate-y-0" : "-translate-y-full"
            }`}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-emerald-900/10 bg-gradient-to-r from-[#003B3B] to-[#00695C] px-5 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
              {mobileCategory || mobilePages ? (
                <button
                  type="button"
                  onClick={() => {
                    const next = openDropdown === "categories" ? null : "categories";
                    setOpenDropdown(next);
                    if (next) setSelectedCategory(categories[0] || null);
                  }}
                  aria-expanded={openDropdown === "categories"}
                  className={`flex h-[76px] items-center gap-2 px-3 text-[15px] font-semibold transition duration-300 xl:px-4 ${
                    openDropdown === "categories"
                      ? "text-[#b77b19]"
                      : "text-[#173f33] hover:text-[#b77b19]"
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
                              selectedId === categoryId
                                ? "bg-[#fff8e9]"
                                : "hover:bg-[#fffaf0]"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleCategoryClick(category)}
                              className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2.5 text-left text-sm font-medium text-[#30271b]"
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

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {!mobileCategory && !mobilePages && (
                <>
                  <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Browse the store</p>
                  <div className="space-y-1.5">
                    {[
                      { to: "/", label: "Home", icon: FaHome },
                      { to: "/shop", label: "Shop", icon: FaShoppingBag },
                      { to: "/contactus", label: "Contact Us", icon: FaPhoneAlt },
                    ].map(({ to, label, icon: Icon }) => (
                      <NavLink
                        key={to}
                        to={to}
                        end={to === "/"}
                        onClick={closeMobileMenu}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
                            isActive ? "bg-emerald-50 text-[#004D40]" : "text-slate-600 hover:bg-slate-50 hover:text-[#004D40]"
                          }`
                        }
                      >
                        <Icon size={18} /> {label}
                      </NavLink>
                    ))}
                    {metals.length > 0 && (
                      <div className="pt-4">
                        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Shop by metal
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {metals.map((metal) => (
                            <Link
                              key={metal.id}
                              to={`/shop?metal=${encodeURIComponent(metal.name)}`}
                              onClick={closeMobileMenu}
                              className="flex items-center gap-2 rounded-xl border border-[#f0e5d1] bg-[#fffdf8] px-3 py-2.5 text-sm font-semibold text-[#30271b] transition hover:border-[#d6ad5f] hover:bg-[#fff7e7]"
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
                  className={`flex h-[76px] items-center gap-2 px-3 text-[15px] font-semibold transition duration-300 xl:px-4 ${
                    openDropdown === "metals"
                      ? "text-[#b77b19]"
                      : "text-[#173f33] hover:text-[#b77b19]"
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
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm font-medium text-[#30271b] transition hover:bg-[#fff8e9] hover:text-[#8c5e13]"
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
                        <button
                          type="button"
                          onClick={() => {
                            setAccountOpen(false);
                            navigate("/orders");
                          }}
                          className="w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[#f8f0df]"
                        >
                          My Orders
                        </button>
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
                  <div className="mt-6 rounded-2xl bg-[#F8F5EB] p-4">
                    <p className="font-serif text-sm font-semibold text-[#004D40]">Timeless pieces, made to treasure.</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">Explore the Sri Golds jewellery collection.</p>
                  </div>
                </>
              )}

              {mobileCategory && (
                <div className="space-y-1.5">
                  <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Shop by category</p>
                  {categories.length ? categories.map((category) => (
                    <NavLink
                      key={category.id || category.catId}
                      type="button"
                      onClick={() => handleCategoryClick(category)}
                      className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-[#365547] hover:bg-[#f1e5cb]"
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
                className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold text-[#173f33] hover:bg-[#f1e5cb]"
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
                      className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-[#365547] hover:bg-[#f1e5cb]"
                    >
                      {metal.name}
                    </button>
                  ))}
                </div>
              )}

              <NavLink
                to="/contactus"
                onClick={closeMenus}
                className="block rounded-lg px-4 py-3 text-sm font-semibold text-[#173f33] hover:bg-[#f1e5cb]"
              >
                Contact Us
              </NavLink>

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
