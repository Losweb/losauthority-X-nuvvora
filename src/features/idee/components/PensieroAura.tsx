import { useEffect, useState } from "react";
import { AuraSfera } from "@/shared/components/brand/AuraSfera";

/**
 * Frasi di stato mentre Aura lavora. Anthropic non manda un "sto pensando"
 * leggibile durante la generazione, quindi le scandiamo noi seguendo i passi
 * reali della funzione: contesto → lettura → idee → script.
 */
const FASI = [
  "Sto rileggendo la tua scheda e la tua analisi…",
  "Cerco il problema giusto del tuo cliente ideale…",
  "Scelgo l'angolo e la tipologia del video…",
  "Scrivo gli hook…",
  "Rifinisco gli script parlati…",
  "Ancora un attimo, controllo che filino…",
] as const;

const INTERVALLO_MS = 2600;

interface PensieroAuraProps {
  /** Frasi di stato alternative (es. il coach che cerca la lezione). Default: quelle di Crea idee. */
  fasi?: readonly string[];
  /** Quanto dura di solito l'attesa: sopra i 10 secondi va detto (es. «Di solito 30-60 secondi»). */
  stima?: string;
  /** Ogni quanto cambia la frase (default 2,6 s; le attese lunghe la allungano per coprire tutta l'attesa). */
  intervalloMs?: number;
}

/**
 * La risposta in attesa (AURA_MANUALE «in chat»): un volto fermo accanto ai tre puntini che
 * respirano e la frase di stato che cambia ogni paio di secondi. L'Aura viva è quella del composer.
 */
export function PensieroAura({ fasi = FASI, stima, intervalloMs = INTERVALLO_MS }: PensieroAuraProps) {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setIndice((i) => Math.min(i + 1, fasi.length - 1)), intervalloMs);
    return () => window.clearInterval(timer);
  }, [fasi.length, intervalloMs]);

  return (
    <div className="flex items-start gap-3" role="status" aria-live="polite">
      <AuraSfera dimensione={32} conNome={false} viva={false} className="mt-0.5" />
      <div className="min-w-0 pt-1">
        <span className="aura-typing text-foreground" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <p key={indice} className="text-[14px] leading-5 text-muted-foreground animate-in fade-in slide-in-from-bottom-1 duration-500 motion-reduce:animate-none">
          {fasi[indice]}
        </p>
        {stima ? <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">{stima}</p> : null}
      </div>
    </div>
  );
}
