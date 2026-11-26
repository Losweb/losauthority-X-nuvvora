import type { ReactNode } from "react";
import { AlertTriangle, Star } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/lib/utils";
import { contaVere, MIN_VERE, SEZIONI_SCHEDA, titoloScheda, valoreA, type Coppia, type Parte, type SchedaAvatar, type Spunta, type Voce } from "../../mappa";
import type { Modifica } from "../../hooks/useMappaAvatar";
import { RigaAvatar, RigaSpunta, type Correzione } from "./RigaAvatar";

interface SchedaDocumentoProps {
  scheda: SchedaAvatar;
  stato: string;
  onModifica?: (m: Modifica) => void;
  occupato?: boolean;
  /** A tutta larghezza le sezioni vanno su due colonne. */
  ampia?: boolean;
}

const testoVoce = (v: Voce) => (v.o === "vera" ? `«${v.t.replace(/^[«"“]+|[»"”]+$/g, "")}»` : v.t);

function ParteScheda({ parte, contenuto, c }: { parte: Parte; contenuto: unknown; c: Correzione }) {
  const v = valoreA(contenuto, parte.percorso);
  if (v === undefined || v === null || (Array.isArray(v) && v.length === 0)) return null;
  let corpo: ReactNode = null;
  if (parte.tipo === "testo" && typeof v === "string") {
    corpo = (
      <RigaAvatar percorso={parte.percorso} valori={[v]} semplice {...c}>
        <p className="text-[14px] leading-snug">{v}</p>
      </RigaAvatar>
    );
  } else if (parte.tipo === "voce") {
    const x = v as Voce;
    corpo = (
      <RigaAvatar percorso={parte.percorso} origine={x.o} valori={[x.t]} {...c}>
        <p className="text-[14px] leading-snug">{testoVoce(x)}</p>
      </RigaAvatar>
    );
  } else if (parte.tipo === "voci") {
    corpo = (
      <ul className="grid gap-1.5">
        {(v as Voce[]).map((x, i) => (
          <li key={i}>
            <RigaAvatar percorso={`${parte.percorso}.${i}`} origine={x.o} valori={[x.t]} {...c}>
              <p className="text-[14px] leading-snug">{testoVoce(x)}</p>
            </RigaAvatar>
          </li>
        ))}
      </ul>
    );
  } else if (parte.tipo === "coppie") {
    corpo = (
      <ul className="grid gap-2">
        {(v as Coppia[]).map((x, i) => (
          <li key={i} className="rounded-md bg-surface p-2.5">
            <RigaAvatar percorso={`${parte.percorso}.${i}`} origine={x.o} valori={[x.a, x.b]} chiavi={["a", "b"]} etichette={[parte.a ?? "", parte.b ?? ""]} {...c}>
              <dl className="grid gap-1 text-[14px] leading-snug sm:grid-cols-2 sm:gap-3">
                <div>
                  <dt className="text-[12px] text-muted-foreground">{parte.a}</dt>
                  <dd>{x.a}</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-muted-foreground">{parte.b}</dt>
                  <dd>{x.b}</dd>
                </div>
              </dl>
            </RigaAvatar>
          </li>
        ))}
      </ul>
    );
  } else if (parte.tipo === "spunte") {
    corpo = (
      <div className="grid gap-2">
        {(v as Spunta[]).map((x, i) => (
          <RigaSpunta key={i} percorso={`${parte.percorso}.${i}`} testo={x.t} fatto={x.fatto} {...c} />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-1.5">
      {parte.etichetta ? <p className="text-[12px] font-medium text-muted-foreground">{parte.etichetta}</p> : null}
      {corpo}
    </div>
  );
}

/** La scheda di un avatar, sezione per sezione come nel documento di Wesley. Si legge da sola. */
export function SchedaDocumento({ scheda, stato, onModifica, occupato, ampia = false }: SchedaDocumentoProps) {
  const c: Correzione = { onModifica: onModifica ? (m) => onModifica({ dove: scheda.ordine, ...m }) : undefined, occupato };
  const vere = contaVere(scheda.contenuto);
  const sezioni = SEZIONI_SCHEDA.filter((s) => s.parti.some((p) => {
    const v = valoreA(scheda.contenuto, p.percorso);
    return v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0);
  }));

  return (
    <article aria-label={`Scheda di ${titoloScheda(scheda)}`} className="overflow-hidden rounded-lg border bg-card shadow-xs">
      <header className="grid gap-2 border-b px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="figure text-[12px] text-muted-foreground">Avatar {scheda.ordine}</span>
          {scheda.principale ? (
            <Badge variant="action">
              <Star aria-hidden /> Principale
            </Badge>
          ) : null}
          <Badge variant={stato === "rivista" ? "active" : "neutral"} dot>
            {stato === "rivista" ? "Rivista da Wesley" : "Bozza"}
          </Badge>
        </div>
        <h3 className="text-[22px] leading-tight font-bold">
          {titoloScheda(scheda)}
          {scheda.contenuto.eta ? <span className="font-normal text-muted-foreground"> · {scheda.contenuto.eta}</span> : null}
        </h3>
      </header>

      {vere < MIN_VERE ? (
        <div className="flex gap-2.5 border-b border-status-expiring/30 bg-status-expiring-soft px-5 py-3 text-[14px] text-status-expiring">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Questa scheda è in gran parte costruita: {vere === 0 ? "non ci sono ancora frasi vere" : vere === 1 ? "c'è una sola frase vera" : `ci sono solo ${vere} frasi vere`}. Le righe «ipotesi» le ha proposte Aura: confermale o correggile.
          </p>
        </div>
      ) : null}

      {sezioni.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">La scheda si scrive dopo la mappa: Aura parte dall'avatar principale.</p>
      ) : (
        <div className={cn("px-5 py-5", ampia ? "gap-x-10 lg:columns-2" : "grid gap-6")}>
          {sezioni.map((s) => (
            <section key={s.titolo} className={cn("grid content-start gap-2.5 break-inside-avoid", ampia && "mb-7")}>
              <h4 className="eyebrow">{s.titolo}</h4>
              {s.parti.map((p) => (
                <ParteScheda key={p.percorso} parte={p} contenuto={scheda.contenuto} c={c} />
              ))}
            </section>
          ))}
        </div>
      )}
    </article>
  );
}
