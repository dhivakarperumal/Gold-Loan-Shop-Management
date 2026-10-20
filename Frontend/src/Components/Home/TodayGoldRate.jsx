import { Coins } from "lucide-react";
import useGoldRates from "../../PrivateRouter/useGoldRates";
import { formatRateDate } from "../../PrivateRouter/goldRateUtils";

const RATE_GROUPS = [
  {
    metal: "Gold",
    rates: [
      { purity: "999", label: "24K Gold" },
      { purity: "916", label: "22K Gold" },
      { purity: "833", label: "20K Gold" },
      { purity: "750", label: "18K Gold" },
      { purity: "585", label: "14K Gold" }
    ]
  },
  {
    metal: "Silver",
    rates: [{ purity: "999", label: "Silver 999" }]
  },
  {
    metal: "Platinum",
    rates: [
      { purity: "950", label: "Platinum 950" },
      { purity: "900", label: "Platinum 900" }
    ]
  },
  {
    metal: "Diamond",
    rates: [
      { purity: "D-F / VVS", label: "D–F / VVS" },
      { purity: "G-H / VS", label: "G–H / VS" },
      { purity: "I-J / SI", label: "I–J / SI" }
    ]
  }
];

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

export default function TodayGoldRate() {
  const { current, loading, error } = useGoldRates();
  const rateGroups = RATE_GROUPS.map((group) => ({
    ...group,
    rates: group.rates.map(({ purity, label }) => ({
      label,
      rate: current?.rates?.find((item) => (
        item.metal_type?.toLowerCase() === group.metal.toLowerCase() && item.purity === purity
      ))
    })).filter(({ rate }) => rate)
  })).filter((group) => group.rates.length > 0);

  return (
    <section className="bg-[#fbf8f1] px-4 py-8 sm:px-6 lg:px-8" aria-labelledby="today-gold-rate-title">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-2xl border border-[#eadfc8] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#eee7da] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f8f0dc] text-[#a66b00]">
                <Coins size={22} aria-hidden="true" />
              </span>
              <div>
                <h2 id="today-gold-rate-title" className="text-lg font-extrabold text-[#174a38] sm:text-xl">
                  Today&apos;s Precious Metal Rates
                </h2>
                <p className="text-xs font-medium text-[#777066]">Gold, silver and platinum per gram · diamonds per carat</p>
              </div>
            </div>
            {current?.rate_date && (
              <p className="text-sm font-semibold text-[#777066]">
                Rate date: <time dateTime={current.rate_date}>{formatRateDate(current.rate_date)}</time>
              </p>
            )}
          </div>

          {loading && !current ? (
            <p className="px-5 py-7 text-center text-sm text-[#777066]" role="status">
              Loading today&apos;s gold rates...
            </p>
          ) : error && !current ? (
            <p className="px-5 py-7 text-center text-sm text-red-700" role="alert">
              Today&apos;s gold rates could not be loaded. Please try again later.
            </p>
          ) : rateGroups.length > 0 ? (
            <>
              <div className="space-y-5 px-5 py-5 sm:px-7">
                {rateGroups.map((group) => (
                  <div key={group.metal}>
                    <h3 className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#777066]">
                      {group.metal}
                    </h3>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                      {group.rates.map(({ label, rate }) => (
                        <div key={label} className="rounded-xl border border-[#eee7da] bg-[#fffdfa] px-3 py-4 text-center">
                          <p className="text-xs font-bold text-[#777066]">{label}</p>
                          <p className="mt-2 text-lg font-black text-[#174a38] sm:text-xl">
                            {currency.format(Number(rate.rate_per_unit ?? rate.rate_per_gram))}
                          </p>
                          <p className="mt-1 text-xs font-medium text-[#938a7d]">
                            per {rate.rate_unit === "carat" ? "carat" : "gram"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {error && (
                <p className="border-t border-[#eee7da] px-5 py-2 text-center text-xs text-amber-800" role="status">
                  Showing the last loaded rates; the latest refresh failed.
                </p>
              )}
            </>
          ) : (
            <p className="px-5 py-7 text-center text-sm text-[#777066]" role={error ? "alert" : "status"}>
              {error ? "Today's gold rates could not be loaded. Please try again later." : "Gold rates are not available right now."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
