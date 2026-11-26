import { HelpCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { DUBBI, PASSI_BARRA, type Passo } from "../../mappa";

/** La barra dei passi (leggo, analisi, mappa, schede): il cliente sa sempre a che punto è. */
export function PassiAvatar({ passo }: { passo: Passo }) {
  const corrente = passo === "fatto" ? PASSI_BARRA.length : PASSI_BARRA.findIndex((p) => p.passo === passo);
  // Solo i trattini (26/11/2026): il nome del passo si legge passando sopra e dal lettore di schermo.
  return (
    <nav aria-label="A che punto sei">
      <ol className="flex gap-1.5">
        {PASSI_BARRA.map((p, i) => (
          <li key={p.passo} aria-current={i === corrente ? "step" : undefined} title={p.etichetta} className="flex-1">
            <span className={cn("block h-1.5 rounded-full", i < corrente ? "bg-primary" : i === corrente ? "bg-primary/45" : "bg-secondary")} />
            <span className="sr-only">
              {p.etichetta}
              {i < corrente ? ": fatto" : i === corrente ? ": adesso" : ""}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** I tre dubbi della lezione: un tocco e la domanda parte verso Aura, che risponde subito. */
export function DubbiAvatar({ onDubbio, disabilitato, compatti = false }: { onDubbio: (d: string) => void; disabilitato?: boolean; compatti?: boolean }) {
  return (
    <div role="group" aria-label="I tre dubbi sull'avatar" className={cn("flex gap-2", compatti ? "overflow-x-auto pb-1 [scrollbar-width:none]" : "flex-wrap")}>
      {DUBBI.map((d) => (
        <Button key={d} type="button" variant="outline" size={compatti ? "xs" : "sm"} disabled={disabilitato} onClick={() => onDubbio(d)} className="shrink-0 pointer-coarse:min-h-11 pointer-coarse:px-3.5">
          <HelpCircle aria-hidden /> {d}
        </Button>
      ))}
    </div>
  );
}
