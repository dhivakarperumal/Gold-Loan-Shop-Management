import React from "react";
import { Gem, Headset, ShieldCheck, Truck } from "lucide-react";
import PageContainer from "./PageContainer";

const Header = () => (
  <div className="hidden bg-gradient-to-r from-[#00372d] via-[#005143] to-[#00372d] text-white md:block">
    <PageContainer className="px-4 sm:px-5 lg:px-[3%]">
      <div className="flex min-h-12 items-center justify-between gap-4">
        <div className="hidden shrink-0 items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f3cc72] xl:flex">
          <Gem size={17} />
          <span>Premium Jewellery Collections</span>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-3 text-[10px] font-semibold uppercase tracking-wide sm:gap-5 sm:text-[11px] xl:gap-7">
          <span className="flex shrink-0 items-center gap-2">
            <Truck size={17} className="text-[#f3bd4f]" />
            Free Shipping
          </span>
          <span className="hidden h-5 w-px bg-[#d6ad55]/70 sm:block" />
          <span className="flex shrink-0 items-center gap-2">
            <ShieldCheck size={17} className="text-[#f3bd4f]" />
            Certified Jewellery
          </span>
          <span className="hidden h-5 w-px bg-[#d6ad55]/70 lg:block" />
          <span className="hidden shrink-0 items-center gap-2 lg:flex">
            <Headset size={17} className="text-[#f3bd4f]" />
            24/7 Support
          </span>
        </div>

        <div className="hidden shrink-0 items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f3cc72] 2xl:flex">
          <span aria-hidden="true">✦</span>
          A Symbol of Trust &amp; Tradition
          <span aria-hidden="true">✦</span>
        </div>
      </div>
    </PageContainer>
  </div>
);

export default Header;
