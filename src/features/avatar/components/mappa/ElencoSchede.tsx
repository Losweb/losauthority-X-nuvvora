import { AlertTriangle, ArrowRight, Star } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/lib/utils";
import { contaVere, MIN_VERE, schedaIniziata, titoloScheda, type SchedaAvatar } from "../../mappa";

/** Le schede degli avatar sotto la mappa: una card per partenza, si apre a tutta larghezza. */
export function ElencoSchede({ schede, onApri }: { schede: SchedaAvatar[]; onApri: (ordine: number) => void }) {
  if (schede.length === 0) return null;
  return (
    <section aria-label="Le schede" className="grid gap-2">
      <p className="eyebrow">Le schede</p>
      <ul className="grid gap-2">
        {[...schede]
          .sort((a, b) => Number(b.principale) - Number(a.principale) || a.ordine - b.ordine)
          .map((s) => {
            const iniziata = schedaIniziata(s);
            const vere = contaVere(s.contenuto);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={!iniziata}
                  onClick={() => onApri(s.ordine)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border border-line bg-card p-3 text-left transition-colors",
                    iniziata ? "hover:bg-surface-hover" : "cursor-default opacity-70",
                  )}
                >
                  <span className="grid min-w-0 flex-1 gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[15px] font-semibold">{titoloScheda(s)}</span>
                      {s.principale ? (
                        <Badge variant="action">
                          <Star aria-hidden /> Principale
                        </Badge>
                      ) : null}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {!iniziata ? "La scrive Aura dopo la mappa" : vere < MIN_VERE ? (
                        <span className="inline-flex items-center gap-1 text-status-expiring">
                          <AlertTriangle className="size-3" aria-hidden /> In gran parte costruita
                        </span>
                      ) : (
                        `${vere} frasi vere`
                      )}
                    </span>
                  </span>
                  {iniziata ? <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
                </button>
              </li>
            );
          })}
      </ul>
    </section>
  );
}
