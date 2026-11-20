import { useEffect } from "react";

/**
 * Si stampa sempre col tema chiaro: col tema scuro il PDF (offerta, scheda onboarding) uscirebbe
 * con testo chiaro su carta bianca. Prima della stampa toglie `.dark` da <html>, dopo lo rimette.
 */
export function useStampaChiara() {
  useEffect(() => {
    const html = document.documentElement;
    let eraScuro = false;
    const prima = () => {
      eraScuro = html.classList.contains("dark");
      if (!eraScuro) return;
      html.classList.remove("dark");
      html.style.colorScheme = "light";
    };
    const dopo = () => {
      if (!eraScuro) return;
      html.classList.add("dark");
      html.style.colorScheme = "dark";
      eraScuro = false;
    };
    window.addEventListener("beforeprint", prima);
    window.addEventListener("afterprint", dopo);
    return () => {
      window.removeEventListener("beforeprint", prima);
      window.removeEventListener("afterprint", dopo);
    };
  }, []);
}
