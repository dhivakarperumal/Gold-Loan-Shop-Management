
import React from "react";
import { FaArrowRight } from "react-icons/fa";

const Banner = () => {
  const banners = [
    {
      title: "Bridal Collection",
      subtitle: "For your most precious moments",
      button: "Explore Bridal Collection",
      image: "/images/banner/bridalcollection.png",
      theme: "bridal",
      link: "/category/mangalsutra",
    },
    {
      title: "Gold Coins & Bars",
      subtitle: "A symbol of prosperity for generations",
      button: "View Collection",
      image: "/images/banner/goldcoinandbars.png",
      theme: "coins",
      link: "/category/coins-bars",
    },
  ];

  return (
    <section className="w-full bg-[#fffdf8] px-3 py-3 sm:px-5 lg:px-8">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-3 md:grid-cols-2">
        {banners.map((banner) => (
          <div
            key={banner.title}
            className={`group relative isolate flex min-h-[170px] items-center overflow-hidden rounded-lg border sm:min-h-[200px] lg:min-h-[220px] ${
              banner.theme === "bridal"
                ? "border-[#b58b37]/40 bg-[#063d2d]"
                : "border-[#d9b66b]/50 bg-[#fff0d6]"
            }`}
          >
            {/* Background image */}
            <img
              src={banner.image}
              alt={banner.title}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            />

            {/* Overlay only for the bridal banner */}
            {banner.theme === "bridal" && (
              <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#003b2b]/70 via-[#003b2b]/30 to-transparent" />
            )}

            {/* Decorative border */}
            <div className="pointer-events-none absolute inset-[5px] rounded-md border border-[#e7c36d]/50" />

            {/* Content */}
            <div className="relative z-10 max-w-[72%] px-6 py-5 sm:px-8 lg:px-15">
              <p
                className={`mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] sm:text-[10px] ${
                  banner.theme === "bridal"
                    ? "text-[#f8d77e]"
                    : "text-[#986020]"
                }`}
              >
                {banner.theme === "bridal"
                  ? "Exclusive Collection"
                  : "Timeless Investment"}
              </p>

              <h2
                className={`font-serif text-lg font-bold leading-tight sm:text-xl lg:text-2xl ${
                  banner.theme === "bridal"
                    ? "text-[#ffe4a0]"
                    : "text-[#713719]"
                }`}
              >
                {banner.title}
              </h2>

              <p
                className={`mt-1.5 max-w-[230px] text-[10px] leading-relaxed sm:text-xs lg:text-sm ${
                  banner.theme === "bridal"
                    ? "text-[#fff9e9]"
                    : "text-[#38271c]"
                }`}
              >
                {banner.subtitle}
              </p>

              <a
                href={banner.link}
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-[#f6bd43] to-[#ffda78] px-3 py-2 text-[10px] font-bold text-[#3d2910] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:px-4 sm:text-xs"
              >
                {banner.button}
                <FaArrowRight className="text-[9px] transition-transform duration-300 group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Banner;
