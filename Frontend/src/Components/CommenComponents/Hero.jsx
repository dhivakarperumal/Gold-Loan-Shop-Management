
import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Gem,
  ShieldCheck,
  Truck,
} from "lucide-react";

const slides = [
  {
    image: "/images/Hero/hero.png",
    eyebrow: "TRADITION  ✦  CRAFTSMANSHIP  ✦  FOREVER YOURS",
    title: "Jewellery that",
    highlight: "tells your story",
    description: "Timeless gold. Unforgettable moments.",
    button: "Explore Collections",
  },
  {
    image: "/images/Hero/hero2.png",
    eyebrow: "ELEGANCE  ✦  PURITY  ✦  TIMELESS BEAUTY",
    title: "Silver that",
    highlight: "speaks elegance",
    description: "Discover the beauty of timeless silver.",
    button: "Explore Silver",
  },
  {
    image: "/images/Hero/hero3.png",
    eyebrow: "BEAUTY  ✦  HERITAGE  ✦  EVERYDAY LUXURY",
    title: "Designed to",
    highlight: "shine forever",
    description: "Discover jewellery made for every occasion.",
    button: "Discover More",
  },
  {
    image: "/images/Hero/hero4.png",
    eyebrow: "CRAFTED WITH LOVE  ✦  MADE TO TREASURE",
    title: "Every jewel",
    highlight: "has a story",
    description: "Find the perfect piece for your special moments.",
    button: "View Collections",
  },
];

const Hero = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  const slide = slides[activeSlide];

  const previousSlide = () => {
    setActiveSlide(
      (prev) => (prev - 1 + slides.length) % slides.length
    );
  };

  const nextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <section className="relative w-full overflow-hidden bg-[#032e25] text-white">
      <div className="relative isolate flex min-h-[490px] h-[520px] max-h-[650px] w-full items-center justify-center sm:min-h-[500px] md:h-[540px] lg:h-[560px]">

        {/* Full image: no blur, no cropping */}
        <div
          key={slide.image}
          className="absolute inset-0 bg-contain bg-center bg-no-repeat transition-opacity duration-500"
          style={{
            backgroundImage: `url("${slide.image}")`,
          }}
        />

        {/* Subtle left-side overlay for text readability */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#00271e]/65 via-[#003326]/20 to-transparent" />

        {/* Decorative bottom shading removed to keep jewellery clear */}

        {/* Decorative gold border */}
        <div className="pointer-events-none absolute inset-2 z-10 border border-[#d2b56e]/60 sm:inset-3">
          <span className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-[#e5c879]" />
          <span className="absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-[#e5c879]" />
          <span className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-[#e5c879]" />
          <span className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-[#e5c879]" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 flex h-full w-full items-center px-9 sm:px-14 md:px-16 lg:px-20 xl:px-24">
          <div className="w-full max-w-[560px] py-10">

            <p className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[9px] font-medium uppercase tracking-[0.18em] text-[#f1dba4] sm:text-[10px] sm:tracking-[0.22em]">
              {slide.eyebrow}
            </p>

            <h1 className="font-serif text-[38px] leading-[1.04] tracking-[-1.5px] drop-shadow-lg sm:text-5xl md:text-6xl lg:text-[68px]">
              {slide.title}
              <br />
              <span className="mt-1 inline-block bg-gradient-to-r from-[#fff0b5] via-[#eac66b] to-[#c99a36] bg-clip-text font-semibold italic text-transparent">
                {slide.highlight}
              </span>
            </h1>

            <p className="mt-5 max-w-[390px] font-serif text-sm leading-6 text-[#f7ead0] sm:text-base md:text-lg">
              {slide.description}
            </p>

            <a
              href="#collections"
              className="group mt-7 inline-flex items-center gap-5 rounded-sm border border-[#f6d88b] bg-gradient-to-r from-[#f5d17c] to-[#dba53c] px-6 py-3.5 text-xs font-bold text-[#17372a] shadow-md transition duration-300 hover:-translate-y-1 hover:brightness-110 sm:px-8 sm:text-sm"
            >
              {slide.button}
              <ArrowRight
                size={17}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </a>

            {/* Trust indicators */}
            <div className="mt-8 flex max-w-[490px] flex-wrap gap-x-5 gap-y-4 sm:gap-x-7">

              <div className="flex items-center gap-2.5">
                <Gem className="h-9 w-9 shrink-0 rounded-full border border-[#d6b65f] p-2 text-[#f0d17e]" />
                <span className="text-[10px] leading-4 text-[#fff5e2] sm:text-[11px]">
                  100%
                  <br />
                  BIS Hallmarked
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-9 w-9 shrink-0 rounded-full border border-[#d6b65f] p-2 text-[#f0d17e]" />
                <span className="text-[10px] leading-4 text-[#fff5e2] sm:text-[11px]">
                  Trusted
                  <br />
                  Since Generations
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <Truck className="h-9 w-9 shrink-0 rounded-full border border-[#d6b65f] p-2 text-[#f0d17e]" />
                <span className="text-[10px] leading-4 text-[#fff5e2] sm:text-[11px]">
                  Secure & Insured
                  <br />
                  Delivery
                </span>
              </div>

            </div>
          </div>
        </div>

        {/* Previous slide */}
        <button
          type="button"
          aria-label="Previous slide"
          onClick={previousSlide}
          className="absolute left-4 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#e3cf9b]/70 bg-black/30 text-[#f3dfaa] transition hover:bg-[#d9b45e] hover:text-[#12352a] sm:left-6 sm:h-11 sm:w-11"
        >
          <ChevronLeft size={21} />
        </button>

        {/* Next slide */}
        <button
          type="button"
          aria-label="Next slide"
          onClick={nextSlide}
          className="absolute right-4 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#e3cf9b]/70 bg-black/30 text-[#f3dfaa] transition hover:bg-[#d9b45e] hover:text-[#12352a] sm:right-6 sm:h-11 sm:w-11"
        >
          <ChevronRight size={21} />
        </button>

        {/* Slide indicators */}
        <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2.5">
          {slides.map((item, index) => (
            <button
              key={item.image}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              aria-current={activeSlide === index ? "true" : undefined}
              onClick={() => setActiveSlide(index)}
              className={`rounded-full transition-all duration-300 ${
                activeSlide === index
                  ? "h-2 w-7 bg-[#f0cf77]"
                  : "h-2 w-2 bg-white/60 hover:bg-white"
              }`}
            />
          ))}
        </div>

        {/* Traditional jewellery tagline */}
        <div className="absolute bottom-8 right-12 z-10 hidden font-serif text-sm italic leading-5 text-[#efd38c] drop-shadow-md lg:block">
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
