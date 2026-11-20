import type { DragEvent } from "react";
import { ETICHETTA_STATO_CONTENUTO, eStatoContenuto, type Contenuto, type Tipologia } from "../types";
import { CLASSE_CARTA, stileCarta } from "../colore";
import { cn } from "@/lib/utils";
import { EtichettaTipologia } from "./EtichettaTipologia";
import { PillolaStato } from "./PuntoStato";

interface ChipCalendarioProps {
  c: Contenuto;
  /** La tipologia del contenuto (risolta da `tipologia_id`), se ne ha una. */
  tipologia: Tipologia | null;
  onApri: (c: Contenuto) => void;
}

/**
 * Un contenuto dentro un giorno del calendario, minimal: la card è tinta del COLORE DELLA
 * TIPOLOGIA, il titolo e sotto, ognuna sulla sua riga, le pillole di tipologia e fase.
 * Si trascina su un altro giorno e si apre con un clic.
 */
export function ChipCalendario({ c, tipologia, onApri }: ChipCalendarioProps) {
  const stato = eStatoContenuto(c.stato) ? c.stato : null;
  const titolo = [c.titolo, stato ? ETICHETTA_STATO_CONTENUTO[stato] : null, tipologia?.nome].filter(Boolean).join(" · ");

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
      style={tipologia ? stileCarta(tipologia.colore) : undefined}
      className={cn(
        "grid w-full min-w-0 cursor-grab grid-cols-[minmax(0,1fr)] justify-items-start gap-1.5 rounded-lg px-2 py-1.5 text-left transition-[filter] hover:brightness-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:cursor-grabbing dark:hover:brightness-110",
        tipologia ? CLASSE_CARTA : "bg-muted",
      )}
    >
      {/* Sempre su più righe, uguale per tutte le card: titolo su UNA riga (se è lungo finisce con «…»), tipologia, fase. Niente orario. */}
      <span className="block w-full truncate text-[13px] leading-snug font-semibold text-foreground">{c.titolo}</span>
      {tipologia ? <EtichettaTipologia tipologia={tipologia} piccola className="w-fit" /> : null}
      {stato ? <PillolaStato stato={stato} className="w-fit" /> : null}
    </button>
  );
}
