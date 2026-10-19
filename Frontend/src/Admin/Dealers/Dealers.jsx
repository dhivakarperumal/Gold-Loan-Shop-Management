import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle, ArrowDownToLine, ArrowLeft, ArrowRightLeft, Building2, Check,
  ClipboardList, Coins, Download, FileText, LoaderCircle, Plus, Printer, RefreshCw,
  Search, ShieldCheck, Truck, Wallet, X
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api";

const TEAL = "#003B3B";
const PURITIES = ["999", "916", "833", "750", "585"];
const today = () => new Date().toISOString().slice(0, 10);
const currency = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2
}).format(Number(value || 0));
const initialDealer = {
  name: "", contact_person: "", email: "", phone: "", alternate_phone: "",
  category_id: "", gstin: "", pan: "", billing_address_line1: "", billing_city: "",
  billing_state: "", billing_pincode: "", shipping_address_line1: "", shipping_city: "",
  shipping_state: "", shipping_pincode: "", opening_balance: "0", opening_balance_side: "payable",
  opening_metal_weight: "", opening_metal_type: "Gold", opening_metal_purity: "916",
  credit_limit: "0", payment_terms_days: "0", bank_name: "", bank_account_name: "",
  bank_account_number: "", bank_ifsc: "", status: "Active", notes: ""
};
const blankLine = () => ({
  description: "", metal_type: "Gold", purity: "916", quantity: "1", net_weight: "",
  rate_per_gram: "", negotiated_rate: false, unit_price: "", making_charge: "0",
  wastage_charge: "0", stone_charge: "0", discount: "0", tax_rate: "0", tax_type: "NONE"
});

function ErrorBox({ message, retry }) {
  if (!message) return null;
  return <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
    <span>{message}</span>{retry && <button type="button" onClick={retry} className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white">Retry</button>}
  </div>;
}

function Field({ label, value, onChange, type = "text", required = false, min, step, placeholder, disabled = false }) {
  return <label className="block space-y-1.5">
    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}{required && " *"}</span>
    <input type={type} value={value ?? ""} onChange={onChange} required={required} min={min} step={step} placeholder={placeholder} disabled={disabled}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#008577] focus:ring-2 focus:ring-emerald-800/10 disabled:bg-slate-100" />
  </label>;
}

function SelectField({ label, value, onChange, children, required = false }) {
  return <label className="block space-y-1.5">
    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}{required && " *"}</span>
    <select value={value ?? ""} onChange={onChange} required={required}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#008577] focus:ring-2 focus:ring-emerald-800/10">
      {children}
    </select>
  </label>;
}

