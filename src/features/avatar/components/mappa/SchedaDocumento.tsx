import type { ReactNode } from "react";
import { ChevronDown, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  contaVere,
  MIN_VERE,
  SEZIONI_ESSENZIALI,
  SEZIONI_RESTO,
  titoloScheda,
  valoreA,
  type Coppia,
  type Parte,
  type SchedaAvatar,
  type SezioneScheda,
  type Spunta,
  type Voce,
} from "../../mappa";
import type { Modifica } from "../../hooks/useMappaAvatar";
import { PuntoIpotesi, RigaAvatar, RigaSpunta, type Correzione } from "./RigaAvatar";

interface SchedaDocumentoProps {
  scheda: SchedaAvatar;
  stato: string;
  onModifica?: (m: Modifica) => void;
  occupato?: boolean;
  /** A tutta larghezza le sezioni vanno su due colonne. */
  ampia?: boolean;
  /** Team: «Tutta la scheda» parte aperta. */
  apertaTutta?: boolean;
}

const testoVoce = (v: Voce) => (v.o === "vera" ? `«${v.t.replace(/^[«"“]+|[»"”]+$/g, "")}»` : v.t);
const pieno = (v: unknown) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);

function ParteScheda({ parte, contenuto, c }: { parte: Parte; contenuto: unknown; c: Correzione }) {
  const v = valoreA(contenuto, parte.percorso);
  if (!pieno(v)) return null;
  let corpo: ReactNode = null;
  if (parte.tipo === "testo" && typeof v === "string") {
    corpo = (
      <RigaAvatar percorso={parte.percorso} valori={[v]} semplice {...c}>
        <p className="text-[15px] leading-relaxed">{v}</p>
      </RigaAvatar>
    );
  } else if (parte.tipo === "voce") {
    const x = v as Voce;
    corpo = (
      <RigaAvatar percorso={parte.percorso} origine={x.o} valori={[x.t]} {...c}>
        <p className="text-[15px] leading-relaxed">{testoVoce(x)}</p>
      </RigaAvatar>
    );
  } else if (parte.tipo === "voci") {
    corpo = (
      <ul className="grid gap-1">
        {(v as Voce[]).map((x, i) => (
          <li key={i}>
            <RigaAvatar percorso={`${parte.percorso}.${i}`} origine={x.o} valori={[x.t]} {...c}>
              <p className="text-[15px] leading-relaxed">{testoVoce(x)}</p>
            </RigaAvatar>
          </li>
        ))}
      </ul>
    );
  } else if (parte.tipo === "coppie") {
    // Una coppia = due righe: la prima normale, la seconda grigia con la freccia. Le etichette una volta sola.
    corpo = (
      <ul className="grid gap-2.5">
        {(v as Coppia[]).map((x, i) => (
          <li key={i}>
            <RigaAvatar percorso={`${parte.percorso}.${i}`} origine={x.o} valori={[x.a, x.b]} chiavi={["a", "b"]} etichette={[parte.a ?? "", parte.b ?? ""]} {...c}>
              <p className="text-[15px] leading-relaxed">{x.a}</p>
              <p className="text-[14px] leading-relaxed text-muted-foreground">→ {x.b}</p>
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
  const etichetta = parte.etichetta ?? (parte.tipo === "coppie" && parte.a && parte.b ? `${parte.a} → ${parte.b}` : null);
  return (
    <div className="grid gap-1">
      {etichetta ? <p className="text-[13px] text-muted-foreground">{etichetta}</p> : null}
      {corpo}
    </div>
  );
}

function Sezioni({ sezioni, contenuto, c, colonne }: { sezioni: SezioneScheda[]; contenuto: unknown; c: Correzione; colonne: boolean }) {
  return (
    <div className={cn(colonne ? "gap-x-12 lg:columns-2" : "grid gap-6")}>
      {sezioni.map((s) => (
        <section key={s.titolo} className={cn("grid content-start gap-2 break-inside-avoid", colonne && "mb-7")}>
          <h4 className="text-[13px] font-semibold text-foreground">{s.titolo}</h4>
          {s.parti.map((p) => (
            <ParteScheda key={p.percorso} parte={p} contenuto={contenuto} c={c} />
          ))}
        </section>
      ))}
    </div>
  );
}

const scritte = (sezioni: SezioneScheda[], contenuto: unknown) => sezioni.filter((s) => s.parti.some((p) => pieno(valoreA(contenuto, p.percorso))));

/**
 * La scheda di un avatar (26/11/2026, «solo il necessario»): in testa nome, età e situazione;
 * sotto le sei sezioni che servono per fare i contenuti; il resto del documento di Wesley
 * piegato in «Tutta la scheda». Le ipotesi di Aura hanno un pallino, le righe vere le virgolette.
 */
export function SchedaDocumento({ scheda, stato, onModifica, occupato, ampia = false, apertaTutta = false }: SchedaDocumentoProps) {
  const c: Correzione = { onModifica: onModifica ? (m) => onModifica({ dove: scheda.ordine, ...m }) : undefined, occupato };
  const k = scheda.contenuto;
  const vere = contaVere(k);
  const essenziali = scritte(SEZIONI_ESSENZIALI, k);
  const resto = scritte(SEZIONI_RESTO, k);
  const situazione = k.situazione ?? scheda.partenza.situazione;
  const haIpotesi = JSON.stringify(k).includes('"o":"lettura"');

  return (
    <article aria-label={`Scheda di ${titoloScheda(scheda)}`} className="overflow-hidden rounded-lg border bg-card">
      <header className="grid gap-1.5 border-b px-5 py-5">
        <h3 className="flex flex-wrap items-center gap-x-2 text-[24px] leading-tight font-bold">
          {titoloScheda(scheda)}
          {k.eta ? <span className="text-[18px] font-normal text-muted-foreground">{k.eta}</span> : null}
          {scheda.principale ? <Star className="size-4 fill-current text-foreground" aria-label="Avatar principale" /> : null}
        </h3>
        {situazione ? (
          <RigaAvatar percorso="situazione" origine={situazione.o} valori={[situazione.t]} {...c}>
            <p className="text-[15px] leading-relaxed text-muted-foreground">{situazione.t}</p>
          </RigaAvatar>
        ) : null}
        {stato === "rivista" ? <p className="text-[13px] font-medium text-status-active">Rivista da Wesley</p> : null}
      </header>

      {essenziali.length === 0 && resto.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">La scheda si scrive dopo la mappa: Aura parte dall'avatar principale.</p>
      ) : (
        <div className="grid gap-6 px-5 py-5">
          {haIpotesi ? (
            <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <PuntoIpotesi className="mt-0" />
              {vere < MIN_VERE ? "Scheda in gran parte costruita da Aura: " : ""}
              {onModifica ? "le righe col pallino sono ipotesi, toccale per correggerle." : "le righe col pallino sono ipotesi di Aura."}
            </p>
          ) : null}
          <Sezioni sezioni={essenziali} contenuto={k} c={c} colonne={ampia} />
          {resto.length > 0 ? (
            <details className="group/tutta border-t pt-4" open={apertaTutta}>
              <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[14px] font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                <ChevronDown className="size-4 transition-transform group-open/tutta:rotate-180" aria-hidden />
                Tutta la scheda
              </summary>
              <div className="pt-5">
                <Sezioni sezioni={resto} contenuto={k} c={c} colonne={ampia} />
              </div>
            </details>
          ) : null}
        </div>
      )}
    </article>
  );
}
