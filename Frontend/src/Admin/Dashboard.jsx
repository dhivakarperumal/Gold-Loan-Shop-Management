import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../PrivateRouter/AuthContext";
import { useAdmin } from "../PrivateRouter/AdminContext";
import { formatRateDate } from "../PrivateRouter/goldRateUtils";
import useGoldRates from "../PrivateRouter/useGoldRates";
import api from "../api";
import { toast, Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  FiUsers,
  FiBox,
  FiTrendingUp,
  FiTrendingDown,
  FiChevronDown,
  FiArrowRight,
  FiMoreHorizontal,
  FiChevronRight,
  FiLayers,
  FiAlertTriangle
} from "react-icons/fi";
import { FaRupeeSign, FaCoins, FaGem, FaHandHoldingUsd, FaShieldAlt } from "react-icons/fa";
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");

const getDashboardImageUrl = (image) => {
  if (!image) return "/images/categories/necklacecat.png";
  if (/^(https?:|data:|blob:|\/images\/)/i.test(image)) return image;
  return `${backendUrl}${image.startsWith("/") ? image : `/${image}`}`;
};

const DEFAULT_DASHBOARD_DATA = {
  stats: [
    {
      id: "total_customers",
      label: "Total Customers",
      value: "1,248",
      trend: "+12%",
      trendUp: true,
      icon: "users",
      color: "emerald"
    },
    {
      id: "active_gold_loans",
      label: "Active Gold Loans",
      value: "386",
      trend: "+8%",
      trendUp: true,
      icon: "loan",
      color: "amber"
    },
    {
      id: "today_collection",
      label: "Today's Collection",
      value: "₹ 4,85,000",
      trend: "+15%",
      trendUp: true,
      icon: "rupee",
      color: "emerald"
    },
    {
      id: "gold_stock_value",
      label: "Gold Stock Value",
      value: "₹ 1,28,50,000",
      trend: "+6%",
      trendUp: true,
      icon: "gold",
      color: "amber"
    },
    {
      id: "total_products",
      label: "Total Products",
      value: "0",
      trend: "Inventory",
      trendUp: true,
      icon: "products",
      color: "blue"
    },
    {
      id: "total_categories",
      label: "Total Categories",
      value: "0",
      trend: "Categories",
      trendUp: true,
      icon: "categories",
      color: "purple"
    },
    {
      id: "completed_loans",
      label: "Completed Loans",
      value: "0",
      trend: "Closed loans",
      trendUp: true,
      icon: "completed",
      color: "teal"
    },
    {
      id: "low_stock_products",
      label: "Low Stock Products",
      value: "0",
      trend: "Below 10 units",
      trendUp: false,
      icon: "low-stock",
      color: "rose"
    }
  ],
  totalLoansCount: 248,
  loanStatusCounts: {
    Active: 150,
    Processing: 48,
    Pending: 32,
    Overdue: 18
  },
  revenueTrends: [
    { label: "Oct 01", revenue: 42000, date: "Oct 01, 2026" },
    { label: "Oct 03", revenue: 62000, date: "Oct 03, 2026" },
    { label: "Oct 05", revenue: 78000, date: "Oct 05, 2026" },
    { label: "Oct 07", revenue: 68000, date: "Oct 07, 2026" },
    { label: "Oct 09", revenue: 124560, date: "Oct 09, 2026" },
    { label: "Oct 11", revenue: 104000, date: "Oct 11, 2026" },
    { label: "Oct 13", revenue: 138000, date: "Oct 13, 2026" },
    { label: "Oct 15", revenue: 145000, date: "Oct 15, 2026" },
    { label: "Oct 16", revenue: 98000, date: "Oct 16, 2026" }
  ],
  recentLoans: [
    {
      id: "#SG1001",
      customer: "Priya S",
      jewellery: "Gold Necklace Set",
      amount: "₹ 56,800",
      status: "Active",
      date: "Oct 16, 2026",
      img: "/images/categories/necklacecat.png",
      rawId: 1
    },
    {
      id: "#SG1002",
      customer: "Karthik R",
      jewellery: "Gold Earrings",
      amount: "₹ 32,450",
      status: "Processing",
      date: "Oct 15, 2026",
      img: "/images/categories/earrings.png",
      rawId: 2
    },
    {
      id: "#SG1003",
      customer: "Divya M",
      jewellery: "Gold Ring",
      amount: "₹ 18,900",
      status: "Pending",
      date: "Oct 15, 2026",
      img: "/images/categories/rings.png",
      rawId: 3
    },
    {
      id: "#SG1004",
      customer: "Suresh K",
      jewellery: "Gold Bracelet",
      amount: "₹ 74,200",
      status: "Active",
      date: "Oct 14, 2026",
      img: "/images/categories/bangles.png",
      rawId: 4
    },
    {
      id: "#SG1005",
      customer: "Anitha V",
      jewellery: "Gold Chain",
      amount: "₹ 26,350",
      status: "Overdue",
      date: "Oct 14, 2026",
      img: "/images/categories/choker.png",
      rawId: 5
    }
  ],
  topProducts: [
    {
      id: 1,
      name: "Gold Necklace Set",
      cat: "Necklaces",
      sales: "120 sales",
      amount: "₹ 12,45,600",
      img: "/images/categories/necklacecat.png"
    },
    {
      id: 2,
      name: "Gold Earrings",
      cat: "Earrings",
      sales: "95 sales",
      amount: "₹ 6,82,300",
      img: "/images/categories/earrings.png"
    },
    {
      id: 3,
      name: "Gold Ring",
      cat: "Rings",
      sales: "80 sales",
      amount: "₹ 4,56,800",
      img: "/images/categories/rings.png"
    },
    {
      id: 4,
      name: "Gold Bracelet",
      cat: "Bangles",
      sales: "65 sales",
      amount: "₹ 3,24,500",
      img: "/images/categories/bangles.png"
    },
    {
      id: 5,
      name: "Gold Chain",
      cat: "Chains",
      sales: "52 sales",
      amount: "₹ 2,98,600",
      img: "/images/categories/choker.png"
    }
  ]
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { dashboardData, setDashboardCached } = useAdmin();
  const { current: currentGoldRates, loading: goldRatesLoading } = useGoldRates();
  const [loading, setLoading] = useState(false);
  const [salesRange, setSalesRange] = useState("month");

  useEffect(() => {
    fetchDashboardData("month");
  }, []);

  const fetchDashboardData = async (range = salesRange) => {
    try {
      const response = await api.get('/dashboard', { params: { range } });
      if (response.data && response.data.stats) {
        setDashboardCached(response.data);
      }
    } catch (error) {
      console.warn("Using dashboard showcase data:", error?.message || error);
    }
  };

  // Safe resolved data (merged with defaults so it ALWAYS renders properly)
  const data = dashboardData || DEFAULT_DASHBOARD_DATA;
  const stats = data.stats || DEFAULT_DASHBOARD_DATA.stats;
  const recentLoans = data.recentLoans?.length ? data.recentLoans : DEFAULT_DASHBOARD_DATA.recentLoans;
  const topProducts = data.topProducts?.length ? data.topProducts : DEFAULT_DASHBOARD_DATA.topProducts;
  const loanStatusCounts = data.loanStatusCounts || DEFAULT_DASHBOARD_DATA.loanStatusCounts;
  const revenueTrends = data.revenueTrends?.length ? data.revenueTrends : DEFAULT_DASHBOARD_DATA.revenueTrends;
  const totalLoansCount = data.totalLoansCount || 248;
  const summaryCards = [
    {
      id: "total_customers",
      icon: <FiUsers />,
      iconStyle: { backgroundColor: "#006D50", color: "#FFFFFF" },
      cardStyle: { backgroundColor: "#123B32", borderColor: "#2C6A55" },
      chartColor: "#6EE7B7",
      trendUp: true
    },
    {
      id: "active_gold_loans",
      icon: <FaCoins />,
      iconStyle: { background: "linear-gradient(145deg, #F7C84B, #B87500)", color: "#FFFFFF" },
      cardStyle: { backgroundColor: "#3D3019", borderColor: "#8B6D2E" },
      chartColor: "#FCD36B"
    },
    {
      id: "today_collection",
      icon: <FaRupeeSign />,
      iconStyle: { backgroundColor: "#006D50", color: "#FFFFFF" },
      cardStyle: { backgroundColor: "#14324A", borderColor: "#35719A" },
      chartColor: "#7DD3FC"
    },
    {
      id: "gold_stock_value",
      icon: <FaGem />,
      iconStyle: { background: "linear-gradient(145deg, #F7C84B, #B87500)", color: "#FFFFFF" },
      cardStyle: { backgroundColor: "#482A24", borderColor: "#9A533D" },
      chartColor: "#FDBA9A"
    },
    {
      id: "total_products",
      icon: <FiBox />,
      iconStyle: { backgroundColor: "#00838F", color: "#FFFFFF" },
      cardStyle: { backgroundColor: "#263238", borderColor: "#546E7A" },
      chartColor: "#80DEEA"
    },
    {
      id: "total_categories",
      icon: <FiLayers />,
      iconStyle: { backgroundColor: "#7C3AED", color: "#FFFFFF" },
      cardStyle: { backgroundColor: "#252849", borderColor: "#555F9A" },
      chartColor: "#D8B4FE"
    },
    {
      id: "completed_loans",
      icon: <FaCoins />,
      iconStyle: { backgroundColor: "#0F766E", color: "#FFFFFF" },
      cardStyle: { backgroundColor: "#163B3A", borderColor: "#34736B" },
      chartColor: "#5EEAD4"
    },
    {
      id: "low_stock_products",
      icon: <FiAlertTriangle />,
      iconStyle: { backgroundColor: "#BE123C", color: "#FFFFFF" },
      cardStyle: { backgroundColor: "#472333", borderColor: "#98445D" },
      chartColor: "#FDA4AF"
    }
  ].map((card) => {
    const defaultStat = DEFAULT_DASHBOARD_DATA.stats.find((stat) => stat.id === card.id);
    const liveStat = stats.find((stat) => stat.id === card.id);
    return {
      ...defaultStat,
      ...liveStat,
      ...card,
      trendUp: liveStat?.trendUp ?? defaultStat?.trendUp ?? card.trendUp
    };
  });

  // Status styling
  const getStatusBadge = (status) => {
    switch (status) {
      case "Active":
      case "Delivered":
        return "bg-emerald-50 text-emerald-600 font-semibold";
      case "Processing":
        return "bg-amber-50 text-amber-600 font-semibold";
      case "Pending":
        return "bg-sky-50 text-sky-600 font-semibold";
      case "Overdue":
      case "Cancelled":
        return "bg-rose-50 text-rose-600 font-semibold";
      default:
        return "bg-slate-50 text-slate-600 font-semibold";
    }
  };

  // ── Bar Chart Data & Options ──────────────────────────────────────
  const barLabels = revenueTrends.map(t => t.label || t.month || "");
  const barValues = revenueTrends.map(t => t.revenue || t.amount || 0);

  const barChartData = {
    labels: barLabels,
    datasets: [
      {
        label: 'Sales',
        data: barValues,
        backgroundColor: '#2DD4BF', // soft emerald / teal like the screenshot
        hoverBackgroundColor: '#0D9488',
        borderRadius: 6,
        borderSkipped: false,
        categoryPercentage: 0.65,
        barPercentage: 0.75,
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0F172A',
        titleColor: '#F8FAFC',
        bodyColor: '#34D399',
        padding: { top: 8, bottom: 8, left: 12, right: 12 },
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (items) => {
            const idx = items[0]?.dataIndex;
            return revenueTrends[idx]?.date || items[0]?.label || "";
          },
          label: (context) => `● ₹ ${context.parsed.y.toLocaleString('en-IN')}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => {
            if (value === 0) return '0';
            if (value >= 100000) return `${(value / 1000).toFixed(0)}K`;
            return `${(value / 1000).toFixed(0)}K`;
          },
          color: '#94A3B8',
          font: { size: 11, weight: '500' }
        },
        grid: { color: '#F1F5F9', drawBorder: false },
        border: { dash: [4, 4], display: false }
      },
      x: {
        ticks: { color: '#94A3B8', font: { size: 11, weight: '500' } },
        grid: { display: false, drawBorder: false }
      }
    }
  };

  // ── Doughnut Chart: Loan Status ──────────────────────────────────
  const loanStatusLabels = ['Active', 'Processing', 'Pending', 'Overdue'];
  const loanStatusColors = ['#10B981', '#F59E0B', '#38BDF8', '#EF4444'];
  const loanStatusValues = [
    loanStatusCounts.Active || 150,
    loanStatusCounts.Processing || 48,
    loanStatusCounts.Pending || 32,
    loanStatusCounts.Overdue || 18,
  ];
  const totalLoanStatusSum = loanStatusValues.reduce((a, b) => a + b, 0) || totalLoansCount;

  const doughnutData = {
    labels: loanStatusLabels,
    datasets: [
      {
        data: loanStatusValues,
        backgroundColor: loanStatusColors,
        borderWidth: 0,
        cutout: '72%',
        hoverOffset: 4
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0F172A',
        titleColor: '#F8FAFC',
        bodyColor: '#F8FAFC',
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${ctx.raw} (${((ctx.raw / totalLoanStatusSum) * 100).toFixed(0)}%)`
        }
      }
    }
  };

  const loanStatusLegend = loanStatusLabels.map((label, idx) => ({
    label,
    count: loanStatusValues[idx],
    pct: `${Math.round((loanStatusValues[idx] / totalLoanStatusSum) * 100)}%`,
    color: loanStatusColors[idx]
  }));

  return (
    <div className="space-y-6 pb-12 bg-[#F8FAFC] min-h-screen">
      <Toaster position="top-right" />

      <section className="relative flex h-[170px] items-center overflow-hidden rounded-xl border border-[#B68A36] bg-[#003B32] shadow-sm sm:h-[184px]">
        <img
          src="/images/Hero/hero4.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#002D27]/95 via-[#003B32]/80 to-transparent" />
        <div className="relative z-10 flex h-full w-full items-center px-5 sm:px-9">
          <div className="max-w-[58%] sm:max-w-[52%]">
            <p className="text-xs font-semibold tracking-wide text-[#F6D991] sm:text-base" style={{ color: "#FFE39A", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>Welcome to</p>
            <h1
              className="mt-0.5 font-serif text-3xl font-bold leading-none sm:text-5xl"
              style={{ color: "#FFD15C", textShadow: "0 2px 8px rgba(0,0,0,0.9)" }}
            >
              Sri Golds
            </h1>
            <p className="mt-2 max-w-md text-[10px] leading-relaxed text-white/90 sm:text-sm" style={{ color: "#FFFFFF", textShadow: "0 1px 4px rgba(0,0,0,0.85)" }}>
              Your trusted jewellery &amp; gold loan management partner
            </p>
            <div className="mt-3 hidden items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#F6D991] sm:flex" style={{ color: "#FFE39A", textShadow: "0 1px 4px rgba(0,0,0,0.85)" }}>
              <span>Purity</span><span className="text-white/50">|</span>
              <span>Trust</span><span className="text-white/50">|</span>
              <span>Prosperity</span>
            </div>
          </div>
          <div className="ml-auto hidden max-w-[180px] space-y-3 pr-3 text-[#F6D991] lg:block" style={{ color: "#FFE39A", textShadow: "0 1px 4px rgba(0,0,0,0.85)" }}>
            <div className="flex items-center gap-2">
              <FaGem className="shrink-0 text-lg" />
              <span className="text-[9px] font-bold uppercase leading-tight tracking-wide">Traditional Values</span>
            </div>
            <div className="flex items-center gap-2">
              <FaShieldAlt className="shrink-0 text-lg" />
              <span className="text-[9px] font-bold uppercase leading-tight tracking-wide">Modern Management</span>
            </div>
            <div className="flex items-center gap-2">
              <FiUsers className="shrink-0 text-lg" />
              <span className="text-[9px] font-bold uppercase leading-tight tracking-wide">Customer Satisfaction</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-x-2 gap-y-[20px] sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <article
            key={card.id}
            style={card.cardStyle}
            className="relative flex h-[160px] min-w-0 items-center gap-3 overflow-hidden rounded-xl border-l-4 border-y border-r p-3 shadow-[0_3px_12px_rgba(30,41,59,0.1)] transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div style={card.iconStyle} className="z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl shadow-md">
              {card.icon}
            </div>
            <div className="relative z-10 min-w-0 self-center">
              <p style={{ color: "#E2E8F0" }} className="truncate text-[11px] font-semibold">{card.label}</p>
              <p style={{ color: "#FFFFFF" }} className="mt-1 truncate text-[19px] font-black leading-none tracking-tight">{card.value}</p>
              <div style={{ color: card.trendUp ? "#86EFAC" : "#FDA4AF" }} className="mt-2 flex items-center gap-1 text-[11px] font-extrabold">
                {card.trendUp ? <FiTrendingUp /> : <FiTrendingDown />}
                <span>{card.trend}</span>
              </div>
              <p style={{ color: "#CBD5E1" }} className="mt-0.5 text-[9px] font-medium">{card.id === "today_collection" ? "vs yesterday" : "vs last month"}</p>
            </div>
            <button
              type="button"
              aria-label={`View ${card.label}`}
              onClick={() => navigate({
                total_customers: "/admin/loans/customermanagement",
                gold_stock_value: "/admin/products/stock",
                total_products: "/admin/products/all",
                total_categories: "/admin/products/category",
                completed_loans: "/admin/loans/allloans",
                low_stock_products: "/admin/products/stock"
              }[card.id] || "/admin/loans/allloans")}
              className="absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-black/5 bg-white/65 text-[10px] text-slate-700 transition hover:bg-white"
            >
              <FiChevronRight />
            </button>
            <div style={{ color: card.chartColor }} className="absolute bottom-3 right-3 flex h-7 items-end gap-[3px]">
              {[11, 17, 13, 23].map((height, index) => (
                <span key={index} className="w-[4px] rounded-t-sm bg-current" style={{ height: `${height}px` }} />
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
            Quick Actions & Shortcuts
          </h3>
          <span className="text-[10px] font-semibold text-slate-400">One-click management</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Add Product", icon: <FiBox size={18} />, color: "from-[#004D40] to-[#008577]", path: "/admin/products/add" },
            { label: "New Loan", icon: <FaHandHoldingUsd size={18} />, color: "from-[#0F766E] to-[#14B8A6]", path: "/admin/loans/createloan" },
            { label: "All Loans", icon: <FaCoins size={18} />, color: "from-[#047857] to-[#34D399]", path: "/admin/loans/allloans" },
            { label: "Customers", icon: <FiUsers size={18} />, color: "from-[#B7791F] to-[#F5C45E]", path: "/admin/loans/customermanagement" },
            { label: "Stock Details", icon: <FiBox size={18} />, color: "from-[#B45309] to-[#F59E0B]", path: "/admin/products/stock" },
            { label: "Daily Gold Rate", icon: <FaGem size={18} />, color: "from-[#003B3B] to-[#008577]", path: "/admin/settings/daily-gold-rate" }
          ].map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => navigate(action.path)}
              className="group flex flex-col items-center gap-2.5 rounded-2xl border border-slate-100 bg-slate-50/40 p-3.5 transition-all hover:border-slate-200 hover:bg-white hover:shadow-md"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${action.color} text-white shadow-sm transition-transform group-hover:scale-105`}>
                {action.icon}
              </span>
              <span className="text-center text-xs font-bold leading-tight text-slate-700">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Active Daily Gold Rates Banner (Essential for Sri Golds) ── */}
      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#003B3B] text-[#F5C45E] flex items-center justify-center font-bold text-base shrink-0 shadow-sm">
            <FaGem />
          </div>
          <div>
            <h2 className="text-xs font-extrabold text-[#003B3B] uppercase tracking-wider">
              Sri Golds Daily Rates
            </h2>
            <p className="text-[11px] font-medium text-slate-400">
              {goldRatesLoading ? "Refreshing rates..." : currentGoldRates ? `Effective ${formatRateDate(currentGoldRates.rate_date)}` : "Live benchmark market rates"}
            </p>
          </div>
        </div>

        {currentGoldRates?.rates ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {currentGoldRates.rates.slice(0, 4).map((rate) => (
              <div key={`${rate.metal_type}-${rate.purity}`} className="rounded-xl bg-emerald-50/60 border border-emerald-100/50 px-3 py-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">{rate.metal_type} {rate.purity}</span>
                <p className="text-xs font-black text-[#003B3B]">₹{Number(rate.rate_per_gram).toLocaleString("en-IN")}/g</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl bg-amber-50/80 border border-amber-100 px-3 py-1.5">
              <span className="text-[10px] font-bold text-amber-700">Gold 22K (916)</span>
              <p className="text-xs font-black text-amber-900">₹6,850/g</p>
            </div>
            <div className="rounded-xl bg-amber-50/80 border border-amber-100 px-3 py-1.5">
              <span className="text-[10px] font-bold text-amber-700">Gold 24K</span>
              <p className="text-xs font-black text-amber-900">₹7,472/g</p>
            </div>
            <div className="rounded-xl bg-slate-100 border border-slate-200 px-3 py-1.5">
              <span className="text-[10px] font-bold text-slate-600">Silver 999</span>
              <p className="text-xs font-black text-slate-800">₹98.50/g</p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate("/admin/settings/daily-gold-rate")}
          className="rounded-xl bg-[#003B3B] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#008577] transition-colors self-start md:self-auto shrink-0"
        >
          Manage rates →
        </button>
      </div>

      {/* ── Middle Section: Charts (Sales Overview & Loan Status) ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Sales Overview (65% width) */}
        <div className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-bold text-slate-800">Sales Overview</h3>
            <div className="relative">
              <select
                value={salesRange}
                onChange={(e) => {
                  setSalesRange(e.target.value);
                  fetchDashboardData(e.target.value);
                }}
                className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-1.5 pr-7 text-xs font-semibold text-slate-600 focus:outline-none focus:border-[#008577] cursor-pointer shadow-2xs"
              >
                <option value="month">This Month</option>
                <option value="week">This Week</option>
                <option value="year">This Year</option>
              </select>
              <FiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs" />
            </div>
          </div>
          <div className="h-[260px] sm:h-[280px] w-full pt-2">
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>

        {/* Right: Loan Status Donut Chart (35% width, Replacing Order Status) */}
        <div className="lg:col-span-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-2">Loan Status</h3>
          <div className="flex flex-col sm:flex-row lg:flex-row items-center justify-between gap-4 my-auto py-2">
            {/* Donut with center text */}
            <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
              <Doughnut data={doughnutData} options={doughnutOptions} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-800 leading-none">
                  {totalLoansCount}
                </span>
                <span className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                  Loans
                </span>
              </div>
            </div>

            {/* Legend breakdown list matching the screenshot */}
            <div className="w-full sm:w-auto flex-1 space-y-2.5">
              {loanStatusLegend.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-600 font-medium">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{item.count}</span>
                    <span className="text-slate-400 font-semibold w-8 text-right">{item.pct}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Section: Recent Loans & Top Selling Products ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Recent Loans (65% width, replacing Recent Orders properly) */}
        <div className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-bold text-slate-800">Recent Loans</h3>
            <button
              onClick={() => navigate('/admin/loans/allloans')}
              className="text-xs font-bold text-[#008577] hover:underline flex items-center gap-1"
            >
              View All <FiArrowRight className="text-xs" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[11px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="pb-3">#</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Products</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentLoans.map((loan, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-3.5 font-bold text-slate-700">{loan.id}</td>
                    <td className="py-3.5 font-semibold text-slate-800">{loan.customer}</td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <img
                          src={getDashboardImageUrl(loan.img)}
                          alt={loan.jewellery}
                          className="w-8 h-8 rounded-lg object-contain bg-amber-50/60 p-0.5 border border-slate-100 shrink-0"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/images/categories/necklacecat.png";
                          }}
                        />
                        <span className="text-slate-600 font-medium truncate max-w-[120px] sm:max-w-none">
                          {loan.jewellery}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 font-extrabold text-slate-800">{loan.amount}</td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] ${getStatusBadge(loan.status)}`}>
                        {loan.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-400 font-medium whitespace-nowrap">{loan.date}</td>
                    <td className="py-3.5 text-center">
                      <button
                        onClick={() => navigate(loan.rawId ? `/admin/loans/details/${loan.rawId}` : '/admin/loans/allloans')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all mx-auto"
                        title="View details"
                      >
                        <FiMoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Top Selling Products (35% width, Matching Screenshot) */}
        <div className="lg:col-span-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-bold text-slate-800">Top Selling Products</h3>
            <button
              onClick={() => navigate('/admin/products/all')}
              className="text-xs font-bold text-[#008577] hover:underline flex items-center gap-1"
            >
              View All <FiArrowRight className="text-xs" />
            </button>
          </div>

          <div className="space-y-3.5 my-auto">
            {topProducts.map((prod, i) => (
              <div key={i} className="flex items-center justify-between gap-3 group">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Gold Ranked Badge */}
                  <span className="w-6 h-6 rounded-full bg-amber-400 text-white text-[11px] font-black flex items-center justify-center shrink-0 shadow-2xs">
                    {i + 1}
                  </span>
                  {/* Thumbnail */}
                  <img
                    src={getDashboardImageUrl(prod.img)}
                    alt={prod.name}
                    className="w-10 h-10 rounded-xl object-contain bg-amber-50/50 p-1 border border-slate-100 shrink-0"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/images/categories/necklacecat.png";
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate leading-tight group-hover:text-[#008577] transition-colors">
                      {prod.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {prod.sales}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-800">
                    {prod.amount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
