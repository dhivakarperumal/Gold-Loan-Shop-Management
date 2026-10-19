import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api";
import GoldRatesContext from "./goldRatesContext";

export function GoldRatesProvider({ children }) {
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

  const refresh = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const response = await api.get("/gold-rates/current");
      setCurrent(response.data || null);
      setLastFetchedAt(new Date());
      return response.data || null;
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not refresh the active gold rate.");
      throw requestError;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadRates = async () => {
      if (!mounted) return;
      try {
        await refresh();
      } catch (requestError) {
        console.error("Gold rate refresh failed:", requestError);
      }
    };
    const handleFocus = () => { void loadRates(); };
    const interval = window.setInterval(loadRates, 60000);
    window.addEventListener("focus", handleFocus);
    void loadRates();
    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refresh]);

  const value = useMemo(() => ({
    current,
    loading,
    error,
    lastFetchedAt,
    refresh,
    setCurrent
  }), [current, loading, error, lastFetchedAt, refresh]);

  return <GoldRatesContext.Provider value={value}>{children}</GoldRatesContext.Provider>;
}
