import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Dettatura con il riconoscimento vocale del browser (Web Speech API): niente server e niente
 * costi, l'audio lo trascrive il browser. Chrome, Edge e Safari sì; Firefox no (`supportata` false
 * e il bottone del microfono non compare). La lingua è quella del browser di chi parla.
 */

interface RisultatoVoce {
  readonly length: number;
  [indice: number]: { transcript: string };
}
interface EventoVoce {
  results: { readonly length: number; [indice: number]: RisultatoVoce };
}
interface ErroreVoce {
  error: string;
}
interface Riconoscimento {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: EventoVoce) => void) | null;
  onerror: ((e: ErroreVoce) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type CostruttoreRiconoscimento = new () => Riconoscimento;

function costruttore(): CostruttoreRiconoscimento | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: CostruttoreRiconoscimento; webkitSpeechRecognition?: CostruttoreRiconoscimento };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Quello già scritto + quello dettato, con uno spazio in mezzo se serve. */
function unisci(base: string, dettato: string): string {
  const d = dettato.trim();
  if (!d) return base;
  if (!base || /\s$/.test(base)) return base + d;
  return `${base} ${d}`;
}

/**
 * `avvia(testoAttuale)` comincia ad ascoltare e chiama `onTesto` con il testo completo (quello che
 * c'era + quello dettato, anche provvisorio) a ogni parola; `ferma()` smette.
 */
export function useDettatura(onTesto: (testo: string) => void) {
  const [supportata] = useState(() => costruttore() !== null);
  const [attiva, setAttiva] = useState(false);
  const rec = useRef<Riconoscimento | null>(null);
  const onTestoRef = useRef(onTesto);
  useEffect(() => {
    onTestoRef.current = onTesto;
  }, [onTesto]);

  // Uscendo dalla pagina il microfono si spegne.
  useEffect(() => () => rec.current?.abort(), []);

  const ferma = useCallback(() => {
    rec.current?.stop();
  }, []);

  const avvia = useCallback((base: string) => {
    const Costruttore = costruttore();
    if (!Costruttore || rec.current) return;
    const r = new Costruttore();
    r.lang = navigator.language || "it-IT";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let dettato = "";
      for (let i = 0; i < e.results.length; i++) dettato += e.results[i][0].transcript;
      onTestoRef.current(unisci(base, dettato));
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        toast.error("Microfono non disponibile", { description: "Consenti al browser di usare il microfono e riprova." });
      } else if (e.error !== "aborted" && e.error !== "no-speech") {
        toast.error("La dettatura si è interrotta", { description: "Riprova o scrivi il messaggio." });
      }
    };
    r.onend = () => {
      rec.current = null;
      setAttiva(false);
    };
    rec.current = r;
    try {
      r.start();
      setAttiva(true);
    } catch {
      rec.current = null;
    }
  }, []);

  return { supportata, attiva, avvia, ferma };
}
