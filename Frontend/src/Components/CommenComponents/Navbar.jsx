import React, { useContext, useState, useRef, useEffect } from "react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { AuthContext } from "../../PrivateRouter/AuthContext";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import PageContainer from "./PageContainer";
import api from "../../api";
import {
  FaBars,
  FaChevronDown,
  FaChevronRight,
  FaFileAlt,
  FaGem,
  FaHeart,
  FaHome,
  FaPhoneAlt,
  FaSearch,
  FaShoppingBag,
  FaTag,
  FaThLarge,
  FaTimes,
  FaUser,
} from "react-icons/fa";
import WishlistDrawer from "./WishlistDrawer";
import CartDrawer from "./CartDrawer";

const Navbar = () => {

  const { user, logout } = useContext(AuthContext);
  const { cart, wishlist } = useContext(StoreContext);
  const [mobilePages, setMobilePages] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenu, setMobileMenu] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [categories, setCategories] = useState([]);
  const [metals, setMetals] = useState([]);
  const [openDropdown, setOpenDropdown] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [mobileCategory, setMobileCategory] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);

  const menuRef = useRef();
  const dropdownRef = useRef();
  const searchButtonRef = useRef();
  const searchInputRef = useRef();
  const searchPanelRef = useRef();
  const currentPathRef = useRef(location.pathname);

  const confirmLogout = () => {
    logout();
    setLogoutConfirm(false);
    setUserMenu(false);
    setMobileMenu(false);
    navigate("/login");
  };

  const closeMobileMenu = () => {
    setMobileMenu(false);
    setMobileCategory(false);
    setMobilePages(false);
  };

  useEffect(() => {
    if (!mobileMenu) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeMobileMenu();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenu]);

  useEffect(() => {
    if (currentPathRef.current !== location.pathname) {
      currentPathRef.current = location.pathname;
      closeMobileMenu();
    }
  }, [location.pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {

    const handler = (e) => {

      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenu(false);
      }

      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown("");
        setSelectedCategory(null);
      }

      if (
        searchButtonRef.current &&
        !searchButtonRef.current.contains(e.target) &&
        searchPanelRef.current &&
        !searchPanelRef.current.contains(e.target)
      ) {
        setSearchOpen(false);
      }

    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);

  }, []);

  useEffect(() => {
    if (!searchOpen) return undefined;

    searchInputRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen]);

  useEffect(() => {
    const query = searchTerm.trim();
    if (!searchOpen || query.length < 2) return undefined;

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
  }, [searchOpen, searchTerm]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchNavigationData = async () => {
      try {
        const [categoryResponse, metalResponse] = await Promise.all([
          api.get("/categories", { signal: controller.signal }),
          api.get("/metals", { signal: controller.signal }),
        ]);

        if (!Array.isArray(categoryResponse.data) || !Array.isArray(metalResponse.data)) {
          throw new TypeError("Navigation category and metal responses must be arrays");
        }
        setCategories(
          categoryResponse.data
            .filter((category) => (category.status || "Active") === "Active")
            .sort((first, second) => Number(first.id) - Number(second.id))
        );
        setMetals(metalResponse.data.filter((metal) => metal.status === "Active"));
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Failed to fetch navbar categories and metals:", error);
        }
      }
    };

    fetchNavigationData();
    return () => controller.abort();
  }, []);

  const getMetalImageUrl = (image) => {
    if (!image || /^(https?:|data:|blob:)/i.test(image)) return image || "";
    const backendUrl = (
      import.meta.env.VITE_BACKEND_URL ||
      import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
      "http://localhost:5000"
    ).replace(/\/$/, "");
    return `${backendUrl}${image.startsWith("/") ? image : `/${image}`}`;
  };

  const getSearchProductImage = (product) => {
    let images = product.images;
    if (typeof images === "string") {
      try {
        images = JSON.parse(images);
      } catch {
        images = [images];
      }
    }
    const firstImage = Array.isArray(images) ? images[0] : images;
    const imagePath = typeof firstImage === "string"
      ? firstImage
      : firstImage?.url || firstImage?.path || firstImage?.src;
    return imagePath ? getMetalImageUrl(imagePath) : "";
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    const query = searchTerm.trim();
    if (!query) {
    toast.error("Enter a product name or code to search.");
    searchInputRef.current?.focus();
    return;
    }

    setSearching(true);
    setSearchError(false);
    try {
    const response = await api.get("/products", {
      params: { page: 1, limit: 8, search: query, status: "Active" },
    });
    if (!Array.isArray(response.data?.products)) {
      throw new TypeError("The product search response must contain a products array");
    }

    const products = response.data.products;
    setSearchResults(products);
    if (products.length === 0) {
      toast.error("No matching active products found.");
      return;
    }

    const normalizedQuery = query.toLowerCase();
    const product = products.find((item) =>
      [item.name, item.product_code].some(
        (value) => String(value || "").toLowerCase() === normalizedQuery
      )
    ) || products[0];
    const productId = product.id ?? product.product_id ?? product.productId;
    if (!productId) {
      throw new TypeError("The matching product has no valid ID");
    }
    setSearchOpen(false);
    navigate(`/product/${productId}`);
    } catch (error) {
    console.error("Failed to search products:", error);
    setSearchError(true);
    toast.error(error.response?.data?.message || "Could not search products.");
    } finally {
    setSearching(false);
    }
  };

  const openProductDetails = (product) => {
    const productId = product.id ?? product.product_id ?? product.productId;
    if (!productId) {
    toast.error("This product cannot be opened because its ID is missing.");
    return;
    }
    setSearchOpen(false);
    navigate(`/product/${productId}`);
  };

  const getCategorySubcategories = (category) =>
    Array.isArray(category.subcategory) ? category.subcategory.filter(Boolean) : [];

  const getUserInitial = () =>
    String(user?.name || user?.username || user?.email || "?").trim().charAt(0).toUpperCase();
  const cartItemCount = cart.reduce((total, item) => total + Number(item.quantity || 0), 0);

  return (

    <nav className="sticky top-0 z-50 border-b-2 border-[#d7a640] bg-gradient-to-r from-[#fffaf0] via-[#fffdf8] to-[#fff8e9] shadow-[0_4px_16px_rgba(74,49,17,0.12)]">

      <PageContainer className="px-3 sm:px-5 lg:px-[3%]">
        <div className="flex min-h-[76px] items-center gap-2 xl:min-h-[104px] xl:gap-5">
          <Link to="/" className="flex shrink-0 items-center" aria-label="Sri Golds home">
            <img src="/images/logo.png" alt="Sri Golds" className="h-12 w-20 object-contain sm:h-14 sm:w-24 xl:h-[76px] xl:w-32" />
          </Link>

          <div ref={dropdownRef} className="hidden min-w-0 flex-1 items-center justify-center xl:flex">
            <div className="flex h-full min-w-0 items-center">
              <NavLink to="/" end className={({ isActive }) => `flex h-[76px] items-center justify-center border-r border-[#e9dfca]/70 px-3 text-sm font-semibold transition hover:text-[#b77912] 2xl:px-5 ${isActive ? "text-[#b77912]" : ""}`}>
                <span className="text-[#174a38]">Home</span>
              </NavLink>
              <NavLink to="/shop" className={({ isActive }) => `flex h-[76px] items-center justify-center border-r border-[#e9dfca]/70 px-3 text-sm font-semibold transition hover:text-[#b77912] 2xl:px-5 ${isActive ? "text-[#b77912]" : ""}`}>
                <span className="text-[#174a38]">Explore</span>
              </NavLink>

              <div className="relative h-full">
                <button
                  type="button"
                  aria-expanded={openDropdown === "categories"}
                  onClick={() => {
                    setOpenDropdown(openDropdown === "categories" ? "" : "categories");
                    setSelectedCategory(categories[0] || null);
                  }}
                  className={`flex h-[76px] items-center justify-center border-r border-[#e9dfca]/70 px-3 text-sm font-semibold transition hover:text-[#b77912] 2xl:px-5 ${openDropdown === "categories" ? "text-[#b77912]" : ""}`}
                >
                  <span className="flex items-center gap-1 text-[#174a38]">Category <FaChevronDown className={`text-[#174a38] transition-transform ${openDropdown === "categories" ? "rotate-180" : ""}`} /></span>
                </button>
                {openDropdown === "categories" && (
                  <div className="absolute left-0 top-full z-50 flex min-w-[300px] rounded-xl border border-[#efe5d4] bg-white p-2 shadow-xl">
                    <div className="max-h-[min(70vh,520px)] w-[275px] overflow-y-auto">
                      {categories.map((category) => {
                        const image = Array.isArray(category.images) ? category.images[0] : category.images;
                        return (
                          <div
                            key={category.id || category.catId}
                            onMouseEnter={() => setSelectedCategory(category)}
                            onFocus={() => setSelectedCategory(category)}
                            className={`flex items-center rounded-lg pr-2 transition ${(selectedCategory?.id || selectedCategory?.catId) === (category.id || category.catId) ? "bg-[#fff8e9]" : "hover:bg-[#fffaf0]"}`}
                          >
                            <Link
                              to={`/category/${category.slug || category.name}`}
                              onClick={() => setOpenDropdown("")}
                              className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2.5 text-sm font-medium text-[#30271b]"
                            >
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#fbf5e9]">
                                {image ? <img src={getMetalImageUrl(image)} alt="" className="h-8 w-8 object-contain" loading="lazy" /> : <FaTag className="text-[#174a38]" />}
                              </span>
                              <span className="truncate">{category.name}</span>
                            </Link>
                            <button
                              type="button"
                              aria-label={`Show ${category.name} subcategories`}
                              onClick={() => setSelectedCategory(category)}
                              className="p-2 text-[#b47a25] hover:text-[#7c5318]"
                            >
                              <FaChevronRight />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {selectedCategory && (
                      <div className="ml-2 w-[230px] border-l border-[#efe5d4] py-1 pl-2">
                        <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#9a7a42]">{selectedCategory.name}</p>
                        {getCategorySubcategories(selectedCategory).length ? getCategorySubcategories(selectedCategory).map((subcategory) => (
                          <Link
                            key={subcategory}
                            to={`/category/${selectedCategory.slug || selectedCategory.name}?subcategory=${encodeURIComponent(subcategory)}`}
                            onClick={() => setOpenDropdown("")}
                            className="block rounded-lg px-3 py-2.5 text-sm text-[#514638] transition hover:bg-[#fff8e9] hover:text-[#8c5e13]"
                          >
                            {subcategory}
                          </Link>
                        )) : (
                          <p className="px-3 py-2 text-sm text-[#8a8174]">No subcategories</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="relative h-full">
                <button
                  type="button"
                  aria-expanded={openDropdown === "metals"}
                  onClick={() => setOpenDropdown(openDropdown === "metals" ? "" : "metals")}
                  className={`flex h-[76px] items-center justify-center border-r border-[#e9dfca]/70 px-3 text-sm font-semibold transition hover:text-[#b77912] 2xl:px-5 ${openDropdown === "metals" ? "text-[#b77912]" : ""}`}
                >
                  <span className="flex items-center gap-2 text-[#174a38]">
                    Metal
                    <FaChevronDown className={`text-[#174a38] transition-transform ${openDropdown === "metals" ? "rotate-180" : ""}`} />
                  </span>
                </button>
                {openDropdown === "metals" && (
                  <div className="absolute left-0 top-full z-50 w-[250px] rounded-xl border border-[#efe5d4] bg-white p-2 shadow-xl">
                    {metals.map((metal) => (
                      <Link
                        key={metal.id}
                        to={`/shop?metal=${encodeURIComponent(metal.name)}`}
                        onClick={() => setOpenDropdown("")}
                        className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium text-[#30271b] transition hover:bg-[#fff8e9] hover:text-[#8c5e13]"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#efe5d4] bg-[#fbf5e9]">
                          {metal.image ? <img src={getMetalImageUrl(metal.image)} alt="" className="h-full w-full object-cover" loading="lazy" /> : <FaGem className="text-lg text-[#174a38]" />}
                        </span>
                        <span className="flex-1">{metal.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link to="/contactus" className="flex h-[76px] items-center justify-center px-3 text-sm font-semibold transition hover:text-[#b77912] 2xl:px-5">
                <span className="text-[#174a38]">Contact Us</span>
              </Link>
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2 xl:ml-0">

            <form onSubmit={handleSearch} className="hidden min-w-0 items-center overflow-hidden rounded-full border border-[#d3a342] bg-white/80 shadow-sm xl:flex xl:w-[220px] 2xl:w-[300px]">
              <FaSearch className="ml-4 shrink-0 text-[#174a38]" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setSearchResults([]);
                  setSearchError(false);
                }}
                placeholder="Search for jewellery..."
                aria-label="Search jewellery"
                className="min-w-0 flex-1 bg-transparent px-3 py-3 text-xs outline-none placeholder:text-[#827b70]"
              />
              <button
                type="submit"
                aria-label="Submit product search"
                disabled={searching}
                className="mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00483d] text-[#f1c454] transition hover:bg-[#006052] disabled:opacity-60"
              >
                <FaSearch />
              </button>
            </form>

            <button
              ref={searchButtonRef}
              type="button"
              onClick={() => setSearchOpen((isOpen) => !isOpen)}
              aria-label={searchOpen ? "Close search" : "Open search"}
              aria-expanded={searchOpen}
              aria-controls="navbar-search-panel"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#173a32] transition hover:bg-[#f2ead8] xl:hidden"
            >
              <FaSearch className="text-lg" />
            </button>

            <button
              type="button"
              onClick={() => setWishlistOpen(true)}
              aria-label="Open favorites"
              className="relative flex min-w-10 flex-col items-center gap-1 rounded-lg px-1.5 py-1.5 text-[#173a32] transition hover:text-[#a77525] sm:min-w-[58px] sm:px-2 xl:min-w-[62px]"
            >
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(55,45,29,0.12)] sm:h-10 sm:w-10">
                <FaHeart className="text-lg" />
              </span>
              <span className="hidden text-[11px] font-medium sm:block">Wishlist</span>
              {wishlist.length > 0 && (
                <span className="absolute right-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#d69b17] px-1 text-[9px] font-black text-white sm:right-2">
                  {wishlist.length > 9 ? '9+' : wishlist.length}
                </span>
              )}
            </button>

            {user ? (
              <div className="relative hidden sm:block" ref={menuRef}>
                <button
                  type="button"
                  aria-expanded={userMenu}
                  aria-haspopup="menu"
                  onClick={() => setUserMenu((isOpen) => !isOpen)}
                  className="flex min-w-10 cursor-pointer flex-col items-center gap-1 rounded-lg px-1.5 py-1.5 text-[#173a32] transition hover:text-[#a77525] sm:min-w-[58px] sm:px-2 xl:min-w-[62px]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00483d] text-sm font-bold uppercase text-white shadow-[0_2px_8px_rgba(55,45,29,0.12)] sm:h-10 sm:w-10" aria-hidden="true">
                    {getUserInitial()}
                  </span>
                  <span className="text-[11px] font-medium">Account</span>
                </button>
                {userMenu && (
                  <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-[#efe5d4] bg-white shadow-xl">
                    <Link to="/account" role="menuitem" className="block px-4 py-3 text-sm hover:bg-[#fff8e9]" onClick={() => setUserMenu(false)}>My Account</Link>
                    {user.role === "admin" && (
                      <Link to="/admin" role="menuitem" className="block px-4 py-3 text-sm hover:bg-[#fff8e9]" onClick={() => setUserMenu(false)}>Admin Panel</Link>
                    )}
                    <button type="button" role="menuitem" onClick={() => setLogoutConfirm(true)} className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50">Logout</button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" aria-label="Account / Sign in" className="hidden min-w-10 flex-col items-center gap-1 rounded-lg px-1.5 py-1.5 text-[#173a32] transition hover:text-[#a77525] sm:flex sm:min-w-[58px] sm:px-2 xl:min-w-[62px]">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(55,45,29,0.12)] sm:h-10 sm:w-10">
                  <FaUser className="text-lg" />
                </span>
                <span className="text-[11px] font-medium">Account</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => {
                setMobileCategory(false);
                setMobilePages(false);
                setMobileMenu((isOpen) => !isOpen);
              }}
              aria-label={mobileMenu ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenu}
              aria-controls="store-mobile-navigation"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#174a38] transition hover:bg-[#fff8e9] xl:hidden"
            >
              {mobileMenu ? <FaTimes size={21} /> : <FaBars size={21} />}
            </button>

          </div>

        </div>

      </PageContainer>

      {searchOpen && (
        <div
          ref={searchPanelRef}
          id="navbar-search-panel"
          className="absolute inset-x-0 top-full z-50 border-t border-[#efe5d4] bg-white px-3 py-4 shadow-lg sm:px-5 xl:hidden"
        >
          <PageContainer className="flex items-center gap-3">
            <div className="relative mx-auto w-full max-w-2xl flex-1">
              <form onSubmit={handleSearch} className="flex items-center overflow-hidden rounded-lg border border-[#d9d9d9] bg-white shadow-sm">
                <FaSearch className="ml-3 shrink-0 text-[#174a38]" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setSearchResults([]);
                    setSearchError(false);
                  }}
                  placeholder="Search for jewelry, collections..."
                  aria-label="Search jewelry and collections"
                  aria-autocomplete="list"
                  aria-controls="navbar-product-search-results"
                  className="min-w-0 flex-1 px-3 py-3 text-sm outline-none placeholder:text-gray-500"
                />
                <button type="submit" disabled={searching} className="flex h-11 shrink-0 items-center justify-center gap-2 bg-[#174a38] px-4 text-sm font-semibold text-white transition hover:bg-[#10382b] disabled:cursor-wait disabled:opacity-75">
                  <FaSearch />
                  <span>{searching ? "Searching..." : "Search"}</span>
                </button>
              </form>
              {searchTerm.trim().length >= 2 && (
                <div
                  id="navbar-product-search-results"
                  className="absolute inset-x-0 top-full z-50 mt-2 max-h-[min(60vh,420px)] overflow-y-auto rounded-xl border border-[#eadfce] bg-white p-2 shadow-xl"
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
                              <FaGem className="text-[#174a38]" aria-hidden="true" />
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
              )}
            </div>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#174a38] transition hover:bg-[#edf4ef]"
            >
              <FaTimes />
            </button>
          </PageContainer>
        </div>
      )}

      {/* Logout Modal */}

      {logoutConfirm && (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-white rounded-xl shadow-xl w-[320px] p-6 text-center">

            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Confirm Logout
            </h2>

            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to logout?
            </p>

            <div className="flex justify-center gap-4">

              <button
                onClick={() => setLogoutConfirm(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                onClick={confirmLogout}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600"
              >
                Logout
              </button>

            </div>

          </div>

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
                    setMobileCategory(false);
                    setMobilePages(false);
                  }}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-white/90 hover:bg-white/10"
                >
                  <FaChevronRight className="rotate-180" /> Back
                </button>
              ) : (
                <Link to="/" onClick={closeMobileMenu} className="flex items-center gap-2">
                  <img src="/images/logo.png" alt="" className="h-10 w-14 rounded-lg bg-white object-contain p-1" />
                  <span className="font-serif text-lg font-semibold text-[#F5C45E]">Sri Golds</span>
                </Link>
              )}
              <button
                type="button"
                onClick={closeMobileMenu}
                aria-label="Close navigation menu"
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15"
              >
                <FaTimes size={20} />
              </button>
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
                              {metal.image ? (
                                <img
                                  src={getMetalImageUrl(metal.image)}
                                  alt=""
                                  className="h-7 w-8 object-contain"
                                  loading="lazy"
                                />
                              ) : (
                                <FaGem className="text-xl text-[#174a38]" aria-hidden="true" />
                              )}
                              <span className="truncate">{metal.name}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setMobileCategory(true)}
                      className="flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#004D40]"
                    >
                      <span className="flex items-center gap-3"><FaThLarge size={17} className="text-[#174a38]" /> Categories</span>
                      <FaChevronRight size={15} className="text-[#174a38]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobilePages(true)}
                      className="flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#004D40]"
                    >
                      <span className="flex items-center gap-3"><FaFileAlt size={17} className="text-[#174a38]" /> Pages</span>
                      <FaChevronRight size={15} className="text-[#174a38]" />
                    </button>
                  </div>

                  <div className="my-5 border-t border-slate-100" />
                  <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Your account</p>
                  <div className="space-y-1.5">
                    {user ? (
                      <>
                        <Link to="/account" onClick={closeMobileMenu} className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#004D40]">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#174a38] text-xs font-bold uppercase text-white">{getUserInitial()}</span> My Account
                        </Link>
                        {user.role === "admin" && (
                          <Link to="/admin" onClick={closeMobileMenu} className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#004D40]">
                            <FaUser size={17} className="text-[#174a38]" /> Admin Panel
                          </Link>
                        )}
                        <button type="button" onClick={() => { setLogoutConfirm(true); closeMobileMenu(); }} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50">
                          <FaUser size={17} className="text-[#174a38]" /> Sign Out
                        </button>
                      </>
                    ) : (
                      <Link to="/login" onClick={closeMobileMenu} className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#004D40]">
                        <FaUser size={17} className="text-[#174a38]" /> Sign In / Register
                      </Link>
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
                      to={`/category/${category.slug || category.name}`}
                      onClick={closeMobileMenu}
                      className={({ isActive }) =>
                        `flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
                          isActive ? "bg-emerald-50 text-[#004D40]" : "text-slate-600 hover:bg-slate-50 hover:text-[#004D40]"
                        }`
                      }
                    >
                      <span className="flex items-center gap-3"><FaTag size={16} className="text-[#174a38]" />{category.name}</span>
                      <FaChevronRight size={14} className="text-[#174a38]" />
                    </NavLink>
                  )) : (
                    <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">No categories available.</p>
                  )}
                </div>
              )}

              {mobilePages && (
                <div className="space-y-1.5">
                  <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Information</p>
                  {[
                    { to: "/about", label: "About", icon: FaFileAlt },
                    { to: "/termsandconditions", label: "Terms and Conditions", icon: FaFileAlt },
                  ].map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
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
                </div>
              )}
            </div>
          </aside>
      </div>
      <WishlistDrawer isOpen={wishlistOpen} onClose={() => setWishlistOpen(false)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </nav>

  );
};

export default Navbar;