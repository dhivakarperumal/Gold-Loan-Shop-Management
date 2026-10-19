
import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade } from "swiper/modules";
import api from "../../api";
import {
  ArrowRight,
  Gem,
  ShieldCheck,
  Truck,
} from "lucide-react";

import "swiper/css";
import "swiper/css/effect-fade";

const backendUrl = (
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5000"
).replace(/\/$/, "");

const getBannerImageUrl = (image) => {
  if (!image || /^(https?:|data:|blob:)/i.test(image)) return image || "";
  return `${backendUrl}${image.startsWith("/") ? image : `/${image}`}`;
};

const getHeadingParts = (title) => {
  const words = String(title || "").trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return { title: "", highlight: words[0] || "" };
  const splitAt = Math.floor(words.length / 2);
  return {
    title: words.slice(0, splitAt).join(" "),
    highlight: words.slice(splitAt).join(" "),
  };
};

const Hero = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [slides, setSlides] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchBanners = async () => {
      try {
        const response = await api.get("/banners", { signal: controller.signal });
        if (!Array.isArray(response.data)) {
          throw new TypeError("The banners response must be an array");
        }
        setSlides(response.data.filter((banner) => banner.type === "hero" && banner.active));
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          console.error("Failed to fetch home hero banners:", fetchError);
          setError(true);
        }
      }
    };

    fetchBanners();
    return () => controller.abort();
  }, []);

  const slide = slides[activeSlide] || slides[0];
  const heading = getHeadingParts(slide?.title);

  return (
    <section className="relative w-full overflow-hidden bg-[#032e25] text-white">
      <div className="relative isolate h-[680px] w-full sm:h-[540px] lg:h-[560px]">

        {/* Swiper background images */}
        {slides.length > 0 && (
          <Swiper
            modules={[Autoplay, EffectFade]}
            effect="fade"
            slidesPerView={1}
            speed={900}
            loop={slides.length > 1}
            autoplay={slides.length > 1 ? {
              delay: 3500,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            } : false}
            pagination={false}
            navigation={false}
            onSlideChange={(swiper) => {
              setActiveSlide(swiper.realIndex);
            }}
            className="!absolute inset-0 h-full w-full"
          >
            {slides.map((item) => {
              const desktopImage = getBannerImageUrl(item.image);
              const mobileImage = item.mobile_image
                ? getBannerImageUrl(item.mobile_image)
                : "";

              return (
                <SwiperSlide key={item.id} className="h-full w-full">
                  <picture className="absolute inset-0 block h-full w-full">
                    {mobileImage && (
                      <source media="(max-width: 639px)" srcSet={mobileImage} />
                    )}
                    <img
                      src={desktopImage}
                      alt=""
                      className="h-full w-full object-cover object-[75%_center] sm:object-contain sm:object-center"
                      onError={(event) => {
                        if (mobileImage && event.currentTarget.currentSrc !== desktopImage) {
                          event.currentTarget.src = desktopImage;
                        }
                      }}
                    />
                  </picture>
                </SwiperSlide>
              );
            })}
          </Swiper>
        )}

        {/* Subtle overlay on the left only */}
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#00271e]/90 via-[#003326]/25 to-transparent sm:bg-gradient-to-r sm:from-[#00271e]/65 sm:via-[#003326]/20 sm:to-transparent" />

        {/* Decorative gold border */}
        <div className="pointer-events-none absolute inset-2 z-10 border border-[#d2b56e]/60 sm:inset-3">
          <span className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-[#e5c879]" />
          <span className="absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-[#e5c879]" />
          <span className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-[#e5c879]" />
          <span className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-[#e5c879]" />
        </div>

        {/* Hero content */}
        <div className="pointer-events-none absolute inset-0 z-[2] flex items-end px-6 pb-16 sm:items-center sm:px-10 sm:pb-0 md:px-16 lg:px-20 xl:px-24">
          <div className="pointer-events-auto w-full max-w-[560px]">

            {slide ? (
              <>
                <p className="mb-5 hidden flex-wrap items-center gap-x-3 gap-y-2 text-[10px] font-medium uppercase tracking-[0.22em] text-[#f1dba4] sm:flex">
                  {slide.subtitle}
                </p>

                <h1 className="font-serif text-[clamp(2.25rem,9vw,3rem)] leading-[1.04] tracking-[-1px] drop-shadow-lg sm:text-5xl sm:tracking-[-1.5px] md:text-6xl lg:text-[68px]">
                  {heading.title}
                  {heading.title && <br />}
                  <span className="mt-1 inline-block bg-gradient-to-r from-[#fff0b5] via-[#eac66b] to-[#c99a36] bg-clip-text font-semibold italic text-transparent">
                    {heading.highlight}
                  </span>
                </h1>

                <p className="mt-5 hidden max-w-[390px] font-serif text-sm leading-6 text-[#f7ead0] sm:block sm:text-base md:text-lg">
                  {slide.description}
                </p>

                <a
                  href={slide.link || "#collections"}
                  className="group mt-5 inline-flex items-center gap-3 rounded-sm border border-[#f6d88b] bg-gradient-to-r from-[#f5d17c] to-[#dba53c] px-4 py-3 text-xs font-bold text-[#17372a] shadow-md transition duration-300 hover:-translate-y-1 hover:brightness-110 sm:mt-7 sm:gap-5 sm:px-8 sm:py-3.5 sm:text-sm"
                >
                  Explore Collections
                  <ArrowRight
                    size={17}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </a>
              </>
            ) : error ? (
              <p className="text-sm text-[#f7ead0]" role="alert">
                Hero banners could not be loaded.
              </p>
            ) : null}

            {/* Trust indicators */}
            <div className="mt-8 hidden max-w-[490px] flex-wrap gap-x-7 gap-y-4 sm:flex">
              <div className="flex items-center gap-2.5">
                <Gem className="h-8 w-8 shrink-0 rounded-full border border-[#d6b65f] p-1.5 text-[#f0d17e] sm:h-9 sm:w-9 sm:p-2" />
                <span className="text-[9px] leading-4 text-[#fff5e2] sm:text-[11px]">
                  100%
                  <br />
                  BIS Hallmarked
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-8 w-8 shrink-0 rounded-full border border-[#d6b65f] p-1.5 text-[#f0d17e] sm:h-9 sm:w-9 sm:p-2" />
                <span className="text-[9px] leading-4 text-[#fff5e2] sm:text-[11px]">
                  Trusted
                  <br />
                  Since Generations
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <Truck className="h-8 w-8 shrink-0 rounded-full border border-[#d6b65f] p-1.5 text-[#f0d17e] sm:h-9 sm:w-9 sm:p-2" />
                <span className="text-[9px] leading-4 text-[#fff5e2] sm:text-[11px]">
                  Secure & Insured
                  <br />
                  Delivery
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative tagline */}
        <div className="pointer-events-none absolute bottom-8 right-12 z-[2] hidden font-serif text-sm italic leading-5 text-[#efd38c] drop-shadow-md lg:block">
          Where
          <br />
          Tradition
          <br />
          Shines Forever
          <div className="mt-2 h-px w-16 bg-[#e6c56f]" />
          <div className="mt-1 text-right text-[#e6c56f]">✦</div>
        </div>

      </div>
    </section>
  );
};

export default Hero;
