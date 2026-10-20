import { useEffect, useState } from "react";
import { aggiornamentoRiuscito, EVENTO_NUOVA_VERSIONE, puoMostrare, risorsaGiaSegnalata, VERSIONE_APP, versionePubblicata } from "@/shared/utils/versione";

/** Primo controllo poco dopo l'apertura, poi ogni 5 minuti con la scheda visibile. */
const PRIMO_CONTROLLO_MS = 20_000;
const OGNI_MS = 5 * 60_000;
/** Tornando sulla scheda si controlla al massimo una volta al minuto. */
const MINIMO_TRA_CONTROLLI_MS = 60_000;

export interface NuovaVersione {
  /** null quando la segnala un pezzo di codice che non si carica più (versione non nota). */
  versione: string | null;
}

/**
 * C'è una versione più nuova di quella in uso? Si controlla /version.json poco dopo l'apertura, ogni
 * 5 minuti con la scheda visibile, quando si torna sulla scheda e quando torna la rete. In sviluppo no
 * (lì c'è l'HMR di Vite). Una volta trovata, i controlli si fermano: resta il popup fino all'aggiornamento.
 */
export function useNuovaVersione(): NuovaVersione | null {
  const [nuova, setNuova] = useState<NuovaVersione | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    let trovata = false;
    let ultimo = 0;

    function mostra(versione: string | null) {
      if (trovata || !puoMostrare(versione)) return;
      trovata = true;
      setNuova({ versione });
    }

    async function controlla(subito: boolean) {
      if (trovata) return;
      const ora = Date.now();
      if (!subito && ora - ultimo < MINIMO_TRA_CONTROLLI_MS) return;
      ultimo = ora;
      const pubblicata = await versionePubblicata();
      if (!pubblicata) return;
      if (pubblicata === VERSIONE_APP) {
        aggiornamentoRiuscito();
        return;
      }
      mostra(pubblicata);
    }

    const quandoVisibile = () => {
      if (document.visibilityState === "visible") void controlla(false);
    };
    const conRete = () => void controlla(true);
    const daRisorsa = () => mostra(null);

    if (risorsaGiaSegnalata()) daRisorsa();
    const primo = window.setTimeout(() => void controlla(true), PRIMO_CONTROLLO_MS);
    const periodico = window.setInterval(() => {
      if (document.visibilityState === "visible") void controlla(true);
    }, OGNI_MS);
    document.addEventListener("visibilitychange", quandoVisibile);
    window.addEventListener("focus", quandoVisibile);
    window.addEventListener("online", conRete);
    window.addEventListener(EVENTO_NUOVA_VERSIONE, daRisorsa);
    return () => {
      window.clearTimeout(primo);
      window.clearInterval(periodico);
      document.removeEventListener("visibilitychange", quandoVisibile);
      window.removeEventListener("focus", quandoVisibile);
      window.removeEventListener("online", conRete);
      window.removeEventListener(EVENTO_NUOVA_VERSIONE, daRisorsa);
    };
  }, []);

  return nuova;
}
