import React, { useEffect, useState } from "react";
import { FaArrowRight } from "react-icons/fa";
import { Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import api from "../../api";
import PageContainer from "../CommenComponents/PageContainer";
import ProductCard from "../Home/ProductCard";

import "swiper/css";

/**
 * CategoryProducts
 * Shows all active products that share the same category as the current product,
 * excluding the current product itself.
 * - Hidden completely when there are no matching products.
 * - Single result is left-aligned (no centering).
 *
 * Props:
 *  - currentProductId : id of the product currently being viewed
 *  - category         : e.g. "Chain", "Ring", "Bangle"
 */
const CategoryProducts = ({ currentProductId, category }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!category) {
      setLoading(false);
      return;
    }

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

        const normalise = (v) => String(v || "").toLowerCase().trim();
        const targetCategory = normalise(category);

        const filtered = response.data.products.filter((p) => {
          const pid = String(p.id ?? p.product_id ?? p.productId ?? "");
          if (pid === String(currentProductId)) return false;
          return (
            normalise(p.category).includes(targetCategory) ||
            normalise(p.subcategory).includes(targetCategory)
          );
        });

        setProducts(filtered);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Failed to fetch category products:", err);
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchProducts();
    return () => controller.abort();
  }, [currentProductId, category]);

  // Hidden when loading, on error, or when no matching products exist
  if (loading || error || products.length === 0) return null;

  return (
    <section className="w-full bg-[#fff9f0] py-6 border-t border-[#f0e9db]">
      <PageContainer>
        <div className="min-w-0">

          {/* Section header */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col items-start text-left">
              <span className="mb-1 text-[9px] font-bold uppercase tracking-[0.3em] text-[#a67b2e]">
                Browse Category
              </span>
              <h2 className="font-serif text-2xl font-bold tracking-wide text-[#201a13] sm:text-3xl">
                More {category}
              </h2>
              <div className="mt-2 flex items-center justify-start gap-3" aria-hidden="true">
                <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#d9a441]" />
                <span className="h-1.5 w-1.5 rotate-45 bg-[#d9a441]" />
                <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#d9a441]" />
              </div>
            </div>
            <a
              href={`/explore?category=${encodeURIComponent(category)}`}
              className="inline-flex items-center gap-2 self-end text-xs font-semibold text-[#6f5426] transition-colors hover:text-[#b47a16]"
            >
              View All
              <FaArrowRight className="text-[10px] text-[#b47a16]" />
            </a>
          </div>

          {/* Swiper carousel — single result stays left-aligned */}
          <Swiper
            modules={[Autoplay]}
            loop={products.length > 5}
            autoplay={
              products.length > 5
                ? { delay: 2400, disableOnInteraction: false, pauseOnMouseEnter: true }
                : false
            }
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
            centeredSlides={false}
            className="!pb-2"
          >
            {products.map((p) => (
              <SwiperSlide
                key={p.id}
                className="h-auto w-[260px] sm:w-[280px] xl:w-[300px]"
              >
                <ProductCard product={p} />
              </SwiperSlide>
            ))}
          </Swiper>

        </div>
      </PageContainer>
    </section>
  );
};

export default CategoryProducts;
