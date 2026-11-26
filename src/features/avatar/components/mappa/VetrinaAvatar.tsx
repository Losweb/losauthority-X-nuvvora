import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { schedaIniziata, titoloScheda, type SchedaAvatar } from "../../mappa";

/**
 * I tuoi avatar (26/11/2026, pulizia UX come la vetrina dell'Offerta): a lavoro finito la pagina
 * mostra prima gli avatar come schede (nome, età, situazione); al clic si apre la scheda.
 * La mappa che li ha prodotti sta piegata sotto.
 */
export function VetrinaAvatar({ schede, onApri }: { schede: SchedaAvatar[]; onApri: (ordine: number) => void }) {
  if (schede.length === 0) return null;
  const ordinate = [...schede].sort((a, b) => Number(b.principale) - Number(a.principale) || a.ordine - b.ordine);
  return (
    <section aria-labelledby="titolo-vetrina-avatar" className="grid gap-4">
      <h2 id="titolo-vetrina-avatar" className="text-[18px] font-bold">
        I tuoi avatar
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {ordinate.map((s) => {
          const iniziata = schedaIniziata(s);
          const situazione = s.contenuto.situazione?.t ?? s.partenza.situazione?.t;
          return (
            <li key={s.id} className="grid">
              <button
                type="button"
                disabled={!iniziata}
                onClick={() => onApri(s.ordine)}
                className={cn(
                  "group grid min-h-[190px] content-between gap-5 rounded-xl border bg-card p-5 text-left shadow-xs transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  iniziata ? "hover:-translate-y-0.5 hover:shadow-md" : "cursor-default opacity-70",
                  s.principale && "border-foreground/25",
                )}
              >
                <div className="grid content-start gap-2">
                  <span className={cn("w-fit rounded-full px-2.5 py-0.5 text-[12px] font-medium", s.principale ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground")}>
                    {s.principale ? "Avatar principale" : `Avatar ${s.ordine}`}
                  </span>
                  <h3 className="text-[19px] leading-tight font-bold">
                    {titoloScheda(s)}
                    {s.contenuto.eta ? <span className="ml-2 text-[15px] font-normal text-muted-foreground">{s.contenuto.eta}</span> : null}
                  </h3>
                  {situazione ? <p className="line-clamp-2 text-[14px] leading-relaxed text-muted-foreground">{situazione}</p> : null}
                </div>
                <span className="inline-flex items-center gap-1 justify-self-end text-[14px] font-medium transition-[gap] group-hover:gap-2">
                  {iniziata ? (
                    <>
                      Apri <ArrowRight className="size-4" aria-hidden />
                    </>
                  ) : (
                    <span className="text-muted-foreground">La scrive Aura dopo la mappa</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
