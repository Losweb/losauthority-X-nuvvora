import { useId, useState, type DragEvent } from "react";
import { format, isToday } from "date-fns";
import { it } from "date-fns/locale";
import { Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import type { Contenuto, StatoContenuto, Tipologia } from "../types";
import { ChipCalendario } from "./ChipCalendario";
import { MenuNuovoContenuto } from "./MenuNuovoContenuto";

interface GiornoCalendarioProps {
  giorno: Date;
  /** "YYYY-MM-DD" */
  chiave: string;
  nelMese: boolean;
  lista: Contenuto[];
  /** id → tipologia, per il colore e il nome nelle card. */
  tipologie: Map<string, Tipologia>;
  /** Una card è sopra questo giorno mentre la si trascina. */
  bersaglio: boolean;
  onApri: (c: Contenuto) => void;
  onNuovo: (data: string, stato: StatoContenuto) => void;
  onDragOver: (e: DragEvent<HTMLElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent<HTMLElement>) => void;
}

/**
 * Una cella del mese. Toccare il giorno (o il «+» che appare passando sopra)
 * apre il menu «Nuovo script / Nuovo video» con quella data già scelta; le
 * card dentro si aprono o si trascinano da sole.
 */
export function GiornoCalendario({ giorno, chiave, nelMese, lista, tipologie, bersaglio, onApri, onNuovo, onDragOver, onDragLeave, onDrop }: GiornoCalendarioProps) {
  const [menuAperto, setMenuAperto] = useState(false);
  const idTrigger = useId();
  const etichetta = format(giorno, "EEEE d MMMM", { locale: it });

  return (
    <div
      onClick={() => setMenuAperto(true)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "group/giorno flex min-h-28 cursor-pointer flex-col gap-1 p-1.5 transition-colors",
        nelMese ? "bg-card hover:bg-muted/40" : "bg-muted/40 text-muted-foreground hover:bg-muted/70",
        bersaglio && "bg-sidebar-accent",
      )}
    >
      <div className="flex items-center justify-between gap-1">
        {/* Il wrapper ferma il clic del «+»: altrimenti arriverebbe al giorno e riaprirebbe il menu appena chiuso. */}
        <span className="-m-1 flex" onClick={(e) => e.stopPropagation()}>
          <MenuNuovoContenuto
            data={chiave}
            open={menuAperto}
            onOpenChange={setMenuAperto}
            triggerId={idTrigger}
            onNuovo={onNuovo}
            trigger={
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label={`Aggiungi un contenuto ${etichetta}`}
                className="opacity-0 transition-opacity group-hover/giorno:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100 pointer-coarse:opacity-100"
              />
            }
          >
            <Plus aria-hidden />
          </MenuNuovoContenuto>
        </span>
        <span
          className={cn(
            "figure text-[12px] leading-none",
            isToday(giorno) && "rounded-full bg-primary px-1.5 py-1 text-primary-foreground",
          )}
        >
          {format(giorno, "d")}
        </span>
      </div>

      {lista.map((c) => (
        <ChipCalendario key={c.id} c={c} tipologia={c.tipologia_id ? (tipologie.get(c.tipologia_id) ?? null) : null} onApri={onApri} />
      ))}

      {bersaglio && lista.length === 0 ? (
        <p className="rounded-md border border-dashed border-primary/50 px-1 py-2 text-center text-xs text-muted-foreground">Rilascia qui</p>
      ) : null}
    </div>
  );
}
