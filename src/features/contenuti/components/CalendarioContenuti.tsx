import { useMemo, useState, type DragEvent } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { it } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { ETICHETTA_STATO_CONTENUTO, mappaTipologie, STATO_CONTENUTO_KEYS, type Contenuto, type StatoContenuto, type Tipologia } from "../types";
import { AgendaContenuti, RigaAgenda } from "./AgendaContenuti";
import { ChipCalendario } from "./ChipCalendario";
import { EtichettaTipologia } from "./EtichettaTipologia";
import { GiornoCalendario } from "./GiornoCalendario";
import { PuntoStato } from "./PuntoStato";

interface CalendarioContenutiProps {
  contenuti: Contenuto[];
  /** Le tipologie che l'utente vede: colore e nome nelle card, legenda. */
  tipologie: Tipologia[];
  onApri: (c: Contenuto) => void;
  /** Nuova data prevista ("YYYY-MM-DD") o null se trascinato in "Senza data". */
  onRipianifica: (id: string, data: string | null) => void;
  /** Nuovo contenuto nel giorno toccato, come script o come video. */
  onNuovo: (data: string, stato: StatoContenuto) => void;
}

const LUNEDI = { weekStartsOn: 1 } as const;
const ISO = "yyyy-MM-dd";

/** Data con cui il contenuto si colloca nel calendario: prevista, altrimenti quella reale. */
function dataDi(c: Contenuto): string | null {
  return c.pubblicazione_prevista ?? c.pubblicato_il;
}

/**
 * Vista mensile: i contenuti nel giorno previsto, un giorno si tocca per
 * aggiungere uno script o un video, le card si trascinano per ripianificare.
 * Sotto md: elenco dei giorni con la data da cambiare.
 */
export function CalendarioContenuti({ contenuti, tipologie, onApri, onRipianifica, onNuovo }: CalendarioContenutiProps) {
  const [mese, setMese] = useState(() => startOfMonth(new Date()));
  const mappa = useMemo(() => mappaTipologie(tipologie), [tipologie]);
  const [sopra, setSopra] = useState<string | null>(null);

  const giorni = useMemo(
    () => eachDayOfInterval({ start: startOfWeek(mese, LUNEDI), end: endOfWeek(endOfMonth(mese), LUNEDI) }),
    [mese],
  );

  const { perGiorno, senzaData } = useMemo(() => {
    const mappa = new Map<string, Contenuto[]>();
    const liberi: Contenuto[] = [];
    for (const c of contenuti) {
      const d = dataDi(c);
      if (!d) {
        liberi.push(c);
        continue;
      }
      mappa.set(d, [...(mappa.get(d) ?? []), c]);
    }
    return { perGiorno: mappa, senzaData: liberi };
  }, [contenuti]);

  function accetta(e: DragEvent<HTMLElement>, chiave: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (sopra !== chiave) setSopra(chiave);
  }

  function rilascia(e: DragEvent<HTMLElement>, data: string | null) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const attuale = contenuti.find((c) => c.id === id);
    if (attuale && attuale.pubblicazione_prevista !== data) onRipianifica(id, data);
    setSopra(null);
  }

  const titoloMese = format(mese, "LLLL yyyy", { locale: it });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
      <section aria-label="Calendario dei contenuti" className="grid gap-3">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-2xl font-semibold capitalize">{titoloMese}</h3>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => setMese(startOfMonth(new Date()))}>
              Oggi
            </Button>
            <Button size="icon" variant="outline" aria-label="Mese precedente" onClick={() => setMese((m) => addMonths(m, -1))}>
              <ChevronLeft aria-hidden />
            </Button>
            <Button size="icon" variant="outline" aria-label="Mese successivo" onClick={() => setMese((m) => addMonths(m, 1))}>
              <ChevronRight aria-hidden />
            </Button>
          </div>
        </header>

        {/* Legende (solo con la griglia): il pallino è la fase, la barra della card è il colore della tipologia. */}
        <div className="hidden gap-1 text-xs text-muted-foreground md:grid">
          <ul aria-label="Fasi del workflow" className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <li className="eyebrow text-[12px]">Fase</li>
            {STATO_CONTENUTO_KEYS.map((s) => (
              <li key={s} className="flex items-center gap-1.5">
                <PuntoStato stato={s} />
                {ETICHETTA_STATO_CONTENUTO[s]}
              </li>
            ))}
          </ul>
          {tipologie.length > 0 ? (
            <ul aria-label="Tipologie dei contenuti" className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <li className="eyebrow text-[12px]">Tipologia</li>
              {tipologie.map((t) => (
                <li key={t.id} className="flex items-center">
                  <EtichettaTipologia tipologia={t} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* La chiave rimette il giorno proposto per il nuovo contenuto quando cambia il mese. */}
        <AgendaContenuti key={format(mese, "yyyy-MM")} mese={mese} perGiorno={perGiorno} onApri={onApri} onRipianifica={onRipianifica} onNuovo={onNuovo} />

        <div className="hidden md:block md:overflow-x-auto">
          <div className="grid min-w-[720px] grid-cols-7 overflow-hidden rounded-lg border bg-border gap-px">
            {giorni.slice(0, 7).map((g) => (
              <div key={g.toISOString()} className="eyebrow bg-muted px-2 py-1.5 text-center text-[12px]">
                {format(g, "EEE", { locale: it })}
              </div>
            ))}
            {giorni.map((g) => {
              const chiave = format(g, ISO);
              return (
                <GiornoCalendario
                  key={chiave}
                  giorno={g}
                  chiave={chiave}
                  nelMese={isSameMonth(g, mese)}
                  lista={perGiorno.get(chiave) ?? []}
                  tipologie={mappa}
                  bersaglio={sopra === chiave}
                  onApri={onApri}
                  onNuovo={onNuovo}
                  onDragOver={(e) => accetta(e, chiave)}
                  onDragLeave={() => setSopra((s) => (s === chiave ? null : s))}
                  onDrop={(e) => rilascia(e, chiave)}
                />
              );
            })}
          </div>
        </div>
      </section>

      <aside
        aria-label="Contenuti senza data"
        onDragOver={(e) => accetta(e, "senza-data")}
        onDragLeave={() => setSopra((s) => (s === "senza-data" ? null : s))}
        onDrop={(e) => rilascia(e, null)}
        className={cn(
          "flex flex-col gap-2 rounded-lg border border-dashed bg-muted/40 p-3 transition-colors",
          sopra === "senza-data" && "border-primary bg-sidebar-accent",
        )}
      >
        <h3 className="eyebrow text-[12px]">Senza data · {senzaData.length}</h3>
        {senzaData.length === 0 ? (
          <p className="text-xs text-muted-foreground">Tutti i contenuti hanno una data. Trascina qui per toglierla.</p>
        ) : (
          <>
            {/* Sul telefono, al posto del trascinamento, la data si sceglie dalla riga. */}
            <div className="contents md:hidden">
              {senzaData.map((c) => (
                <RigaAgenda key={c.id} c={c} onApri={onApri} onRipianifica={onRipianifica} />
              ))}
            </div>
            <div className="hidden md:contents">
              {senzaData.map((c) => (
                <ChipCalendario key={c.id} c={c} tipologia={c.tipologia_id ? (mappa.get(c.tipologia_id) ?? null) : null} onApri={onApri} />
              ))}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
