
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
      "A symbol of purity and prosperity, our gold jewellery celebrates life's most precious moments.",
    Icon: Coins,
    imageClass: "from-[#f5dba3] to-[#b47a22]",
  },
  silver: {
    symbol: "Ag",
    purity: "999 PURE",
    description:
      "Elegant, versatile and timeless, our silver collection blends tradition with modern style.",
    Icon: Sparkles,
    imageClass: "from-[#e7e7df] to-[#aaa99f]",
  },
  platinum: {
    symbol: "Pt",
    purity: "950 · 900",
    description:
      "Rare, refined and enduring, platinum represents lasting strength and elegance.",
    Icon: Atom,
    imageClass: "from-[#c9d9ce] to-[#718f82]",
  },
  diamond: {
    symbol: "",
    purity: "D–F / VVS · G–H / VS · I–J / SI",
    description:
      "Exceptional sparkle and brilliance, selected for their unmatched beauty.",
    Icon: Gem,
    imageClass: "from-[#f6e8d0] to-[#d8c6a7]",
  },
};

const getMetalDetails = (name = "") => {
  const key = name.trim().toLowerCase();

  if (key.includes("gold")) return METAL_DETAILS.gold;
  if (key.includes("silver")) return METAL_DETAILS.silver;
  if (key.includes("platinum")) return METAL_DETAILS.platinum;
  if (key.includes("diamond")) return METAL_DETAILS.diamond;

  return null;
};

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

        console.error("Failed to load home page metals:", requestError);
        setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <section
      className="bg-[#fbf7ed] py-6 sm:py-8"
      aria-labelledby="home-metals-title"
    >
      <PageContainer>
        <div className="overflow-hidden rounded-2xl border border-[#e6d2a5] bg-[#fffaf0] shadow-[0_10px_30px_rgba(60,45,15,0.10)]">
          {/* Compact emerald banner heading */}
          <header className="relative overflow-hidden bg-gradient-to-br from-[#002d21] via-[#064734] to-[#00291e] px-4 py-6 text-center text-white sm:py-7">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-10 -top-12 h-36 w-36 rounded-full border border-[#d8ad52]/20"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full border border-[#d8ad52]/20"
            />

            <div className="relative">
              <p className="flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-[0.25em] text-[#f1d384] sm:text-xs">
                <span className="h-px w-8 bg-[#d6a63c]" />
                Our Collection
                <span className="h-px w-8 bg-[#d6a63c]" />
              </p>

              <h2
                id="home-metals-title"
                className="mt-2 font-serif text-3xl font-bold sm:text-4xl lg:text-5xl"
              >
                Explore Our{" "}
                <span className="text-[#e8b64e]">Metals</span>
              </h2>

              <p className="mt-2 text-xs text-white/80 sm:text-sm">
                Timeless metals, crafted for your most precious moments.
              </p>

              <div
                className="mx-auto mt-3 flex w-fit items-center gap-2 text-[#e8b64e]"
                aria-hidden="true"
              >
                <span className="h-px w-9 bg-[#d6a63c]" />
                <Gem size={15} strokeWidth={1.5} />
                <span className="h-px w-9 bg-[#d6a63c]" />
              </div>
            </div>
          </header>

          {/* Loading and error states */}
          {loading ? (
            <p
              className="py-8 text-center text-sm text-[#756b5b]"
              role="status"
            >
              Loading metals...
            </p>
          ) : error ? (
            <p
              className="py-8 text-center text-sm text-[#756b5b]"
              role="alert"
            >
              Metals could not be loaded. Please try again later.
            </p>
          ) : metals.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#756b5b]">
              No active metals are available.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {metals.map((metal, index) => {
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
                    className={`group relative flex min-w-0 flex-col ${
                      index !== metals.length - 1
                        ? "border-b border-[#e6d2a5] sm:border-b-0 lg:border-r"
                        : ""
                    } ${
                      index % 2 === 0
                        ? "bg-[#fffaf0]"
                        : "bg-[#f8f4e9]"
                    } ${
                      index < metals.length - 1
                        ? "sm:max-lg:border-r sm:max-lg:border-[#e6d2a5]"
                        : ""
                    }`}
                  >
                    {/* Large image area, no separate card */}
                    <Link
                      to={exploreUrl}
                      aria-label={`Explore ${metal.name}`}
                      className={`relative block h-48 overflow-hidden bg-gradient-to-br ${
                        details?.imageClass ||
                        "from-[#f5e9ce] to-[#dfd0ad]"
                      } sm:h-44 lg:h-40 xl:h-48`}
                    >
                      {metal.image ? (
                        <img
                          src={getMetalImageUrl(metal.image)}
                          alt={`${metal.name} collection`}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Icon
                            size={68}
                            strokeWidth={1}
                            className="text-[#a67b2e]"
                            aria-hidden="true"
                          />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-[#082d20]/25 via-transparent to-transparent" />

                      {/* Metal symbol */}
                      <span className="absolute bottom-0 left-1/2 flex h-12 w-12 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border-2 border-[#d8a53b] bg-[#003c2b] font-serif text-xl font-bold text-[#f3d278] shadow-md">
                        {details?.symbol || (
                          <Gem
                            size={23}
                            strokeWidth={1.4}
                            aria-hidden="true"
                          />
                        )}
                      </span>
                    </Link>

                    {/* Compact content directly on the banner */}
                    <div className="flex flex-1 flex-col items-center px-4 pb-5 pt-8 text-center sm:px-3 sm:pb-5">
                      <h3 className="font-serif text-2xl font-bold text-[#123b2c] sm:text-2xl lg:text-xl xl:text-2xl">
                        {metal.name}
                      </h3>

                      {purity && (
                        <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-[#956619] sm:text-xs">
                          {purity}
                        </p>
                      )}

                      <p className="mt-2 max-w-xs text-xs leading-relaxed text-[#756b5b] sm:text-sm">
                        {description ||
                          `Discover our beautiful ${metal.name.toLowerCase()} collection, selected for quality and timeless style.`}
                      </p>

                      <Link
                        to={exploreUrl}
                        className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#173b2d] underline decoration-[#d9a441] decoration-2 underline-offset-4 transition hover:text-[#a66b00] sm:text-sm"
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
        </div>
      </PageContainer>
    </section>
  );
}
