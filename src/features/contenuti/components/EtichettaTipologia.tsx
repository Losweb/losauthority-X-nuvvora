import { cn } from "@/lib/utils";
import { stilePieno } from "../colore";
import type { Tipologia } from "../types";

/** Il pallino del colore (per le voci del select, dove la pillola sarebbe troppo). */
export function PuntoTipologia({ colore, className }: { colore: string; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", className)} style={{ backgroundColor: colore }} />;
}

interface EtichettaTipologiaProps {
  tipologia: Tipologia;
  className?: string;
  /** Pillola più bassa (16px) per le chip del calendario. */
  piccola?: boolean;
}

/** Pillola PIENA del colore della tipologia con il nome: nelle card del tablero, nelle chip e nelle legende. */
export function EtichettaTipologia({ tipologia, className, piccola = false }: EtichettaTipologiaProps) {
  return (
    <span
      data-slot="tipologia"
      title={tipologia.predefinita ? `${tipologia.nome} · predefinita` : tipologia.nome}
      style={stilePieno(tipologia.colore)}
      className={cn(
        "inline-flex max-w-full items-center rounded-full font-medium",
        piccola ? "h-4 px-1.5 text-[12px] leading-none" : "h-5 px-2 text-[12px] leading-4",
        className,
      )}
    >
      <span className="truncate">{tipologia.nome}</span>
    </span>
  );
}
