
import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Search,
  Heart,
  ShoppingBag,
  UserRound,
  ChevronDown,
  Menu,
  X,
  Gem,
  Truck,
  ShieldCheck,
  Headset,
  Phone,
  MapPin,
  LogOut,
  User,
} from "lucide-react";
import PageContainer from "./PageContainer";

const Navbar = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [openDropdown, setOpenDropdown] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  // Connect these values to your existing application state/API.
  const wishlistCount = 0;
  const cartCount = 0;
  const user = null;

  const categories = [
    { name: "Necklaces", slug: "necklaces" },
    { name: "Earrings", slug: "earrings" },
    { name: "Bangles", slug: "bangles" },
    { name: "Rings", slug: "rings" },
    { name: "Chains", slug: "chains" },
    { name: "Mangalsutra", slug: "mangalsutra" },
    { name: "Temple Jewellery", slug: "temple-jewellery" },
    { name: "Coins & Bars", slug: "coins-bars" },
    { name: "Silver Articles", slug: "silver-articles" },
  ];

  const metals = [
    { name: "Gold Jewellery", slug: "gold" },
    { name: "Diamond Jewellery", slug: "diamond" },
    { name: "Silver Jewellery", slug: "silver" },
    { name: "Platinum Jewellery", slug: "platinum" },
  ];

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

  const closeMenus = () => {
    setOpenDropdown(null);
    setMobileMenuOpen(false);
    setAccountOpen(false);
  };

  const handleCategoryClick = (slug) => {
    closeMenus();
    navigate(`/shop?category=${encodeURIComponent(slug)}`);
  };

  const handleMetalClick = (slug) => {
    closeMenus();
    navigate(`/shop?metal=${encodeURIComponent(slug)}`);
  };

  return (
    <header className="relative z-50 w-full">

      

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

              <NavLink to="/about" className={navLinkClass}>
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
                  onClick={() =>
                    setOpenDropdown(
                      openDropdown === "categories" ? null : "categories"
                    )
                  }
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
                  <div className="absolute left-0 top-full z-50 w-60 overflow-hidden rounded-b-xl border border-[#e6d5b2] bg-[#fffdf7] py-2 shadow-[0_12px_28px_rgba(30,50,35,0.16)]">
                    <div className="border-b border-[#eee4d0] px-4 py-3">
                      <p className="font-serif text-base text-[#064638]">
                        Explore Collections
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Find your favourite design
                      </p>
                    </div>

                    {categories.map((category) => (
                      <button
                        key={category.slug}
                        type="button"
                        onClick={() => handleCategoryClick(category.slug)}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-[#29483b] transition hover:bg-[#f8f0df] hover:text-[#a87519]"
                      >
                        {category.name}
                        <span className="text-[#c8a04f]">›</span>
                      </button>
                    ))}
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
                  <div className="absolute left-0 top-full z-50 w-60 overflow-hidden rounded-b-xl border border-[#e6d5b2] bg-[#fffdf7] py-2 shadow-[0_12px_28px_rgba(30,50,35,0.16)]">
                    <div className="border-b border-[#eee4d0] px-4 py-3">
                      <p className="font-serif text-base text-[#064638]">
                        Shop by Metal
                      </p>
                    </div>

                    {metals.map((metal) => (
                      <button
                        key={metal.slug}
                        type="button"
                        onClick={() => handleMetalClick(metal.slug)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-[#29483b] transition hover:bg-[#f8f0df] hover:text-[#a87519]"
                      >
                        {metal.name}
                        <Gem size={15} className="text-[#c8a04f]" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <NavLink to="/contactus" className={navLinkClass}>
                Contact Us
              </NavLink>
            </div>

            {/* Desktop search and actions */}
            <div className="hidden shrink-0 items-center gap-3 lg:flex xl:gap-5">

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
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search for jewellery..."
                  aria-label="Search jewellery"
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

              {/* Wishlist */}
              <button
                type="button"
                onClick={() => navigate("/wishlist")}
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
                      <User size={21} />
                    ) : (
                      <UserRound size={21} />
                    )}
                  </span>
                  <span className="text-xs font-medium">Account</span>
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
                          onClick={() => {
                            // Connect your existing logout handler here.
                            setAccountOpen(false);
                          }}
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
                onClick={() => navigate("/wishlist")}
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
                onClick={() => navigate("/cart")}
                aria-label="Cart"
                className="relative rounded-full p-2 text-[#064638] hover:bg-[#eee3cc]"
              >
                <ShoppingBag size={21} />
                {cartCount > 0 && (
                  <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c78b20] px-1 text-[9px] text-white">
                    {cartCount}
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
          <form
            onSubmit={handleSearch}
            className="relative z-10 mb-3 flex items-center overflow-hidden rounded-full border border-[#d4aa59] bg-white/90 p-1 lg:hidden"
          >
            <Search size={19} className="ml-3 shrink-0 text-[#174638]" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search for jewellery..."
              aria-label="Search jewellery"
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
                to="/about"
                onClick={closeMenus}
                className="block rounded-lg px-4 py-3 text-sm font-semibold text-[#173f33] hover:bg-[#f1e5cb]"
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
                className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold text-[#173f33] hover:bg-[#f1e5cb]"
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
                      key={category.slug}
                      type="button"
                      onClick={() => handleCategoryClick(category.slug)}
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
                      key={metal.slug}
                      type="button"
                      onClick={() => handleMetalClick(metal.slug)}
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
  );
};

export default Navbar;
