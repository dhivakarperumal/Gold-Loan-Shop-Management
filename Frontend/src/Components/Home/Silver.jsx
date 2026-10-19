
import React, { useEffect, useState } from "react";
import { FaArrowRight } from "react-icons/fa";
import { Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import api from "../../api";
import ProductCard from "./ProductCard";

import "swiper/css";

const Silver = () => {
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
          String(product.metal_type || "").toLowerCase().includes("silver")
        ));
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          console.error("Failed to fetch silver products:", fetchError);
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
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 lg:grid-cols-[0.9fr_2fr]">

        {/* LEFT: Silver promotional banner */}
        <a
          href="/category/silver-articles"
          className="group relative flex min-h-[280px] overflow-hidden rounded-lg border border-[#c99a43]/60 bg-[#003b2b] sm:min-h-[320px] lg:min-h-0"
        >
          {/* Silver banner image */}
          <img
            src="/images/silverproduct.png"
            alt="Premium silver jewellery and articles"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />

          {/* Reduced green overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#003b2b]/20 via-[#003b2b]/5 to-transparent" />

          {/* Decorative gold border */}
          <div className="pointer-events-none absolute inset-[5px] rounded-md border border-[#d8b45e]/60" />

          {/* Banner content */}
          <div className="relative z-10 flex w-[65%] flex-col items-start justify-center p-5 sm:p-7">
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#f4ce72]">
              Timeless Elegance
            </p>

            <h2 className="font-serif text-2xl font-bold leading-tight text-[#ffe4a0] sm:text-3xl">
              Silver
              <br />
              Collection
            </h2>

            <p className="mt-3 max-w-[180px] text-xs leading-relaxed text-white sm:text-sm">
              Tradition in pure silver
            </p>

            <span className="mt-4 inline-flex items-center gap-2 rounded-sm bg-gradient-to-r from-[#f2b93f] to-[#ffda76] px-3 py-2.5 text-[10px] font-bold text-[#34230d] transition-all group-hover:gap-3 sm:px-4 sm:text-xs">
              Explore Collection
              <FaArrowRight />
            </span>
          </div>
        </a>

        {/* RIGHT: Silver products */}
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-xl font-bold text-[#201a13] sm:text-2xl">
                Silver Articles
              </h2>
              <span className="h-px w-10 bg-[#d9a441]" />
            </div>

            <a
              href="/category/silver-articles"
              className="flex items-center gap-2 text-xs font-medium text-[#33271b] transition-colors hover:text-[#b47a16]"
            >
              View All
              <FaArrowRight className="text-[10px] text-[#b47a16]" />
            </a>
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-[#777066]" role="status">Loading silver products...</p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-[#777066]" role="alert">Products could not be loaded.</p>
          ) : products.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#777066]">No silver products available.</p>
          ) : (
            <Swiper
              modules={[Autoplay]}
              loop={products.length > 1}
              autoplay={products.length > 1 ? {
                delay: 2200,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
              } : false}
              speed={700}
              slidesPerView={Math.max(1, Math.min(2.1, products.length))}
              spaceBetween={12}
              breakpoints={{
                480: { slidesPerView: Math.max(1, Math.min(2, products.length)) },
                640: { slidesPerView: Math.max(1, Math.min(3, products.length)) },
                1024: { slidesPerView: Math.max(1, Math.min(3, products.length)) },
                1280: { slidesPerView: Math.max(1, Math.min(4, products.length)) },
              }}
              grabCursor
              centeredSlides={false}
              className="!pb-2"
            >
              {products.map((product) => (
                <SwiperSlide key={product.id} className="h-auto">
                  <div className={products.length === 1 ? "mx-auto w-full max-w-[300px]" : ""}>
                    <ProductCard product={product} />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          )}
        </div>
      </div>
    </section>
  );
};

export default Silver;
