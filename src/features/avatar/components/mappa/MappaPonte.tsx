import type { ReactNode } from "react";
import { AlertTriangle, Star } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MappaAvatar, SchedaAvatar, Voce } from "../../mappa";
import type { Modifica } from "../../hooks/useMappaAvatar";
import { RigaAvatar, RigaSpunta } from "./RigaAvatar";

interface MappaPonteProps {
  mappa: MappaAvatar;
  schede: SchedaAvatar[];
  /** Il cliente corregge le righe; assente = sola lettura (team). */
  onModifica?: (m: Modifica) => void;
  occupato?: boolean;
}

function Vuoto({ testo }: { testo: string }) {
  return <p className="text-[13px] text-muted-foreground">{testo}</p>;
}

/** Le linee che dalle partenze scendono e si uniscono sul ponte (da md; sul telefono una linea sola). */
function Convergenza({ n }: { n: number }) {
  return (
    <>
      <div aria-hidden className="mx-auto h-6 w-px bg-line-strong md:hidden" />
      <svg aria-hidden viewBox="0 0 100 28" preserveAspectRatio="none" className="hidden h-7 w-full text-line-strong md:block">
        {Array.from({ length: n }, (_, i) => (
          <path key={i} d={`M ${((i + 0.5) * 100) / n} 0 C ${((i + 0.5) * 100) / n} 16, 50 12, 50 28`} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    </>
  );
}

/**
 * La mappa disegnata a ponte, non come elenco: le partenze in alto, il ponte
 * (cosa vende) al centro, l'arrivo in basso in evidenza. La principale è segnata.
 * Sotto: perché la principale, proporzione dei contenuti, chi resta fuori,
 * esempi per i video, da verificare.
 */
export function MappaPonte({ mappa, schede, onModifica, occupato }: MappaPonteProps) {
  const suMappa = onModifica ? (m: Omit<Modifica, "dove">) => onModifica({ dove: "mappa", ...m }) : undefined;
  const ordinate = [...schede].sort((a, b) => a.ordine - b.ordine);
  const n = Math.max(ordinate.length, 1);
  const riga = (v: Voce | null | undefined, percorso: string, onM = suMappa, compatta = false) =>
    v ? (
      <RigaAvatar percorso={percorso} origine={v.o} valori={[v.t]} onModifica={onM} occupato={occupato} compatta={compatta}>
        <p className="text-[14px] leading-snug">{v.t}</p>
      </RigaAvatar>
    ) : null;

  return (
    <section aria-label="La mappa" className="grid gap-4">
      {mappa.offerta_da_costruire ? (
        <div className="flex gap-2.5 rounded-lg border border-status-expiring/40 bg-status-expiring-soft p-3 text-[14px] text-status-expiring">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>Prima di scegliere a chi parlare serve sapere cosa vendi: l'ho segnalato a Wesley, l'offerta la costruite insieme.</p>
        </div>
      ) : null}

      {/* Le partenze */}
      <div>
        <p className="eyebrow mb-2">Da dove partono</p>
        {ordinate.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line p-4">
            <Vuoto testo="Le partenze arrivano dopo l'analisi: i gruppi di persone che partono da punti diversi per lo stesso arrivo." />
          </div>
        ) : (
          <ol className={cn("grid gap-3", ordinate.length === 2 && "md:grid-cols-2", ordinate.length === 3 && "md:grid-cols-3")}>
            {ordinate.map((s) => {
              const onP = onModifica ? (m: Omit<Modifica, "dove">) => onModifica({ dove: s.ordine, ...m }) : undefined;
              return (
                <li key={s.id} className={cn("grid content-start gap-2 rounded-lg border bg-card p-3 shadow-xs", s.principale ? "border-foreground/40 ring-1 ring-foreground/15" : "border-line")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="figure text-[12px] text-muted-foreground">Partenza {s.ordine}</span>
                    {s.principale ? (
                      <Badge variant="action">
                        <Star aria-hidden /> Principale
                      </Badge>
                    ) : null}
                  </div>
                  {s.partenza.situazione ? (
                    <RigaAvatar percorso="partenza.situazione" origine={s.partenza.situazione.o} valori={[s.partenza.situazione.t]} onModifica={onP} occupato={occupato} compatta>
                      <p className="text-[15px] leading-snug font-semibold">{s.partenza.situazione.t}</p>
                    </RigaAvatar>
                  ) : null}
                  {riga(s.partenza.descrizione, "partenza.descrizione", onP, true)}
                  {s.partenza.cosa_manca ? (
                    <div className="grid gap-1 border-t border-line pt-2">
                      <span className="text-[12px] font-medium text-muted-foreground">Gli manca</span>
                      {riga(s.partenza.cosa_manca, "partenza.cosa_manca", onP, true)}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <Convergenza n={n} />

      {/* Il ponte */}
      <div className="rounded-lg border border-line bg-surface p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="eyebrow">Il ponte · cosa vendi</p>
          {mappa.tipo ? <Badge variant="outline">{mappa.tipo === "prodotto" ? "Prodotto" : "Servizio"}</Badge> : null}
        </div>
        {mappa.ponte.length === 0 ? (
          <Vuoto testo="Si parte sempre da qui: cosa vendi, in due o tre passi." />
        ) : (
          <ol className="grid gap-2 md:grid-flow-col md:auto-cols-fr">
            {mappa.ponte.map((p, i) => (
              <li key={i} className="flex gap-2 rounded-md bg-card p-2.5">
                <span aria-hidden className="figure flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[12px] font-semibold">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">{riga(p, `ponte.${i}`, suMappa, true)}</div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div aria-hidden className="mx-auto h-6 w-px bg-line-strong" />

      {/* L'arrivo, in evidenza */}
      <div className="rounded-lg bg-primary p-4 text-primary-foreground shadow-sm">
        <p className="eyebrow mb-1.5 text-primary-foreground/70">Lo stesso arrivo</p>
        {mappa.arrivo ? (
          <div className="[&_button]:text-primary-foreground/80 [&_p]:text-[16px] [&_p]:font-semibold">{riga(mappa.arrivo, "arrivo")}</div>
        ) : (
          <p className="text-[14px] text-primary-foreground/70">Dove vuole arrivare chi compra, con le sue parole.</p>
        )}
      </div>

      <AltroMappa mappa={mappa} onModifica={suMappa} occupato={occupato} riga={riga} />
    </section>
  );
}

function AltroMappa({
  mappa,
  onModifica,
  occupato,
  riga,
}: {
  mappa: MappaAvatar;
  onModifica?: (m: Omit<Modifica, "dove">) => void;
  occupato?: boolean;
  riga: (v: Voce | null | undefined, percorso: string) => ReactNode;
}) {
  const blocchi = [
    mappa.principale_perche ? { titolo: "Perché questa è la principale", corpo: riga(mappa.principale_perche, "principale_perche") } : null,
    mappa.proporzione ? { titolo: "Quanti contenuti a ogni partenza", corpo: riga(mappa.proporzione, "proporzione") } : null,
    mappa.fuori.length > 0
      ? {
          titolo: "Chi resta fuori (per ora)",
          corpo: mappa.fuori.map((f, i) => (
            <RigaAvatar key={i} percorso={`fuori.${i}`} origine={f.o} valori={[f.chi, f.perche]} chiavi={["chi", "perche"]} etichette={["Chi", "Perché"]} onModifica={onModifica} occupato={occupato}>
              <p className="text-[14px] leading-snug font-medium">{f.chi}</p>
              {f.perche ? <p className="text-[13px] leading-snug text-muted-foreground">{f.perche}</p> : null}
            </RigaAvatar>
          )),
        }
      : null,
    mappa.esempi.length > 0
      ? {
          titolo: "Esempi per i video",
          corpo: mappa.esempi.map((e, i) => (
            <RigaAvatar key={i} percorso={`esempi.${i}`} origine={e.o} valori={[e.persona, e.frase]} chiavi={["persona", "frase"]} etichette={["Chi è", "La sua frase"]} onModifica={onModifica} occupato={occupato}>
              <p className="text-[14px] leading-snug font-medium">{e.persona}</p>
              <p className="text-[14px] leading-snug">{e.o === "vera" ? `«${e.frase.replace(/^[«"“]+|[»"”]+$/g, "")}»` : e.frase}</p>
            </RigaAvatar>
          )),
        }
      : null,
    mappa.da_verificare.length > 0
      ? {
          titolo: "Da verificare",
          corpo: mappa.da_verificare.map((d, i) => <RigaSpunta key={i} percorso={`da_verificare.${i}`} testo={d.t} fatto={d.fatto} onModifica={onModifica} occupato={occupato} />),
        }
      : null,
  ].filter((b): b is { titolo: string; corpo: ReactNode } => b !== null);
  if (blocchi.length === 0) return null;
  return (
    <div className="grid gap-4 pt-2">
      {blocchi.map((b) => (
        <div key={b.titolo} className="grid gap-2">
          <h4 className="eyebrow">{b.titolo}</h4>
          <div className="grid gap-2.5">{b.corpo}</div>
        </div>
      ))}
    </div>
  );
}
