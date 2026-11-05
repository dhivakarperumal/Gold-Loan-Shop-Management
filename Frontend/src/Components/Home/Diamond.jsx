
import React from "react";
import { FaArrowRight } from "react-icons/fa";
import { Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import PageContainer from "../CommenComponents/PageContainer";
import ProductCard from "./ProductCard";

import "swiper/css";

const Diamond = ({ products: catalogProducts, loading, error }) => {
    const products = catalogProducts.filter((product) =>
        [product.name, product.category, product.subcategory, product.metal_type]
            .some((value) => String(value || "").toLowerCase().includes("diamond"))
    );

    return (
        <section className="w-full bg-[#fffdf8] py-4">
            <PageContainer>

                <div className="min-w-0">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex flex-col items-start text-left">
                            <span className="mb-1 text-[9px] font-bold uppercase tracking-[0.3em] text-[#a67b2e]">
                                Curated Collection
                            </span>
                            <h2 className="font-serif text-2xl font-bold tracking-wide text-[#201a13] sm:text-3xl">
                                Diamond Jewellery
                            </h2>
                            <div className="mt-2 flex items-center justify-start gap-3" aria-hidden="true">
                                <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#d9a441]" />
                                <span className="h-1.5 w-1.5 rotate-45 bg-[#d9a441]" />
                                <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#d9a441]" />
                            </div>
                        </div>
                        <a
                            href="/explore?category=Diamond%20Jewellery"
                            className="inline-flex items-center gap-2 self-end text-xs font-semibold text-[#6f5426] transition-colors hover:text-[#b47a16]"
                        >
                            View All
                            <FaArrowRight className="text-[10px] text-[#b47a16]" />
                        </a>
                    </div>

                    {loading ? (
                        <p className="py-8 text-center text-sm text-[#777066]" role="status">Loading diamond products...</p>
                    ) : error ? (
                        <p className="py-8 text-center text-sm text-[#777066]" role="alert">Products could not be loaded.</p>
                    ) : products.length === 0 ? (
                        <p className="py-8 text-center text-sm text-[#777066]">No diamond products available.</p>
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

export default Diamond;
