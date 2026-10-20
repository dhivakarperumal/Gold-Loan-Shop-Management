
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import api from "../../api";
import PageContainer from "../CommenComponents/PageContainer";

const METAL_ORDER = ["gold", "silver", "diamond", "platinum"];

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

              return (
                <article
                  key={metal.id}
                  className="group relative flex min-h-[170px] flex-col justify-center overflow-hidden rounded-xl border border-[#d8b66c] bg-[#f7e8c8] bg-cover bg-center px-5 py-5 shadow-[0_3px_12px_rgba(113,79,24,0.12)] transition-shadow hover:shadow-[0_8px_24px_rgba(31,53,39,0.2)] sm:min-h-[190px] sm:px-8 sm:py-6 lg:min-h-[205px]"
                  style={{
                    backgroundImage:
                      "url('/images/metal/diamondmetal.png')",
                  }}
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-r from-[#fff7e7]/95 via-[#fff7e7]/85 to-transparent"
                  />
                  <div className="relative z-[1] max-w-[62%]">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#9a681c] sm:text-[10px]">
                      Today&apos;s {metal.name} Rate
                    </p>
                    <h3 className="mt-1 font-serif text-2xl font-bold leading-tight text-[#174a38] sm:text-3xl">
                      {metal.name} Rate
                    </h3>
                    {metal.purity && (
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[#8b631e] sm:text-xs">
                        {metal.purity}
                      </p>
                    )}
                    {metal.description && (
                      <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-[#45574d] sm:text-xs">
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
