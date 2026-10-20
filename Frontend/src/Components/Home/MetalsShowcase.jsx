
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Atom,
  Coins,
  Flower2,
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
    cardGradient: "from-[#fff7e5] via-[#fffdf8] to-[#f6e4b8]",
  },
  silver: {
    symbol: "Ag",
    purity: "999 PURE",
    description:
      "Elegant, versatile and timeless, our silver collection blends tradition with modern style.",
    Icon: Sparkles,
    fallback: "from-[#e6e5de] to-[#aaa99f]",
    cardGradient: "from-[#eaf5ff] via-[#f8fbff] to-[#d9eaff]",
  },
  platinum: {
    symbol: "Pt",
    purity: "950 · 900",
    description:
      "Rare, refined and enduring, platinum symbolises lasting strength and elegance.",
    Icon: Atom,
    fallback: "from-[#c9d9ce] to-[#718f82]",
    cardGradient: "from-[#e8f7ed] via-[#f8fcf8] to-[#d3eddd]",
  },
  diamond: {
    symbol: "",
    purity: "D–F / VVS · G–H / VS · I–J / SI",
    description:
      "Exceptional sparkle and brilliance, our diamonds are chosen for their unmatched beauty.",
    Icon: Gem,
    fallback: "from-[#f6e8d0] to-[#d8c6a7]",
    cardGradient: "from-[#fff0f8] via-[#fff9fc] to-[#f5dff0]",
  },
};

const METAL_ORDER = ["gold", "silver", "diamond", "platinum"];

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

        const activeMetals = data.filter(
          (metal) => String(metal.status || "").toLowerCase() === "active"
        );
        setMetals(
          activeMetals.sort((first, second) => {
            const firstOrder = METAL_ORDER.findIndex((name) =>
              String(first.name || "").toLowerCase().includes(name)
            );
            const secondOrder = METAL_ORDER.findIndex((name) =>
              String(second.name || "").toLowerCase().includes(name)
            );
            return (firstOrder === -1 ? METAL_ORDER.length : firstOrder)
              - (secondOrder === -1 ? METAL_ORDER.length : secondOrder);
          })
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
      className="bg-[#fbf7ed] py-3 sm:py-4"
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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2">
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
                  className={`group relative grid min-h-[190px] grid-cols-[44%_56%] overflow-hidden rounded-xl border border-[#e6cf9c] bg-gradient-to-br ${details?.cardGradient || "from-[#f5e9ce] via-[#fffdf8] to-[#dfd0ad]"} shadow-[0_3px_12px_rgba(113,79,24,0.06)] sm:min-h-[210px] lg:min-h-[230px]`}
                >
                  <Link
                    to={exploreUrl}
                    aria-label={`Explore ${metal.name}`}
                    className={`relative z-[1] min-w-0 overflow-hidden rounded-r-[46%_58%] border-r-[5px] border-[#e9c77f] bg-gradient-to-br ${details?.fallback || "from-[#f5e9ce] to-[#dfd0ad]"}`}
                  >
                    {metal.image ? (
                      <img
                        src={getMetalImageUrl(metal.image)}
                        alt={`${metal.name} jewellery`}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon
                          size={76}
                          strokeWidth={1.1}
                          className="text-[#a67b2e]/80"
                          aria-hidden="true"
                        />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#002d21]/25 via-transparent to-transparent" />

                    <span className="absolute bottom-3 left-3 z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#d8a53b] bg-[#003c2b] font-serif text-xl font-bold text-[#f3d278] shadow-md sm:bottom-4 sm:left-4 sm:h-14 sm:w-14 sm:text-2xl">
                      {details?.symbol || <Gem size={24} />}
                    </span>
                  </Link>

                  <div className="relative flex min-w-0 flex-col justify-center overflow-hidden bg-gradient-to-br from-white/75 via-white/55 to-transparent px-3 py-3 pl-5 sm:px-4 sm:py-3 sm:pl-6 lg:px-6 lg:pl-8">
                    <Flower2
                      size={104}
                      strokeWidth={0.7}
                      className="pointer-events-none absolute -right-7 top-4 h-20 w-20 text-[#d7b568]/20 sm:h-28 sm:w-28"
                      aria-hidden="true"
                    />
                    <Flower2
                      size={72}
                      strokeWidth={0.7}
                      className="pointer-events-none absolute -bottom-6 right-10 hidden text-[#d7b568]/15 sm:block"
                      aria-hidden="true"
                    />
                    <span className="relative mb-1.5 h-[2px] w-8 bg-[#c48a22] sm:w-10" />

                    <h3 className="relative font-serif text-xl font-bold leading-tight text-[#073b2b] sm:text-2xl lg:text-3xl">
                      {metal.name}
                    </h3>

                    {purity && (
                      <p className="relative mt-1 break-words text-[9px] font-bold uppercase leading-snug tracking-wide text-[#a36c12] sm:text-[10px] lg:text-xs">
                        {purity}
                      </p>
                    )}

                    <p className="relative mt-1.5 line-clamp-2 text-[11px] leading-snug text-[#68645c] sm:text-xs lg:text-sm">
                      {description ||
                        `Discover our beautiful ${metal.name.toLowerCase()} collection, selected for quality and timeless style.`}
                    </p>

                    <Link
                      to={exploreUrl}
                      className="relative mt-2.5 inline-flex w-fit items-center gap-1.5 border-b border-[#d9a441] pb-0.5 text-[11px] font-bold text-[#073b2b] transition hover:text-[#a66b00] sm:mt-3 sm:text-xs"
                    >
                      Explore {metal.name}
                      <ArrowRight
                        size={16}
                        className="text-[#a66b00] transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </Link>
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
