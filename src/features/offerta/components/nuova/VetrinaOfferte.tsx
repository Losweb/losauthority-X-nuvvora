import { ArrowRight } from "lucide-react";
import { RigaAvatar, type Correzione } from "@/features/avatar";
import { cn } from "@/lib/utils";
import { dividiPrezzo, ETICHETTA_VETRINA, type GradinoOfferta as Gradino, type OffertaNuova } from "../../nuova";

/**
 * La vetrina delle offerte (26/11/2026, richiesta di Wesley): a lavoro finito la pagina Offerta
 * mostra prima i gradini come schede «da negozio» (nome, cosa c'è dentro, prezzo); al clic si entra
 * nella singola offerta. La principale è evidenziata.
 */
export function VetrinaOfferte({ o, onApri }: { o: OffertaNuova; onApri: (indice: number) => void }) {
  const gradini = o.scheda?.gradini ?? [];
  return (
    <section aria-labelledby="titolo-vetrina" className="grid gap-4">
      <h2 id="titolo-vetrina" className="text-[18px] font-bold">
        Le tue offerte
      </h2>
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        {gradini.map((g, i) => {
          const principale = g.livello === "cuore";
          const { cifra, nota } = dividiPrezzo(g.prezzo);
          return (
            <li key={i} className="grid">
              <button
                type="button"
                onClick={() => onApri(i)}
                className={cn(
                  "group grid min-h-[210px] content-between gap-5 rounded-xl border bg-card p-5 text-left shadow-xs transition-all outline-none hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring",
                  principale && "border-foreground/25",
                )}
              >
                <div className="grid content-start gap-2">
                  <span className={cn("w-fit rounded-full px-2.5 py-0.5 text-[12px] font-medium", principale ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground")}>
                    {ETICHETTA_VETRINA[g.livello]}
                  </span>
                  <h3 className="text-[19px] leading-tight font-bold">{g.nome || ETICHETTA_VETRINA[g.livello]}</h3>
                  {g.contiene ? <p className="line-clamp-2 text-[14px] leading-relaxed text-muted-foreground">{g.contiene}</p> : null}
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div className="grid">
                    <span className="figure text-[26px] leading-none font-bold">{cifra}</span>
                    {nota ? <span className="mt-1 text-[12px] text-status-expiring">{nota}</span> : null}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[14px] font-medium transition-[gap] group-hover:gap-2">
                    Apri <ArrowRight className="size-4" aria-hidden />
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Una offerta che non è la principale (entrata, premium): cosa c'è dentro, perché quel prezzo, dove porta. */
export function SchedaGradino({
  g,
  indice,
  principale,
  onApriPrincipale,
  onModifica,
  occupato,
}: { g: Gradino; /** La posizione nei gradini: serve per salvare le correzioni. */ indice: number; principale?: Gradino; onApriPrincipale?: () => void } & Correzione) {
  const c: Correzione = { onModifica, occupato };
  const { cifra, nota } = dividiPrezzo(g.prezzo);
  return (
    <article aria-label={g.nome || ETICHETTA_VETRINA[g.livello]} className="overflow-hidden rounded-lg border bg-card">
      <header className="grid gap-2 p-5">
        <span className="w-fit rounded-full bg-surface px-2.5 py-0.5 text-[12px] font-medium text-muted-foreground">{ETICHETTA_VETRINA[g.livello]}</span>
        <RigaAvatar percorso={`gradini.${indice}`} valori={[g.nome, g.prezzo]} chiavi={["nome", "prezzo"]} etichette={["Nome", "Prezzo"]} semplice {...c}>
          <h3 className="text-[22px] leading-tight font-bold">{g.nome || ETICHETTA_VETRINA[g.livello]}</h3>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="figure text-[22px] font-bold">{cifra}</span>
            {nota ? <span className="text-[13px] text-status-expiring">{nota}</span> : null}
          </p>
        </RigaAvatar>
      </header>
      <div className="grid gap-5 border-t p-5">
        {g.contiene ? (
          <section className="grid gap-1">
            <h4 className="text-[13px] text-muted-foreground">Cosa c'è dentro</h4>
            <RigaAvatar percorso={`gradini.${indice}`} valori={[g.contiene]} chiavi={["contiene"]} etichette={["Cosa c'è dentro"]} semplice {...c}>
              <p className="text-[15px] leading-relaxed">{g.contiene}</p>
            </RigaAvatar>
          </section>
        ) : null}
        {g.ragionamento ? (
          <section className="grid gap-1">
            <h4 className="text-[13px] text-muted-foreground">Perché questo prezzo</h4>
            <p className="text-[15px] leading-relaxed">{g.ragionamento}</p>
          </section>
        ) : null}
      </div>
      {principale && onApriPrincipale ? (
        <button type="button" onClick={onApriPrincipale} className="flex w-full items-center justify-between gap-3 border-t px-5 py-4 text-left transition-colors hover:bg-surface">
          <span className="grid">
            <span className="text-[13px] text-muted-foreground">Porta a</span>
            <span className="text-[15px] font-semibold">{principale.nome || "Offerta principale"}</span>
          </span>
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </button>
      ) : null}
    </article>
  );
}
