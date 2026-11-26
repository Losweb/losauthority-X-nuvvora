import { domandeVisibili } from "@onboarding/definizione.ts";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { AuraSfera } from "@/shared/components/brand/AuraSfera";
import { conParole } from "../format";
import type { ErroriDomande } from "../schema";
import type { Blocco, IdDomanda, Parole, Risposte, ValoreRisposta } from "../types";
import { DomandaCampo } from "./domande/DomandaCampo";

interface BloccoFlowProps {
  blocco: Blocco;
  indice: number;
  totale: number;
  risposte: Risposte;
  parole: Parole;
  errori: ErroriDomande;
  avanzando: boolean;
  clienteId: string;
  onChange: (id: IdDomanda, valore: ValoreRisposta) => void;
  onIndietro: () => void;
  onAvanti: () => void;
}

/** Schermata di un blocco: intro di Aura, le domande VISIBILI con queste risposte, navigazione. */
export function BloccoFlow(props: BloccoFlowProps) {
  const { blocco, indice, totale, risposte, parole, errori, avanzando } = props;
  const ultimo = indice === totale - 1;
  const domande = domandeVisibili(blocco, risposte);
  const obbligatorie = domande.filter((d) => d.obbligatoria);
  const facoltative = domande.filter((d) => !d.obbligatoria);
  // Aperte da subito se c'è già una risposta o un errore lì dentro.
  const facoltativeAperte = facoltative.some((d) => errori[d.id] || (typeof risposte[d.id] === "string" ? (risposte[d.id] as string).trim() !== "" : risposte[d.id] != null));

  return (
    <div className="grid gap-4">
      <div className="flex items-start gap-4 sm:gap-5">
        <AuraSfera dimensione={56} />
        <div className="min-w-0 flex-1 pt-1">
          <p className="eyebrow">
            Passo {indice + 1} di {totale}
          </p>
          <p
            aria-live="polite"
            className="mt-3 font-display text-[clamp(18px,2.4vw,23px)] leading-[1.4] font-bold tracking-[-0.01em] text-foreground"
          >
            {conParole(blocco.intro, parole)}
          </p>
        </div>
      </div>

      {/* Sul telefono il padding della card scende a 16px: più spazio alle domande. */}
      <Card className="max-sm:[--card-spacing:--spacing(4)]">
        <CardHeader>
          <CardTitle className="font-display text-2xl font-semibold">
            {conParole(blocco.titolo, parole)}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-8">
          {obbligatorie.map((domanda) => (
            <DomandaCampo
              key={`${domanda.id}-${domanda.codice}`}
              domanda={domanda}
              valore={risposte[domanda.id]}
              risposte={risposte}
              parole={parole}
              errore={errori[domanda.id]}
              onChange={props.onChange}
              clienteId={props.clienteId}
              inBozza
            />
          ))}
          {/* Le facoltative stanno piegate: il passo resta corto, chi vuole aggiunge (26/11/2026). */}
          {facoltative.length > 0 ? (
            <details className="group rounded-lg border border-line bg-surface p-4" open={facoltativeAperte}>
              <summary className="cursor-pointer list-none text-[14px] font-semibold marker:hidden">
                Vuoi aggiungere altro? <span className="font-normal text-muted-foreground">Facoltativo · {facoltative.length} {facoltative.length === 1 ? "domanda" : "domande"}</span>
              </summary>
              <div className="mt-5 grid gap-6">
                {facoltative.map((domanda) => (
            <DomandaCampo
              key={`${domanda.id}-${domanda.codice}`}
              domanda={domanda}
              valore={risposte[domanda.id]}
              risposte={risposte}
              parole={parole}
              errore={errori[domanda.id]}
              onChange={props.onChange}
              clienteId={props.clienteId}
              inBozza
            />
                ))}
              </div>
            </details>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={props.onIndietro} disabled={avanzando}>
          Indietro
        </Button>
        <Button type="button" onClick={props.onAvanti} disabled={avanzando}>
          {ultimo ? (avanzando ? "Un attimo…" : "Fai leggere ad Aura") : "Continua"}
        </Button>
      </div>
    </div>
  );
}
