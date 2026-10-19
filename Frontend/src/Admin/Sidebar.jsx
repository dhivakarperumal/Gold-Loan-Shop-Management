import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  BarChart3,
  X,
  ChevronDown,
  ChevronLeft,
  Home,
  Tag,
  PlusCircle,
  List,
  Layers,
  Archive,
  Handshake,
  Megaphone,
  Video,
  Star,
  Gem,
  FilePlus,
  Files,
  HandCoins,
  RefreshCw,
  Clock3,
  Coins
} from "lucide-react";

/* ================= NAV ITEMS ================= */
const navItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },

  { path: "/admin/settings/daily-gold-rate", label: "Daily Gold Rate", icon: Coins },
  { path: "/admin/billings", label: "Billing", icon: Files },
  {
    label: "Loan Management",
    icon: HandCoins,
    children: [
      {
        path: "/admin/loans/customermanagement",
        activePaths: ["/admin/loans/customers/:id"],
        label: "Customer Management",
        icon: FilePlus
      },
      { path: "/admin/kyc", label: "KYC Review", icon: Users },
      {
        path: "/admin/loans/allloans",
        activePaths: [
          "/admin/loans/createloan",
          "/admin/loans/edit/:id",
          "/admin/loans/details/:id",
          "/admin/loans/interestmanagement"
        ],
        label: "All Loans",
        icon: Files
      },
      { path: "/admin/loans/loanrepayment", label: "Loan Repayment", icon: HandCoins },
      { path: "/admin/loans/loanreniwel", label: "Loan Renewal", icon: RefreshCw },
      { path: "/admin/loans/goldrelease", label: "Gold Release", icon: Gem },
      { path: "/admin/loans/overdueloans", label: "Overdue Loans", icon: Clock3 },
      
    ],
  },


  {
    label: "Products",
    icon: Package,
    children: [
      {
        path: "/admin/products/all",
        activePaths: ["/admin/products/:id"],
        label: "All Products",
        icon: List
      },
      {
        path: "/admin/products/add",
        activePaths: ["/admin/products/edit/:id"],
        label: "Add Product",
        icon: PlusCircle
      },
      {
        path: "/admin/products/stock",
        activePaths: ["/admin/products/stock/add"],
        label: "Stock Details",
        icon: Archive
      },
      { path: "/admin/products/category", label: "Categories", icon: Layers },
      { path: "/admin/metals", label: "Add Metal", icon: Gem },
    ],
  },

  

  {
    label: "Marketings Management",
    icon: Megaphone,
    children: [
      { path: "/admin/banners", label: "Offers & Banners", icon: Tag },
      { path: "/admin/videos", label: "Showcase Videos", icon: Video },
      { path: "/admin/reviews", label: "Reviews", icon: Star },
      { path: "/admin/users/all", label: "Customers", icon: Users },
    ],
  },


  {
    label: "Dealers",
    icon: Handshake,
    children: [
      { path: "/admin/dealers", label: "Dealer Master", icon: List },
      { path: "/admin/dealers/purchases", label: "Purchases & Payables", icon: Files },
      { path: "/admin/dealers/jobs", label: "Goldsmith Job Work", icon: HandCoins },
      { path: "/admin/dealers/refining", label: "Old Gold & Refining", icon: Gem },
    ],
  },

  { path: "/admin/reports", label: "Reports", icon: BarChart3 },
  
  { path: "/", label: "Back Home", icon: Home },
];

