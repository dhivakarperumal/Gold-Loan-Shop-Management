import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Atom, Coins, Gem, Sparkles } from "lucide-react";
import api from "../../api";
import PageContainer from "../CommenComponents/PageContainer";

const backendUrl = (
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5000"
).replace(/\/$/, "");

const getMetalImageUrl = (image) => {
  if (!image || /^(https?:|data:|blob:)/i.test(image)) return image || "";
  return `${backendUrl}${image.startsWith("/") ? image : `/${image}`}`;
};

const METAL_DETAILS = {
  gold: {
    symbol: "Au",
    purity: "24K · 22K · 20K · 18K · 14K",
    description: "A symbol of purity and prosperity, our gold jewellery is crafted to celebrate life's special moments.",
    Icon: Coins
  },
  silver: {
    symbol: "Ag",
    purity: "999 PURE",
    description: "Elegant, versatile and timeless, our silver collection blends tradition with modern style.",
    Icon: Sparkles
  },
  platinum: {
    symbol: "Pt",
    purity: "950 · 900",
    description: "Rare, refined and enduring, platinum symbolises lasting strength and elegance.",
    Icon: Atom
  },
  diamond: {
    symbol: "",
    purity: "D – F / VVS · G – H / VS · I – J / SI",
    description: "Exceptional sparkle and brilliance, our diamonds are chosen for their unmatched beauty.",
    Icon: Gem
  }
};

export default function MetalsShowcase() {
  const [metals, setMetals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    api.get("/metals", { signal: controller.signal })
      .then(({ data }) => {
        if (!Array.isArray(data)) {
          throw new TypeError("The metals response must be an array");
        }
        setMetals(data.filter((metal) => metal.status === "Active"));
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        console.error("Failed to load home page metals:", requestError);
        setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return (
    <section className="bg-[#fbf7ed] py-8 sm:py-10" aria-labelledby="home-metals-title">
      <PageContainer>
        <div className="overflow-hidden rounded-[22px] border border-[#efdcae] bg-[#fffaf0] shadow-[0_12px_35px_rgba(111,78,24,0.10)]">
          <header className="relative overflow-hidden bg-gradient-to-br from-[#003526] via-[#064a36] to-[#002f23] px-5 py-8 text-center text-white sm:py-10">
            <span aria-hidden="true" className="pointer-events-none absolute -left-8 -top-10 text-8xl text-[#d6a63c]/15">❀</span>
            <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-10 text-8xl text-[#d6a63c]/15">❀</span>
            <div className="relative">
              <p className="flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-[0.28em] text-[#f1d384] sm:text-xs">
                <span className="h-px w-8 bg-[#d6a63c]" />
                Our Collection
                <span className="h-px w-8 bg-[#d6a63c]" />
              </p>
              <h2 id="home-metals-title" className="mt-2 font-serif text-3xl font-bold text-[#fffaf0] sm:text-5xl">
                Explore Our <span className="text-[#e8b64e]">Metals</span>
              </h2>
              <p className="mt-2 text-sm text-white/80 sm:text-base">
                Timeless metals, crafted for your most precious moments.
              </p>
              <div className="mx-auto mt-4 flex w-fit items-center gap-3 text-[#e8b64e]" aria-hidden="true">
                <span className="h-px w-12 bg-[#d6a63c]" />
                <Gem size={19} strokeWidth={1.5} />
                <span className="h-px w-12 bg-[#d6a63c]" />
              </div>
            </div>
          </header>

        {loading ? (
          <p className="py-12 text-center text-sm text-[#777066]" role="status">Loading metals...</p>
        ) : error ? (
          <p className="py-12 text-center text-sm text-[#777066]" role="alert">Metals could not be loaded.</p>
        ) : metals.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#777066]">No active metals are available.</p>
        ) : (
          <div className="grid gap-3 p-3 sm:grid-cols-2 sm:gap-4 sm:p-4 lg:grid-cols-4">
            {metals.map((metal) => {
              const details = METAL_DETAILS[metal.name.trim().toLowerCase()];
              const Icon = details?.Icon || Coins;
              const purity = metal.purity || details?.purity;
              const description = metal.description || details?.description;
              const exploreUrl = `/explore?metal=${encodeURIComponent(metal.name)}`;

              return (
                <article key={metal.id} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#ecd9b0] bg-gradient-to-b from-[#fffaf0] to-[#fffdf8] text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <Link to={exploreUrl} aria-label={`Explore ${metal.name}`} className="relative block h-48 overflow-hidden bg-[#e9e1d0] sm:h-52">
                    {metal.image ? (
                      <img
                        src={getMetalImageUrl(metal.image)}
                        alt=""
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#f6e8c9] to-[#e5d5b4] text-[#a67b2e]">
                        <Icon size={62} strokeWidth={1.2} aria-hidden="true" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#14271d]/25 to-transparent" />
                    <span className="absolute bottom-0 left-1/2 flex h-16 w-16 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border-2 border-[#d8a53b] bg-[#003c2b] font-serif text-2xl font-bold text-[#f3d278] shadow-lg">
                      {details?.symbol || <Gem size={30} strokeWidth={1.5} aria-hidden="true" />}
                    </span>
                  </Link>
                  <div className="flex flex-1 flex-col items-center px-4 pb-5 pt-10">
                    <h3 className="font-serif text-3xl font-bold text-[#123b2c]">{metal.name}</h3>
                    {purity && <p className="mt-1.5 text-xs font-bold uppercase tracking-wide text-[#9a6817] sm:text-sm">{purity}</p>}
                    <p className="mt-3 min-h-[60px] text-sm leading-relaxed text-[#756b5b]">
                      {description || `Discover our beautiful ${metal.name.toLowerCase()} collection, selected for quality and timeless style.`}
                    </p>
                    <Link
                      to={exploreUrl}
                      className="mt-auto inline-flex items-center gap-2 pt-4 text-sm font-bold text-[#173b2d] underline decoration-[#d9a441] decoration-2 underline-offset-8 transition hover:text-[#a66b00]"
                    >
                      Explore {metal.name}
                      <ArrowRight size={18} className="text-[#a66b00] transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        </div>
      </PageContainer>
    </section>
  );
}
