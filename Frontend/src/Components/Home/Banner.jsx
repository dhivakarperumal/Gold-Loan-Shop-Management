
import React from "react";
import { FaArrowRight } from "react-icons/fa";

const Banner = () => {
  const banners = [
    {
      title: "Bridal Collection",
      subtitle: "For your most precious moments",
      button: "Explore Bridal Collection",
      image: "/images/bannerimage.jpg",
      theme: "bridal",
      link: "/category/mangalsutra",
    },
    {
      title: "Gold Coins & Bars",
      subtitle: "A symbol of prosperity for generations",
      button: "View Collection",
      image: "/images/offerbanner.jpg",
      theme: "coins",
      link: "/category/coins-bars",
    },
  ];

  return (
    <section className="w-full bg-[#fffdf8] px-3 py-3 sm:px-5 lg:px-8">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 md:grid-cols-2">
        {banners.map((banner) => (
          <div
            key={banner.title}
            className={`group relative isolate flex min-h-[190px] items-center overflow-hidden rounded-xl border ${
              banner.theme === "bridal"
                ? "border-[#b58b37]/40 bg-[#063d2d]"
                : "border-[#d9b66b]/50 bg-[#fff0d6]"
            } sm:min-h-[220px] lg:min-h-[250px]`}
          >
            {/* Background image */}
            <img
              src={banner.image}
              alt={banner.title}
              className="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />

            {/* Text readability overlay */}
            <div
              className={`absolute inset-0 -z-10 ${
                banner.theme === "bridal"
                  ? "bg-gradient-to-r from-[#003b2b]/95 via-[#003b2b]/75 to-transparent"
                  : "bg-gradient-to-r from-[#fff5e4]/95 via-[#fff2dc]/80 to-transparent"
              }`}
            />

            {/* Decorative gold borders */}
            <div className="pointer-events-none absolute inset-[5px] rounded-lg border border-[#e7c36d]/50" />

            {/* Banner content */}
            <div className="relative z-10 max-w-[70%] px-4 py-6 sm:px-6 lg:px-8">
              <p
                className={`mb-2 text-[9px] font-semibold uppercase tracking-[0.25em] sm:text-[10px] ${
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
                className={`font-serif text-xl font-bold leading-tight sm:text-2xl lg:text-3xl ${
                  banner.theme === "bridal"
                    ? "text-[#ffe4a0]"
                    : "text-[#713719]"
                }`}
              >
                {banner.title}
              </h2>

              <p
                className={`mt-2 max-w-[250px] text-xs leading-relaxed sm:text-sm ${
                  banner.theme === "bridal"
                    ? "text-[#fff9e9]"
                    : "text-[#38271c]"
                }`}
              >
                {banner.subtitle}
              </p>

              <a
                href={banner.link}
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-[#f6bd43] to-[#ffda78] px-3 py-2 text-[10px] font-bold text-[#3d2910] shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:px-4 sm:py-2.5 sm:text-xs"
              >
                {banner.button}
                <FaArrowRight className="text-[10px] transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Banner;
