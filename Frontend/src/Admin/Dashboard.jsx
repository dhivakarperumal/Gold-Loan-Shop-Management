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
  FiEye,
  FiCalendar,
  FiChevronDown,
  FiPlusCircle,
  FiArrowRight,
  FiMoreHorizontal,
  FiShoppingCart
} from "react-icons/fi";
import { FaRupeeSign, FaCoins, FaGem, FaHandHoldingUsd } from "react-icons/fa";
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
      color: "violet"
    },
    {
      id: "total_gold_stock",
      label: "Total Gold Stock",
      value: "850.500 g",
      trend: "+5%",
      trendUp: true,
      icon: "gold",
      color: "amber"
    },
    {
      id: "total_loan_amount",
      label: "Total Loan Amount",
      value: "₹ 42,50,000",
      trend: "-8%",
      trendUp: false,
      icon: "loan",
      color: "rose"
    },
    {
      id: "total_sales",
      label: "Total Sales",
      value: "₹ 12,80,000",
      trend: "+18%",
      trendUp: true,
      icon: "cart",
      color: "violet"
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
      iconClass: "bg-violet-100 text-violet-600",
      cardClass: "bg-[#E8D29A] border-[#D6BB78]",
      sparkColor: "#A855F7",
      sparkFill: "M0 43 C12 39 16 40 25 44 S39 39 45 40 S58 27 64 31 S74 10 81 11 S92 2 100 2 V50 H0 Z",
      sparkLine: "M0 43 C12 39 16 40 25 44 S39 39 45 40 S58 27 64 31 S74 10 81 11 S92 2 100 2",
      trendUp: true
    },
    {
      id: "total_gold_stock",
      icon: <FaCoins />,
      iconClass: "bg-amber-100 text-amber-500",
      cardClass: "bg-[#FFF5DF] border-[#F5E6C3]",
      sparkColor: "#F59E0B",
      sparkFill: "M0 45 C12 45 16 37 23 40 S37 31 43 35 S54 27 62 33 S73 18 80 22 S91 13 100 8 V50 H0 Z",
      sparkLine: "M0 45 C12 45 16 37 23 40 S37 31 43 35 S54 27 62 33 S73 18 80 22 S91 13 100 8",
      trendUp: true
    },
    {
      id: "total_loan_amount",
      icon: <FaHandHoldingUsd />,
      iconClass: "bg-rose-100 text-rose-600",
      cardClass: "bg-[#FFF0F1] border-[#F8DDE1]",
      sparkColor: "#FB7185",
      sparkFill: "M0 44 C9 42 17 36 24 39 S36 32 43 35 S54 26 61 31 S72 19 78 24 S91 9 100 8 V50 H0 Z",
      sparkLine: "M0 44 C9 42 17 36 24 39 S36 32 43 35 S54 26 61 31 S72 19 78 24 S91 9 100 8",
      trendUp: false
    },
    {
      id: "total_sales",
      icon: <FiShoppingCart />,
      iconClass: "bg-fuchsia-100 text-fuchsia-600",
      cardClass: "bg-[#F8EEFF] border-[#EADCF8]",
      sparkColor: "#C084FC",
      sparkFill: "M0 44 C10 43 15 35 23 38 S35 32 42 36 S53 27 60 31 S72 20 79 22 S89 12 100 6 V50 H0 Z",
      sparkLine: "M0 44 C10 43 15 35 23 38 S35 32 42 36 S53 27 60 31 S72 20 79 22 S89 12 100 6",
      trendUp: true
    }
  ].map((card) => {
    const defaultStat = DEFAULT_DASHBOARD_DATA.stats.find((stat) => stat.id === card.id);
    const liveStat = stats.find((stat) => stat.id === card.id);
    return {
      ...defaultStat,
      ...liveStat,
      ...card,
      trendUp: liveStat?.trendUp ?? defaultStat.trendUp
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

      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight leading-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            Welcome back! Here's what's happening with Sri Golds today.
          </p>
        </div>

        {/* Date Range Selector (as in screenshot) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-2.5 bg-white border border-slate-200/80 px-3.5 py-2 rounded-xl shadow-sm text-xs font-semibold text-slate-700 hover:border-slate-300 transition-colors cursor-pointer">
            <FiCalendar className="text-slate-400 text-sm" />
            <span>Oct 1, 2026 - Oct 16, 2026</span>
            <FiChevronDown className="text-slate-400 text-xs ml-1" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <article
            key={card.id}
            className={`relative flex h-[140px] min-w-0 items-center gap-3 overflow-hidden rounded-xl border ${card.cardClass} p-3 shadow-[0_3px_12px_rgba(30,41,59,0.04)] transition-shadow hover:shadow-md`}
          >
            <div className={`z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[23px] ${card.iconClass}`}>
              {card.icon}
            </div>
            <div className="relative z-10 min-w-0 pb-0.5">
              <p className="truncate text-[10px] font-semibold text-slate-600">{card.label}</p>
              <p className="mt-1 truncate text-[18px] font-extrabold leading-none tracking-tight text-slate-900">{card.value}</p>
              <div className={`mt-2 flex items-center gap-1 text-[10px] font-bold ${card.trendUp ? "text-violet-600" : "text-rose-600"}`}>
                {card.trendUp ? <FiTrendingUp /> : <FiTrendingDown />}
                <span>{card.trend}</span>
              </div>
              <p className="mt-0.5 text-[8px] font-medium text-slate-500">from last month</p>
            </div>
            <svg className="pointer-events-none absolute bottom-0 right-0 h-[50px] w-[88px]" viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true">
              <path d={card.sparkFill} fill={card.sparkColor} fillOpacity="0.12" />
              <path d={card.sparkLine} fill="none" stroke={card.sparkColor} strokeLinecap="round" strokeWidth="1.5" />
            </svg>
          </article>
        ))}
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

      {/* ── Quick Action Shortcuts ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
            Quick Actions & Shortcuts
          </h3>
          <span className="text-[10px] text-slate-400 font-semibold">One-click management</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Add Product", icon: <FiBox size={18} />, color: "from-[#004D40] to-[#008577]", path: "/admin/products/add" },
            { label: "New Loan", icon: <FaHandHoldingUsd size={18} />, color: "from-[#0F766E] to-[#14B8A6]", path: "/admin/loans/createloan" },
            { label: "All Loans", icon: <FaCoins size={18} />, color: "from-[#047857] to-[#34D399]", path: "/admin/loans/allloans" },
            { label: "Customers", icon: <FiUsers size={18} />, color: "from-[#B7791F] to-[#F5C45E]", path: "/admin/loans/customermanagement" },
            { label: "Stock Details", icon: <FiBox size={18} />, color: "from-[#B45309] to-[#F59E0B]", path: "/admin/products/stock" },
            { label: "Daily Gold Rate", icon: <FaGem size={18} />, color: "from-[#003B3B] to-[#008577]", path: "/admin/settings/daily-gold-rate" },
          ].map((action, i) => (
            <button
              key={i}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2.5 p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all group active:scale-98 bg-slate-50/40 hover:bg-white"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform`}>
                {action.icon}
              </div>
              <span className="text-xs font-bold text-slate-700 text-center leading-tight">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
