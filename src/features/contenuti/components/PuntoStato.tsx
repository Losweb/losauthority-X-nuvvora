import { cn } from "@/lib/utils";
import { COLORE_STATO_CONTENUTO, ETICHETTA_STATO_CONTENUTO, eStatoContenuto } from "../types";

/** Pallino colorato della fase (grigio = idea … salvia = pubblicato). */
export function PuntoStato({ stato, className }: { stato: string; className?: string }) {
  if (!eStatoContenuto(stato)) return null;
  return (
    <span
      aria-label={ETICHETTA_STATO_CONTENUTO[stato]}
      title={ETICHETTA_STATO_CONTENUTO[stato]}
      className={cn("inline-block size-2 shrink-0 rounded-full", COLORE_STATO_CONTENUTO[stato].punto, className)}
    />
  );
}

/** Pillola della fase: pallino colorato + nome, su fondo neutro (card del calendario, tabella). */
export function PillolaStato({ stato, className }: { stato: string; className?: string }) {
  if (!eStatoContenuto(stato)) return null;
  return (
    <span className={cn("inline-flex h-5 max-w-full items-center gap-1.5 rounded-full bg-background/70 px-2 text-[12px] leading-none font-medium text-foreground", className)}>
      <PuntoStato stato={stato} />
      <span className="truncate">{ETICHETTA_STATO_CONTENUTO[stato]}</span>
    </span>
  );
}
