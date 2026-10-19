
import React, { useEffect, useState } from "react";
import { FaArrowRight } from "react-icons/fa";
import { Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import api from "../../api";
import PageContainer from "../CommenComponents/PageContainer";
import ProductCard from "./ProductCard";

import "swiper/css";

const Gold = () => {
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
                const isDiamondProduct = (product) =>
                    [product.name, product.category, product.subcategory, product.metal_type]
                        .some((value) => String(value || "").toLowerCase().includes("diamond"));
                setProducts(response.data.products.filter(
                    (product) => String(product.metal_type || "").toLowerCase().includes("gold")
                        && !isDiamondProduct(product)
                ));
            } catch (fetchError) {
                if (!controller.signal.aborted) {
                    console.error("Failed to fetch gold products:", fetchError);
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
        <section className="w-full bg-[#fffdf8] py-4">
            <PageContainer>

                {/* LEFT: Gold jewellery products */}
                <div className="min-w-0">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h2 className="font-serif text-xl font-bold text-[#201a13] sm:text-2xl">
                                Gold Jewellery
                            </h2>
                            <span className="h-px w-10 bg-[#d9a441]" />
                        </div>

                        <a
                            href="/category/gold-jewellery"
                            className="flex items-center gap-2 text-xs font-medium text-[#33271b] transition-colors hover:text-[#b47a16]"
                        >
                            View All
                            <FaArrowRight className="text-[10px] text-[#b47a16]" />
                        </a>
                    </div>

                    {loading ? (
                        <p className="py-8 text-center text-sm text-[#777066]" role="status">Loading gold products...</p>
                    ) : error ? (
                        <p className="py-8 text-center text-sm text-[#777066]" role="alert">Products could not be loaded.</p>
                    ) : products.length === 0 ? (
                        <p className="py-8 text-center text-sm text-[#777066]">No gold products available.</p>
                    ) : (
                        <Swiper
                            modules={[Autoplay]}
                            loop={products.length > 5}
                            autoplay={products.length > 5 ? {
                                delay: 2200,
                                disableOnInteraction: false,
                                pauseOnMouseEnter: true,
                            } : false}
                            speed={700}
                            slidesPerView="auto"
                            spaceBetween={12}
                            breakpoints={{
                                640: { slidesPerView: 2 },
                                900: { slidesPerView: 3 },
                                1200: { slidesPerView: 4 },
                                1500: { slidesPerView: 5 },
                            }}
                            grabCursor
                            centeredSlides={products.length === 1}
                            className="!pb-2"
                        >
                            {products.map((product) => (
                                <SwiperSlide key={product.id} className="h-auto w-[260px] sm:w-[280px] xl:w-[300px]">
                                    <ProductCard product={product} />
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    )}
                </div>
            </PageContainer>
        </section>
    );
};

export default Gold;
