import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import api from "../../api";

const backendUrl = (
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5000"
).replace(/\/$/, "");

const getMetalImageUrl = (image) => {
  if (!image || /^(https?:|data:|blob:)/i.test(image)) return image || "";
  return `${backendUrl}${image.startsWith("/") ? image : `/${image}`}`;
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
    <section className="bg-[#fffdf8] px-4 py-10 sm:px-6 lg:px-8" aria-labelledby="home-metals-title">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a67b2e]">Our Collection</p>
          <h2 id="home-metals-title" className="mt-1 font-serif text-2xl font-bold text-[#201a13] sm:text-3xl">
            Explore Our Metals
          </h2>
          <div className="mx-auto mt-3 flex w-fit items-center gap-3" aria-hidden="true">
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#d9a441]" />
            <span className="h-1.5 w-1.5 rotate-45 bg-[#d9a441]" />
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#d9a441]" />
          </div>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-[#777066]" role="status">Loading metals...</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-[#777066]" role="alert">Metals could not be loaded.</p>
        ) : metals.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#777066]">No active metals are available.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {metals.map((metal) => (
              <article key={metal.id} className="overflow-hidden rounded-2xl border border-[#eadfc8] bg-white shadow-sm transition-shadow hover:shadow-md">
                {metal.image ? (
                  <img
                    src={getMetalImageUrl(metal.image)}
                    alt={metal.name}
                    className="h-48 w-full bg-[#fbf8f1] object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center bg-[#fbf8f1] text-[#a66b2e]">
                    <Coins size={42} aria-hidden="true" />
                  </div>
                )}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-[#174a38]">{metal.name}</h3>
                  {metal.purity && <p className="mt-1 text-sm font-semibold text-[#a67b2e]">{metal.purity}</p>}
                  {metal.description && <p className="mt-3 text-sm leading-relaxed text-[#777066]">{metal.description}</p>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
