import { useContext } from "react";
import GoldRatesContext from "./goldRatesContext";

export default function useGoldRates() {
  const context = useContext(GoldRatesContext);
  if (!context) throw new Error("useGoldRates must be used inside GoldRatesProvider");
  return context;
}
