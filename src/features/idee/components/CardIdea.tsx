import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bookmark, Check, ChevronDown, X } from "lucide-react";
import { TIPOLOGIE_CONTENUTO, type TipologiaContenuto } from "@/features/contenuti";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { ETICHETTA_STATO_IDEA, eStatoIdea, type Idea } from "../types";
import { BottoneCopia } from "./BottoneCopia";

const BORDO_TIPOLOGIA: Record<TipologiaContenuto, string> = {
  virale: "border-l-status-expiring",
  consolidazione: "border-l-muted-foreground/60",
  vendita: "border-l-status-active",
  content_series: "border-l-foreground",
};

function eTipologia(v: string | null): v is TipologiaContenuto {
  return v !== null && v in TIPOLOGIE_CONTENUTO;
}

/** Per confrontare hook e inizio dello script senza badare a virgolette, spazi e maiuscole. */
const normalizza = (t: string) =>
  t
    .toLowerCase()
    .replace(/[“”"«»'’.,!?…:;–—-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * L'hook è «la prima frase pronta da dire»: quasi sempre lo script comincia proprio con quella.
 * Si mostra a parte solo quando nello script non c'è, così la card non ripete la stessa frase due volte.
 */
function hookDaMostrare(idea: Idea): string | null {
  if (!idea.hook) return null;
  if (!idea.script) return idea.hook;
  return normalizza(idea.script).startsWith(normalizza(idea.hook)) ? null : idea.hook;
}

interface CardIdeaProps {
  idea: Idea;
  indice?: number;
  onSalva: (idea: Idea) => void;
  onScarta: (idea: Idea) => void;
  onWorkflow: (idea: Idea) => void;
  occupato?: boolean;
}

/**
 * Una proposta di Aura: striscia colorata per tipologia, script in primo piano, copia, azioni.
 * La card è un container: quando è larga (la chat su desktop) si legge in orizzontale, con titolo e
 * azioni a sinistra e lo script a destra; stretta (telefono, pannello «Salvate») va in colonna.
 */
export function CardIdea({ idea, indice = 0, onSalva, onScarta, onWorkflow, occupato = false }: CardIdeaProps) {
  const [aperta, setAperta] = useState(false);
  const tipologia = eTipologia(idea.tipologia) ? TIPOLOGIE_CONTENUTO[idea.tipologia] : null;
  const stato = eStatoIdea(idea.stato) ? idea.stato : "proposta";
  const scartata = stato === "scartata";
  const hook = hookDaMostrare(idea);
  const daCopiare = [hook, idea.script ?? (hook ? null : idea.hook)].filter(Boolean).join("\n\n");

  return (
    <article
      style={{ animationDelay: `${indice * 120}ms` }}
      className={cn(
        "@container rounded-2xl border border-l-4 bg-card p-5 shadow-xs transition-[opacity,box-shadow] animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-500 motion-reduce:animate-none hover:shadow-sm",
        eTipologia(idea.tipologia) ? BORDO_TIPOLOGIA[idea.tipologia] : "border-l-border",
        scartata && "opacity-50",
      )}
    >
      {/* Stretta: titolo, script, azioni in colonna. Larga: titolo e azioni a sinistra, lo script a destra. */}
      <div className="grid gap-4 [grid-template-areas:'meta'_'script'_'azioni'] @2xl:grid-cols-[minmax(200px,260px)_minmax(0,1fr)] @2xl:grid-rows-[auto_1fr] @2xl:gap-x-8 @2xl:[grid-template-areas:'meta_script'_'azioni_script']">
        <div className="flex min-w-0 flex-col gap-3 [grid-area:meta]">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {tipologia ? <Badge variant={tipologia.tono}>{tipologia.label}</Badge> : null}
              {stato !== "proposta" ? (
                <Badge variant={stato === "usata" ? "active" : "outline"} dot={stato === "usata"}>
                  {ETICHETTA_STATO_IDEA[stato]}
                </Badge>
              ) : null}
            </div>
            {/* Su card stretta copia e scarta stanno qui; su card larga in alto a destra, sopra lo script. */}
            <div className="flex shrink-0 items-center gap-0.5 @2xl:hidden">
              {daCopiare ? <BottoneCopia testo={daCopiare} etichetta="Copia lo script" dimensione="icon-sm" /> : null}
              {!scartata && stato !== "usata" ? <BottoneScarta occupato={occupato} onClick={() => onScarta(idea)} /> : null}
            </div>
          </div>
          <h3 className="font-sans text-[15px] leading-snug font-semibold text-foreground">{idea.titolo}</h3>
        </div>

        {/* Lo script, in nero pieno: è la cosa da leggere. */}
        <div className="relative min-w-0 [grid-area:script] @2xl:border-l @2xl:border-line @2xl:pl-8">
          <div className="absolute -top-1 right-0 hidden items-center gap-0.5 @2xl:flex">
            {daCopiare ? <BottoneCopia testo={daCopiare} etichetta="Copia lo script" dimensione="icon-sm" /> : null}
            {!scartata && stato !== "usata" ? <BottoneScarta occupato={occupato} onClick={() => onScarta(idea)} /> : null}
          </div>
          <div className="grid gap-2 @2xl:pr-16">
            {hook ? <p className="text-[15px] leading-relaxed font-medium text-foreground">{hook}</p> : null}
            {idea.script ? (
              <>
                <p className={cn("text-[15px] leading-relaxed whitespace-pre-wrap text-foreground", !aperta && "line-clamp-6")}>{idea.script}</p>
                <button
                  type="button"
                  onClick={() => setAperta((v) => !v)}
                  className="inline-flex w-fit items-center gap-1 text-[13px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline pointer-coarse:-my-2.5 pointer-coarse:py-2.5"
                >
                  {aperta ? "Riduci" : "Leggi tutto lo script"}
                  <ChevronDown className={cn("size-3.5 transition-transform", aperta && "rotate-180")} aria-hidden />
                </button>
              </>
            ) : null}
          </div>
        </div>

        {!scartata ? (
          <div className="flex flex-wrap gap-2 [grid-area:azioni] @2xl:self-end">
            {stato === "proposta" ? (
              <Button size="sm" variant="outline" disabled={occupato} onClick={() => onSalva(idea)}>
                <Bookmark aria-hidden /> Salva
              </Button>
            ) : null}
            {stato === "usata" ? (
              <Button size="sm" variant="outline" render={<Link to="/area/workflow" />}>
                <Check aria-hidden /> Apri il Workflow
              </Button>
            ) : (
              <Button size="sm" disabled={occupato} onClick={() => onWorkflow(idea)}>
                Porta nel Workflow <ArrowRight aria-hidden />
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function BottoneScarta({ occupato, onClick }: { occupato: boolean; onClick: () => void }) {
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      className="text-muted-foreground hover:text-foreground"
      aria-label="Scarta idea"
      title="Scarta idea"
      disabled={occupato}
      onClick={onClick}
    >
      <X aria-hidden />
    </Button>
  );
}