/* ================= SIDEBAR ================= */
const Sidebar = ({ isOpen, onClose, collapsed, onToggleCollapse }) => {
  const location = useLocation();

  /* ================= HELPERS & LOGIC ================= */
  const matchesRoute = (routePath) => {
    const currentSegments = location.pathname.split("/").filter(Boolean);
    const routeSegments = routePath.split("/").filter(Boolean);
    const hasDynamicSegment = routeSegments.some(segment => segment.startsWith(":"));

    return (hasDynamicSegment
      ? currentSegments.length === routeSegments.length
      : currentSegments.length >= routeSegments.length) &&
      routeSegments.every((segment, index) =>
        segment.startsWith(":") || segment === currentSegments[index]
      );
  };

  const getActiveChildPath = (item) => {
    if (!item.children) return null;
    const matchingChildren = item.children
      .filter(child => [child.path, ...(child.activePaths || [])].some(matchesRoute))
      .sort((first, second) => {
        const firstSpecificity = first.path.split("/").filter(segment => segment && !segment.startsWith(":")).length;
        const secondSpecificity = second.path.split("/").filter(segment => segment && !segment.startsWith(":")).length;
        return secondSpecificity - firstSpecificity || second.path.length - first.path.length;
      });
    return matchingChildren[0]?.path || null;
  };

  const isActiveRoute = (item) => {
    const currentPath = location.pathname;

    // 1. Strict exact match for root routes to prevent Dashboard/BackHome overlap
    if (item.path === "/" || item.path === "/admin" || item.exact) {
      return currentPath === item.path;
    }

    // 2. Dropdown parent check: check if any child is perfectly active or a sub-path
    if (item.children) {
      return getActiveChildPath(item) !== null;
    }

    // 3. Normal item check: match exact or match as a parent path (with boundary)
    if (item.path) {
      return matchesRoute(item.path);
    }

    return false;
  };

  const [openMenu, setOpenMenu] = useState(() => {
    const activeItem = navItems.find(item => item.children && isActiveRoute(item));
    return activeItem ? activeItem.label : null;
  });

  useEffect(() => {
    const activeItem = navItems.find(item => item.children && isActiveRoute(item));
    if (activeItem) {
      setOpenMenu(activeItem.label);
    }
  }, [location.pathname]);

  /* Dropdown logic - only one open at a time */
  const toggleMenu = (label) => {
    setOpenMenu(prev => prev === label ? null : label);
  };

  return (
    <>
      {/* ========== MOBILE OVERLAY ========== */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden
        transition-opacity ${isOpen ? "opacity-100 visible" : "opacity-0 invisible"}`}
      />

      {/* ========== SIDEBAR ========== */}
      <aside
        className={`
        fixed top-0 left-0 z-50 h-full
        bg-gradient-to-b from-[#07564B] via-[#064A41] to-[#043D37]
        border-r border-white/10 shadow-[12px_0_40px_rgba(2,28,25,0.18)]
        font-sans
        
        flex flex-col transition-all duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
        ${collapsed ? "lg:w-20 w-full" : "w-full lg:w-72"}
      `}
      >
        {/* ========== LOGO ========== */}
        <div className="relative overflow-hidden border-b border-white/10 bg-white/[0.025] px-4 py-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-emerald-300/10 via-transparent to-amber-300/10" />
          <div className={`relative flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-black/15 ring-1 ring-white/30">
              <img
                src="/images/logo.png"
                alt="Sri Golds"
                className="w-11 h-11 object-contain"
              />
            </div>
            {!collapsed && (
              <div className="min-w-0 overflow-hidden">
                <p className="mb-1 truncate font-serif text-lg font-bold leading-none tracking-wide text-[#F5C45E]">
                  Sri Golds
                </p>
                <p className="text-xs font-medium tracking-wide text-emerald-50/75">
                  Admin Panel
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            className="ml-auto rounded-xl border border-transparent p-2 text-white/60 transition-all hover:border-white/10 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========== NAVIGATION ========== */}
        <nav aria-label="Admin navigation" className="hide-scrollbar flex-1 space-y-1.5 overflow-y-auto px-3 py-5">
          {navItems.map((item) => {
            const Icon = item.icon;

            /* ===== DROPDOWN ITEM ===== */
            if (item.children) {
              const isMenuOpen = openMenu === item.label;
              const isAnyChildActive = isActiveRoute(item);

              return (
                <div key={item.label} className="space-y-1">
                  <button
                    onClick={() => toggleMenu(item.label)}
                    aria-expanded={isMenuOpen}
                    title={collapsed ? item.label : undefined}
                    className={`
                      group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200
                      ${isAnyChildActive
                        ? "border-white/10 bg-gradient-to-r from-[#078D7B] to-[#087263] text-white shadow-lg shadow-black/15"
                        : isMenuOpen
                          ? "border-white/10 bg-white/[0.08] text-white"
                          : "border-transparent text-emerald-50/75 hover:border-white/[0.08] hover:bg-white/[0.07] hover:text-white"
                      }
                    `}
                  >
                    <Icon className={`h-5 w-5 shrink-0 transition-colors ${isAnyChildActive ? "text-[#FFE08A]" : "text-emerald-100/75 group-hover:text-white"}`} />

                    {!collapsed && (
                      <>
                        <span className="flex-1 text-sm font-semibold tracking-wide">
                          {item.label}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-emerald-100/60 transition-transform ${isMenuOpen ? "rotate-180 text-white" : ""
                            }`}
                        />
                      </>
                    )}
                  </button>

                  {/* ===== SUB MENU ===== */}
                  {!collapsed && (
                    <div
                      className={`hide-scrollbar ml-3 space-y-1 overflow-y-auto border-l border-white/10 pl-3 transition-all duration-300
                      ${isMenuOpen ? "max-h-80 py-1 opacity-100" : "max-h-0 opacity-0"}`}
                    >
                      {item.children.map((sub) => {
                        const SubIcon = sub.icon;
                        const isActive = getActiveChildPath(item) === sub.path;

                        return (
                          <NavLink
                            key={sub.path}
                            to={sub.path}
                            onClick={() => isOpen && onClose()}
                            title={sub.label}
                            className={`
                              flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium tracking-wide transition-all duration-200
                              ${isActive
                                ? "bg-white/[0.09] text-white shadow-sm ring-1 ring-inset ring-white/[0.06]"
                                : "text-emerald-50/65 hover:bg-white/[0.06] hover:text-white"
                              }
                            `}
                          >
                            <SubIcon className={`h-4 w-4 shrink-0 ${isActive ? "text-[#F5C45E]" : "text-emerald-100/55"}`} />
                            <span className="flex-1">{sub.label}</span>
                            {isActive && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#F5C45E]" />}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            /* ===== NORMAL ITEM ===== */
            const isActive = isActiveRoute(item);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                title={collapsed ? item.label : undefined}
                onClick={() => {
                  setOpenMenu(null);
                  if (isOpen) onClose();
                }}
                className={`
                  group flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200
                  ${isActive
                    ? "border-white/10 bg-gradient-to-r from-[#078D7B] to-[#087263] text-white shadow-lg shadow-black/15"
                    : "border-transparent text-emerald-50/75 hover:border-white/[0.08] hover:bg-white/[0.07] hover:text-white"
                  }
                `}
              >
                <Icon className={`h-5 w-5 shrink-0 transition-colors ${isActive ? "text-[#FFE08A]" : "text-emerald-100/75 group-hover:text-white"}`} />
                {!collapsed && <span className="text-sm font-semibold tracking-wide">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* ========== STORE PROMOTION ========== */}
        {!collapsed && (
          <Link to="/" className="group relative mx-3 mb-4 block h-36 overflow-hidden rounded-2xl border border-white/15 shadow-lg shadow-black/15">
            <img src="/images/Luxury Gold Jewelry Showcase.png" alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#032F2B]/95 via-[#063D37]/70 to-transparent" />
            <div className="relative flex h-full flex-col items-start justify-center p-3">
              <span className="max-w-28 text-sm font-semibold leading-snug text-white">Premium Jewellery Collection</span>
              <span className="mt-2 rounded-lg bg-[#F5C45E] px-2.5 py-1 text-[10px] font-bold text-[#003B3B] transition-colors group-hover:bg-white">View Store →</span>
            </div>
          </Link>
        )}

        {/* ========== COLLAPSE BUTTON ========== */}
        <button
          onClick={onToggleCollapse}
          className="
            hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2
            w-6 h-6 rounded-full
            bg-white border border-slate-200
            shadow-[0_4px_10px_rgba(0,0,0,0.1)]
            items-center justify-center
            text-emerald-800 transition-all hover:scale-110 hover:text-emerald-950 z-50
          "
        >
          <ChevronLeft
            className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""
              }`}
          />
        </button>
      </aside>
    </>
  );
};

export default Sidebar;
