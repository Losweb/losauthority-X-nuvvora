import { useMemo, useState } from "react";
import { ChevronDown, FileText, FolderOpen, Instagram, Music2, Plus, Search, Youtube, type LucideIcon } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { Input } from "@/shared/components/ui/input";
import { formatDateShort } from "@/shared/utils/formatDate";
import { cn } from "@/lib/utils";
import {
  CAMPO_PIATTAFORMA,
  ETICHETTA_PIATTAFORMA_CONTENUTO,
  ETICHETTA_STATO_CONTENUTO,
  oraBreve,
  PIATTAFORME_CONTENUTO,
  STATO_CONTENUTO_KEYS,
  type Contenuto,
  type ContenutoPredefiniti,
  type PiattaformaContenuto,
  type StatoContenuto,
  type Tipologia,
} from "../types";
import { EtichettaTipologia } from "./EtichettaTipologia";
import { PillolaStato, PuntoStato } from "./PuntoStato";

/** lucide non ha TikTok: la nota musicale, come in Pubblicazioni. */
const ICONA: Record<PiattaformaContenuto, LucideIcon> = { tiktok: Music2, instagram: Instagram, youtube: Youtube };

interface TabellaContenutiProps {
  contenuti: Contenuto[];
  /** id → tipologia, per la pillola colorata. */
  tipologie: Map<string, Tipologia>;
  onApri: (c: Contenuto) => void;
  onSposta: (id: string, stato: StatoContenuto) => void;
  onNuovo: (predefiniti?: ContenutoPredefiniti) => void;
}

/** Colonne della griglia da md: titolo · tipologia · fase · data · social · materiale. */
const COLONNE = "md:grid md:grid-cols-[minmax(0,1fr)_150px_170px_130px_84px_52px] md:items-center md:gap-4";

/**
 * Vista «Tabella» del Workflow: i contenuti raggruppati per fase (sezioni che si chiudono),
 * una riga per video con tipologia, fase cambiabile dalla riga, data prevista, stato sui tre
 * social e cosa c'è già (script, Drive). Una ricerca filtra per titolo. Sul telefono ogni riga
 * diventa una card compatta con le stesse informazioni.
 */
