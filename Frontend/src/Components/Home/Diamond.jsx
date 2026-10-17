
import React, { useEffect, useState } from "react";
import { FaArrowRight, FaHeart, FaShoppingBag } from "react-icons/fa";
import api from "../../api";
import { formatProductPrice, getProductDetails, getProductImageUrl } from "./productDisplay";

const Diamond = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        const fetchProducts = async () => {
            try {
                const response = await api.get("/products", {
                    params: { page: 1, limit: 100, search: "", status: "Active" },
                    signal: controller.signal,
                });
                if (!Array.isArray(response.data?.products)) {
                    throw new TypeError("The products response must contain a products array");
                }
                setProducts(response.data.products.filter((product) =>
                    [product.name, product.category, product.subcategory, product.metal_type]
                        .some((value) => String(value || "").toLowerCase().includes("diamond"))
                ));
            } catch (fetchError) {
                if (!controller.signal.aborted) {
                    console.error("Failed to fetch diamond products:", fetchError);
                    setError(true);
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };

        fetchProducts();
        return () => controller.abort();
    }, []);

    return (
        <section className="w-full bg-[#fffdf8] px-3 py-4 sm:px-5 lg:px-7">
            <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 lg:grid-cols-[2fr_0.9fr]">

                {/* LEFT: Diamond products */}
                <div className="min-w-0">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h2 className="font-serif text-xl font-bold text-[#201a13] sm:text-2xl">
                                Diamond Jewellery
                            </h2>
                            <span className="h-px w-10 bg-[#d9a441]" />
                        </div>

                        <a
                            href="/category/diamond-jewellery"
                            className="flex items-center gap-2 text-xs font-medium text-[#33271b] transition-colors hover:text-[#b47a16]"
                        >
                            View All
                            <FaArrowRight className="text-[10px] text-[#b47a16]" />
                        </a>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {loading ? (
                            <p className="col-span-full py-8 text-center text-sm text-[#777066]" role="status">Loading diamond products...</p>
                        ) : error ? (
                            <p className="col-span-full py-8 text-center text-sm text-[#777066]" role="alert">Products could not be loaded.</p>
                        ) : products.length === 0 ? (
                            <p className="col-span-full py-8 text-center text-sm text-[#777066]">No diamond products available.</p>
                        ) : products.map((product) => (
                            <article
                                key={product.id}
                                className="group min-w-0 overflow-hidden rounded-md border border-[#eadfce] bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                            >
                                {/* Product image */}
                                <div className="relative aspect-[1.12/1] overflow-hidden bg-[#f6efe4]">
                                    <img
                                        src={getProductImageUrl(product)}
                                        alt={product.name}
                                        loading="lazy"
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />

                                    <button
                                        type="button"
                                        aria-label={`Add ${product.name} to wishlist`}
                                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-white/95 text-[#81513b] shadow-sm transition-colors hover:bg-[#fff0e8] hover:text-red-600"
                                    >
                                        <FaHeart size={13} />
                                    </button>
                                </div>

                                {/* Product details */}
                                <div className="p-2">
                                    <h3 className="truncate font-serif text-xs font-semibold text-[#292018] sm:text-sm">
                                        {product.name}
                                    </h3>

                                    <p className="mt-1 truncate text-[10px] text-[#777066] sm:text-xs">
                                        {getProductDetails(product)}
                                    </p>

                                    <p className="mt-1 text-sm font-bold text-[#9c3218] sm:text-base">
                                        {formatProductPrice(product)}
                                    </p>

                                    <button
                                        type="button"
                                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-sm bg-gradient-to-r from-[#efb640] to-[#ffda78] px-1 py-2 text-[10px] font-bold text-[#35240e] transition-all hover:brightness-95 sm:text-xs"
                                    >
                                        <FaShoppingBag size={11} />
                                        Add to Bag
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>



                {/* RIGHT: Diamond promotional banner */}
                <a
                    href="/category/diamond-jewellery"
                    className="group relative flex min-h-[280px] overflow-hidden rounded-lg border border-[#c99a43]/60 bg-[#003b2b] sm:min-h-[320px] lg:min-h-0"
                >
                    {/* Diamond banner image */}
                    <img
                        src="/images/diamondproduct.png"
                        alt="Diamond jewellery collection"
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />

                    {/* Reduced green overlay */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#003b2b]/20 via-[#003b2b]/5 to-transparent" />

                    {/* Gold decorative frame */}
                    <div className="pointer-events-none absolute inset-[5px] rounded-md border border-[#d8b45e]/60" />

                    {/* Banner content */}
                    <div className="relative z-10 flex w-[65%] flex-col items-start justify-center p-5 sm:p-7">
                        <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#f4ce72]">
                            Brilliant by Nature
                        </p>

                        <h2 className="font-serif text-2xl font-bold leading-tight text-[#ffe4a0] sm:text-3xl">
                            Diamond
                            <br />
                            Jewellery
                        </h2>

                        <p className="mt-3 max-w-[180px] text-xs leading-relaxed text-white sm:text-sm">
                            Brilliance for every special moment
                        </p>

                        <span className="mt-4 inline-flex items-center gap-2 rounded-sm bg-gradient-to-r from-[#f2b93f] to-[#ffda76] px-3 py-2.5 text-[10px] font-bold text-[#34230d] transition-all group-hover:gap-3 sm:px-4 sm:text-xs">
                            Explore Collection
                            <FaArrowRight />
                        </span>
                    </div>
                </a>
            </div>
        </section>
    );
};

export default Diamond;
