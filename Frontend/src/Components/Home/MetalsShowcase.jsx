
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import api from "../../api";
import PageContainer from "../CommenComponents/PageContainer";

const METAL_ORDER = ["gold", "silver", "diamond", "platinum"];
const METAL_BACKGROUNDS = {
  gold: "/images/metal/goldmetal.png",
  silver: "/images/metal/silvermetal.png",
  diamond: "/images/metal/diamondmetal.png",
  platinum: "/images/metal/platinummetal.png",
};
const METAL_TEXT_COLORS = {
  gold: {
    eyebrow: "text-[#b58a32]",
    title: "text-[#f7e9c6]",
    details: "text-[#f1ead8]",
  },
  silver: {
    eyebrow: "text-[#71847a]",
    title: "text-[#315b4d]",
    details: "text-[#3f554b]",
  },
  diamond: {
    eyebrow: "text-[#b77932]",
    title: "text-[#955b27]",
    details: "text-[#43594d]",
  },
  platinum: {
    eyebrow: "text-[#d1a42d]",
    title: "text-[#e7b629]",
    details: "text-[#e5e5dc]",
  },
};

function getMetalKey(name = "") {
  return METAL_ORDER.find((metal) => name.toLowerCase().includes(metal));
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
              const exploreUrl = `/explore?metal=${encodeURIComponent(
                metal.name
              )}`;
              const metalKey = getMetalKey(metal.name);
              const background = METAL_BACKGROUNDS[metalKey];
              const textColors = METAL_TEXT_COLORS[metalKey] || METAL_TEXT_COLORS.gold;

              return (
                <article
                  key={metal.id}
                  className="group relative flex min-h-[170px] flex-col justify-center overflow-hidden rounded-xl border border-[#d8b66c] bg-[#f7e8c8] bg-cover bg-center px-5 py-5 shadow-[0_3px_12px_rgba(113,79,24,0.12)] transition-shadow hover:shadow-[0_8px_24px_rgba(31,53,39,0.2)] sm:min-h-[190px] sm:px-8 sm:py-6 lg:min-h-[205px]"
                  style={background ? { backgroundImage: `url('${background}')` } : undefined}
                >
                  <div className="relative z-[1] max-w-[62%]">
                    <p className={`text-[9px] font-bold uppercase tracking-[0.2em] ${textColors.eyebrow} sm:text-[10px]`}>
                      Today&apos;s {metal.name} Rate
                    </p>
                    <h3 className={`mt-1 font-serif text-2xl font-bold leading-tight ${textColors.title} sm:text-3xl`}>
                      {metal.name} Rate
                    </h3>
                    {metal.purity && (
                      <p className={`mt-1 text-[10px] font-semibold uppercase tracking-wide ${textColors.details} sm:text-xs`}>
                        {metal.purity}
                      </p>
                    )}
                    {metal.description && (
                      <p className={`mt-1.5 line-clamp-2 text-[11px] leading-snug ${textColors.details} sm:text-xs`}>
                        {metal.description}
                      </p>
                    )}
                    <Link
                      to={exploreUrl}
                      className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f6d274] to-[#dcae44] px-3.5 py-2 text-[10px] font-bold text-[#382a10] shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#174a38] sm:mt-4 sm:px-4 sm:text-xs"
                    >
                      Explore {metal.name}
                      <ArrowRight
                        size={14}
                        className="transition-transform group-hover:translate-x-1"
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
