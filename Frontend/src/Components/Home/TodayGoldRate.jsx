import { useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  CircleDot,
  X,
  Coins,
  Gem,
  Info,
  RefreshCw,
  Sparkles
} from "lucide-react";
import PageContainer from "../CommenComponents/PageContainer";
import useGoldRates from "../../PrivateRouter/useGoldRates";
import { formatRateDate } from "../../PrivateRouter/goldRateUtils";

const RATE_GROUPS = [
  {
    metal: "Gold",
    tagline: "Timeless value",
    icon: Coins,
    theme: "gold",
    rates: [
      { purity: "999", label: "24K (999)", detail: "Pure Gold" },
      { purity: "916", label: "22K (916)", detail: "Standard Gold" },
      { purity: "833", label: "20K (833)", detail: "Premium Gold" },
      { purity: "750", label: "18K (750)", detail: "Classic Gold" },
      { purity: "585", label: "14K (585)", detail: "Light Gold" }
    ]
  },
  {
    metal: "Silver",
    tagline: "Everyday elegance",
    icon: Sparkles,
    theme: "silver",
    rates: [{ purity: "999", label: "Silver 999", detail: "Pure Silver" }]
  },
  {
    metal: "Diamond",
    tagline: "Exceptional sparkle",
    icon: Gem,
    theme: "diamond",
    rates: [
      { purity: "D-F / VVS", label: "D – F / VVS", detail: "Top Quality" },
      { purity: "G-H / VS", label: "G – H / VS", detail: "High Quality" },
      { purity: "I-J / SI", label: "I – J / SI", detail: "Good Quality" }
    ]
  },
  {
    metal: "Platinum",
    tagline: "Rare & enduring",
    icon: CircleDot,
    theme: "platinum",
    rates: [
      { purity: "950", label: "Platinum 950", detail: "95% Pure" },
      { purity: "900", label: "Platinum 900", detail: "90% Pure" }
    ]
  }
];