export function TabellaContenuti({ contenuti, tipologie, onApri, onSposta, onNuovo }: TabellaContenutiProps) {
  const [cerca, setCerca] = useState("");
  const [chiusi, setChiusi] = useState<Set<StatoContenuto>>(() => new Set());

  const perStato = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    const mappa = new Map<StatoContenuto, Contenuto[]>(STATO_CONTENUTO_KEYS.map((s) => [s, []]));
    for (const c of contenuti) {
      if (q && !c.titolo.toLowerCase().includes(q)) continue;
      mappa.get(c.stato as StatoContenuto)?.push(c);
    }
    // Dentro la fase: prima quelli con la data più vicina, poi quelli senza data.
    for (const lista of mappa.values()) lista.sort(perData);
    return mappa;
  }, [contenuti, cerca]);

  function alterna(stato: StatoContenuto) {
    setChiusi((prima) => {
      const dopo = new Set(prima);
      if (dopo.has(stato)) dopo.delete(stato);
      else dopo.add(stato);
      return dopo;
    });
  }

  return (
    <div className="grid gap-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Cerca un video per titolo…" aria-label="Cerca nei contenuti" className="pl-9" />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        {/* Intestazione delle colonne, solo da md (sul telefono le righe sono card). */}
        <div className={cn("hidden border-b border-line px-4 py-2.5 text-[12px] font-medium tracking-wide text-muted-foreground uppercase", COLONNE)}>
          <span>Video</span>
          <span>Tipologia</span>
          <span>Fase</span>
          <span>Pubblicazione</span>
          <span>Social</span>
          <span className="text-right">Mat.</span>
        </div>

        {STATO_CONTENUTO_KEYS.map((stato) => {
          const lista = perStato.get(stato) ?? [];
          const chiuso = chiusi.has(stato);
          return (
            <section key={stato} aria-label={ETICHETTA_STATO_CONTENUTO[stato]} className="border-b border-line last:border-b-0">
              <div className="flex items-center justify-between gap-2 bg-muted/40 px-4 py-2">
                <button
                  type="button"
                  onClick={() => alterna(stato)}
                  aria-expanded={!chiuso}
                  className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground pointer-coarse:min-h-9"
                >
                  <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", chiuso && "-rotate-90")} aria-hidden />
                  <PuntoStato stato={stato} />
                  {ETICHETTA_STATO_CONTENUTO[stato]}
                  <span className="figure rounded-full bg-background px-1.5 text-[12px] font-medium text-muted-foreground">{lista.length}</span>
                </button>
                <Button size="xs" variant="ghost" className="text-muted-foreground" onClick={() => onNuovo({ stato })} aria-label={`Nuova idea in ${ETICHETTA_STATO_CONTENUTO[stato]}`}>
                  <Plus aria-hidden /> <span className="hidden sm:inline">Aggiungi</span>
                </Button>
              </div>

              {!chiuso ? (
                lista.length === 0 ? (
                  <p className="px-4 py-3 text-[13px] text-muted-foreground">{cerca ? "Nessun video con questo titolo." : "Nessun video in questa fase."}</p>
                ) : (
                  <ul>
                    {lista.map((c) => (
                      <RigaContenuto
                        key={c.id}
                        c={c}
                        tipologia={c.tipologia_id ? (tipologie.get(c.tipologia_id) ?? null) : null}
                        onApri={onApri}
                        onSposta={(nuovo) => {
                          if (nuovo !== c.stato) onSposta(c.id, nuovo);
                        }}
                      />
                    ))}
                  </ul>
                )
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Prima la data più vicina; i contenuti senza data in fondo. */
function perData(a: Contenuto, b: Contenuto): number {
  const da = a.pubblicazione_prevista ?? a.pubblicato_il;
  const db = b.pubblicazione_prevista ?? b.pubblicato_il;
  if (da && db) return da.localeCompare(db) || (a.ora_prevista ?? "").localeCompare(b.ora_prevista ?? "");
  if (da) return -1;
  if (db) return 1;
  return 0;
}

function RigaContenuto({ c, tipologia, onApri, onSposta }: { c: Contenuto; tipologia: Tipologia | null; onApri: (c: Contenuto) => void; onSposta: (s: StatoContenuto) => void }) {
  const data = c.pubblicato_il ?? c.pubblicazione_prevista;
  const ora = !c.pubblicato_il ? oraBreve(c.ora_prevista) : null;

  return (
    <li
      onClick={() => onApri(c)}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onApri(c);
        }
      }}
      tabIndex={0}
      aria-label={`Apri «${c.titolo}»`}
      className={cn(
        "grid cursor-pointer gap-2 border-t border-line px-4 py-3 transition-colors first:border-t-0 hover:bg-muted/40 focus-visible:bg-muted/50 focus-visible:outline-none",
        COLONNE,
      )}
    >
      <span className="min-w-0 truncate text-[14px] font-medium text-foreground" title={c.titolo}>
        {c.titolo}
      </span>

      {/* Sul telefono tipologia, fase e data stanno su una riga sotto il titolo. */}
      <span className="flex min-w-0 flex-wrap items-center gap-1.5 md:contents">
        <span className="min-w-0">{tipologia ? <EtichettaTipologia tipologia={tipologia} /> : <span className="text-[13px] text-muted-foreground max-md:hidden">—</span>}</span>

        {/* La fase si cambia da qui; il wrapper ferma il clic (anche dal portal del menu). */}
        <span className="min-w-0" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="inline-flex max-w-full items-center gap-1 rounded-full transition-colors hover:brightness-95 focus-visible:outline-2 focus-visible:outline-ring"
                  aria-label={`Fase di «${c.titolo}»: ${ETICHETTA_STATO_CONTENUTO[c.stato as StatoContenuto] ?? c.stato}. Cambia`}
                />
              }
            >
              <PillolaStato stato={c.stato} className="bg-muted" />
              <ChevronDown className="size-3 shrink-0 text-muted-foreground" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-auto min-w-52">
              {STATO_CONTENUTO_KEYS.map((s) => (
                <DropdownMenuItem key={s} className="gap-2 py-2" disabled={s === c.stato} onClick={() => onSposta(s)}>
                  <PuntoStato stato={s} />
                  {ETICHETTA_STATO_CONTENUTO[s]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </span>

        <span className={cn("figure text-[13px]", data ? "text-foreground" : "text-muted-foreground", c.pubblicato_il && "text-status-active")}>
          {data ? formatDateShort(data) : <span className="max-md:hidden">Senza data</span>}
          {ora ? <span className="text-muted-foreground"> · {ora}</span> : null}
        </span>
      </span>

      <span className="flex items-center gap-3 md:contents">
        <span className="flex items-center gap-1.5">
          {PIATTAFORME_CONTENUTO.map((p) => {
            const Icona = ICONA[p];
            const programmato = c[CAMPO_PIATTAFORMA[p]] === "programmato";
            const etichetta = `${ETICHETTA_PIATTAFORMA_CONTENUTO[p]}: ${programmato ? "programmato" : "da programmare"}`;
            return (
              <span key={p} title={etichetta} className={cn("inline-flex", programmato ? "text-status-active" : "text-muted-foreground")}>
                <Icona className="size-4" aria-hidden />
                <span className="sr-only">{etichetta}</span>
              </span>
            );
          })}
        </span>

        <span className="flex items-center gap-1.5 text-muted-foreground md:justify-end">
          <span title={c.script ? "Script scritto" : "Script da scrivere"} className={cn("inline-flex", !c.script && "opacity-30")}>
            <FileText className="size-4" aria-hidden />
            <span className="sr-only">{c.script ? "Script scritto" : "Script da scrivere"}</span>
          </span>
          {c.drive_url ? (
            <a
              href={c.drive_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Apri il materiale su Drive"
              className="inline-flex hover:text-foreground"
            >
              <FolderOpen className="size-4" aria-hidden />
              <span className="sr-only">Apri il materiale su Drive</span>
            </a>
          ) : (
            <span title="Nessun materiale su Drive" className="inline-flex opacity-30">
              <FolderOpen className="size-4" aria-hidden />
            </span>
          )}
        </span>
      </span>
    </li>
  );
}
