import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuraSfera } from "@/shared/components/brand/AuraSfera";

/** Quanto resta a schermo prima di aprire l'onboarding. */
const DURATA_MS = 2600;

interface FineBenvenutoProps {
  /** Il benvenuto è stato segnato sul database: solo allora si può passare all'onboarding senza rimbalzi. */
  pronto: boolean;
}

/**
 * Ultima animazione: Aura prende la parola e, passati i secondi di attesa e
 * salvato il benvenuto, si apre la scheda onboarding.
 */
export function FineBenvenuto({ pronto }: FineBenvenutoProps) {
  const navigate = useNavigate();
  const [tempoScaduto, setTempoScaduto] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setTempoScaduto(true), DURATA_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (pronto && tempoScaduto) navigate("/area/onboarding", { replace: true });
  }, [pronto, tempoScaduto, navigate]);

  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-8 text-center">
      <AuraSfera dimensione={128} parla conNome={false} />
      <div className="grid gap-3 animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-700 delay-500 motion-reduce:animate-none">
        <p className="eyebrow">Tutto pronto</p>
        <h2 className="font-display text-[clamp(28px,4vw,38px)] leading-tight font-bold tracking-[-0.01em]">Ora tocca a te.</h2>
        <p className="mx-auto max-w-[420px] text-[15px] leading-relaxed text-muted-foreground">
          Compila la tua scheda: è la base su cui Wesley e Aura costruiscono il tuo percorso.
        </p>
      </div>
    </div>
  );
}
