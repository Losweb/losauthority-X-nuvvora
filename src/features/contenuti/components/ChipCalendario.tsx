import type { DragEvent, ReactNode } from "react";
import { CheckCircle2, FileText, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { ETICHETTA_STATO_CONTENUTO, eStatoContenuto, oraBreve, type Contenuto, type Tipologia } from "../types";
import { stileTinta } from "../colore";
import { EtichettaTipologia } from "./EtichettaTipologia";
import { PuntoStato } from "./PuntoStato";

interface ChipCalendarioProps {
  c: Contenuto;
  /** La tipologia del contenuto (risolta da `tipologia_id`), se ne ha una. */
  tipologia: Tipologia | null;
  onApri: (c: Contenuto) => void;
}

function Segno({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <span title={titolo} className="inline-flex shrink-0">
      {children}
      <span className="sr-only">{titolo}</span>
    </span>
  );
}

/**
 * Un contenuto dentro un giorno del calendario, dipinto con il COLORE DELLA TIPOLOGIA: sfondo
 * e bordo in tinta leggera, barra piena a sinistra, pillola piena con il nome. Così in un giorno
 * con tante card le tipologie si distinguono subito. Sotto: pallino della fase e i segni di cosa
 * c'è già (script, Drive, pubblicato). Si trascina su un altro giorno e si apre con un clic.
 */
export function ChipCalendario({ c, tipologia, onApri }: ChipCalendarioProps) {
  const stato = eStatoContenuto(c.stato) ? c.stato : null;
  // Nella colonna «Senza data» l'ora non ha senso (il DB la toglie insieme al giorno).
  const ora = c.pubblicazione_prevista ? oraBreve(c.ora_prevista) : null;
  const titolo = [ora, c.titolo, stato ? ETICHETTA_STATO_CONTENUTO[stato] : null, tipologia?.nome].filter(Boolean).join(" · ");

  function handleDragStart(e: DragEvent<HTMLButtonElement>) {
    e.dataTransfer.setData("text/plain", c.id);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <button
      type="button"
      draggable
      onDragStart={handleDragStart}
      onClick={(e) => {
        // Il giorno sotto apre il menu «nuovo»: il clic sulla card non deve arrivarci.
        e.stopPropagation();
        onApri(c);
      }}
      title={titolo}
      style={tipologia ? stileTinta(tipologia.colore) : undefined}
      className="flex w-full cursor-grab items-stretch gap-1.5 rounded-md border bg-card py-1 pr-1.5 pl-1 text-left text-xs leading-tight shadow-xs transition-[box-shadow,filter] hover:shadow-sm hover:brightness-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:cursor-grabbing"
    >
      <span
        aria-hidden
        className={cn("w-1 shrink-0 rounded-full", !tipologia && "bg-muted-foreground/30")}
        style={tipologia ? { backgroundColor: tipologia.colore } : undefined}
      />
      <span className="grid min-w-0 flex-1 gap-1">
        <span className="line-clamp-2 font-medium text-foreground">
          {ora ? <span className="figure mr-1 font-semibold">{ora}</span> : null}
          {c.titolo}
        </span>
        <span className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
          {tipologia ? <EtichettaTipologia tipologia={tipologia} piccola /> : null}
          <PuntoStato stato={c.stato} />
          {c.script ? (
            <Segno titolo="Script scritto">
              <FileText className="size-3" aria-hidden />
            </Segno>
          ) : null}
          {c.drive_url ? (
            <Segno titolo="Materiale su Drive">
              <FolderOpen className="size-3" aria-hidden />
            </Segno>
          ) : null}
          {c.stato === "pubblicato" ? (
            <Segno titolo="Pubblicato">
              <CheckCircle2 className="size-3 text-status-active" aria-hidden />
            </Segno>
          ) : null}
        </span>
      </span>
    </button>
  );
}
