import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
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
  Truck,
  XCircle,
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
  Settings as SettingsIcon,
  Coins
} from "lucide-react";

import api from "../api";

/* ================= NAV ITEMS ================= */
const navItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },


  {
    label: "Loan Management",
    icon: HandCoins,
    children: [
      { path: "/admin/loans/customermanagement", label: "Customer Management", icon: FilePlus },
     
      { path: "/admin/loans/allloans", label: "All Loans", icon: Files },
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
      { path: "/admin/products/all", label: "All Products", icon: List },
      { path: "/admin/products/add", label: "Add Product", icon: PlusCircle },
      { path: "/admin/products/stock", label: "Stock Details", icon: Archive },
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
  {
    label: "Settings",
    icon: SettingsIcon,
    children: [
      { path: "/admin/settings", label: "General Settings", icon: SettingsIcon },
      { path: "/admin/settings/daily-gold-rate", label: "Daily Precious Rates", icon: Coins },
    ],
  },
  { path: "/", label: "Back Home", icon: Home },
];

/* ================= SIDEBAR ================= */
const Sidebar = ({ isOpen, onClose, collapsed, onToggleCollapse }) => {
  const location = useLocation();

  /* ================= HELPERS & LOGIC ================= */
  const getActiveChildPath = (item) => {
    if (!item.children) return null;
    const matchingChildren = item.children
      .filter(child => location.pathname === child.path || location.pathname.startsWith(child.path + "/"))
      .sort((first, second) => second.path.length - first.path.length);
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
      return currentPath === item.path || currentPath.startsWith(item.path + "/");
    }

    return false;
  };

  const [openMenu, setOpenMenu] = useState(() => {
    const activeItem = navItems.find(item => item.children && isActiveRoute(item));
    return activeItem ? activeItem.label : null;
  });

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
        bg-[#003B3B] border-r border-white/10
        font-sans
        
        flex flex-col transition-all duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
        ${collapsed ? "lg:w-20 w-full" : "w-full lg:w-72"}
      `}
      >
        {/* ========== LOGO ========== */}
       <div className="relative overflow-hidden px-4 pt-5 pb-5 border-b border-white/10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-emerald-400/15 via-transparent to-amber-300/10" />
          <div className={`relative flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg overflow-hidden shrink-0">
              <img
                src="/images/logo.png"
                alt="Sri Golds"
                className="w-11 h-11 object-contain"
              />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-lg font-serif font-bold tracking-wide text-[#F5C45E] leading-none mb-1">
                  Sri Golds
                </p>
                <p className="text-xs font-medium tracking-wide text-white/70">
                  Admin Panel
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="ml-auto p-2 rounded-xl text-white/40 hover:bg-white/5 lg:hidden border border-transparent hover:border-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========== NAVIGATION ========== */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto hide-scrollbar">
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
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                      ${isMenuOpen || isAnyChildActive
                        ? "bg-[#008577] text-white shadow-md shadow-black/10"
                        : "text-white/50 hover:bg-white/5 hover:text-white"
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isMenuOpen || isAnyChildActive ? "text-white" : ""}`} />

                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left text-sm font-semibold tracking-wide">
                          {item.label}
                          {item.label === "Orders" && orderCounts.all > 0 && (
                            <span className="ml-2 inline-block bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                              {orderCounts.all}
                            </span>
                          )}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${isMenuOpen ? "rotate-180" : ""
                            }`}
                        />
                      </>
                    )}
                  </button>

                  {/* ===== SUB MENU ===== */}
                  {!collapsed && (
                    <div
                      className={`ml-4 pl-4  border-white/5 space-y-1 overflow-y-auto hide-scrollbar transition-all duration-300
                      ${isMenuOpen ? "max-h-60 opacity-100 py-1" : "max-h-0 opacity-0"}`}
                    >
                      {item.children.map((sub) => {
                        const SubIcon = sub.icon;
                        const isActive = getActiveChildPath(item) === sub.path;

                        // Get count badge for this item
                        let badgeCount = 0;
                        if (sub.label === "New Orders") badgeCount = orderCounts.new;
                        else if (sub.label === "All Orders") badgeCount = orderCounts.all;
                        else if (sub.label === "Delivery Orders") badgeCount = orderCounts.delivery;
                        else if (sub.label === "Cancelled Orders") badgeCount = orderCounts.cancelled;

                        return (
                          <NavLink
                            key={sub.path}
                            to={sub.path}
                            onClick={() => isOpen && onClose()}
                            className={`
                              flex items-center gap-3 px-4 py-2.5 rounded-md text-xs font-medium tracking-wide transition-all
                              ${isActive
                                ? "bg-white/10 text-[#F5C45E] border-l-2 border-[#F5C45E]"
                                : "text-white/65 hover:text-white hover:bg-white/5"
                              }
                            `}
                          >
                            <SubIcon className={`w-5 h-6 shrink-0 ${isActive ? "text-white" : ""}`} />
                            <span className="flex-1">{sub.label}</span>
                            {badgeCount > 0 && (
                              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-fit">
                                {badgeCount}
                              </span>
                            )}
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
                onClick={() => {
                  setOpenMenu(null);
                  if (isOpen) onClose();
                }}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-md transition-all
                  ${isActive
                    ? "bg-[#008577] text-white shadow-md shadow-black/10"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                  }
                `}
              >
                <Icon className={`w-5 h-6 shrink-0 ${isActive ? "text-white" : ""}`} />
                {!collapsed && <span className="text-sm font-semibold tracking-wide">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* ========== STORE PROMOTION ========== */}
        {!collapsed && (
          <Link to="/" className="group relative mx-3 mb-4 block h-36 overflow-hidden rounded-2xl border border-white/15">
            <img src="/images/Luxury Gold Jewelry Showcase.png" alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#003B3B]/95 via-[#003B3B]/65 to-transparent" />
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
            text-slate-500 hover:text-blue-600 hover:scale-110 transition-all z-50
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