const Dealers = () => {
    const navigate = useNavigate();
    const [dealers, setDealers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDealer, setSelectedDealer] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [showAddDealer, setShowAddDealer] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [viewMode, setViewMode] = useState("table");

    // Mock history data
    const mockHistory = [
        { id: "#INV-2024-001", date: "2024-03-01", items: "Wedding Silk Saree x 5", amount: "₹45,000", status: "Paid" },
        { id: "#INV-2024-042", date: "2024-02-15", items: "Cotton Saree x 12", amount: "₹18,000", status: "Paid" },
        { id: "#INV-2023-118", date: "2024-01-20", items: "Linen Saree x 2", amount: "₹4,200", status: "Pending" },
    ];

    useEffect(() => {
        fetchDealers();
    }, []);

    const fetchDealers = async () => {
        setLoading(true);
        try {
            const res = await api.get("/dealers");
            setDealers(res.data);
        } catch (error) {
            console.error("Fetch Dealers Error:", error);
            toast.error("Failed to load dealers");
        } finally {
            setLoading(false);
        }
    };

    const filteredDealers = dealers.filter(dealer => {
        const search = searchTerm.toLowerCase();
        const matchesSearch = dealer.name?.toLowerCase().includes(search) ||
            dealer.contact?.toLowerCase().includes(search) ||
            dealer.location?.toLowerCase().includes(search) ||
            dealer.email?.toLowerCase().includes(search);
        const matchesStatus = statusFilter === "All" || dealer.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalDealers = dealers.length;
    const activeDealers = dealers.filter(dealer => String(dealer.status || "Active").toLowerCase() === "active").length;
    const inactiveDealers = dealers.filter(dealer => String(dealer.status || "Active").toLowerCase() === "inactive").length;
    const totalOrders = dealers.reduce((total, dealer) => total + (Number(dealer.orders) || 0), 0);

    const handleContact = (dealer) => {
        toast.promise(
            new Promise((resolve) => setTimeout(resolve, 800)),
            {
                loading: `Opening secure chat with ${dealer.name}...`,
                success: `Connected to ${dealer.contact}!`,
                error: 'Connection failed',
            }
        );
    };

    const handleViewHistory = (dealer) => {
        setSelectedDealer(dealer);
        setShowHistory(true);
    };

    const handleImportExcel = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx, .xls, .csv';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                toast.loading(`Importing ${file.name}...`);
                setTimeout(() => {
                    toast.dismiss();
                    toast.success("All partners imported successfully!");
                }, 1500);
            }
        };
        input.click();
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case "Premium": return "bg-amber-100 text-amber-700 border-amber-200";
            case "Verified": return "bg-emerald-100 text-emerald-700 border-emerald-200";
            case "Pending": return "bg-gray-100 text-gray-700 border-gray-200";
            default: return "bg-gray-100 text-gray-500 border-gray-100";
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Toaster position="top-right" />
            {/* Dealer Analytics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shrink-0"><FiTruck size={22} /></div>
                    <div><p className="text-xs text-gray-400 font-medium">Total Dealers</p><h3 className="text-3xl font-black text-slate-800 leading-none my-0.5">{totalDealers.toLocaleString()}</h3><p className="text-[10px] text-gray-400">All registered partners</p></div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-lg shrink-0"><FiCheck size={22} /></div>
                    <div><p className="text-xs text-gray-400 font-medium">Active Dealers</p><h3 className="text-3xl font-black text-slate-800 leading-none my-0.5">{activeDealers.toLocaleString()}</h3><p className="text-[10px] text-gray-400">Currently active</p></div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white shadow-lg shrink-0"><FiX size={22} /></div>
                    <div><p className="text-xs text-gray-400 font-medium">Inactive Dealers</p><h3 className="text-3xl font-black text-slate-800 leading-none my-0.5">{inactiveDealers.toLocaleString()}</h3><p className="text-[10px] text-gray-400">Needs follow-up</p></div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white shadow-lg shrink-0"><FiPackage size={22} /></div>
                    <div><p className="text-xs text-gray-400 font-medium">Total Orders</p><h3 className="text-3xl font-black text-slate-800 leading-none my-0.5">{totalOrders.toLocaleString()}</h3><p className="text-[10px] text-gray-400">Across all dealers</p></div>
                </div>
            </div>
            {/* Page Header */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
                    <div className="relative w-full sm:w-72">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search dealers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-500 transition-all text-sm font-medium"
                        />
                    </div>
                    <div className="relative w-full sm:w-40">
                        <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={15} />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full appearance-none pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium outline-none focus:border-blue-500"
                        >
                            <option value="All">All Status</option>
                            <option value="Premium">Premium</option>
                            <option value="Verified">Verified</option>
                            <option value="Pending">Pending</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">▼</span>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
                        <button type="button" onClick={() => setViewMode("table")} className={`p-2 rounded-md transition-colors ${viewMode === "table" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-blue-600"}`} aria-label="Table mode" title="Table mode">
                            <FiList size={16} />
                        </button>
                        <button type="button" onClick={() => setViewMode("card")} className={`p-2 rounded-md transition-colors ${viewMode === "card" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-blue-600"}`} aria-label="Card mode" title="Card mode">
                            <FiGrid size={16} />
                        </button>
                    </div>
                    <button
                        onClick={handleImportExcel}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#4b0b78] border border-[#4b0b78] text-white px-5 py-2.5 rounded-lg font-bold transition-all hover:bg-[#260642] active:scale-95 shadow-sm"
                    >
                        <FiUpload /> Import Partners
                    </button>

                    <button
                        onClick={() => setShowAddDealer(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#4b0b78] hover:bg-[#260642] text-white px-6 py-2.5 rounded-lg font-bold transition-all shadow-lg shadow-purple-200 active:scale-95"
                    >
                        <FiPlus /> New Partnership
                    </button>
                </div>
            </div>

            {/* Table View */}
            {viewMode === "table" && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-gradient-to-r from-[#260642] to-[#4b0b78] text-[11px] font-black text-[#facc15] uppercase tracking-wider">
                                    <th className="px-4 py-4 text-center"><input type="checkbox" className="rounded border-white/70 text-[#facc15] focus:ring-[#facc15]" aria-label="Select all dealers" /></th>
                                    <th className="px-4 py-4 text-center">S No</th>
                                    <th className="px-6 py-4">Dealer</th>
                                    <th className="px-6 py-4">Contact</th>
                                    <th className="px-6 py-4">Location</th>
                                    <th className="px-6 py-4 text-center">Rating</th>
                                    <th className="px-6 py-4 text-center">Orders</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="9" className="px-6 py-10 text-center text-gray-400 text-sm font-semibold">Loading dealers...</td></tr>
                                ) : filteredDealers.length === 0 ? (
                                    <tr><td colSpan="9" className="px-6 py-10 text-center text-gray-400 text-sm font-semibold">No dealers found.</td></tr>
                                ) : filteredDealers.map((dealer, index) => (
                                    <tr key={dealer.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                                        <td className="px-4 py-4 text-center"><input type="checkbox" className="rounded border-gray-300 text-[#4318FF] focus:ring-[#4318FF]" aria-label={`Select ${dealer.name}`} /></td>
                                        <td className="px-4 py-4 text-center text-sm font-bold text-gray-400">{index + 1}</td>
                                        <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-blue-50 overflow-hidden flex items-center justify-center text-blue-600 font-black">{dealer.image ? <img src={dealer.image} alt={dealer.name} className="w-full h-full object-cover" /> : dealer.name?.charAt(0)}</div><div><p className="font-bold text-slate-800">{dealer.name}</p><p className="text-xs text-gray-400">#{dealer.id}</p></div></div></td>
                                        <td className="px-6 py-4"><p className="text-sm font-medium text-slate-700">{dealer.phone || dealer.contact || "-"}</p><p className="text-xs text-gray-400">{dealer.email || "-"}</p></td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{dealer.location || "-"}</td>
                                        <td className="px-6 py-4 text-center font-bold text-amber-500"><span className="inline-flex items-center gap-1"><FiStar fill="currentColor" />{dealer.rating || "-"}</span></td>
                                        <td className="px-6 py-4 text-center font-bold text-blue-600">{dealer.orders || 0}</td>
                                        <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(dealer.status)}`}>{dealer.status || "Pending"}</span></td>
                                        <td className="px-6 py-4"><div className="flex justify-end gap-2"><button onClick={() => handleContact(dealer)} className="px-3 py-2 rounded-lg bg-[#4b0b78] text-white text-xs font-bold hover:bg-[#260642]">Contact</button><button onClick={() => navigate(`/admin/invoices/add?dealerId=${dealer.id}`)} className="px-3 py-2 rounded-lg bg-[#4b0b78] text-white text-xs font-bold hover:bg-[#260642]">Invoice</button><button onClick={() => handleViewHistory(dealer)} className="px-3 py-2 rounded-lg bg-[#4b0b78] text-white text-xs font-bold hover:bg-[#260642]">History</button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Dealers Grid */}
            {viewMode === "card" && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="animate-pulse bg-white rounded-[2rem] border border-gray-100 p-6 h-80 shadow-sm">
                            <div className="flex gap-4 mb-6">
                                <div className="w-16 h-16 bg-gray-200 rounded-2xl shrink-0"></div>
                                <div className="flex-1 space-y-2 py-1">
                                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-10 bg-gray-100 rounded-2xl"></div>
                                    <div className="h-10 bg-gray-100 rounded-2xl"></div>
                                </div>
                                <div className="h-4 bg-gray-100 rounded w-full"></div>
                                <div className="h-4 bg-gray-100 rounded w-2/3"></div>
                            </div>
                        </div>
                    ))
                ) : filteredDealers.map((dealer) => (
                    <div key={dealer.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group p-6">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-gray-50 overflow-hidden border border-gray-100 flex items-center justify-center">
                                    {dealer.image ? (
                                        <img src={dealer.image} alt={dealer.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <span className="text-xl font-black text-blue-600 bg-blue-50 w-full h-full flex items-center justify-center capitalize">{dealer.name?.charAt(0)}</span>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{dealer.name}</h3>
                                    <span className={`mt-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(dealer.status)}`}>
                                        {dealer.status}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => toast.error("Quick actions not configured yet.")}
                                className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all"
                            >
                                <FiMoreVertical />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50/50 rounded-2xl flex flex-col items-center">
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Rating</p>
                                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                                        <FiStar fill="currentColor" /> {dealer.rating}
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50/50 rounded-2xl flex flex-col items-center">
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Orders</p>
                                    <div className="flex items-center gap-1 text-blue-600 font-bold">
                                        <FiPackage /> {dealer.orders}
                                    </div>
                                </div>
                            </div>

    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5">
      {tabs.map(([key, label, route]) => <button key={key} type="button" onClick={() => navigate(route)}
        className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-bold transition ${section === key ? "bg-[#003B3B] text-white" : "text-slate-500 hover:bg-slate-50 hover:text-[#003B3B]"}`}>{label}</button>)}
    </nav>

    <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
      {[
        ["Active dealers", summary?.dealers?.active ?? "—", Truck],
        ["Supplier payables", summary ? currency(summary.payables) : "—", Wallet],
        ["Dealer receivables", summary ? currency(summary.receivables) : "—", ArrowRightLeft],
        ["Purchases this month", summary ? currency(summary.purchases_this_month) : "—", Coins],
        ["Overdue invoices", summary ? `${summary.overdue.count} · ${currency(summary.overdue.amount)}` : "—", AlertTriangle],
        ["Open job orders", summary?.pending_jobs ?? "—", ClipboardList]
      ].map(([label, value, Icon]) => <div key={label} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-500">{label}</span><Icon size={17} className="text-[#008577]" /></div>
        <p className="mt-2 truncate text-xl font-black text-slate-900">{value}</p>
      </div>)}
    </div>

    {summary?.metal_outstanding?.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-amber-900"><Coins size={17} /> Metal outstanding by purity</div>
      <div className="flex flex-wrap gap-2">{summary.metal_outstanding.map((metal) => <span key={`${metal.metal_type}-${metal.purity}`} className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700">
        {metal.metal_type} {metal.purity}: {Number(metal.weight).toFixed(3)} g <span className="text-slate-400">({Number(metal.fine_gold_weight).toFixed(3)} fine g)</span>
      </span>)}</div>
    </div>}

    <ErrorBox message={error} retry={() => void fetchAll()} />
    {loading ? <div className="flex min-h-64 items-center justify-center gap-3 rounded-xl border border-slate-100 bg-white text-sm font-bold text-slate-500"><LoaderCircle className="animate-spin" /> Loading dealer records...</div> : <>
      {section === "dealers" && <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="relative w-full max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Search dealer, code, contact, GSTIN..." className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#008577]" /></div>
          <div className="flex gap-2">
            <select value={statusFilter} onChange={(event) => { setPage(1); setStatusFilter(event.target.value); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option>All</option><option>Active</option><option>Inactive</option><option>On Hold</option></select>
            <select value={categoryFilter} onChange={(event) => { setPage(1); setCategoryFilter(event.target.value); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="All">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <button type="button" onClick={async () => {
              const name = window.prompt("New dealer category");
              if (!name?.trim()) return;
              try { await api.post("/dealers/categories", { name: name.trim() }); toast.success("Dealer category added"); await fetchAll(); }
              catch (requestError) { toast.error(requestError.response?.data?.message || "Unable to add category"); }
            }} className="rounded-lg border border-[#003B3B] px-3 py-2 text-xs font-bold text-[#003B3B]">Add category</button>
          </div>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left">
          <thead><tr className="bg-gradient-to-r from-[#003B3B] to-[#008577] text-xs uppercase tracking-wide text-white">
            <th className="px-4 py-3">Dealer</th><th className="px-4 py-3">Category / GSTIN</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3 text-right">Payable</th><th className="px-4 py-3 text-right">Receivable</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th>
          </tr></thead>
          <tbody>{visibleDealers.length === 0 ? <tr><td colSpan="7" className="p-10 text-center text-sm text-slate-400">No dealer records match your search.</td></tr> : visibleDealers.map((dealer) => <tr key={dealer.id} className="border-b border-slate-100 hover:bg-emerald-50/30">
            <td className="px-4 py-3"><button type="button" onClick={() => void openDealerDocs(dealer)} className="text-left font-bold text-[#003B3B] hover:underline">{dealer.name}</button><p className="text-xs text-slate-400">{dealer.dealer_code}</p></td>
            <td className="px-4 py-3 text-sm text-slate-700">{dealer.category_name}<p className="text-xs text-slate-400">{dealer.gstin || "GSTIN not recorded"}</p></td>
            <td className="px-4 py-3 text-sm text-slate-700">{dealer.contact_person}<p className="text-xs text-slate-400">{dealer.phone} · {dealer.email || "No email"}</p></td>
            <td className="px-4 py-3 text-right font-bold text-slate-800">{currency(dealer.payable_balance)}</td>
            <td className="px-4 py-3 text-right font-bold text-slate-800">{currency(dealer.receivable_balance)}</td>
            <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${dealer.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>{dealer.status}</span></td>
            <td className="px-4 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => void openStatement(dealer)} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700">Statement</button><button type="button" onClick={() => startDealerEdit(dealer)} className="rounded-md bg-[#003B3B] px-2.5 py-1.5 text-xs font-bold text-white">Edit</button></div></td>
          </tr>)}</tbody>
        </table></div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span>{pagination.total} dealer records</span><div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded border px-2 py-1 disabled:opacity-40">Previous</button><span>Page {page} of {pagination.totalPages}</span><button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)} className="rounded border px-2 py-1 disabled:opacity-40">Next</button></div>
        </div>
      </section>}

      {section === "purchases" && <section className="overflow-hidden rounded-xl border border-slate-100 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 p-4"><div><h2 className="font-black text-slate-800">Purchase documents & accounts payable</h2><p className="text-xs text-slate-500">Posted documents retain invoice-rate and tax snapshots.</p></div><button type="button" onClick={() => exportCsv([["Document","Dealer","Type","Date","Due date","Total","Paid","Outstanding"], ...purchases.map((row) => [row.document_number,row.dealer_name,row.document_type,row.document_date,row.due_date,row.total,row.paid_amount,row.outstanding])], "dealer-purchases.csv")} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"><Download size={15} /> Export CSV</button></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead><tr className="bg-[#003B3B] text-xs uppercase text-white"><th className="p-3">Document</th><th className="p-3">Dealer</th><th className="p-3">Invoice ref</th><th className="p-3">Date / Due</th><th className="p-3 text-right">Amount</th><th className="p-3 text-right">Paid</th><th className="p-3 text-right">Outstanding</th></tr></thead><tbody>{purchases.length ? purchases.map((item) => <tr key={item.id} className="border-b text-sm"><td className="p-3 font-bold text-[#003B3B]">{item.document_number}<p className="text-[10px] font-normal uppercase text-slate-400">{item.document_type.replaceAll("_"," ")}</p></td><td className="p-3">{item.dealer_name}</td><td className="p-3">{item.supplier_invoice_number || "—"}</td><td className="p-3">{item.document_date}<p className="text-xs text-slate-400">Due {item.due_date || "—"}</p></td><td className="p-3 text-right">{currency(item.total)}</td><td className="p-3 text-right">{currency(item.paid_amount)}</td><td className="p-3 text-right font-bold">{currency(item.outstanding)}</td></tr>) : <tr><td colSpan="7" className="p-10 text-center text-slate-400">No purchase documents posted.</td></tr>}</tbody></table></div>
      </section>}

      {section === "jobs" && <section className="overflow-hidden rounded-xl border border-slate-100 bg-white">
        <div className="border-b border-slate-100 p-4"><h2 className="font-black text-slate-800">Goldsmith issue, receipt & reconciliation</h2><p className="text-xs text-slate-500">Weights are tracked by purity and fine-gold equivalent. Unexplained variance requires approval reason.</p>{jobs.filter((job) => job.reconciliation_status === "Pending").map((job) => <div key={job.id} className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm"><span>{job.job_number} has a pending fine-gold variance of {Number(job.reconciliation_variance).toFixed(3)} g.</span><button type="button" onClick={() => void approveReconciliation(job)} className="rounded bg-amber-700 px-3 py-1.5 text-xs font-bold text-white">Approve with reason</button></div>)}</div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead><tr className="bg-[#003B3B] text-xs uppercase text-white"><th className="p-3">Job / Dealer</th><th className="p-3">Due</th><th className="p-3 text-right">Issued fine g</th><th className="p-3 text-right">Returned fine g</th><th className="p-3">Status / Variance</th><th className="p-3 text-right">Post movement</th></tr></thead><tbody>{jobs.length ? jobs.map((job) => <tr key={job.id} className="border-b text-sm"><td className="p-3 font-bold">{job.job_number}<p className="text-xs font-normal text-slate-500">{job.dealer_name}</p></td><td className="p-3">{job.due_date || "—"}</td><td className="p-3 text-right">{Number(job.issued_fine_weight).toFixed(3)}</td><td className="p-3 text-right">{Number(job.returned_fine_weight).toFixed(3)}</td><td className="p-3">{job.status}{job.reconciliation_variance != null && <p className="text-xs font-bold text-amber-700">Variance {Number(job.reconciliation_variance).toFixed(3)} fine g</p>}</td><td className="p-3"><div className="flex justify-end gap-1"><button type="button" disabled={!["Open","Issued"].includes(job.status)} onClick={() => { setMetalForm({ ...metalForm, job_id: String(job.id), weight: "" }); setDialog("issue"); }} className="rounded border px-2 py-1 text-[10px] font-bold disabled:opacity-40">Issue</button><button type="button" disabled={!["Issued","Partially Received"].includes(job.status)} onClick={() => { setMetalForm({ ...metalForm, job_id: String(job.id), weight: "" }); setDialog("receipt"); }} className="rounded border px-2 py-1 text-[10px] font-bold disabled:opacity-40">Receive</button><button type="button" disabled={["Reconciled","Cancelled"].includes(job.status)} onClick={() => { setReconcileForm({ job_id: job.id, approved_loss: "0", reason: "" }); setDialog("reconcile"); }} className="rounded bg-[#003B3B] px-2 py-1 text-[10px] font-bold text-white disabled:opacity-40">Reconcile</button></div></td></tr>) : <tr><td colSpan="6" className="p-10 text-center text-slate-400">No job orders recorded.</td></tr>}</tbody></table></div>
      </section>}

      {section === "refining" && <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-100 bg-white p-5"><h2 className="font-black text-slate-800">Old-gold intake and settlement</h2><p className="mb-4 mt-1 text-xs text-slate-500">Record tested purity, net gold, negotiated/current rate and resulting settlement.</p><button type="button" onClick={() => setDialog("oldGold")} className="rounded-lg bg-[#003B3B] px-4 py-2 text-sm font-bold text-white">Record old-gold receipt</button></section>
        <section className="rounded-xl border border-slate-100 bg-white p-5"><h2 className="font-black text-slate-800">Refining / recovered metal</h2><p className="mb-4 mt-1 text-xs text-slate-500">Link recovered inventory to its source old-gold receipt and review fine-metal variance.</p><button type="button" onClick={() => setDialog("refining")} className="rounded-lg border border-[#003B3B] px-4 py-2 text-sm font-bold text-[#003B3B]">Record refining receipt</button></section>
        <section className="rounded-xl border border-slate-100 bg-white p-5 xl:col-span-2"><h2 className="mb-3 font-black text-slate-800">Old-gold receipts & refining reconciliation</h2><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="bg-[#003B3B] text-white"><th className="p-3">Receipt</th><th className="p-3">Dealer</th><th className="p-3">Received</th><th className="p-3 text-right">Net / Fine gold</th><th className="p-3 text-right">Rate snapshot</th><th className="p-3 text-right">Settlement</th><th className="p-3 text-right">Recovered fine gold</th></tr></thead><tbody>{oldGoldReceipts.map((item) => <tr key={item.id} className="border-b"><td className="p-3 font-bold">{item.receipt_number}</td><td className="p-3">{item.dealer_name}</td><td className="p-3">{new Date(item.received_at).toLocaleDateString()}</td><td className="p-3 text-right">{Number(item.net_weight).toFixed(3)} / {Number(item.fine_gold_weight).toFixed(3)} g</td><td className="p-3 text-right">{currency(item.agreed_rate)} / g<p className="text-xs text-slate-400">{item.gold_rate_date || item.rate_source}</p></td><td className="p-3 text-right">{currency(item.settlement_amount)}</td><td className="p-3 text-right">{Number(item.recovered_fine_gold).toFixed(3)} g</td></tr>)}</tbody></table>{oldGoldReceipts.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No old-gold receipts have been posted yet.</p>}</div></section>
      </div>}
    </>}

    {dialog === "dealer" && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4">
      <form onSubmit={submitDealer} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4"><div><h2 className="text-xl font-black text-slate-900">{editingDealer ? "Update dealer profile" : "Register jewellery trade partner"}</h2><p className="text-xs text-slate-500">Financial and metal opening balances post once to separate ledgers.</p></div><button type="button" onClick={() => setDialog("")} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X /></button></div>
        <div className="grid gap-5 p-6 md:grid-cols-3">
          <Field label="Dealer / firm name" required value={form.name} onChange={(e) => setDealerField("name", e.target.value)} />
          <SelectField label="Dealer category" required value={form.category_id} onChange={(e) => setDealerField("category_id", e.target.value)}><option value="">Choose category</option>{categories.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>
          <SelectField label="Status" value={form.status} onChange={(e) => setDealerField("status", e.target.value)}><option>Active</option><option>Inactive</option><option>On Hold</option></SelectField>
          <Field label="Contact person" required value={form.contact_person} onChange={(e) => setDealerField("contact_person", e.target.value)} />
          <Field label="Phone" required value={form.phone} onChange={(e) => setDealerField("phone", e.target.value)} />
          <Field label="Alternate phone" value={form.alternate_phone} onChange={(e) => setDealerField("alternate_phone", e.target.value)} />
          <Field label="Email" type="email" value={form.email} onChange={(e) => setDealerField("email", e.target.value)} />
          <Field label="GSTIN" value={form.gstin} onChange={(e) => setDealerField("gstin", e.target.value.toUpperCase())} />
          <Field label="PAN" value={form.pan} onChange={(e) => setDealerField("pan", e.target.value.toUpperCase())} />
          <Field label="Billing address" value={form.billing_address_line1} onChange={(e) => setDealerField("billing_address_line1", e.target.value)} />
          <Field label="Billing city" value={form.billing_city} onChange={(e) => setDealerField("billing_city", e.target.value)} />
          <Field label="Billing state" value={form.billing_state} onChange={(e) => setDealerField("billing_state", e.target.value)} />
          <Field label="Billing pincode" value={form.billing_pincode} onChange={(e) => setDealerField("billing_pincode", e.target.value)} />
          <Field label="Shipping address" value={form.shipping_address_line1} onChange={(e) => setDealerField("shipping_address_line1", e.target.value)} />
          <Field label="Shipping city" value={form.shipping_city} onChange={(e) => setDealerField("shipping_city", e.target.value)} />
          <Field label="Shipping state" value={form.shipping_state} onChange={(e) => setDealerField("shipping_state", e.target.value)} />
          <Field label="Shipping pincode" value={form.shipping_pincode} onChange={(e) => setDealerField("shipping_pincode", e.target.value)} />
          <Field label="Credit limit (₹)" type="number" min="0" step="0.01" value={form.credit_limit} onChange={(e) => setDealerField("credit_limit", e.target.value)} />
          <Field label="Payment terms (days)" type="number" min="0" step="1" value={form.payment_terms_days} onChange={(e) => setDealerField("payment_terms_days", e.target.value)} />
          <Field label="Bank name" value={form.bank_name} onChange={(e) => setDealerField("bank_name", e.target.value)} />
          <Field label="Account holder" value={form.bank_account_name} onChange={(e) => setDealerField("bank_account_name", e.target.value)} />
          <Field label="Account number" value={form.bank_account_number} onChange={(e) => setDealerField("bank_account_number", e.target.value)} />
          <Field label="IFSC" value={form.bank_ifsc} onChange={(e) => setDealerField("bank_ifsc", e.target.value.toUpperCase())} />
          {!editingDealer && <><SelectField label="Opening financial balance side" value={form.opening_balance_side} onChange={(e) => setDealerField("opening_balance_side", e.target.value)}><option value="payable">Payable to dealer</option><option value="receivable">Receivable from dealer</option></SelectField><Field label="Opening financial balance (₹)" type="number" min="0" step="0.01" value={form.opening_balance} onChange={(e) => setDealerField("opening_balance", e.target.value)} /><SelectField label="Opening metal type" value={form.opening_metal_type} onChange={(e) => setDealerField("opening_metal_type", e.target.value)}><option>Gold</option><option>Silver</option></SelectField><SelectField label="Opening metal purity" value={form.opening_metal_purity} onChange={(e) => setDealerField("opening_metal_purity", e.target.value)}>{PURITIES.map((purity) => <option key={purity}>{purity}</option>)}</SelectField><Field label="Opening metal weight (g, optional)" type="number" min="0.001" step="0.001" value={form.opening_metal_weight} onChange={(e) => setDealerField("opening_metal_weight", e.target.value)} /></>}
          <label className="block space-y-1.5 md:col-span-3"><span className="text-[11px] font-bold uppercase text-slate-500">Account notes</span><textarea value={form.notes} onChange={(e) => setDealerField("notes", e.target.value)} rows="3" className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-[#008577]" /></label>
        </div>
        <div className="flex justify-end gap-2 border-t bg-slate-50 p-4"><button type="button" onClick={() => setDialog("")} className="rounded-lg border bg-white px-4 py-2 text-sm font-bold">Cancel</button><button disabled={saving} className="rounded-lg bg-[#003B3B] px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : editingDealer ? "Save profile" : "Create dealer"}</button></div>
      </form>
    </div>}

    {dialog === "purchase" && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={submitPurchase} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4"><div><h2 className="text-xl font-black">Post supplier document</h2><p className="text-xs text-slate-500">Rates and taxes are captured on each line when posted.</p></div><button type="button" onClick={() => setDialog("")}><X /></button></div>
      <div className="grid gap-4 p-6 md:grid-cols-3">
        <SelectField label="Dealer" required value={purchaseForm.dealer_id} onChange={(e) => setPurchaseForm({ ...purchaseForm, dealer_id: e.target.value, linked_document_id: "" })}><option value="">Select active dealer</option>{dealers.filter((item) => item.status === "Active").map((item) => <option key={item.id} value={item.id}>{item.dealer_code} — {item.name}</option>)}</SelectField>
        <SelectField label="Document type" value={purchaseForm.document_type} onChange={(e) => setPurchaseForm({ ...purchaseForm, document_type: e.target.value, linked_document_id: "" })}><option value="invoice">Supplier invoice</option><option value="purchase_return">Purchase return</option><option value="debit_note">Debit note (reduces payable)</option><option value="credit_note">Credit note (increases payable)</option></SelectField>
        <Field label="Supplier invoice number" required={purchaseForm.document_type === "invoice"} value={purchaseForm.supplier_invoice_number} onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier_invoice_number: e.target.value })} />
        <Field label="Document date" type="date" required value={purchaseForm.document_date} onChange={(e) => setPurchaseForm({ ...purchaseForm, document_date: e.target.value })} />
        <Field label="Due date" type="date" value={purchaseForm.due_date} onChange={(e) => setPurchaseForm({ ...purchaseForm, due_date: e.target.value })} />
        {purchaseForm.document_type !== "invoice" && <SelectField label="Original supplier invoice" required value={purchaseForm.linked_document_id || ""} onChange={(e) => setPurchaseForm({ ...purchaseForm, linked_document_id: e.target.value })}><option value="">Select original invoice</option>{linkedInvoices.map((item) => <option key={item.id} value={item.id}>{item.document_number} · {item.supplier_invoice_number} · {currency(item.total)}</option>)}</SelectField>}
      </div>
      <div className="space-y-4 px-6 pb-5">{purchaseForm.lines.map((line, index) => <div key={index} className="rounded-xl border border-slate-200 p-4">
        <div className="mb-3 flex items-center justify-between"><p className="text-sm font-black text-[#003B3B]">Invoice line {index + 1}</p>{purchaseForm.lines.length > 1 && <button type="button" onClick={() => setPurchaseForm((current) => ({ ...current, lines: current.lines.filter((_, i) => i !== index) }))} className="text-xs font-bold text-rose-600">Remove line</button>}</div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Description" required value={line.description} onChange={(e) => setPurchaseLine(index, "description", e.target.value)} />
          <SelectField label="Metal" value={line.metal_type} onChange={(e) => setPurchaseLine(index, "metal_type", e.target.value)}><option>Gold</option><option>Silver</option><option>Other</option></SelectField>
          {line.metal_type !== "Other" && <SelectField label="Purity" value={line.purity} onChange={(e) => { setPurchaseLine(index, "purity", e.target.value); setPurchaseLine(index, "rate_per_gram", ""); }}><option value="">Choose</option>{(line.metal_type === "Gold" ? PURITIES : ["999"]).map((purity) => <option key={purity}>{purity}</option>)}</SelectField>}
          <Field label={line.metal_type === "Other" ? "Quantity" : "Net weight (g)"} type="number" min="0.001" step="0.001" required value={line.metal_type === "Other" ? line.quantity : line.net_weight} onChange={(e) => setPurchaseLine(index, line.metal_type === "Other" ? "quantity" : "net_weight", e.target.value)} />
          {line.metal_type !== "Other" && <div className="space-y-1.5"><span className="text-[11px] font-bold uppercase text-slate-500">Active rate ₹/g</span><div className="flex gap-1"><input type="number" min="0.01" step="0.01" value={line.rate_per_gram} onChange={(e) => { setPurchaseLine(index, "rate_per_gram", e.target.value); setPurchaseLine(index, "negotiated_rate", true); }} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm" placeholder="Load current rate" /><button type="button" onClick={() => { setPurchaseLine(index, "negotiated_rate", false); void loadDealerRate(line.metal_type, line.purity, (value) => setPurchaseLine(index, "rate_per_gram", value)); }} className="rounded border px-2 text-xs font-bold">Current</button></div></div>}
          {line.metal_type === "Other" && <Field label="Unit price (₹)" type="number" min="0" step="0.01" value={line.unit_price} onChange={(e) => setPurchaseLine(index, "unit_price", e.target.value)} />}
          <Field label="Making charge (₹)" type="number" min="0" step="0.01" value={line.making_charge} onChange={(e) => setPurchaseLine(index, "making_charge", e.target.value)} />
          <Field label="Wastage charge (₹)" type="number" min="0" step="0.01" value={line.wastage_charge} onChange={(e) => setPurchaseLine(index, "wastage_charge", e.target.value)} />
          <Field label="Stone charge (₹)" type="number" min="0" step="0.01" value={line.stone_charge} onChange={(e) => setPurchaseLine(index, "stone_charge", e.target.value)} />
          <Field label="Discount (₹)" type="number" min="0" step="0.01" value={line.discount} onChange={(e) => setPurchaseLine(index, "discount", e.target.value)} />
          <Field label="GST rate (%)" type="number" min="0" max="100" step="0.001" value={line.tax_rate} onChange={(e) => setPurchaseLine(index, "tax_rate", e.target.value)} />
          <SelectField label="Tax treatment" value={line.tax_type} onChange={(e) => setPurchaseLine(index, "tax_type", e.target.value)}><option value="NONE">No tax</option><option value="CGST_SGST">Intra-state CGST + SGST</option><option value="IGST">Inter-state IGST</option></SelectField>
        </div>
      </div>)}
        <button type="button" onClick={() => setPurchaseForm((current) => ({ ...current, lines: [...current.lines, blankLine()] }))} className="rounded-lg border border-[#003B3B] px-3 py-2 text-xs font-bold text-[#003B3B]"><Plus size={14} className="mr-1 inline" /> Add line item</button>
        <Field label="Internal notes" value={purchaseForm.notes} onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 border-t bg-slate-50 p-4"><button type="button" onClick={() => setDialog("")} className="rounded-lg border bg-white px-4 py-2 text-sm font-bold">Cancel</button><button disabled={saving} className="rounded-lg bg-[#003B3B] px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "Posting…" : "Post document"}</button></div>
    </form></div>}

    {dialog === "payment" && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={submitPayment} className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex justify-between"><div><h2 className="text-xl font-black">Record dealer payment</h2><p className="text-xs text-slate-500">Unallocated remainder is posted as dealer advance/receivable.</p></div><button type="button" onClick={() => setDialog("")}><X /></button></div>
      <SelectField label="Dealer" required value={paymentForm.dealer_id} onChange={(e) => setPaymentForm({ ...paymentForm, dealer_id: e.target.value, purchase_id: "", allocation: "" })}><option value="">Select dealer</option>{dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.name}</option>)}</SelectField>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Payment amount (₹)" type="number" min="0.01" step="0.01" required value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} /><Field label="Payment date" type="date" required value={paymentForm.payment_date} onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} /><SelectField label="Method" value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}><option>Bank</option><option>UPI</option><option>Cheque</option><option>Cash</option></SelectField><Field label="Payment reference" value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} /></div>
      <SelectField label="Allocate to invoice (optional)" value={paymentForm.purchase_id} onChange={(e) => { const found = outstanding.find((item) => String(item.id) === e.target.value); setPaymentForm({ ...paymentForm, purchase_id: e.target.value, allocation: found ? String(found.outstanding) : "" }); }}><option value="">Keep as unallocated advance</option>{outstanding.filter((item) => String(item.dealer_id) === paymentForm.dealer_id).map((item) => <option key={item.id} value={item.id}>{item.document_number} · due {currency(item.outstanding)}</option>)}</SelectField>
      {paymentForm.purchase_id && <Field label="Allocation amount (₹)" type="number" min="0.01" step="0.01" value={paymentForm.allocation} onChange={(e) => setPaymentForm({ ...paymentForm, allocation: e.target.value })} />}
      <div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setDialog("")} className="rounded-lg border px-4 py-2 text-sm font-bold">Cancel</button><button disabled={saving} className="rounded-lg bg-[#003B3B] px-5 py-2 text-sm font-bold text-white">{saving ? "Posting…" : "Post payment"}</button></div>
    </form></div>}

    {dialog === "job" && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={submitJob} className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex justify-between"><h2 className="text-xl font-black">Create goldsmith job order</h2><button type="button" onClick={() => setDialog("")}><X /></button></div>
      <SelectField label="Goldsmith / job worker" required value={jobForm.dealer_id} onChange={(e) => setJobForm({ ...jobForm, dealer_id: e.target.value })}><option value="">Select dealer</option>{dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.name}</option>)}</SelectField>
      <Field label="Work description" required value={jobForm.description} onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })} />
      <div className="grid gap-3 sm:grid-cols-3"><Field label="Due date" type="date" value={jobForm.due_date} onChange={(e) => setJobForm({ ...jobForm, due_date: e.target.value })} /><Field label="Labour charge (₹)" type="number" min="0" step="0.01" value={jobForm.labour_charge} onChange={(e) => setJobForm({ ...jobForm, labour_charge: e.target.value })} /><Field label="Approved wastage (g)" type="number" min="0" step="0.001" value={jobForm.approved_wastage} onChange={(e) => setJobForm({ ...jobForm, approved_wastage: e.target.value })} /></div>
      <div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setDialog("")} className="rounded-lg border px-4 py-2 text-sm font-bold">Cancel</button><button disabled={saving} className="rounded-lg bg-[#003B3B] px-5 py-2 text-sm font-bold text-white">{saving ? "Saving…" : "Create job order"}</button></div>
    </form></div>}

    {(dialog === "issue" || dialog === "receipt") && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={submitMetal} className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex justify-between"><div><h2 className="text-xl font-black">{dialog === "issue" ? "Gold issue voucher" : "Finished goods / scrap receipt"}</h2><p className="text-xs text-slate-500">Fine metal equivalent is recorded against the job and dealer metal ledger.</p></div><button type="button" onClick={() => setDialog("")}><X /></button></div>
      <SelectField label="Job order" required value={metalForm.job_id} onChange={(e) => setMetalForm({ ...metalForm, job_id: e.target.value })}><option value="">Select job</option>{jobs.filter((job) => dialog === "issue" ? ["Open","Issued"].includes(job.status) : ["Issued","Partially Received"].includes(job.status)).map((job) => <option key={job.id} value={job.id}>{job.job_number} — {job.dealer_name}</option>)}</SelectField>
      {dialog === "receipt" && <SelectField label="Receipt type" value={metalForm.receipt_type} onChange={(e) => setMetalForm({ ...metalForm, receipt_type: e.target.value })}><option value="finished">Finished jewellery</option><option value="scrap">Recoverable scrap</option><option value="dust">Dust return</option></SelectField>}
      <div className="grid gap-3 sm:grid-cols-3"><SelectField label="Metal" value={metalForm.metal_type} onChange={(e) => setMetalForm({ ...metalForm, metal_type: e.target.value })}><option>Gold</option><option>Silver</option></SelectField><SelectField label="Purity" value={metalForm.purity} onChange={(e) => setMetalForm({ ...metalForm, purity: e.target.value })}>{(metalForm.metal_type === "Gold" ? PURITIES : ["999"]).map((purity) => <option key={purity}>{purity}</option>)}</SelectField><Field label="Weight (g)" type="number" min="0.001" step="0.001" required value={metalForm.weight} onChange={(e) => setMetalForm({ ...metalForm, weight: e.target.value })} /></div>
      {dialog === "receipt" && <Field label="Labour charge (₹)" type="number" min="0" step="0.01" value={metalForm.labour_charge} onChange={(e) => setMetalForm({ ...metalForm, labour_charge: e.target.value })} />}
      <div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setDialog("")} className="rounded-lg border px-4 py-2 text-sm font-bold">Cancel</button><button disabled={saving} className="rounded-lg bg-[#003B3B] px-5 py-2 text-sm font-bold text-white">{saving ? "Posting…" : dialog === "issue" ? "Post issue voucher" : "Post receipt"}</button></div>
    </form></div>}

    {dialog === "reconcile" && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={submitReconciliation} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex justify-between"><div><h2 className="text-xl font-black">Reconcile metal balance</h2><p className="text-xs text-slate-500">Review issued vs finished, scrap and dust fine-gold equivalent.</p></div><button type="button" onClick={() => setDialog("")}><X /></button></div>
      <SelectField label="Job order" required value={reconcileForm.job_id} onChange={(e) => setReconcileForm({ ...reconcileForm, job_id: e.target.value })}><option value="">Select job</option>{openJobs.map((job) => <option key={job.id} value={job.id}>{job.job_number} — {job.dealer_name} (variance {((Number(job.issued_fine_weight) || 0) - (Number(job.returned_fine_weight) || 0)).toFixed(3)} fine g)</option>)}</SelectField>
      <Field label="Approved process loss (g)" type="number" min="0" step="0.001" value={reconcileForm.approved_loss} onChange={(e) => setReconcileForm({ ...reconcileForm, approved_loss: e.target.value })} />
      <label className="block space-y-1.5"><span className="text-[11px] font-bold uppercase text-slate-500">Approval reason (required for unexplained variance)</span><textarea value={reconcileForm.reason} onChange={(e) => setReconcileForm({ ...reconcileForm, reason: e.target.value })} rows="3" className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-[#008577]" /></label>
      <div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setDialog("")} className="rounded-lg border px-4 py-2 text-sm font-bold">Cancel</button><button disabled={saving} className="rounded-lg bg-[#003B3B] px-5 py-2 text-sm font-bold text-white">{saving ? "Reconciling…" : "Approve reconciliation"}</button></div>
    </form></div>}

    {dialog === "oldGold" && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={submitOldGold} className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex justify-between"><div><h2 className="text-xl font-black">Old-gold receipt & settlement</h2><p className="text-xs text-slate-500">Fine gold is net tested weight × assay purity / 1000.</p></div><button type="button" onClick={() => setDialog("")}><X /></button></div>
      <SelectField label="Old-gold dealer" required value={oldGoldForm.dealer_id} onChange={(e) => setOldGoldForm({ ...oldGoldForm, dealer_id: e.target.value })}><option value="">Select dealer</option>{dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.name}</option>)}</SelectField>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Gross weight (g)" type="number" min="0.001" step="0.001" required value={oldGoldForm.gross_weight} onChange={(e) => setOldGoldForm({ ...oldGoldForm, gross_weight: e.target.value, net_weight: String(Math.max(0, Number(e.target.value || 0) - Number(oldGoldForm.stone_weight || 0))) })} /><Field label="Stone weight (g)" type="number" min="0" step="0.001" value={oldGoldForm.stone_weight} onChange={(e) => setOldGoldForm({ ...oldGoldForm, stone_weight: e.target.value, net_weight: String(Math.max(0, Number(oldGoldForm.gross_weight || 0) - Number(e.target.value || 0))) })} /><Field label="Net tested gold weight (g)" type="number" min="0.001" step="0.001" required value={oldGoldForm.net_weight} onChange={(e) => setOldGoldForm({ ...oldGoldForm, net_weight: e.target.value })} /><SelectField label="Tested purity" value={oldGoldForm.tested_purity} onChange={(e) => { const purity = e.target.value; setOldGoldForm({ ...oldGoldForm, tested_purity: purity, agreed_rate: "", rate_source: "Global" }); }}><option value="">Choose</option>{PURITIES.map((purity) => <option key={purity}>{purity}</option>)}</SelectField></div>
      <div className="grid gap-3 sm:grid-cols-2"><SelectField label="Rate source" value={oldGoldForm.rate_source} onChange={(e) => setOldGoldForm({ ...oldGoldForm, rate_source: e.target.value, agreed_rate: "" })}><option>Global</option><option>Negotiated</option></SelectField><div className="space-y-1.5"><span className="text-[11px] font-bold uppercase text-slate-500">Agreed rate (₹/tested g)</span><div className="flex gap-2"><input required={oldGoldForm.rate_source === "Negotiated"} readOnly={oldGoldForm.rate_source === "Global"} type="number" min="0.01" step="0.01" value={oldGoldForm.agreed_rate} onChange={(e) => setOldGoldForm({ ...oldGoldForm, agreed_rate: e.target.value })} className="w-full rounded-lg border px-3 py-2.5 text-sm read-only:bg-slate-100" /><button type="button" disabled={oldGoldForm.rate_source !== "Global"} onClick={() => void loadDealerRate("Gold", oldGoldForm.tested_purity, (value) => setOldGoldForm((current) => ({ ...current, agreed_rate: value })))} className="rounded border px-2 text-xs font-bold disabled:opacity-40">Current</button></div></div></div>
      <div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setDialog("")} className="rounded-lg border px-4 py-2 text-sm font-bold">Cancel</button><button disabled={saving} className="rounded-lg bg-[#003B3B] px-5 py-2 text-sm font-bold text-white">{saving ? "Posting…" : "Post receipt & payable"}</button></div>
    </form></div>}

    {dialog === "refining" && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={submitRefining} className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex justify-between"><div><h2 className="text-xl font-black">Refining recovery receipt</h2><p className="text-xs text-slate-500">Links recovered fine gold and refining charges to intake.</p></div><button type="button" onClick={() => setDialog("")}><X /></button></div>
      <SelectField label="Dealer" required value={refiningForm.dealer_id} onChange={(e) => setRefiningForm({ ...refiningForm, dealer_id: e.target.value, old_gold_receipt_id: "" })}><option value="">Select dealer</option>{dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.name}</option>)}</SelectField>
      <SelectField label="Source old-gold receipt" required value={refiningForm.old_gold_receipt_id} onChange={(e) => setRefiningForm({ ...refiningForm, old_gold_receipt_id: e.target.value })}><option value="">Select source receipt</option>{oldGoldReceipts.filter((item) => String(item.dealer_id) === refiningForm.dealer_id && Number(item.fine_gold_weight) - Number(item.recovered_fine_gold) > 0.005).map((item) => <option key={item.id} value={item.id}>{item.receipt_number} · remaining {(Number(item.fine_gold_weight) - Number(item.recovered_fine_gold)).toFixed(3)} fine g</option>)}</SelectField>
      <div className="grid gap-3 sm:grid-cols-3"><SelectField label="Recovered metal" value={refiningForm.recovered_metal_type} onChange={(e) => setRefiningForm({ ...refiningForm, recovered_metal_type: e.target.value })}><option>Gold</option><option>Silver</option></SelectField><SelectField label="Purity" value={refiningForm.recovered_purity} onChange={(e) => setRefiningForm({ ...refiningForm, recovered_purity: e.target.value })}>{(refiningForm.recovered_metal_type === "Gold" ? PURITIES : ["999"]).map((purity) => <option key={purity}>{purity}</option>)}</SelectField><Field label="Recovered weight (g)" type="number" min="0.001" step="0.001" value={refiningForm.recovered_weight} onChange={(e) => setRefiningForm({ ...refiningForm, recovered_weight: e.target.value })} /></div>
      <Field label="Refining charge (₹)" type="number" min="0" step="0.01" value={refiningForm.refining_charges} onChange={(e) => setRefiningForm({ ...refiningForm, refining_charges: e.target.value })} />
      <div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setDialog("")} className="rounded-lg border px-4 py-2 text-sm font-bold">Cancel</button><button disabled={saving} className="rounded-lg bg-[#003B3B] px-5 py-2 text-sm font-bold text-white">{saving ? "Posting…" : "Post refining receipt"}</button></div>
    </form></div>}

    {dialog === "profile" && selectedDealer && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"><div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <div className="sticky top-0 flex items-center justify-between border-b bg-white p-5"><div><h2 className="text-xl font-black">{selectedDealer.name}</h2><p className="text-xs text-slate-500">{selectedDealer.dealer_code} · {selectedDealer.category_name}</p></div><button type="button" onClick={() => setDialog("")}><X /></button></div>
      <div className="grid gap-3 p-5 md:grid-cols-3"><div className="rounded-lg bg-slate-50 p-3"><span className="text-xs text-slate-500">Payable</span><p className="font-black">{currency(selectedDealer.payable_balance)}</p></div><div className="rounded-lg bg-slate-50 p-3"><span className="text-xs text-slate-500">Receivable</span><p className="font-black">{currency(selectedDealer.receivable_balance)}</p></div><div className="rounded-lg bg-slate-50 p-3"><span className="text-xs text-slate-500">Credit terms</span><p className="font-black">{selectedDealer.payment_terms_days} days · {currency(selectedDealer.credit_limit)}</p></div></div>
      <div className="space-y-5 p-5">
        <form onSubmit={uploadDealerDocument} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 p-4"><SelectField label="Document type" value={documentForm.type} onChange={(e) => setDocumentForm({ ...documentForm, type: e.target.value })}><option>GST Certificate</option><option>PAN Card</option><option>Bank Proof</option><option>Agreement</option><option>Other</option></SelectField><label className="block flex-1 space-y-1.5"><span className="text-[11px] font-bold uppercase text-slate-500">Private PDF/image (max 10 MB)</span><input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" required onChange={(e) => setDocumentForm({ ...documentForm, file: e.target.files?.[0] || null })} className="block w-full text-sm" /></label><button className="rounded-lg bg-[#003B3B] px-4 py-2.5 text-sm font-bold text-white">Upload</button></form>
        <div><h3 className="mb-2 font-black">Private dealer documents</h3>{selectedDealer.documents?.length ? selectedDealer.documents.map((doc) => <div key={doc.id} className="flex items-center justify-between border-b py-2 text-sm"><span><FileText className="mr-2 inline text-[#008577]" />{doc.document_type}: {doc.original_name}</span><span className="flex gap-2"><button type="button" onClick={() => void downloadDealerDocument(doc)} className="text-xs font-bold text-[#003B3B]">Download</button><button type="button" onClick={() => void removeDealerDocument(doc)} className="text-xs font-bold text-rose-600">Delete</button></span></div>) : <p className="text-sm text-slate-400">No documents on file.</p>}</div>
        <div><h3 className="mb-2 font-black">Account audit history</h3>{selectedDealer.audit?.data?.length ? selectedDealer.audit.data.map((item) => <div key={item.id} className="border-b py-2 text-sm"><span className="font-bold">{item.action}</span> by {item.actor} · {new Date(item.created_at).toLocaleString()} {item.reason && <span>· {item.reason}</span>}</div>) : <p className="text-sm text-slate-400">No account changes recorded.</p>}</div>
        <button type="button" onClick={() => void openStatement(selectedDealer)} className="rounded-lg border border-[#003B3B] px-4 py-2 text-sm font-bold text-[#003B3B]">Open dealer statement</button>
      </div>
    </div></div>}

    {dialog === "statement" && statement && selectedDealer && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"><div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b bg-white p-5"><div><h2 className="text-xl font-black">Dealer statement — {selectedDealer.name}</h2><p className="text-xs text-slate-500">{selectedDealer.dealer_code} · money and metal ledgers are shown separately</p></div><div className="flex gap-2"><button type="button" onClick={printStatement} className="inline-flex items-center gap-1 rounded border px-3 py-2 text-xs font-bold"><Printer size={14} /> Print</button><button type="button" onClick={() => exportCsv([["Date","Entry","Type","Description","Payable delta","Receivable delta","Closing payable"], ...statement.financial.map((row) => [row.created_at,row.entry_number,row.entry_type,row.description,row.payable_delta,row.receivable_delta,row.payable_balance])], `${selectedDealer.dealer_code}-statement.csv`)} className="inline-flex items-center gap-1 rounded border px-3 py-2 text-xs font-bold"><Download size={14} /> CSV</button><button type="button" onClick={() => setDialog("")} className="rounded p-2"><X /></button></div></div>
      <div className="p-5"><h3 className="mb-2 font-black text-[#003B3B]">Financial ledger (₹)</h3><div className="mb-6 overflow-x-auto"><table className="w-full min-w-[800px] text-left text-xs"><thead><tr className="bg-[#003B3B] text-white"><th className="p-2">Date</th><th className="p-2">Entry</th><th className="p-2">Description</th><th className="p-2 text-right">Payable Δ</th><th className="p-2 text-right">Receivable Δ</th><th className="p-2 text-right">Balance payable</th><th className="p-2 text-right">Actions</th></tr></thead><tbody>{statement.financial.map((row) => <tr key={row.id} className="border-b"><td className="p-2">{new Date(row.created_at).toLocaleDateString()}</td><td className="p-2">{row.entry_number}</td><td className="p-2">{row.description}</td><td className="p-2 text-right">{currency(row.payable_delta)}</td><td className="p-2 text-right">{currency(row.receivable_delta)}</td><td className="p-2 text-right font-bold">{currency(row.payable_balance)}</td><td className="p-2 text-right">{row.source_type === "payment" && !row.is_reversed && <button type="button" onClick={() => void reversePaymentEntry(row)} className="font-bold text-rose-700 hover:underline">Reverse</button>}{row.source_type === "payment" && row.is_reversed && <span className="text-slate-400">Reversed</span>}</td></tr>)}</tbody></table>{statement.financial.length === 0 && <p className="p-4 text-center text-sm text-slate-400">No financial ledger entries for this period.</p>}</div>
      <h3 className="mb-2 font-black text-[#003B3B]">Metal ledger (grams by purity)</h3><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead><tr className="bg-[#003B3B] text-white"><th className="p-2">Date</th><th className="p-2">Voucher</th><th className="p-2">Metal / purity</th><th className="p-2">Movement</th><th className="p-2 text-right">Weight Δ</th><th className="p-2 text-right">Fine-gold Δ</th><th className="p-2">Reconciliation</th><th className="p-2 text-right">Closing weight</th></tr></thead><tbody>{statement.metal.map((row) => <tr key={row.id} className="border-b"><td className="p-2">{new Date(row.created_at).toLocaleDateString()}</td><td className="p-2">{row.entry_number}</td><td className="p-2">{row.metal_type} {row.purity}</td><td className="p-2">{row.movement}</td><td className="p-2 text-right">{Number(row.weight_delta).toFixed(3)}</td><td className="p-2 text-right">{Number(row.fine_gold_delta).toFixed(3)}</td><td className="p-2">{row.reconciliation_status}</td><td className="p-2 text-right font-bold">{Number(row.closing_weight).toFixed(3)}</td></tr>)}</tbody></table>{statement.metal.length === 0 && <p className="p-4 text-center text-sm text-slate-400">No metal ledger entries for this period.</p>}</div></div>
    </div></div>}
  </div>;
};

export default Dealers;
