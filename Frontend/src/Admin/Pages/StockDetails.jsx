import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAdmin } from "../../PrivateRouter/AdminContext";
import api from "../../api";
import { formatRateDate, getRateForPurity } from "../../PrivateRouter/goldRateUtils";
import useGoldRates from "../../PrivateRouter/useGoldRates";
import { toast, Toaster } from "react-hot-toast";
import {
    FiBox,
    FiAlertCircle,
    FiTrendingDown,
    FiSearch,
    FiSave,
    FiPlus,
    FiX,
    FiEdit2,
    FiGrid,
    FiList,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const StockDetails = () => {
    const navigate = useNavigate();
    const { stockCache, setStockCached } = useAdmin();
    const { current: activeRateSet, loading: ratesLoading, error: ratesError } = useGoldRates();

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState("table");
    const itemsPerPage = 10;

    const currentCacheKey = JSON.stringify({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        status: statusFilter
    });
    
    const pageData = stockCache[currentCacheKey];
    const [products, setProducts] = useState(pageData?.products || []);
    const [loading, setLoading] = useState(!pageData);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pagination, setPagination] = useState(pageData?.pagination || { total: 0, totalPages: 1 });
    const [stats, setStats] = useState(pageData?.stats || { total: 0, active: 0, lowStock: 0, outOfStock: 0 });
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [updatedVariants, setUpdatedVariants] = useState([]);
    const [variantAdditions, setVariantAdditions] = useState({});
    const [manualTotalStock, setManualTotalStock] = useState("0");
    const [isUpdating, setIsUpdating] = useState(false);
    const [fetchingDetail, setFetchingDetail] = useState(false);

    const fetchProducts = useCallback(async () => {
        const params = {
            page: currentPage,
            limit: itemsPerPage,
            search: searchTerm,
            status: statusFilter
        };
        const cacheKey = JSON.stringify(params);
        try {
            const response = await api.get("/products", { params });
            const data = response.data;
            let finalData = {};
 
            if (Array.isArray(data)) {
                finalData = { products: data, pagination: { total: data.length, totalPages: 1 }, stats: { total: 0, active: 0, lowStock: 0, outOfStock: 0 }};
            } else {
                finalData = {
                    products: Array.isArray(data.products) ? data.products : [],
                    pagination: data.pagination || { total: 0, totalPages: 1 },
                    stats: data.stats || { total: 0, active: 0, lowStock: 0, outOfStock: 0 }
                };
            }
            setProducts(finalData.products);
            setPagination(finalData.pagination);
            setStats(finalData.stats);
            setStockCached(prev => ({ ...prev, [cacheKey]: finalData }));
        } catch (error) {
            console.error("Error fetching products:", error);
            setProducts([]);
            toast.error(error.response?.data?.message || "Could not load stock details.");
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchTerm, statusFilter, setStockCached]);

    useEffect(() => {
        void fetchProducts();
    }, [fetchProducts]);

    const getStockLevel = (product) => {
        const stock = product.total_stock ?? product.stock ?? 0;
        return stock;
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case "Active":
            case "In Stock": return "bg-emerald-50 text-emerald-600 border-emerald-100";
            case "Low Stock": return "bg-amber-50 text-amber-600 border-amber-100";
            case "Out of Stock": return "bg-rose-50 text-rose-600 border-rose-100";
            default: return "bg-gray-50 text-gray-600 border-gray-100";
        }
    };

    const deriveStatus = (stock) => {
        if (stock <= 0) return "Out of Stock";
        if (stock < 10) return "Low Stock";
        return "In Stock";
    };

    const totalPages = Math.max(1, Number(pagination.totalPages) || 1);
    const currentItems = products;
    const changePage = (page) => {
        setLoading(true);
        setCurrentPage(page);
    };
    const visibleStockMetalValue = products.reduce((total, product) => {
        const rate = getRateForPurity(activeRateSet, product.purity, product.metal_type || "Gold");
        const count = Number(product.total_stock ?? product.stock ?? 0);
        return total + (Number(product.net_gold_weight) || 0) * count * (Number(rate?.rate_per_unit ?? rate?.rate_per_gram) || 0);
    }, 0);

    // Modal Handlers
    const openUpdateModal = async (product) => {
        setIsModalOpen(true);
        setSelectedProduct(product);
        setUpdatedVariants(Array.isArray(product.variants) ? product.variants : []);
        setVariantAdditions({});
        setManualTotalStock("0");
        setFetchingDetail(true);

        try {
            const res = await api.get(`/products/` + product.id);
            const fullP = res.data;
            let vars = [];
            if (fullP.variants) {
                vars = typeof fullP.variants === 'string' ? JSON.parse(fullP.variants) : fullP.variants;
            }
            setSelectedProduct(fullP);
            setUpdatedVariants(Array.isArray(vars) ? vars : []);
            setVariantAdditions({});
            setManualTotalStock("0");
        } catch (e) {
            console.error("Failed to fetch full product details", e);
            toast.error("Failed to fetch detailed stock data");
        } finally {
            setFetchingDetail(false);
        }
    };

    const closeUpdateModal = () => {
        setIsModalOpen(false);
        setSelectedProduct(null);
        setUpdatedVariants([]);
        setVariantAdditions({});
    };

    const handleVariantStockChange = (vIndex, size, value) => {
        const key = `${vIndex}-${size}`;
        const numericValue = Number.parseInt(value, 10);
        setVariantAdditions(prev => ({
            ...prev,
            [key]: Number.isFinite(numericValue) ? Math.max(0, numericValue) : 0
        }));
    };

    const getCurrentStockValue = (product) => {
        const current = Number.parseInt(product?.total_stock ?? product?.stock ?? 0, 10) || 0;
        return Math.max(0, current);
    };

    const handleSaveStock = async () => {
        if (!selectedProduct) return;
        setIsUpdating(true);
        try {
            let newTotalStock = 0;
            const vars = Array.isArray(updatedVariants)
                ? updatedVariants.map((variant) => ({
                    ...variant,
                    sizesStock: variant.sizesStock ? { ...variant.sizesStock } : variant.sizesStock
                }))
                : [];
            const hasVariantsWithSizes = vars.some(v => v.sizesStock && Object.keys(v.sizesStock).length > 0);

            if (hasVariantsWithSizes) {
                vars.forEach((v, vIndex) => {
                    Object.keys(v.sizesStock || {}).forEach(size => {
                        const key = `${vIndex}-${size}`;
                        const currentQty = parseInt(v.sizesStock?.[size] || 0, 10) || 0;
                        const addedQty = parseInt(variantAdditions[key] || 0, 10) || 0;
                        const finalQty = currentQty + addedQty;
                        v.sizesStock[size] = finalQty;
                        newTotalStock += finalQty;
                    });
                });
            } else {
                const currentStock = getCurrentStockValue(selectedProduct);
                const addedStock = parseInt(manualTotalStock) || 0;
                newTotalStock = currentStock + addedStock;
            }

            const stockStatus = newTotalStock <= 0 ? "Out of Stock" : newTotalStock < 10 ? "Low Stock" : "In Stock";

            const payload = {
                ...selectedProduct,
                total_stock: newTotalStock.toString(),
                stock: newTotalStock.toString(),
                stock_status: stockStatus,
                variants: vars
            };

            await api.put(`/products/` + selectedProduct.id, payload);

            setProducts((current) => current.map(p =>
                p.id === selectedProduct.id
                    ? { ...p, total_stock: newTotalStock, stock_status: stockStatus, variants: vars }
                    : p
            ));
            setStockCached((current) => {
                const cachedPage = current[currentCacheKey];
                if (!cachedPage) return current;
                return {
                    ...current,
                    [currentCacheKey]: {
                        ...cachedPage,
                        products: cachedPage.products.map((product) => product.id === selectedProduct.id
                            ? { ...product, total_stock: newTotalStock, stock_status: stockStatus, variants: vars }
                            : product)
                    }
                };
            });

            toast.success("Stock updated successfully");
            closeUpdateModal();
        } catch (error) {
            console.error("Failed to update stock:", error);
            toast.error("Failed to update stock");
        } finally {
            setIsUpdating(false);
        }
    };

    const getProductImage = (product) => {
        let imgUrl = null;
        try {
            const processUrl = (url) => {
                if (!url || typeof url !== 'string') return null;
                if (url.startsWith('http') || url.startsWith('data:')) return url;
                const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
                const cleanPath = url.startsWith('/') ? url : '/' + url;
                return backendUrl + cleanPath;
            };

            if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
                const firstVar = product.variants[0];
                const vImgs = typeof firstVar.images === 'string' ? JSON.parse(firstVar.images) : firstVar.images;
                if (Array.isArray(vImgs) && vImgs.length > 0) imgUrl = vImgs[0];
            }

            if (!imgUrl && product.images) {
                const imgs = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                if (Array.isArray(imgs) && imgs.length > 0) imgUrl = imgs[0];
            }

            const finalUrl = processUrl(imgUrl);
            if (finalUrl) return finalUrl;
        } catch (e) {
            console.error("Error getting product image:", e);
        }

        return `https://ui-avatars.com/api/?name=` + encodeURIComponent(product.name || 'P') + `&background=random`;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            <Toaster position="top-right" />

            <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Inventory</p>
                    <h1 className="mt-1 text-2xl font-black text-[#003B3B]">Stock Details</h1>
                    <p className="mt-1 text-sm text-slate-500">Review availability and update product quantities.</p>
                </div>
                <button
                    type="button"
                    onClick={() => navigate("/admin/products/stock/add")}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#006B62] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#00564f]"
                >
                    <FiPlus size={17} /> Add Stock
                </button>
            </header>

            <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Current-page stock value estimate</p>
                        <p className="mt-1 text-lg font-extrabold text-[#003B3B]">
                            {ratesLoading ? "Refreshing active rates..." : activeRateSet ? `₹${visibleStockMetalValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "No active precious metal rates"}
                        </p>
                        <p className="text-xs text-slate-500">{activeRateSet ? `Based on listed items' net weight × quantity × current metal purity rate · ${formatRateDate(activeRateSet.rate_date)}` : "Activate global rates to estimate stock value."}</p>
                    </div>
                    {ratesError && <p role="alert" className="text-xs font-semibold text-rose-700">Rate refresh failed: {ratesError}</p>}
                </div>
            </section>

           
            
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Products", value: stats.total || 0, sub: "All products",    icon: <FiBox size={22} />,          gradient: "from-violet-500 to-purple-600" },
                    { label: "Active",         value: stats.active || 0, sub: "Active products",     icon: <FiCheckCircle />,             gradient: "from-emerald-400 to-teal-500" },
                    { label: "Out of Stock",   value: stats.outOfStock || 0, sub: "No units available", icon: <FiAlertCircle />,      gradient: "from-orange-400 to-amber-500" },
                    { label: "Low Stock",      value: stats.lowStock || 0, sub: "Products below 10 units", icon: <FiTrendingDown />,             gradient: "from-rose-400 to-pink-500" },
                ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-all">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ` + stat.gradient + ` flex items-center justify-center text-white shadow-lg shrink-0`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">{stat.label}</p>
                            <p className="text-3xl font-black text-slate-800 leading-none my-0.5">{stat.value}</p>
                            <p className="text-[10px] text-gray-400">{stat.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input
                        type="text"
                        placeholder="Search products by name, SKU, category..."
                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-400 focus:bg-white transition-all text-sm font-medium text-slate-700"
                        value={searchTerm}
                        onChange={(e) => {
                            setLoading(true);
                            setCurrentPage(1);
                            setSearchTerm(e.target.value);
                        }}
                    />
                </div>
               
             
                <select
                    aria-label="Filter products by stock status"
                    value={statusFilter}
                    onChange={(event) => {
                        setLoading(true);
                        setCurrentPage(1);
                        setStatusFilter(event.target.value);
                    }}
                    className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-slate-600 outline-none hover:border-purple-300 transition-all cursor-pointer"
                >
                    <option value="All">All stock statuses</option>
                    <option>In Stock</option>
                    <option>Low Stock</option>
                    <option>Out of Stock</option>
                </select>

                <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
                    <button
                        type="button"
                        onClick={() => setViewMode("table")}
                        className={`p-2 rounded-md transition-colors ${viewMode === "table" ? "bg-white text-[#7b2cbf] shadow-sm" : "text-gray-500 hover:text-[#7b2cbf]"}`}
                        aria-label="Table mode"
                        title="Table mode"
                    >
                        <FiList size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode("card")}
                        className={`p-2 rounded-md transition-colors ${viewMode === "card" ? "bg-white text-[#7b2cbf] shadow-sm" : "text-gray-500 hover:text-[#7b2cbf]"}`}
                        aria-label="Card mode"
                        title="Card mode"
                    >
                        <FiGrid size={16} />
                    </button>
                </div>
                

            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-slate-800">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-500 font-bold text-sm">Loading stock details...</p>
                        </div>
                    ) : viewMode === "table" ? (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gradient-to-r from-[#1F0A3C] to-[#3c096c] border-b border-[#3c096c]">
                                    <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider w-10">
                                        <input type="checkbox" className="rounded border-[#FCD34D]/40 accent-[#FCD34D]" />
                                    </th>
                                    <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider w-12">S.No.</th>
                                    <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Product</th>
                                    <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Category</th>
                                    <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Price</th>
                                    <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Stock</th>
                                    <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {currentItems.length > 0 ? (
                                    currentItems.map((product, index) => {
                                        const stock = getStockLevel(product);
                                        const status = deriveStatus(stock);

                                        return (
                                            <tr key={product.id} className="hover:bg-[#240046]/5 transition-colors group">
                                                <td className="px-5 py-4">
                                                    <input type="checkbox" className="rounded border-gray-300" />
                                                </td>
                                                <td className="px-3 py-4 text-sm text-gray-500 font-medium">
                                                    {(currentPage - 1) * itemsPerPage + index + 1}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 border border-gray-100 shrink-0 group-hover:scale-105 transition-transform">
                                                            <img
                                                                src={getProductImage(product)}
                                                                alt={product.name}
                                                                loading="lazy"
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=` + encodeURIComponent(product.name) + `&background=3c096c&color=FCD34D`}
                                                            />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800 leading-tight max-w-[180px] truncate">{product.name}</p>
                                                            <p className="text-[11px] text-gray-400 font-medium mt-0.5">SKU: {product.product_code || `SS` + String(product.id).padStart(4,'0')}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#240046]/10 text-[#7b2cbf] border border-[#7b2cbf]/20">
                                                        {product.category || 'Saree'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <p className="text-sm font-bold text-slate-800">₹{parseFloat(product.offer_price || product.discount_price || product.mrp || 0).toLocaleString('en-IN')}</p>
                                                    {product.mrp && product.offer_price && parseFloat(product.mrp) > parseFloat(product.offer_price) && (
                                                        <p className="text-[11px] text-gray-400 line-through">₹{parseFloat(product.mrp).toLocaleString('en-IN')}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <button
                                                        onClick={() => openUpdateModal(product)}
                                                        title="Click to update stock"
                                                        className="flex items-center gap-1.5 text-sm font-black text-slate-800 hover:text-[#7b2cbf] transition-colors group/stock"
                                                    >
                                                        <span className="underline decoration-dotted decoration-gray-300 group-hover/stock:decoration-[#7b2cbf]">{stock}</span>
                                                        <span className="opacity-0 group-hover/stock:opacity-100 transition-opacity text-[10px] bg-[#240046]/10 text-[#7b2cbf] px-1.5 py-0.5 rounded font-bold">edit</span>
                                                    </button>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`px-3 py-1 rounded-lg text-[11px] font-bold border ` + getStatusStyle(status)}>
                                                        {status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => openUpdateModal(product)}
                                                            className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center hover:bg-amber-500 hover:text-white transition-all"
                                                            title="Update Stock"
                                                        >
                                                            <FiEdit2 size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="px-8 py-10 text-center text-gray-400 font-bold">
                                            No stock data found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-5">
                            {currentItems.length > 0 ? currentItems.map((product) => {
                                const stock = getStockLevel(product);
                                const status = deriveStatus(stock);

                                return (
                                    <div key={product.id} className="group overflow-hidden border border-gray-100 rounded-2xl bg-white hover:-translate-y-0.5 hover:shadow-lg transition-all">
                                        <div className="relative h-40 bg-gray-100 overflow-hidden">
                                            <img
                                                src={getProductImage(product)}
                                                alt={product.name}
                                                loading="lazy"
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=` + encodeURIComponent(product.name) + `&background=3c096c&color=FCD34D`}
                                            />
                                            <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[11px] font-bold border shadow-sm ` + getStatusStyle(status)}>{status}</span>
                                        </div>
                                        <div className="p-4">
                                            <div className="min-w-0">
                                                <p className="text-base font-bold text-slate-800 truncate">{product.name}</p>
                                                <p className="text-[11px] text-gray-400 font-medium mt-1">SKU: {product.product_code || `SS` + String(product.id).padStart(4, '0')}</p>
                                                <span className="inline-block mt-3 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#240046]/10 text-[#7b2cbf] border border-[#7b2cbf]/20">
                                                    {product.category || 'Saree'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-gray-100">
                                                <div>
                                                    <p className="text-[11px] text-gray-400 font-medium">Price</p>
                                                    <p className="text-lg font-black text-slate-800 mt-0.5">₹{parseFloat(product.offer_price || product.discount_price || product.mrp || 0).toLocaleString('en-IN')}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[11px] text-gray-400 font-medium">Available Stock</p>
                                                    <button onClick={() => openUpdateModal(product)} className="text-lg font-black text-slate-800 hover:text-[#7b2cbf] transition-colors">
                                                        {stock}
                                                    </button>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => openUpdateModal(product)}
                                                className="w-full mt-4 py-2.5 rounded-lg bg-[#240046] text-white hover:bg-[#7b2cbf] transition-all text-xs font-bold flex items-center justify-center gap-2"
                                            >
                                                <FiEdit2 size={13} /> Update Stock
                                            </button>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <p className="col-span-full px-8 py-10 text-center text-gray-400 font-bold">No stock data found.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Pagination UI */}
                {totalPages > 0 && (
                    <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between bg-white">
                        <p className="text-xs text-gray-500 font-medium">
                            Showing {pagination.total ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, pagination.total)} of {pagination.total} products
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => changePage(Math.max(currentPage - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-500 hover:border-purple-300 hover:text-purple-600 disabled:opacity-30 transition-all"
                            >‹</button>
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                const firstPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                                const page = firstPage + i;
                                return (
                                    <button
                                        key={page}
                                        onClick={() => changePage(page)}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all border ` + (currentPage === page ? "bg-[#8a2be2] border-purple-500 text-white shadow-md" : "bg-white border-gray-200 text-gray-500 hover:border-purple-300")}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                            {totalPages > 5 && <span className="text-gray-400 text-sm">...</span>}
                            {totalPages > 5 && (
                                <button
                                    onClick={() => changePage(totalPages)}
                                    className={`w-8 h-8 rounded-lg text-xs font-bold border ` + (currentPage === totalPages ? "bg-[#8a2be2] border-purple-500 text-white shadow-md" : "bg-white border-gray-200 text-gray-500 hover:border-purple-300")}
                                >
                                    {totalPages}
                                </button>
                            )}
                            <button
                                onClick={() => changePage(Math.min(currentPage + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-500 hover:border-purple-300 hover:text-purple-600 disabled:opacity-30 transition-all"
                            >›</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Stock Update Modal */}
            {isModalOpen && selectedProduct && (
                createPortal(
                <div className="fixed inset-0 z-[99] flex h-screen w-screen items-center justify-center bg-transparent p-4">
                    <div className="absolute inset-0 z-0 bg-slate-900/60 backdrop-blur-[3px] animate-in fade-in duration-200" onClick={closeUpdateModal} />
                    <div className="relative z-10 bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800">
                        <div className="bg-gradient-to-r from-[#1F0A3C] to-[#3c096c] p-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black text-white">Quick Stock Update</h3>
                                <p className="text-xs font-bold text-[#FCD34D]/70 mt-1">{selectedProduct.name}</p>
                            </div>
                            <button onClick={closeUpdateModal} className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                                <FiX size={20} />
                            </button>
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {fetchingDetail ? (
                                <div className="py-10 flex flex-col items-center justify-center">
                                    <div className="w-8 h-8 border-4 border-[#7b2cbf]/20 border-t-[#7b2cbf] rounded-full animate-spin mb-3"></div>
                                    <p className="text-xs font-bold text-gray-400">Loading variants...</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {updatedVariants.length > 0 && updatedVariants.some(v => v.sizesStock && Object.keys(v.sizesStock).length > 0) ? (
                                        // Variant Based Stock
                                        <div className="space-y-4">
                                            {updatedVariants.map((variant, vIndex) => (
                                                <div key={vIndex} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-6 h-6 rounded-full shadow-sm border border-gray-200" style={{ backgroundColor: variant.color }}></div>
                                                        <span className="text-sm font-black text-slate-800">{variant.colorName || 'Default Shade'}</span>
                                                    </div>

                                                    {variant.sizesStock && Object.keys(variant.sizesStock).length > 0 ? (
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {Object.entries(variant.sizesStock).map(([size, currentQty]) => (
                                                                <div key={size} className="bg-white border border-gray-200 p-3 rounded-xl">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <label className="text-[10px] font-black text-gray-400 uppercase">{size}</label>
                                                                        <span className="text-[9px] font-black bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Curr: {currentQty}</span>
                                                                    </div>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        value={variantAdditions[`${vIndex}-${size}`] ?? ""}
                                                                        onChange={(e) => handleVariantStockChange(vIndex, size, e.target.value)}
                                                                        className="w-full text-base font-black text-slate-800 outline-none placeholder:text-gray-300 bg-transparent border-b border-gray-100 focus:border-[#7b2cbf] transition-colors pb-1"
                                                                        placeholder="Add"
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-gray-400 font-medium">No sizes configured for this variant.</p>
                                                    )}
                                                </div>
                                            ))}
                                            <p className="text-xs text-center bg-[#240046]/5 text-[#7b2cbf] p-3 rounded-xl font-bold">
                                                Total stock will be auto-calculated from variants.
                                            </p>
                                        </div>
                                    ) : (
                                        // Manual Total Stock
                                        <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Add To Current Stock</label>
                                                <span className="text-[10px] font-black text-gray-500 bg-gray-200 px-2 py-1 rounded-full">Current: {selectedProduct.total_stock ?? 0}</span>
                                            </div>
                                            <div className="relative">
                                                <FiBox className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7b2cbf]" />
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={manualTotalStock}
                                                    onChange={(e) => setManualTotalStock(e.target.value)}
                                                    className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#7b2cbf] transition-all text-xl font-black text-slate-800 shadow-sm"
                                                    placeholder="Enter quantity to add"
                                                />
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-bold mt-2 ml-1">The new total will be current stock + added quantity.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
                            <button
                                onClick={closeUpdateModal}
                                disabled={isUpdating}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveStock}
                                disabled={isUpdating || fetchingDetail}
                                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#1F0A3C] to-[#7b2cbf] hover:from-[#10002b] hover:to-[#5a189a] text-[#FCD34D] rounded-xl text-sm font-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                {isUpdating ? (
                                    <><div className="w-4 h-4 border-2 border-[#FCD34D]/30 border-t-[#FCD34D] rounded-full animate-spin"></div> Saving...</>
                                ) : (
                                    <><FiSave /> Save Stock</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
                )
            )}

        </div>
    );
};

// SVG Helper Components
const FiCheckCircle = () => <svg stroke="currentColor" fill="none" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
export default StockDetails;