const themeClasses = {
  gold: {
    header: "border-[#f0d69c] bg-gradient-to-br from-[#fff5dc] to-[#f8e7bd]",
    icon: "bg-[#d9a441] text-white"
  },
  silver: {
    header: "border-[#d6ded8] bg-gradient-to-br from-[#f5f7f2] to-[#e5ebe3]",
    icon: "bg-[#aeb8ad] text-white"
  },
  platinum: {
    header: "border-[#d6ded8] bg-gradient-to-br from-[#eef3ec] to-[#dce8dc]",
    icon: "bg-[#81968a] text-white"
  },
  diamond: {
    header: "border-[#f0d69c] bg-gradient-to-br from-[#fff8e9] to-[#faedcf]",
    icon: "bg-[#d9a441] text-white"
  }
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function RateCard({ group, current }) {
  const Icon = group.icon;
  const theme = themeClasses[group.theme];

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#f0dfbd] bg-white/70 shadow-[0_3px_12px_rgba(113,79,24,0.06)]">
      <div className={`flex min-h-[88px] items-center gap-3 border-b px-3 py-3 ${theme.header}`}>
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${theme.icon}`}>
          <Icon size={24} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-xl font-bold leading-tight text-[#153c2e]">{group.metal}</h3>
          <p className="mt-1 text-xs text-[#745b35]">{group.tagline}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-2">
        {group.rates.map((item) => {
          const rate = current?.rates?.find((entry) => (
            entry.metal_type?.toLowerCase() === group.metal.toLowerCase()
            && entry.purity === item.purity
          ));
          const unit = rate?.rate_unit === "carat" ? "carat" : "gram";

          return (
            <div
              key={item.purity}
              className="flex min-h-[62px] items-center justify-between gap-2 rounded-lg border border-[#f1e8d8] bg-[#fffdfa] px-3 py-2 shadow-[0_2px_7px_rgba(113,79,24,0.04)]"
            >
              <div className="min-w-0">
                <p className="truncate font-serif text-sm font-bold text-[#29251e]">{item.label}</p>
                <p className="mt-0.5 truncate text-xs text-[#77736d]">{item.detail}</p>
              </div>
              <div className="shrink-0 border-l border-[#e9b752] pl-3 text-right">
                <p className="text-sm font-extrabold text-[#123c2d]">
                  {rate ? currency.format(Number(rate.rate_per_unit ?? rate.rate_per_gram)) : "—"}
                </p>
                <p className="mt-0.5 text-[11px] text-[#77736d]">per {unit}</p>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default function TodayGoldRate() {
  const { current, loading, error, refresh } = useGoldRates();
  const [isRatesOpen, setIsRatesOpen] = useState(false);
  const [selectedMetal, setSelectedMetal] = useState(null);

  useEffect(() => {
    if (!isRatesOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsRatesOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [isRatesOpen]);

  return (
    <section className="bg-[#fbf7ed] py-4 sm:py-6" aria-labelledby="today-gold-rate-title">
      <PageContainer>
        <div className="relative isolate overflow-hidden rounded-2xl border border-[#d9b568] bg-gradient-to-r from-[#002a20] via-[#064734] to-[#003428] px-4 py-5 text-white shadow-[0_8px_24px_rgba(0,45,32,0.18)] sm:px-6 sm:py-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 -z-10 hidden w-[42%] bg-cover bg-center opacity-35 sm:block"
            style={{ backgroundImage: "linear-gradient(90deg, #003428 0%, transparent 100%), url('/images/goldproduct.png')" }}
          />
          <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-20 -z-10 h-48 w-48 rounded-full border-[22px] border-[#d9b568]/10" />

          <div className="relative grid items-center gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_auto] md:gap-6">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-[#f2d58a] sm:text-[10px]">Today&apos;s Market Rates</p>
              <h2 id="today-gold-rate-title" className="mt-1 font-serif text-2xl font-bold leading-tight text-[#fff9e9] sm:text-3xl">
                Know Today&apos;s <span className="text-[#f2d58a]">Rates</span>
              </h2>
              <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-white/75 sm:text-sm">
                Gold, silver, diamond and platinum rates at a glance.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-4 md:gap-2 lg:gap-4">
              {RATE_GROUPS.map((group) => {
                const { metal, tagline, icon: Icon, theme } = group;
                return (
                  <button
                    key={metal}
                    type="button"
                    onClick={() => {
                      setSelectedMetal(metal);
                      setIsRatesOpen(true);
                    }}
                    aria-label={`View ${metal} rates`}
                    className="flex min-w-0 items-center gap-2 border-white/15 text-left transition hover:brightness-110 focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2d58a] min-[480px]:justify-center min-[480px]:border-r min-[480px]:last:border-r-0 min-[480px]:last:pr-0 min-[480px]:sm:flex-col min-[480px]:sm:gap-1 min-[480px]:sm:border-r min-[480px]:sm:pr-3 md:border-r"
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${themeClasses[theme].icon}`}>
                      <Icon size={17} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 min-[480px]:text-center">
                      <span className="block text-xs font-semibold text-white">{metal}</span>
                      <span className="block truncate text-[10px] text-white/65">{tagline}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-white/20 pt-4 md:flex-col md:items-stretch md:border-0 md:pt-0">
              <div className="flex min-w-0 items-center gap-2 text-[10px] text-white/70 md:justify-center">
                <CalendarDays size={15} className="shrink-0 text-[#f2d58a]" aria-hidden="true" />
                <span className="truncate">
                  {current?.rate_date ? `Updated ${formatRateDate(current.rate_date)}` : loading ? "Rates updating" : "Rates unavailable"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedMetal(null);
                  setIsRatesOpen(true);
                }}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f2cf76] to-[#d9a441] px-4 py-2.5 text-xs font-bold text-[#153729] shadow-md transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#064734] sm:px-5"
              >
                View Today&apos;s Rates <ChevronRight size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </PageContainer>

      {isRatesOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#071b14]/70 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsRatesOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="metal-rates-dialog-title"
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#e7d4a8] bg-[#fffaf0] shadow-2xl sm:rounded-3xl"
          >
            <header className="flex items-start justify-between gap-4 bg-gradient-to-r from-[#003a2b] via-[#064d38] to-[#003626] px-4 py-4 text-white sm:px-6 sm:py-5">
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#f1d384] sm:text-[10px]">Today&apos;s Market Rates</p>
                <h2 id="metal-rates-dialog-title" className="mt-1 font-serif text-xl font-bold sm:text-2xl">
                  {selectedMetal ? `${selectedMetal} Rates` : "Precious Metal Rates"}
                </h2>
                <p className="mt-1 text-[11px] text-white/75 sm:text-xs">
                  {current?.rate_date ? `Updated ${formatRateDate(current.rate_date)}` : "Rates are updated daily"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRatesOpen(false)}
                aria-label="Close rates"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/25 text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2d58a]"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
              {loading && !current ? (
                <p className="py-12 text-center text-sm text-[#777066]" role="status">Loading today&apos;s rates...</p>
              ) : error && !current ? (
                <p className="py-12 text-center text-sm text-red-700" role="alert">
                  Today&apos;s rates could not be loaded. Please try again later.
                </p>
              ) : !current ? (
                <p className="py-12 text-center text-sm text-[#777066]" role="status">No active rates are available.</p>
              ) : (
                <div className={`grid items-stretch gap-3 ${selectedMetal ? "mx-auto max-w-md" : "sm:grid-cols-2 xl:grid-cols-4"}`}>
                  {RATE_GROUPS.filter((group) => !selectedMetal || group.metal === selectedMetal).map((group) => (
                    <RateCard key={group.metal} group={group} current={current} />
                  ))}
                </div>
              )}

              <footer className="mt-4 flex flex-col gap-3 rounded-xl border border-[#efd18a] bg-gradient-to-r from-[#fff7df] to-[#fffaf0] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                <div className="flex items-start gap-2.5">
                  <Info size={18} className="mt-0.5 shrink-0 text-[#a97817]" aria-hidden="true" />
                  <p className="text-[11px] leading-relaxed text-[#514832] sm:text-xs">
                    <strong className="text-[#153c2e]">Note:</strong> Gold, silver and platinum rates are per gram; diamond rates are per carat. Final jewellery prices may include making charges, stones and applicable taxes.
                    {error && current && <span className="mt-1 block text-amber-800">Showing the last loaded rates; the latest refresh failed.</span>}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { void refresh().catch((requestError) => console.error("Failed to refresh home page rates:", requestError)); }}
                  disabled={loading}
                  aria-label="Refresh today's rates"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-full border border-[#a97817] text-[#8a641a] transition hover:bg-[#f9edce] disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
                >
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden="true" />
                </button>
              </footer>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
