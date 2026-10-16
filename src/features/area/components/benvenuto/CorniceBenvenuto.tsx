import type { ReactNode } from "react";
import { MarmoLogo } from "@/shared/components/brand/MarmoLogo";
import { cn } from "@/lib/utils";

interface CorniceBenvenutoProps {
  /** Indice del passo corrente (0-based) e quanti sono: i puntini in alto. */
  passo: number;
  totale: number;
  /** Il passo sta uscendo: parte l'animazione di uscita prima del cambio. */
  uscita: boolean;
  children: ReactNode;
}

/**
 * La cornice a schermo pieno del benvenuto: la finestra Seto sulla tela sfumata appare in
 * dissolvenza (prima il «navigatore», poi il contenuto), con il marchio in alto e i puntini dei passi.
 * Ogni passo entra dal basso e, quando si va avanti, esce verso l'alto.
 */
export function CorniceBenvenuto({ passo, totale, uscita, children }: CorniceBenvenutoProps) {
  return (
    <div className="marmo-benvenuto-cornice st-canvas">
      <div className="st-window flex flex-col">
        <header className="flex h-(--header-h) shrink-0 items-center justify-between px-6 sm:px-10">
          <MarmoLogo altezza={20} />
          <ol className="flex items-center gap-2" aria-label={`Passo ${passo + 1} di ${totale}`}>
            {Array.from({ length: totale }, (_, i) => (
              <li
                key={i}
                aria-current={i === passo ? "step" : undefined}
                className={cn(
                  "h-1.5 rounded-full transition-[width,background-color] duration-500",
                  i === passo ? "w-6 bg-foreground" : i < passo ? "w-1.5 bg-foreground/60" : "w-1.5 bg-border-strong",
                )}
              />
            ))}
          </ol>
        </header>
        <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 pb-14 sm:px-6">
          <div key={passo} className={cn("w-full max-w-[640px]", uscita ? "marmo-benvenuto-esce" : "marmo-benvenuto-entra")}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
