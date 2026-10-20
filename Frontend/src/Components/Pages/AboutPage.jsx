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
              <div key={value} className="flex items-center gap-3 px-3 py-4 sm:justify-center sm:px-4 sm:py-5">
                <Icon size={25} className="shrink-0 text-[#b47a19]" strokeWidth={1.7} aria-hidden="true" />
                <div>
                  <p className="font-serif text-base font-bold text-[#153b2e] sm:text-lg">{value}</p>
                  <p className="text-[10px] text-[#777066] sm:text-xs">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      <section className="py-12 sm:py-16">
        <PageContainer>
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="grid grid-cols-2 gap-3">
              <img src="/images/Luxury Gold Jewelry Showcase.png" alt="Sri Golds jewellery showroom" className="h-56 w-full rounded-2xl object-cover shadow-md sm:h-72" loading="lazy" />
              <img src="/images/goldproduct.png" alt="Gold jewellery crafted with care" className="mt-8 h-56 w-full rounded-2xl object-cover shadow-md sm:mt-12 sm:h-72" loading="lazy" />
              <div className="col-span-2 flex items-center gap-3 rounded-xl border border-[#ead8b6] bg-gradient-to-r from-[#fff2d3] to-[#fffaf0] px-4 py-3">
                <Heart size={22} className="shrink-0 text-[#b47a19]" aria-hidden="true" />
                <p className="text-xs leading-5 text-[#665842] sm:text-sm">
                  Jewellery made to celebrate life&apos;s milestones and become part of your story.
                </p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#ae7617]">About Sri Golds</p>
              <h2 className="mt-2 font-serif text-3xl font-bold leading-tight text-[#153b2e] sm:text-4xl">Crafting Brighter Moments</h2>
              <p className="mt-4 text-sm leading-7 text-[#68645c]">
                Sri Golds is a trusted jewellery brand dedicated to offering gold, diamond and silver jewellery for every occasion. We bring together thoughtful designs and a tradition of craftsmanship to help you find pieces worth treasuring.
              </p>
              <p className="mt-3 text-sm leading-7 text-[#68645c]">
                From everyday favourites to pieces for life&apos;s biggest celebrations, we welcome you to discover jewellery chosen with care and a personal touch.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  { icon: Gem, label: "Exquisite Designs" },
                  { icon: Award, label: "Skilled Craftsmanship" },
                  { icon: ShieldCheck, label: "Quality Focused" },
                  { icon: Heart, label: "Customer First" }
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 rounded-lg border border-[#eee3d0] bg-white px-3 py-3">
                    <Icon size={19} className="shrink-0 text-[#b47a19]" aria-hidden="true" />
                    <span className="text-xs font-semibold text-[#34463b]">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PageContainer>
      </section>

      <section className="relative overflow-hidden bg-[#00382a] py-12 text-white sm:py-14">
        <img src="/images/goldproduct.png" alt="" className="absolute inset-0 h-full w-full object-cover object-[70%_55%] opacity-30" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#00291f]/95 via-[#00382a]/85 to-[#00382a]/35" />
        <PageContainer className="relative">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#e9c66d]">Our Heritage</p>
            <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Tradition Meets Modern Elegance</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/80">
              From classic inspiration to contemporary design, we celebrate the artistry and meaning behind every piece.
            </p>
            <Link to="/explore" className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f2cf76] to-[#d9a441] px-5 py-2.5 text-sm font-bold text-[#153729] transition hover:brightness-105">
              Discover Our Collections <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </PageContainer>
      </section>



    
{/* Our History Section */}
<section className="overflow-hidden bg-[#fffaf0] py-12 sm:py-16 lg:py-20">
  <PageContainer>
    {/* Heading */}
    <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#ae7617]">
        The Sri Golds Journey
      </p>

      <h2 className="mt-3 font-serif text-3xl font-bold text-[#153b2e] sm:text-4xl lg:text-5xl">
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
        className="absolute bottom-8 left-5 top-8 w-px bg-gradient-to-b from-[#e6ce91] via-[#bd9139] to-[#e6ce91] sm:left-1/2 sm:-translate-x-1/2"
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
          <div key={number} className="relative mb-8 last:mb-0 sm:mb-12">
            <div className="grid grid-cols-1 items-center gap-4 pl-12 sm:grid-cols-[minmax(0,1fr)_64px_minmax(0,1fr)] sm:gap-5 sm:pl-0 lg:gap-8">
              {/* Image side */}
              <div
                className={`min-w-0 ${
                  side === "right"
                    ? "sm:col-start-3 sm:row-start-1"
                    : "sm:col-start-1 sm:row-start-1"
                }`}
              >
                <div className="group relative overflow-hidden rounded-2xl border border-[#e5cf9d] bg-white p-2 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div className="relative h-48 overflow-hidden rounded-xl sm:h-52 lg:h-60">
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
                className="absolute left-5 top-5 z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border-2 border-[#d6ae58] bg-[#064734] text-[#f3d278] shadow-md sm:static sm:col-start-2 sm:row-start-1 sm:mx-auto sm:translate-x-0"
                aria-hidden="true"
              >
                <Icon size={18} strokeWidth={1.7} />
              </div>

              {/* History content */}
              <div
                className={`min-w-0 ${
                  side === "right"
                    ? "sm:col-start-1 sm:row-start-1"
                    : "sm:col-start-3 sm:row-start-1"
                }`}
              >
                <div className="relative h-full rounded-2xl border border-[#ead8b6] bg-white p-5 shadow-sm transition duration-300 hover:border-[#d3b56d] hover:shadow-md sm:p-6 lg:p-8">
                  <span className="absolute right-4 top-3 font-serif text-4xl font-bold text-[#f3ead7] sm:right-6 sm:top-4 sm:text-5xl">
                    {number}
                  </span>

                  <div className="relative">
                    <span className="inline-flex rounded-full border border-[#ead8b6] bg-[#fff7e5] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#986817] sm:text-xs">
                      {year}
                    </span>

                    <h3 className="mt-4 font-serif text-xl font-bold leading-snug text-[#153b2e] sm:text-2xl">
                      {title}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-[#68645c]">
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





      <section className="py-10 sm:py-12">
        <PageContainer>
          <div className="flex flex-col gap-5 rounded-2xl border border-[#ead8b6] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#ae7617]">Our Vision</p>
              <h2 className="mt-1 font-serif text-2xl font-bold text-[#153b2e]">Your Most Trusted Jewellery Partner</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68645c]">
                We strive to make choosing jewellery a warm, personal experience—with thoughtful service and collections for every generation.
              </p>
            </div>
            <Link to="/contactus" className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#c4953e] px-5 py-3 text-sm font-bold text-[#153b2e] transition hover:bg-[#fff5dc]">
              Visit or Contact Us <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </PageContainer>
      </section>
    </main>
  );
}
