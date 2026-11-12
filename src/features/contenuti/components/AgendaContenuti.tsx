import { useMemo, useState } from "react";
import { format, isSameMonth, isToday, parseISO, startOfMonth } from "date-fns";
import { it } from "date-fns/locale";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { oraBreve, type Contenuto, type StatoContenuto } from "../types";
import { MenuNuovoContenuto } from "./MenuNuovoContenuto";
import { PuntoStato } from "./PuntoStato";

const ISO = "yyyy-MM-dd";
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

interface RigaAgendaProps {
  c: Contenuto;
  onApri: (c: Contenuto) => void;
  onRipianifica: (id: string, data: string | null) => void;
}

/** Sul telefono: il contenuto (clic per aprirlo) e la data prevista, cambiabile senza trascinare. */
export function RigaAgenda({ c, onApri, onRipianifica }: RigaAgendaProps) {
  const ora = c.pubblicazione_prevista ? oraBreve(c.ora_prevista) : null;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onApri(c)}
        className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-md border bg-card px-3 py-2 text-left text-sm leading-snug hover:border-input"
      >
        <PuntoStato stato={c.stato} />
        <span className="line-clamp-2 min-w-0 flex-1">
          {ora ? <span className="figure mr-1 font-semibold">{ora}</span> : null}
          {c.titolo}
        </span>
        {c.script ? (
          <span title="Script scritto" className="inline-flex shrink-0 text-muted-foreground">
            <FileText className="size-3.5" aria-hidden />
            <span className="sr-only">Script scritto</span>
          </span>
        ) : null}
      </button>
      <Input
        type="date"
        value={c.pubblicazione_prevista ?? ""}
        aria-label={`Data prevista di "${c.titolo}"`}
        className="w-36 shrink-0"
        onChange={(e) => {
          const data = e.target.value || null;
          if (data !== c.pubblicazione_prevista) onRipianifica(c.id, data);
        }}
      />
    </div>
  );
}

interface AgendaContenutiProps {
  mese: Date;
  perGiorno: Map<string, Contenuto[]>;
  onApri: (c: Contenuto) => void;
  onRipianifica: (id: string, data: string | null) => void;
  onNuovo: (data: string, stato: StatoContenuto) => void;
}

/** Giorno proposto per un nuovo contenuto: oggi se siamo nel mese mostrato, altrimenti il primo del mese. */
function giornoProposto(mese: Date): string {
  const oggi = new Date();
  return format(isSameMonth(oggi, mese) ? oggi : startOfMonth(mese), ISO);
}

/** Il mese come elenco di giorni (solo sotto md, dove la griglia di 7 colonne non ci sta). */
export function AgendaContenuti({ mese, perGiorno, onApri, onRipianifica, onNuovo }: AgendaContenutiProps) {
  const [dataNuovo, setDataNuovo] = useState(() => giornoProposto(mese));
  const giorni = useMemo(
    () =>
      [...perGiorno.entries()]
        .filter(([chiave]) => isSameMonth(parseISO(chiave), mese))
        .sort(([a], [b]) => a.localeCompare(b)),
    [perGiorno, mese],
  );

  return (
    <div className="grid gap-4 md:hidden">
      {/* Sul telefono non c'è la griglia da toccare: il giorno si sceglie qui, poi Script o Video. */}
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={dataNuovo}
          aria-label="Giorno del nuovo contenuto"
          className="min-w-0 flex-1"
          onChange={(e) => setDataNuovo(e.target.value)}
        />
        <MenuNuovoContenuto data={dataNuovo} onNuovo={onNuovo} align="end" disabled={!DATA_ISO.test(dataNuovo)} trigger={<Button variant="outline" />}>
          <Plus aria-hidden /> Aggiungi
        </MenuNuovoContenuto>
      </div>

      {giorni.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">Nessun contenuto in questo mese.</p>
      ) : (
        <ol className="grid gap-4" aria-label="Contenuti del mese">
          {giorni.map(([chiave, lista]) => {
            const giorno = parseISO(chiave);
            const etichetta = format(giorno, "EEEE d MMMM", { locale: it });
            return (
              <li key={chiave} className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="eyebrow flex items-center gap-2 text-[12px]">
                    {etichetta}
                    {isToday(giorno) ? (
                      <span className="rounded-full bg-primary px-1.5 py-0.5 tracking-normal text-primary-foreground normal-case">Oggi</span>
                    ) : null}
                  </p>
                  <MenuNuovoContenuto
                    data={chiave}
                    onNuovo={onNuovo}
                    align="end"
                    trigger={<Button size="icon-xs" variant="ghost" aria-label={`Aggiungi un contenuto ${etichetta}`} />}
                  >
                    <Plus aria-hidden />
                  </MenuNuovoContenuto>
                </div>
                {lista.map((c) => (
                  <RigaAgenda key={c.id} c={c} onApri={onApri} onRipianifica={onRipianifica} />
                ))}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
