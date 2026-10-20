
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Atom,
  Coins,
  Gem,
  Sparkles,
} from "lucide-react";
import api from "../../api";
import PageContainer from "../CommenComponents/PageContainer";

const backendUrl = (
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5000"
).replace(/\/$/, "");

const getMetalImageUrl = (image) => {
  if (!image || /^(https?:|data:|blob:)/i.test(image)) {
    return image || "";
  }

  return `${backendUrl}${image.startsWith("/") ? image : `/${image}`}`;
};

const METAL_DETAILS = {
  gold: {
    symbol: "Au",
    purity: "24K · 22K · 20K · 18K · 14K",
    description:
      "A symbol of purity and prosperity, our gold jewellery celebrates life's special moments.",
    Icon: Coins,
    fallback: "from-[#f3d49a] to-[#b47a22]",
  },
  silver: {
    symbol: "Ag",
    purity: "999 PURE",
    description:
      "Elegant, versatile and timeless, our silver collection blends tradition with modern style.",
    Icon: Sparkles,
    fallback: "from-[#e6e5de] to-[#aaa99f]",
  },
  platinum: {
    symbol: "Pt",
    purity: "950 · 900",
    description:
      "Rare, refined and enduring, platinum symbolises lasting strength and elegance.",
    Icon: Atom,
    fallback: "from-[#c9d9ce] to-[#718f82]",
  },
  diamond: {
    symbol: "",
    purity: "D–F / VVS · G–H / VS · I–J / SI",
    description:
      "Exceptional sparkle and brilliance, our diamonds are chosen for their unmatched beauty.",
    Icon: Gem,
    fallback: "from-[#f6e8d0] to-[#d8c6a7]",
  },
};

function getMetalDetails(name = "") {
  const key = name.trim().toLowerCase();

  if (key.includes("gold")) return METAL_DETAILS.gold;
  if (key.includes("silver")) return METAL_DETAILS.silver;
  if (key.includes("platinum")) return METAL_DETAILS.platinum;
  if (key.includes("diamond")) return METAL_DETAILS.diamond;

  return null;
}

export default function MetalsShowcase() {
  const [metals, setMetals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    api
      .get("/metals", { signal: controller.signal })
      .then(({ data }) => {
        if (!Array.isArray(data)) {
          throw new TypeError("The metals response must be an array");
        }

        setMetals(
          data.filter(
            (metal) =>
              String(metal.status || "").toLowerCase() === "active"
          )
        );
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;

        console.error("Failed to load metals:", requestError);
        setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);


  return (
    <section
      className="bg-[#fbf7ed] px-3 py-4 sm:px-5 sm:py-6"
      aria-label="Explore our metal collections"
    >
      <PageContainer>
        {loading ? (
          <p className="py-12 text-center text-sm text-[#756b5b]" role="status">
            Loading metals...
          </p>
        ) : error ? (
          <p className="py-12 text-center text-sm text-[#756b5b]" role="alert">
            Metals could not be loaded. Please try again later.
          </p>
        ) : metals.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#756b5b]">
            No active metals are available.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
            {metals.map((metal) => {
              const details = getMetalDetails(metal.name);
              const Icon = details?.Icon || Coins;
              const purity = metal.purity || details?.purity;
              const description =
                metal.description || details?.description;

              const exploreUrl = `/explore?metal=${encodeURIComponent(
                metal.name
              )}`;

              return (
                <article
                  key={metal.id}
                  className="group relative grid min-h-[230px] grid-cols-[44%_56%] overflow-hidden rounded-xl border border-[#e6cf9c] bg-[#fffaf0] sm:min-h-[250px] lg:min-h-[270px]"
                >
                  {/* Jewellery image */}
                  <Link
                    to={exploreUrl}
                    aria-label={`Explore ${metal.name}`}
                    className={`relative min-w-0 overflow-hidden bg-gradient-to-br ${details?.fallback || "from-[#f5e9ce] to-[#dfd0ad]"
                      }`}
                  >
                    {metal.image ? (
                      <img
                        src={getMetalImageUrl(metal.image)}
                        alt={`${metal.name} jewellery`}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Icon
                          size={60}
                          strokeWidth={1.1}
                          className="text-[#a67b2e]"
                          aria-hidden="true"
                        />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#002d21]/25 via-transparent to-transparent" />

                    {/* Metal symbol */}
                    <span className="absolute bottom-4 left-3 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#d8a53b] bg-[#003c2b] font-serif text-lg font-bold text-[#f3d278] shadow-md sm:bottom-5 sm:left-4 sm:h-12 sm:w-12 sm:text-xl">
                      {details?.symbol || <Gem size={24} />}
                    </span>
                  </Link>

                  {/* Curved gold image divider */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-[-12%] left-[39%] top-[-12%] z-10 w-12 rounded-[50%] border-r-[5px] border-[#e9c77f] sm:w-14"
                  />

                  {/* Content */}
                  <div className="relative flex min-w-0 flex-col justify-center px-3 py-4 pl-5 sm:px-4 sm:pl-6 lg:px-6 lg:pl-8">
                    <span className="mb-2 h-[2px] w-8 bg-[#c48a22] sm:w-10" />

                    <h3 className="font-serif text-xl font-bold leading-tight text-[#073b2b] sm:text-2xl lg:text-3xl">
                      {metal.name}
                    </h3>

                    {purity && (
                      <p className="mt-1.5 break-words text-[9px] font-bold uppercase leading-relaxed tracking-wide text-[#a36c12] sm:text-[10px] lg:text-xs">
                        {purity}
                      </p>
                    )}

                    <p className="mt-2 text-[11px] leading-relaxed text-[#68645c] sm:mt-3 sm:text-xs lg:text-sm">
                      {description ||
                        `Discover our beautiful ${metal.name.toLowerCase()} collection, selected for quality and timeless style.`}
                    </p>

                    <Link
                      to={exploreUrl}
                      className="mt-3 inline-flex w-fit items-center gap-2 border-b border-[#d9a441] pb-1 text-[11px] font-bold text-[#073b2b] transition hover:text-[#a66b00] sm:mt-4 sm:text-sm"
                    >
                      Explore {metal.name}
                      <ArrowRight
                        size={16}
                        className="text-[#a66b00] transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </Link>

                    {/* Subtle decorative detail */}
                    <Gem
                      size={42}
                      strokeWidth={0.6}
                      className="pointer-events-none absolute bottom-2 right-2 hidden text-[#d7b568]/20 lg:block"
                      aria-hidden="true"
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </PageContainer>
    </section>
  );
}
