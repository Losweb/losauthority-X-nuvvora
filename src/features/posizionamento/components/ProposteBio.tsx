import { useState, type FormEvent } from "react";
import { Check, WandSparkles, X } from "lucide-react";
import { LIMITI } from "@posizionamento-forma/forma";
import { PensieroAura } from "@/features/idee";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useProponiBio } from "../hooks/usePosizionamento";

const ANGOLI: Record<string, string> = { identita: "Per chi sei e contro cosa", criterio: "Quello che vedi solo tu", specchio: "Chi legge si riconosce" };
const FASI = ["Rileggo avatar e offerta", "Scrivo tre bio da angoli diversi", "Conto i caratteri"] as const;

/**
 * «Proponi con Aura» sotto la bio (27/11/2026, richiesta di Wesley): Aura scrive tre bio da angoli
 * diversi, il cliente ne sceglie una («Usa questa») e solo allora si salva. Facoltativo: cosa vuole.
 */
export function ProposteBio({ onUsa, occupato }: { onUsa: (testo: string) => void; occupato?: boolean }) {
  const proponi = useProponiBio();
  const [aperto, setAperto] = useState(false);
  const [richiesta, setRichiesta] = useState("");
  const [bioAttuale, setBioAttuale] = useState("");
  const [criterio, setCriterio] = useState("");

  function invia(e: FormEvent) {
    e.preventDefault();
    proponi.mutate({ richiesta: richiesta.trim(), bioAttuale: bioAttuale.trim(), criterio: criterio.trim() });
  }

  function chiudi() {
    setAperto(false);
    proponi.reset();
  }

  if (!aperto) {
    return (
      <Button type="button" variant="outline" size="sm" className="mt-2 justify-self-start" disabled={occupato} onClick={() => setAperto(true)}>
        <WandSparkles aria-hidden /> Proponi con Aura
      </Button>
    );
  }

  return (
    <section aria-label="Proposte di bio di Aura" className="relative mt-2 grid gap-3 rounded-xl border bg-muted/40 p-3">
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Chiudi le proposte" className="absolute top-1.5 right-1.5 text-muted-foreground" onClick={chiudi}>
        <X aria-hidden />
      </Button>

      {proponi.isPending ? (
        <PensieroAura fasi={FASI} stima="Ci vogliono circa 20 secondi." intervalloMs={7000} />
      ) : (
        <form onSubmit={invia} className="grid gap-2 pr-8">
          <label htmlFor="bio-attuale" className="text-[14px] font-semibold">
            La tua bio di adesso <span className="font-normal text-muted-foreground">(facoltativo: Aura tiene quello che funziona)</span>
          </label>
          <Textarea id="bio-attuale" rows={3} maxLength={400} value={bioAttuale} onChange={(e) => setBioAttuale(e.target.value)} placeholder="Incolla qui la bio che hai oggi su Instagram" />
          <label htmlFor="criterio-bio" className="pt-1 text-[14px] font-semibold">
            Cosa vedi tu che gli altri del tuo settore non vedono? <span className="font-normal text-muted-foreground">(facoltativo)</span>
          </label>
          <Input
            id="criterio-bio"
            maxLength={300}
            value={criterio}
            onChange={(e) => setCriterio(e.target.value)}
            placeholder="Es. i miei clienti non mollano per pigrizia, mollano perché la scheda gli fa male alla schiena"
          />
          <label htmlFor="richiesta-bio" className="pt-1 text-[14px] font-semibold">
            Vuoi qualcosa in particolare? <span className="font-normal text-muted-foreground">(facoltativo)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Input id="richiesta-bio" className="min-w-0 flex-1" maxLength={300} value={richiesta} onChange={(e) => setRichiesta(e.target.value)} placeholder="Es. più corta, senza emoji, parla anche a chi pubblica già" />
            <Button type="submit">{proponi.data ? "Altre tre" : "Proponi"}</Button>
          </div>
        </form>
      )}

      {proponi.data && !proponi.isPending ? (
        <ul className="grid gap-2">
          {proponi.data.map((p, i) => (
            <li key={i} className="grid gap-2 rounded-lg border bg-card p-3">
              <p className="flex items-baseline justify-between gap-3 text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">
                {ANGOLI[p.angolo] ?? p.angolo}
                <span className={cn("font-normal normal-case", p.testo.length > LIMITI.bio && "font-medium text-status-churn")}>
                  {p.testo.length}/{LIMITI.bio}
                </span>
              </p>
              <p className="text-[15px] leading-relaxed whitespace-pre-line">{p.testo}</p>
              {p.perche ? <p className="text-[13px] leading-relaxed text-muted-foreground">{p.perche}</p> : null}
              <Button
                type="button"
                size="sm"
                className="justify-self-start"
                disabled={occupato}
                onClick={() => {
                  onUsa(p.testo);
                  chiudi();
                }}
              >
                <Check aria-hidden /> Usa questa
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
