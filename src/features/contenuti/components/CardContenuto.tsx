import type { DragEvent } from "react";
import { ArrowRightLeft, CalendarDays, CheckCircle2, FileText, FolderOpen, GripVertical, Link2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { formatDateShort } from "@/shared/utils/formatDate";
import { cn } from "@/lib/utils";
import { ETICHETTA_STATO_CONTENUTO, oraBreve, STATO_CONTENUTO_KEYS, type Contenuto, type StatoContenuto, type Tipologia } from "../types";
import { EtichettaTipologia } from "./EtichettaTipologia";
import { PuntoStato } from "./PuntoStato";

interface CardContenutoProps {
  contenuto: Contenuto;
  /** La tipologia del contenuto (risolta da `tipologia_id`), se ne ha una. */
  tipologia: Tipologia | null;
  inTrascinamento: boolean;
  onApri: (c: Contenuto) => void;
  /** Cambio di fase senza trascinare (menu «Sposta in…», solo sotto md). */
  onSposta: (stato: StatoContenuto) => void;
  onDragStart: (c: Contenuto) => void;
  onDragEnd: () => void;
}

/** Una idea di video: card trascinabile tra le colonne, clic per aprirla. */
export function CardContenuto({ contenuto: c, tipologia, inTrascinamento, onApri, onSposta, onDragStart, onDragEnd }: CardContenutoProps) {

  function handleDragStart(e: DragEvent<HTMLElement>) {
    e.dataTransfer.setData("text/plain", c.id);
    e.dataTransfer.effectAllowed = "move";
    onDragStart(c);
  }

  return (
    <article
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onApri(c)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onApri(c);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Apri "${c.titolo}"`}
      className={cn(
        "group grid cursor-grab gap-2 rounded-lg border bg-card p-3 text-left shadow-xs transition-[opacity,box-shadow,border-color] hover:border-input hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing",
        inTrascinamento && "opacity-40",
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 hidden size-4 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground md:block" aria-hidden />
        <p className="min-w-0 flex-1 text-sm leading-snug font-medium">{c.titolo}</p>
      </div>

      {tipologia ? <EtichettaTipologia tipologia={tipologia} className="w-fit" /> : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {c.pubblicato_il ? (
          <span className="inline-flex items-center gap-1 text-status-active">
            <CheckCircle2 className="size-3.5" aria-hidden />
            Pubblicato il {formatDateShort(c.pubblicato_il)}
          </span>
        ) : c.pubblicazione_prevista ? (
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" aria-hidden />
            Prevista {formatDateShort(c.pubblicazione_prevista)}
            {c.ora_prevista ? ` · ${oraBreve(c.ora_prevista)}` : null}
          </span>
        ) : null}
        {c.script ? (
          <span className="inline-flex items-center gap-1" title="Script scritto">
            <FileText className="size-3.5" aria-hidden />
            Script
          </span>
        ) : null}
        {c.riferimenti.length > 0 ? (
          <span className="inline-flex items-center gap-1" title="Link di riferimento">
            <Link2 className="size-3.5" aria-hidden />
            {c.riferimenti.length}
          </span>
        ) : null}
        {c.drive_url ? (
          <a
            href={c.drive_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
          >
            <FolderOpen className="size-3.5" aria-hidden />
            Drive
          </a>
        ) : null}
      </div>

      {/* Sul telefono il trascinamento non c'è: la fase si cambia da qui. Il wrapper ferma il click (anche dal portal). */}
      <div className="md:hidden" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button size="sm" variant="outline" aria-label={`Sposta "${c.titolo}" in un'altra fase`} />}>
            <ArrowRightLeft aria-hidden /> Sposta in…
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-auto min-w-52">
            {STATO_CONTENUTO_KEYS.filter((s) => s !== c.stato).map((s) => (
              <DropdownMenuItem key={s} className="gap-2 py-2.5" onClick={() => onSposta(s)}>
                <PuntoStato stato={s} />
                {ETICHETTA_STATO_CONTENUTO[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
