import { Link } from "react-router-dom";
import {
  CalendarDays,
  ChevronRight,
  CircleDot,
  Coins,
  Gem,
  Info,
  RefreshCw,
  Sparkles
} from "lucide-react";
import PageContainer from "../CommenComponents/PageContainer";
import useGoldRates from "../../PrivateRouter/useGoldRates";
import { formatRateDate } from "../../PrivateRouter/goldRateUtils";
import { formatCurrency } from "../../utils/currency";

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
    metal: "Platinum",
    tagline: "Rare & enduring",
    icon: CircleDot,
    theme: "platinum",
    rates: [
      { purity: "950", label: "Platinum 950", detail: "95% Pure" },
      { purity: "900", label: "Platinum 900", detail: "90% Pure" }
    ]
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
  }
];

const themeClasses = {
  gold: {
    header: "border-[#f0d69c] bg-gradient-to-br from-[#fff5dc] to-[#f8e7bd]",
    icon: "bg-[#d9a441] text-white",
    arrow: "border-[#d9a441] bg-[#a87516] text-white"
  },
  silver: {
    header: "border-[#d6ded8] bg-gradient-to-br from-[#f5f7f2] to-[#e5ebe3]",
    icon: "bg-[#aeb8ad] text-white",
    arrow: "border-[#879589] text-[#345244]"
  },
  platinum: {
    header: "border-[#d6ded8] bg-gradient-to-br from-[#eef3ec] to-[#dce8dc]",
    icon: "bg-[#81968a] text-white",
    arrow: "border-[#879589] text-[#345244]"
  },
  diamond: {
    header: "border-[#f0d69c] bg-gradient-to-br from-[#fff8e9] to-[#faedcf]",
    icon: "bg-[#d9a441] text-white",
    arrow: "border-[#d9a441] text-[#93620d]"
  }
};

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
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${theme.arrow}`}>
          <ChevronRight size={16} aria-hidden="true" />
        </span>
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
                  {rate ? formatCurrency(Number(rate.rate_per_unit ?? rate.rate_per_gram)) : "—"}
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

  return (
    <section className="bg-[#fbf7ed] py-7 sm:py-9" aria-labelledby="today-gold-rate-title">
      <PageContainer>
      <div className="rounded-[22px] border border-[#f0dfbd] bg-[#fffaf0] p-2.5 shadow-[0_12px_35px_rgba(111,78,24,0.10)] sm:p-4">
        <header className="relative overflow-hidden rounded-[18px] bg-gradient-to-r from-[#003a2b] via-[#064d38] to-[#003626] px-5 py-5 text-white sm:px-8 sm:py-6">
          <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-16 h-48 w-48 rounded-full border-[24px] border-white/[0.04]" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-1/4 h-40 w-40 rounded-full bg-emerald-300/[0.04] blur-2xl" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#e3b547] text-[#f5cb66]">
                <Coins size={32} strokeWidth={1.6} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#f1d384]">Live Rates</p>
                <h2 id="today-gold-rate-title" className="mt-1 font-serif text-2xl font-bold leading-tight text-[#fff9e9] sm:text-3xl lg:text-4xl">
                  Today&apos;s Precious Metal Rates
                </h2>
                <p className="mt-2 text-xs text-white/80 sm:text-sm">
                  Gold, silver, platinum per gram · Diamonds per carat
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-white/20 pt-4 md:min-w-[230px] md:border-l md:border-t-0 md:pl-6 md:pt-0">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#e3b547] text-[#f5cb66]">
                <CalendarDays size={22} aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs text-white/70">Rate Date</p>
                <p className="mt-0.5 text-base font-bold">
                  {current?.rate_date ? formatRateDate(current.rate_date) : loading ? "Loading..." : "Not available"}
                </p>
                <p className="mt-0.5 text-[11px] text-white/70">Updated daily</p>
              </div>
            </div>
          </div>
        </header>

        {loading && !current ? (
          <p className="px-4 py-12 text-center text-sm text-[#777066]" role="status">Loading today&apos;s rates...</p>
        ) : error && !current ? (
          <p className="px-4 py-12 text-center text-sm text-red-700" role="alert">
            Today&apos;s rates could not be loaded. Please try again later.
          </p>
        ) : !current ? (
          <p className="px-4 py-12 text-center text-sm text-[#777066]" role="status">No active rates are available.</p>
        ) : (
          <div className="grid items-stretch gap-2 pt-2 sm:gap-3 lg:grid-cols-4">
            {RATE_GROUPS.map((group) => (
              <RateCard key={group.metal} group={group} current={current} />
            ))}
          </div>
        )}

        <footer className="mt-3 flex flex-col gap-4 rounded-2xl border border-[#efd18a] bg-gradient-to-r from-[#fff7df] to-[#fffaf0] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#a97817] text-white">
              <Info size={19} aria-hidden="true" />
            </span>
            <p className="text-xs leading-relaxed text-[#514832]">
              <strong className="text-[#153c2e]">Note:</strong> Gold, silver and platinum rates are shown per gram. Diamond rates are shown per carat.
              <span className="block">Final jewellery prices may include making charges, stones and applicable taxes. Please confirm the latest price with our store before purchase.</span>
              {error && current && <span className="mt-1 block text-amber-800">Showing the last loaded rates; the latest refresh failed.</span>}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => { void refresh().catch((requestError) => console.error("Failed to refresh home page rates:", requestError)); }}
              disabled={loading}
              aria-label="Refresh today's rates"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#a97817] text-[#8a641a] transition hover:bg-[#f9edce] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} aria-hidden="true" />
            </button>
            {/* <Link
              to="/explore"
              className="inline-flex items-center gap-2 rounded-full border border-[#a97817] px-4 py-2.5 text-xs font-bold text-[#302819] transition hover:bg-[#f9edce]"
            >
              View Details <ChevronRight size={16} aria-hidden="true" />
            </Link> */}
          </div>
        </footer>
      </div>
      </PageContainer>
    </section>
  );
}
