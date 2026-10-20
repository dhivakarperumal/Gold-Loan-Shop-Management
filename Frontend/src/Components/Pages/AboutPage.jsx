import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  Gem,
  Heart,
  ShieldCheck,
  Sparkles,
  Store,
  Clock3,
  Handshake,
  TrendingUp,
} from "lucide-react";
import PageContainer from "../CommenComponents/PageContainer";
import PageHeader from "../CommenComponents/PageHeader";

export default function AboutPage() {
  return (
    <main className="bg-[#fffaf0]">
      <PageHeader title="About Us" />

      <section className="border-b border-[#eee1c7] bg-white">
        <PageContainer>
          <div className="grid grid-cols-2 divide-y divide-[#eee1c7] py-2 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            {[
              { icon: Gem, value: "Since 1984", label: "A tradition of trust" },
              { icon: Sparkles, value: "Thoughtful", label: "Designs for every moment" },
              { icon: ShieldCheck, value: "Quality First", label: "Care in every detail" },
              { icon: Store, value: "Tirupattur", label: "Visit our showroom" }
            ].map(({ icon: Icon, value, label }) => (
              <div key={value} className="flex min-w-0 items-center gap-2 px-2 py-3 sm:gap-3 sm:px-4 sm:py-5">
                <Icon size={23} className="shrink-0 text-[#b47a19] sm:h-[25px] sm:w-[25px]" strokeWidth={1.7} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="break-words font-serif text-sm font-bold leading-tight text-[#153b2e] sm:text-lg">{value}</p>
                  <p className="mt-0.5 text-[10px] leading-tight text-[#777066] sm:text-xs">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      <section className="py-9 sm:py-12 lg:py-16">
        <PageContainer>
          <div className="grid min-w-0 items-center gap-7 sm:gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:gap-3">
              <img src="/images/Luxury Gold Jewelry Showcase.png" alt="Sri Golds jewellery showroom" className="h-44 w-full min-w-0 rounded-xl object-cover shadow-md sm:h-64 sm:rounded-2xl lg:h-72" loading="lazy" />
              <img src="/images/goldproduct.png" alt="Gold jewellery crafted with care" className="mt-6 h-44 w-full min-w-0 rounded-xl object-cover shadow-md sm:mt-10 sm:h-64 sm:rounded-2xl lg:mt-12 lg:h-72" loading="lazy" />
              <div className="col-span-2 flex min-w-0 items-center gap-3 rounded-xl border border-[#ead8b6] bg-gradient-to-r from-[#fff2d3] to-[#fffaf0] px-3 py-3 sm:px-4">
                <Heart size={22} className="shrink-0 text-[#b47a19]" aria-hidden="true" />
                <p className="min-w-0 text-justify text-xs leading-5 text-[#665842] sm:text-sm">
                  Jewellery made to celebrate life&apos;s milestones and become part of your story.
                </p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#ae7617]">About Sri Golds</p>
              <h2 className="mt-2 font-serif text-2xl font-bold leading-tight text-[#153b2e] sm:text-3xl lg:text-4xl">Crafting Brighter Moments</h2>
              <p className="mt-4 text-justify text-sm leading-7 text-[#68645c]">
                Sri Golds is a trusted jewellery brand dedicated to offering gold, diamond and silver jewellery for every occasion. We bring together thoughtful designs and a tradition of craftsmanship to help you find pieces worth treasuring.
              </p>
              <p className="mt-3 text-justify text-sm leading-7 text-[#68645c]">
                From everyday favourites to pieces for life&apos;s biggest celebrations, we welcome you to discover jewellery chosen with care and a personal touch.
              </p>
              <div className="mt-5 grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 sm:mt-6 sm:gap-3">
                {[
                  { icon: Gem, label: "Exquisite Designs" },
                  { icon: Award, label: "Skilled Craftsmanship" },
                  { icon: ShieldCheck, label: "Quality Focused" },
                  { icon: Heart, label: "Customer First" }
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex min-w-0 items-center gap-2 rounded-lg border border-[#eee3d0] bg-white px-3 py-3">
                    <Icon size={19} className="shrink-0 text-[#b47a19]" aria-hidden="true" />
                    <span className="min-w-0 text-xs font-semibold leading-snug text-[#34463b]">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* Our Heritage */}
      <section className="relative isolate overflow-hidden bg-[#00382a] text-white">
        {/* Clear image on the right */}
        <img
          src="/images/goldproduct.png"
          alt="Sri Golds jewellery collection"
          loading="lazy"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[75%_45%]"
        />

        {/* Darken only the left side; keep the right image clear */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#00291f] via-[#00382a]/40 to-[#00382a]/10" />

        <PageContainer className="relative">
          <div className="flex min-h-[240px] items-center py-7 sm:min-h-[270px] sm:py-9 lg:min-h-[310px] lg:py-10">
            <div className="min-w-0 max-w-xl">
              <div className="mb-3 flex items-center gap-3">
                <span className="h-px w-8 bg-[#e9c66d]" />
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#f2d58a] sm:text-xs">
                  Our Heritage
                </p>
              </div>

              <h2 className="font-serif text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">
                Tradition Meets
                <span className="block text-[#f2d58a]">
                  Modern Elegance
                </span>
              </h2>

              <p className="mt-3 max-w-md text-justify text-xs leading-6 text-white/90 sm:text-sm sm:leading-7">
                From classic inspiration to contemporary design, we celebrate
                the artistry and meaning behind every piece.
              </p>

              <Link
                to="/explore"
                className="group mt-5 inline-flex max-w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f2cf76] to-[#d9a441] px-4 py-2.5 text-center text-xs font-bold text-[#153729] transition hover:brightness-110 sm:px-5 sm:text-sm"
              >
                Discover Our Collections
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* Why Choose Sri Golds */}
      <section className="relative overflow-hidden border-y border-[#eadcc0] bg-white py-9 sm:py-12 lg:py-16">
        <PageContainer>
          {/* Section heading */}
          <div className="mx-auto mb-7 max-w-2xl text-center sm:mb-10 lg:mb-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#ae7617] sm:text-xs">
              The Sri Golds Difference
            </p>

            <h2 className="mt-2 font-serif text-2xl font-bold text-[#153b2e] sm:text-3xl lg:text-4xl">
              Why Choose Sri Golds?
            </h2>

            <p className="mt-3 text-sm leading-7 text-[#68645c] sm:text-base">
              More than jewellery, we offer thoughtful designs and a personal
              experience for life's special moments.
            </p>

            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="h-px w-10 bg-[#d6a63c]" />
              <Gem size={17} className="text-[#b47a19]" aria-hidden="true" />
              <span className="h-px w-10 bg-[#d6a63c]" />
            </div>
          </div>

          {/* Benefit cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {[
              {
                icon: ShieldCheck,
                number: "01",
                title: "Quality You Can Trust",
                description:
                  "We focus on quality and clear product details to help you shop with confidence.",
              },
              {
                icon: Gem,
                number: "02",
                title: "Beautiful Craftsmanship",
                description:
                  "Explore timeless designs that bring traditional inspiration and modern elegance together.",
              },
              {
                icon: Heart,
                number: "03",
                title: "Personal Attention",
                description:
                  "Find jewellery suited to your style, preferences, and meaningful occasions.",
              },
              {
                icon: Sparkles,
                number: "04",
                title: "For Every Occasion",
                description:
                  "Discover pieces for everyday elegance, celebrations, gifting, and special milestones.",
              },
            ].map(({ icon: Icon, number, title, description }) => (
              <div
                key={title}
                className="group relative min-w-0 overflow-hidden rounded-2xl border border-[#eadcc0] bg-[#fffdf8] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#cba653] hover:bg-white hover:shadow-lg sm:p-6"
              >
                {/* Number */}
                <span className="absolute right-4 top-3 font-serif text-4xl font-bold text-[#f0e6d1] transition-colors group-hover:text-[#ead8b0]">
                  {number}
                </span>

                {/* Icon */}
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-[#e8d5a7] bg-[#f9f0dc] text-[#a87418] transition-colors group-hover:bg-[#064734] group-hover:text-[#f3d278]">
                  <Icon size={23} strokeWidth={1.7} aria-hidden="true" />
                </div>

                <h3 className="mt-4 font-serif text-lg font-bold leading-snug text-[#153b2e] sm:mt-5">
                  {title}
                </h3>

                <p className="mt-2 text-justify text-sm leading-6 text-[#716a5e]">
                  {description}
                </p>

                <div className="mt-5 h-0.5 w-10 rounded-full bg-[#d6a63c] transition-all duration-300 group-hover:w-16" />
              </div>
            ))}
          </div>


        </PageContainer>
      </section>

      {/* Our History Section */}
      <section className="overflow-hidden bg-[#fffaf0] py-9 sm:py-12 lg:py-20">
        <PageContainer>
          {/* Heading */}
          <div className="mx-auto mb-8 max-w-3xl text-center sm:mb-12 lg:mb-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#ae7617]">
              The Sri Golds Journey
            </p>

            <h2 className="mt-3 font-serif text-2xl font-bold text-[#153b2e] sm:text-3xl lg:text-5xl">
              Our History
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#68645c] sm:text-base">
              A journey shaped by tradition, meaningful moments, and a commitment
              to bringing beautiful jewellery into your life.
            </p>

            <div className="mt-5 flex items-center justify-center gap-3">
              <span className="h-px w-14 bg-[#d6a63c]" />
              <Gem size={19} className="text-[#b47a19]" />
              <span className="h-px w-14 bg-[#d6a63c]" />
            </div>
          </div>

          {/* Wider Timeline */}
          <div className="relative mx-auto max-w-6xl">
            {/* Gold timeline line */}
            <div
              className="absolute bottom-8 left-5 top-8 w-px bg-gradient-to-b from-[#e6ce91] via-[#bd9139] to-[#e6ce91] md:left-1/2 md:-translate-x-1/2"
              aria-hidden="true"
            />

            {[
              {
                year: "Since 1984",
                title: "The Beginning",
                description:
                  "Sri Golds began its journey with a commitment to jewellery, personal service, and customer trust.",
                icon: Clock3,
                image: "/images/Luxury Gold Jewelry Showcase.png",
                imageAlt: "Sri Golds jewellery showroom",
                side: "left",
                number: "01",
              },
              {
                year: "Growing Together",
                title: "Expanding Our Collections",
                description:
                  "Discover jewellery inspired by tradition and contemporary style, with designs for everyday wear and special occasions.",
                icon: Gem,
                image: "/images/goldproduct.png",
                imageAlt: "Gold jewellery collection",
                side: "right",
                number: "02",
              },
              {
                year: "A Lasting Promise",
                title: "Building Customer Trust",
                description:
                  "We focus on quality, thoughtful service, and helping customers find jewellery for life's most meaningful moments.",
                icon: Handshake,
                image: "/images/Luxury Gold Jewelry Showcase.png",
                imageAlt: "Jewellery displayed in the showroom",
                side: "left",
                number: "03",
              },
              {
                year: "Looking Ahead",
                title: "Our Future Journey",
                description:
                  "Our goal is to continue celebrating every generation with beautiful collections and a warm, personal experience.",
                icon: TrendingUp,
                image: "/images/goldproduct.png",
                imageAlt: "Elegant gold jewellery",
                side: "right",
                number: "04",
              },
            ].map(
              ({
                year,
                title,
                description,
                icon: Icon,
                image,
                imageAlt,
                side,
                number,
              }) => (
                <div key={number} className="relative mb-7 last:mb-0 sm:mb-9 md:mb-12">
                  <div className="grid min-w-0 grid-cols-1 items-center gap-3 pl-12 sm:gap-4 md:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] md:gap-5 md:pl-0 lg:grid-cols-[minmax(0,1fr)_64px_minmax(0,1fr)] lg:gap-8">
                    {/* Image side */}
                    <div
                      className={`min-w-0 ${side === "right"
                        ? "md:col-start-3 md:row-start-1"
                        : "md:col-start-1 md:row-start-1"
                        }`}
                    >
                      <div className="group relative overflow-hidden rounded-2xl border border-[#e5cf9d] bg-white p-2 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                        <div className="relative h-44 overflow-hidden rounded-xl sm:h-52 lg:h-60">
                          <img
                            src={image}
                            alt={imageAlt}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#082c21]/65 via-transparent to-transparent" />
                          <span className="absolute bottom-4 left-4 font-serif text-xl font-semibold text-white">
                            Sri Golds
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 px-3 py-3">
                          <span className="text-xs font-medium text-[#665842]">
                            Tradition &amp; Elegance
                          </span>
                          <Gem size={16} className="shrink-0 text-[#b47a19]" />
                        </div>
                      </div>
                    </div>

                    {/* Timeline marker */}
                    <div
                      className="absolute left-5 top-5 z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border-2 border-[#d6ae58] bg-[#064734] text-[#f3d278] shadow-md md:static md:col-start-2 md:row-start-1 md:mx-auto md:translate-x-0"
                      aria-hidden="true"
                    >
                      <Icon size={18} strokeWidth={1.7} />
                    </div>

                    {/* History content */}
                    <div
                      className={`min-w-0 ${side === "right"
                        ? "md:col-start-1 md:row-start-1"
                        : "md:col-start-3 md:row-start-1"
                        }`}
                    >
                      <div className="relative h-full min-w-0 rounded-2xl border border-[#ead8b6] bg-white p-4 shadow-sm transition duration-300 hover:border-[#d3b56d] hover:shadow-md sm:p-5 md:p-6 lg:p-8">
                        <span className="absolute right-4 top-3 font-serif text-4xl font-bold text-[#f3ead7] sm:right-6 sm:top-4 sm:text-5xl">
                          {number}
                        </span>

                        <div className="relative">
                          <span className="inline-flex rounded-full border border-[#ead8b6] bg-[#fff7e5] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#986817] sm:text-xs">
                            {year}
                          </span>

                          <h3 className="mt-3 font-serif text-lg font-bold leading-snug text-[#153b2e] sm:mt-4 sm:text-xl lg:text-2xl">
                            {title}
                          </h3>

                          <p className="mt-3 text-justify text-sm leading-6 text-[#68645c] sm:leading-7">
                            {description}
                          </p>

                          <div className="mt-5 h-px w-16 bg-[#d6a63c]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Bottom CTA */}
          <div className="mt-10 text-center sm:mt-14">
            <p className="mb-4 font-serif text-lg text-[#153b2e] sm:text-xl">
              Find a piece to be part of your story.
            </p>

            <Link
              to="/explore"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f2cf76] to-[#d9a441] px-7 py-3 text-sm font-bold text-[#153729] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              Explore Our Collections
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </PageContainer>
      </section>

    </main>
  );
}
