import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Gem,
  ShieldCheck,
  Truck,
} from "lucide-react";

const Hero = () => {
  return (
    <section className="relative w-full overflow-hidden bg-[#032e25] text-white">
      {/* Hero background */}
      <div
        className="relative min-h-[360px] h-[520px] max-h-[600px] w-full bg-cover bg-center md:bg-[center_42%]"
        style={{
          backgroundImage: "url('/images/jewellery-hero.jpg')",
        }}
      >
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#002c22]/95 via-[#003a2c]/70 to-transparent" />

        {/* Decorative gold border */}
        <div className="absolute inset-2 border border-[#c7a45a]/40 pointer-events-none">
          <span className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-[#d4b36a]" />
          <span className="absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-[#d4b36a]" />
          <span className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-[#d4b36a]" />
          <span className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-[#d4b36a]" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 flex h-full items-center px-8 sm:px-12 md:px-16 lg:px-20">
          <div className="max-w-[470px] pt-2">
            <div className="mb-4 flex items-center gap-3 text-[9px] uppercase tracking-[0.2em] text-[#ead9ad] sm:text-[10px]">
              <span>Tradition</span>
              <span className="text-[#d9b45e]">✦</span>
              <span>Craftsmanship</span>
              <span className="text-[#d9b45e]">✦</span>
              <span>Forever Yours</span>
            </div>

            <h1 className="font-serif text-[38px] leading-[0.98] tracking-[-1.5px] sm:text-5xl md:text-6xl">
              Jewellery that
              <br />
              tells{" "}
              <span className="italic font-semibold text-[#e7c56f]">
                your story
              </span>
            </h1>

            <p className="mt-4 font-serif text-sm text-[#f3e8d0] sm:text-base">
              Timeless gold. Unforgettable moments.
            </p>

            <a
              href="#collections"
              className="mt-5 inline-flex items-center gap-5 bg-gradient-to-r from-[#f4ce71] to-[#dca638] px-5 py-3 text-xs font-semibold text-[#183326] shadow-md transition hover:brightness-110 sm:px-7"
            >
              Explore Collections
              <ArrowRight size={16} />
            </a>

            {/* Trust indicators */}
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 sm:gap-x-7">
              <div className="flex items-center gap-2">
                <Gem className="h-8 w-8 shrink-0 rounded-full border border-[#c9a85c] p-1.5 text-[#e4c16c]" />
                <span className="text-[9px] leading-4 text-[#f5ebd7]">
                  100%
                  <br />
                  BIS Hallmarked
                </span>
              </div>

              <div className="flex items-center gap-2">
                <ShieldCheck className="h-8 w-8 shrink-0 rounded-full border border-[#c9a85c] p-1.5 text-[#e4c16c]" />
                <span className="text-[9px] leading-4 text-[#f5ebd7]">
                  Trusted
                  <br />
                  Since Generations
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Truck className="h-8 w-8 shrink-0 rounded-full border border-[#c9a85c] p-1.5 text-[#e4c16c]" />
                <span className="text-[9px] leading-4 text-[#f5ebd7]">
                  Secure & Insured
                  <br />
                  Delivery
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Left carousel arrow */}
        <button
          aria-label="Previous slide"
          className="absolute left-5 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#e3cf9b]/60 bg-black/20 text-[#f3dfaa] transition hover:bg-[#d9b45e] hover:text-[#12352a]"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Right carousel arrow */}
        <button
          aria-label="Next slide"
          className="absolute right-5 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#e3cf9b]/60 bg-black/20 text-[#f3dfaa] transition hover:bg-[#d9b45e] hover:text-[#12352a]"
        >
          <ChevronRight size={18} />
        </button>

        {/* Slide indicators */}
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#f0cf77]" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
        </div>

        {/* Traditional jewellery tagline */}
        <div className="absolute bottom-5 right-10 z-10 hidden font-serif text-xs italic leading-5 text-[#efd38c] md:block">
          Where
          <br />
          Tradition
          <br />
          Shines Forever
          <div className="mt-1 h-px w-16 bg-[#e6c56f]" />
        </div>
      </div>
    </section>
  );
};

export default Hero;