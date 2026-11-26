import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Nomi corti dei cinque passi dell'onboarding (l'ordine è quello di BLOCCHI). */
const NOMI = ["Tu", "Offerta", "Clienti", "Social", "Obiettivi"];

interface PassiSchedaProps {
  /** Passo corrente (0-4); `totale` = tutti fatti (Aura sta leggendo o ha finito). */
  indice: number;
  totale: number;
  /** Si può tornare a un passo già fatto toccandolo. */
  onVai?: (indice: number) => void;
}

/**
 * La barra dei passi della scheda: cinque tratti con il nome sotto, quello
 * corrente in evidenza. Sostituisce la barra sottile + «Passo 1 di 5»: il
 * cliente vede dove si trova e cosa manca (26/11/2026).
 */
export function PassiScheda({ indice, totale, onVai }: PassiSchedaProps) {
  return (
    <nav aria-label="I passi della scheda">
      <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${totale}, minmax(0, 1fr))` }}>
        {Array.from({ length: totale }, (_, i) => {
          const fatto = i < indice;
          const ora = i === indice;
          const contenuto = (
            <>
              <span className={cn("block h-1.5 rounded-full transition-colors", fatto ? "bg-primary" : ora ? "bg-primary/45" : "bg-secondary")} />
              <span className={cn("mt-1.5 flex items-center gap-1 text-[12px]", ora ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {fatto ? <Check className="size-3 shrink-0" aria-hidden /> : null}
                <span className="truncate">{NOMI[i] ?? `Passo ${i + 1}`}</span>
              </span>
            </>
          );
          return (
            <li key={i} aria-current={ora ? "step" : undefined} className="min-w-0">
              {fatto && onVai ? (
                <button type="button" onClick={() => onVai(i)} className="block w-full rounded-md text-left outline-none hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" aria-label={`Torna a ${NOMI[i]}`}>
                  {contenuto}
                </button>
              ) : (
                contenuto
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
