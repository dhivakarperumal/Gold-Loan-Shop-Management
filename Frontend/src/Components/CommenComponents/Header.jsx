
import React from "react";
import {
  Gem,
  Headset,
  ShieldCheck,
  Truck,
} from "lucide-react";
import PageContainer from "./PageContainer";

const Header = () => {
  return (
    <header className="relative hidden overflow-hidden border-b border-[#d9b568]/40 bg-gradient-to-r from-[#00372d] via-[#005143] to-[#00372d] text-white md:block">

      <PageContainer className="relative px-4 sm:px-5 lg:px-[3%]">
        <div className="flex min-h-10 flex-wrap items-center justify-between gap-3 py-2 text-[10px] font-semibold tracking-[0.12em] sm:text-xs">

          {/* Premium Jewellery Collections */}
          <div className="hidden items-center gap-2 text-[#f3cc72] lg:flex">
            <Gem size={15} strokeWidth={1.7} />
            <span>PREMIUM JEWELLERY COLLECTIONS</span>
          </div>

          {/* Service Highlights */}
          <div className="flex flex-1 items-center justify-center gap-4 sm:gap-6">

            <span className="flex shrink-0 items-center gap-2 transition-colors duration-300 hover:text-[#f3cc72]">
              <Truck size={16} className="text-[#f3bd4f]" />
              <span>FREE SHIPPING</span>
            </span>

            <span className="hidden h-4 w-px bg-[#d9b568]/60 sm:block" />

            <span className="hidden items-center gap-2 transition-colors duration-300 hover:text-[#f3cc72] sm:flex">
              <ShieldCheck size={16} className="text-[#f3bd4f]" />
              <span>CERTIFIED JEWELLERY</span>
            </span>

            <span className="hidden h-4 w-px bg-[#d9b568]/60 md:block" />

            <span className="hidden items-center gap-2 transition-colors duration-300 hover:text-[#f3cc72] md:flex">
              <Headset size={16} className="text-[#f3bd4f]" />
              <span>24/7 SUPPORT</span>
            </span>

          </div>

          {/* Trust Message */}
          <div className="hidden items-center gap-2 text-[#f3cc72] xl:flex">
            <span aria-hidden="true" className="text-base">❧</span>
            <span>A SYMBOL OF TRUST &amp; TRADITION</span>
            <span aria-hidden="true" className="text-base">❧</span>
          </div>

        </div>
      </PageContainer>

      {/* Subtle gold bottom accent */}
      <div
        aria-hidden="true"
        className="h-[1px] bg-gradient-to-r from-transparent via-[#d9b568]/80 to-transparent"
      />
    </header>
  );
};

export default Header;
