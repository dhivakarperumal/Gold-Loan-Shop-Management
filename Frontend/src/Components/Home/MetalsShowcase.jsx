
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
    title: "text-[#fff8e7]",
    details: "text-[#fffdf7]",
  },
  silver: {
    eyebrow: "text-[#183c30]",
    title: "text-[#10382d]",
    details: "text-[#172f26]",
  },
  diamond: {
    eyebrow: "text-[#70420f]",
    title: "text-[#70420f]",
    details: "text-[#283c32]",
  },
  platinum: {
    eyebrow: "text-[#d1a42d]",
    title: "text-[#fff1bd]",
    details: "text-[#fffdf7]",
  },
};
const DEFAULT_TEXT_COLORS = {
  eyebrow: "text-[#294438]",
  title: "text-[#12372d]",
  details: "text-[#26382f]",
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
                const isSilver = metalKey === "silver";
              const background = METAL_BACKGROUNDS[metalKey];
              const textColors = METAL_TEXT_COLORS[metalKey] || DEFAULT_TEXT_COLORS;

              return (
                <article
                  key={metal.id}
                  className="group relative flex min-h-[170px] flex-col justify-center overflow-hidden rounded-xl border border-[#d8b66c] bg-[#f7e8c8] bg-cover bg-center px-5 py-5 shadow-[0_3px_12px_rgba(113,79,24,0.12)] transition-shadow hover:shadow-[0_8px_24px_rgba(31,53,39,0.2)] sm:min-h-[190px] sm:px-8 sm:py-6 lg:min-h-[205px]"
                  style={background ? { backgroundImage: `url('${background}')` } : undefined}
                >
                  {isSilver && (
                    <div
                      className="pointer-events-none absolute inset-y-0 left-0 z-0 w-[68%] bg-gradient-to-r from-[#f4f4ed]/80 via-[#f4f4ed]/50 to-transparent"
                      aria-hidden="true"
                    />
                  )}

                  <div className="relative z-[1] w-full max-w-[68%] sm:max-w-[62%]">
                    <h3
                      className={`mt-1 font-serif text-2xl font-bold leading-tight drop-shadow-sm sm:text-3xl ${textColors.title}`}
                    >
                      {metal.name}
                    </h3>

                    {metal.purity && (
                      <p
                        className={`mt-1 text-xs font-bold uppercase tracking-wide ${textColors.details}`}
                      >
                        {metal.purity}
                      </p>
                    )}

                    {metal.description && (
                      <p
                        className={`mt-1.5 line-clamp-2 text-xs font-medium leading-relaxed ${textColors.details}`}
                      >
                        {metal.description}
                      </p>
                    )}

                    <Link
                      to={exploreUrl}
                      className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f6d274] to-[#dcae44] px-4 py-2 text-xs font-bold text-[#382a10] shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#174a38] sm:mt-4"
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
