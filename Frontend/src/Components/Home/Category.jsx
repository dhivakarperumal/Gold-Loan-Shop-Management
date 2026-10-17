
import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import api from "../../api";

import "swiper/css";

const backendUrl = (
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5000"
).replace(/\/$/, "");

const Category = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchCategories = async () => {
      try {
        const response = await api.get("/categories", { signal: controller.signal });
        const activeCategories = response.data.filter(
          (category) => (category.status || "Active") === "Active"
        );
        setCategories(activeCategories);
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          console.error("Failed to fetch home categories:", fetchError);
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchCategories();
    return () => controller.abort();
  }, []);

  const getImageUrl = (image) => {
    if (!image || /^(https?:|data:|blob:)/i.test(image)) return image || "";
    return `${backendUrl}${image.startsWith("/") ? image : `/${image}`}`;
  };

  return (
    <section className="relative overflow-hidden border-y border-[#ead8b6] bg-[#fffdf8] px-3 py-5 sm:px-6 lg:px-8">

      {/* Decorative ornaments */}
      <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-4xl text-[#e9c77e]/80 sm:left-7 sm:text-6xl">
        ❀
      </span>

      <span className="pointer-events-none absolute right-4 top-1/2 z-10 -translate-y-1/2 text-4xl text-[#e9c77e]/80 sm:right-7 sm:text-6xl">
        ❀
      </span>

      <div className="mx-auto max-w-[1700px] px-8 sm:px-10">

        {loading ? (
          <p className="py-8 text-center text-sm text-[#6b5b43]" role="status">
            Loading categories...
          </p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-[#6b5b43]" role="alert">
            Categories could not be loaded.
          </p>
        ) : categories.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#6b5b43]">
            No categories available.
          </p>
        ) : (
          <Swiper
            modules={[Autoplay]}
            loop={categories.length >= 6}
            speed={800}
            autoplay={{
              delay: 1800,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            slidesPerView={3}
            spaceBetween={8}
            breakpoints={{
              480: {
                slidesPerView: 3,
                spaceBetween: 12,
              },
              640: {
                slidesPerView: 5,
                spaceBetween: 12,
              },
              1024: {
                slidesPerView: 7,
                spaceBetween: 12,
              },
              1280: {
                slidesPerView: 9,
                spaceBetween: 8,
              },
            }}
            className="category-swiper !overflow-hidden !px-1"
          >
            {categories.map((category) => {
              const image = Array.isArray(category.images) ? category.images[0] : category.images;

              return (
                <SwiperSlide key={category.catId} className="h-auto">
                  <button
                    type="button"
                    className="group flex h-full min-w-0 w-full flex-col items-center px-1 text-center transition-transform duration-300 hover:-translate-y-1"
                  >
                    <div className="relative aspect-square w-full max-w-[105px] rounded-full border-2 border-[#e9ce98] bg-white p-[3px] shadow-[0_0_0_2px_rgba(225,188,116,0.12)] transition-all duration-300 group-hover:border-[#bd8732] group-hover:shadow-[0_0_0_4px_rgba(225,188,116,0.18)] sm:max-w-[125px] lg:max-w-[145px]">
                      <div className="h-full w-full overflow-hidden rounded-full border border-[#f2e4c8]">
                        {image && (
                          <img
                            src={getImageUrl(image)}
                            alt={category.name}
                            loading="lazy"
                            className="h-full w-full rounded-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        )}
                      </div>
                    </div>

                    <span className="mt-2 whitespace-normal text-xs font-semibold text-[#29231c] transition-colors group-hover:text-[#a77525] sm:mt-3 sm:text-sm lg:text-base">
                      {category.name}
                    </span>

                    <div className="relative mt-2 h-[2px] w-12 shrink-0 bg-gradient-to-r from-transparent via-[#d5a64e] to-transparent sm:w-16">
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] leading-none text-[#c79a43]">
                        ✦
                      </span>
                    </div>
                  </button>
                </SwiperSlide>
              );
            })}
          </Swiper>
        )}

      </div>
    </section>
  );
};

export default Category;
