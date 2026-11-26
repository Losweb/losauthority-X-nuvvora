import { Check, HelpCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { DUBBI, PASSI_BARRA, type Passo } from "../../mappa";

/** La barra dei passi (leggo, analisi, mappa, schede): il cliente sa sempre a che punto è. */
export function PassiAvatar({ passo }: { passo: Passo }) {
  const corrente = passo === "fatto" ? PASSI_BARRA.length : PASSI_BARRA.findIndex((p) => p.passo === passo);
  return (
    <nav aria-label="A che punto sei">
      <ol className="grid grid-cols-4 gap-1.5">
        {PASSI_BARRA.map((p, i) => {
          const fatto = i < corrente;
          const ora = i === corrente;
          return (
            <li key={p.passo} aria-current={ora ? "step" : undefined} className="grid gap-1.5">
              <span className={cn("h-1.5 rounded-full", fatto ? "bg-primary" : ora ? "bg-primary/45" : "bg-secondary")} />
              <span className={cn("flex items-center gap-1 text-[12px]", ora ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {fatto ? <Check className="size-3" aria-hidden /> : null}
                {i + 1}. {p.etichetta}
              </span>
            </li>
          );
        })}
      </ol>
      {passo === "fatto" ? <p className="mt-2 text-[13px] text-muted-foreground">Fatto: mappa e schede sono salvate come bozza. Wesley le rivede nella prossima chiamata.</p> : null}
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
