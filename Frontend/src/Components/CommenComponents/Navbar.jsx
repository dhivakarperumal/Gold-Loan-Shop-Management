import React, { useContext, useState, useRef, useEffect } from "react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../PrivateRouter/AuthContext";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import {
  Menu,
  X,
  User,
  Heart
} from "lucide-react";
import PageContainer from "./PageContainer";
import api from "../../api";
import { FiHome, FiShoppingBag, FiGrid, FiFileText, FiPhone, FiChevronDown } from "react-icons/fi";
import { FiChevronRight, FiTag } from "react-icons/fi";
import WishlistDrawer from "./WishlistDrawer";

const Navbar = () => {

  const { user, logout } = useContext(AuthContext);
  const { wishlist } = useContext(StoreContext);
  const [mobilePages, setMobilePages] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenu, setMobileMenu] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoryMenu, setCategoryMenu] = useState(false);
  const [pagesMenu, setPagesMenu] = useState(false);
  const [mobileCategory, setMobileCategory] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);

  const menuRef = useRef();
  const categoryRef = useRef();
  const pagesRef = useRef();
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

      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setCategoryMenu(false);
      }

      if (pagesRef.current && !pagesRef.current.contains(e.target)) {
        setPagesMenu(false);
      }

    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);

  }, []);

  // Fetch categories
  useEffect(() => {

    const fetchCategories = async () => {
      try {
        const res = await api.get("/categories");
        setCategories(res.data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchCategories();

  }, []);

const navClass = ({ isActive }) =>
  `px-4 py-1.5 rounded-lg text-sm font-medium transition
  ${
    isActive
      ? "bg-gradient-to-r from-primary-light to-secondary text-white shadow"
      : "text-gray-600 hover:bg-primary-light/10 hover:text-primary"
  }`;

  return (

    <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 py-1 shadow-sm backdrop-blur-lg">

      <PageContainer className="px-3 sm:px-5 lg:px-[3%]">

        <div className="flex min-h-14 items-center justify-between gap-2 sm:min-h-[68px]">

          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Sri Golds home">
            <img
              src="/images/logo.png"
              alt="Sri Golds"
              className="h-11 w-[4.5rem] object-contain sm:h-14 sm:w-24 lg:h-16 lg:w-28"
            />
          </Link>

          {/* Desktop Links */}

          <div className="hidden flex-1 justify-center lg:flex">

            <div className="flex items-center gap-1.5 text-sm xl:gap-2 xl:text-base">

              <NavLink to="/" className={navClass}>
                Home
              </NavLink>

              <NavLink to="/shop" className={navClass}>
                Shop
              </NavLink>

              {/* Categories */}

              <div className="relative" ref={categoryRef}>

                <button
                  onClick={() => {
                    setCategoryMenu(!categoryMenu);
                    setPagesMenu(false);
                  }}
                  className="flex cursor-pointer items-center gap-1 text-gray-600 hover:text-primary transition"
                >
                  Categories
                  <FiChevronDown
                    className={`transition-transform ${categoryMenu ? "rotate-180" : ""}`}
                  />
                </button>

                {categoryMenu && (

                  <div className="absolute  top-10 left-0 w-48 bg-white border border-primary rounded-xl shadow-xl overflow-hidden animate-dropdown">

                    {categories.map((cat) => (

                      <NavLink
                        key={cat.id}
                        to={`/category/${cat.slug || cat.name}`}
                        onClick={() => setCategoryMenu(false)}
                        className={({ isActive }) =>
                          `block px-4 py-3 text-sm transition
    ${isActive
                            ? "bg-gradient-to-r from-primary-light via-secondary to-secondary-light text-white"
                            : "text-gray-700 hover:bg-gradient-to-r from-primary-light via-secondary to-secondary-light hover:text-white"
                          }`
                        }
                      >
                        {cat.name}
                      </NavLink>

                    ))}

                  </div>

                )}

              </div>

              {/* Pages */}

              <div className="relative" ref={pagesRef}>

                <button
                  onClick={() => {
                    setPagesMenu(!pagesMenu);
                    setCategoryMenu(false);
                  }}
                  className="flex items-center cursor-pointer gap-1 text-gray-600 hover:text-primary transition"
                >
                  Pages
                  <FiChevronDown
                    className={`transition-transform ${pagesMenu ? "rotate-180" : ""}`}
                  />
                </button>

                {pagesMenu && (

                  <div className="absolute top-10 left-0 w-44 bg-white border border-primary rounded-xl shadow-xl overflow-hidden animate-dropdown">

                    <NavLink
                      to="/about"
                      onClick={() => setPagesMenu(false)}
                      className={({ isActive }) =>
                        `block px-4 py-3 text-sm transition
    ${isActive
                          ? "bg-gradient-to-r from-primary-light via-secondary to-secondary-light text-white"
                          : "text-gray-700 hover:bg-gradient-to-r from-primary-light via-secondary to-secondary-light hover:text-white"
                        }`
                      }
                    >
                      About
                    </NavLink>
                    <NavLink
                      to="/termsandconditions"
                      onClick={() => setPagesMenu(false)}
                      className={({ isActive }) =>
                        `block px-4 py-3 text-sm transition
    ${isActive
                          ? "bg-gradient-to-r from-primary-light via-secondary to-secondary-light text-white"
                          : "text-gray-700 hover:bg-gradient-to-r from-primary-light via-secondary to-secondary-light hover:text-white"
                        }`
                      }
                    >
                      Terms And Conditions
                    </NavLink>

                  </div>

                )}

              </div>

              <NavLink to="/contactus" className={navClass}>
                Contact Us
              </NavLink>

            </div>

          </div>

          {/* Right Icons */}

          <div className="flex shrink-0 items-center gap-2 sm:gap-3 lg:gap-4">

            <button
              type="button"
              onClick={() => setWishlistOpen(true)}
              aria-label="Open favorites"
              className="relative rounded-full p-2 text-primary transition hover:bg-emerald-50 hover:text-primary-light"
            >
              <Heart className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
              {wishlist.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlist.length > 9 ? '9+' : wishlist.length}
                </span>
              )}
            </button>

            {/* User Dropdown */}

            {user ? (

              <div className="relative hidden sm:block" ref={menuRef}>

                <button
                  onClick={() => setUserMenu(!userMenu)}
                  className="w-9 h-9 cursor-pointer rounded-full bg-gradient-to-r from-primary to-primary-light text-white flex items-center justify-center font-semibold shadow-md hover:scale-110 transition"
                >
                  {user.username?.charAt(0).toUpperCase()}
                </button>

                {userMenu && (

                  <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-dropdown">

                    <Link
                      to="/account"
                      className="block px-4 py-3 text-sm hover:bg-gray-100"
                      onClick={() => setUserMenu(false)}
                    >
                      My Account
                    </Link>

                    {user.role === "admin" && (
                      <Link
                        to="admin"
                        className="block px-4 py-3 text-sm hover:bg-gray-100"
                        onClick={() => setUserMenu(false)}
                      >
                        Admin Panel
                      </Link>
                    )}

                    <button
                      onClick={() => setLogoutConfirm(true)}
                      className="w-full cursor-pointer text-left px-4 py-3 text-sm hover:bg-gray-100 text-red-500"
                    >
                      Logout
                    </button>

                  </div>

                )}

              </div>

            ) : (

              <Link to="/login" aria-label="Sign in" className="hidden rounded-full p-2 text-primary transition hover:bg-emerald-50 hover:text-primary-light sm:block">
                <User className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
              </Link>

            )}

            {/* Mobile Menu Button */}

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
              className="flex h-10 w-10 items-center justify-center rounded-full text-primary transition hover:bg-emerald-50 lg:hidden"
            >
              {mobileMenu ? <X size={23} /> : <Menu size={23} />}
            </button>

          </div>

        </div>

      </PageContainer>

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
                  <FiChevronRight className="rotate-180" /> Back
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
                <X size={21} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {!mobileCategory && !mobilePages && (
                <>
                  <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Browse the store</p>
                  <div className="space-y-1.5">
                    {[
                      { to: "/", label: "Home", icon: FiHome },
                      { to: "/shop", label: "Shop", icon: FiShoppingBag },
                      { to: "/contactus", label: "Contact Us", icon: FiPhone },
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
                    <button
                      type="button"
                      onClick={() => setMobileCategory(true)}
                      className="flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#004D40]"
                    >
                      <span className="flex items-center gap-3"><FiGrid size={18} /> Categories</span>
                      <FiChevronRight size={17} className="text-slate-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobilePages(true)}
                      className="flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#004D40]"
                    >
                      <span className="flex items-center gap-3"><FiFileText size={18} /> Pages</span>
                      <FiChevronRight size={17} className="text-slate-400" />
                    </button>
                  </div>

                  <div className="my-5 border-t border-slate-100" />
                  <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Your account</p>
                  <div className="space-y-1.5">
                    {user ? (
                      <>
                        <Link to="/account" onClick={closeMobileMenu} className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#004D40]">
                          <User size={18} /> My Account
                        </Link>
                        {user.role === "admin" && (
                          <Link to="/admin" onClick={closeMobileMenu} className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#004D40]">
                            <User size={18} /> Admin Panel
                          </Link>
                        )}
                        <button type="button" onClick={() => { setLogoutConfirm(true); closeMobileMenu(); }} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50">
                          <User size={18} /> Sign Out
                        </button>
                      </>
                    ) : (
                      <Link to="/login" onClick={closeMobileMenu} className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#004D40]">
                        <User size={18} /> Sign In / Register
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
                      key={category.id}
                      to={`/category/${category.slug || category.name}`}
                      onClick={closeMobileMenu}
                      className={({ isActive }) =>
                        `flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
                          isActive ? "bg-emerald-50 text-[#004D40]" : "text-slate-600 hover:bg-slate-50 hover:text-[#004D40]"
                        }`
                      }
                    >
                      <span className="flex items-center gap-3"><FiTag size={17} />{category.name}</span>
                      <FiChevronRight size={16} className="text-slate-400" />
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
                    { to: "/about", label: "About", icon: FiFileText },
                    { to: "/termsandconditions", label: "Terms and Conditions", icon: FiFileText },
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
    </nav>

  );
};

export default Navbar;