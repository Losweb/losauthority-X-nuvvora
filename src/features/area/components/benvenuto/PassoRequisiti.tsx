import { useState } from "react";
import { ArrowRight, FileText } from "lucide-react";
import { DocumentoLegaleDialog, useAccettaCrm, type DocumentoLegale, type VersioneCrm } from "@/features/crm";
import type { DocumentiCrm } from "@/features/crm/hooks/useAccessoCrm";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";

interface PassoRequisitiProps {
  clienteId: string;
  versione: VersioneCrm;
  documenti: DocumentiCrm;
  onAvanti: () => void;
}

/** Per ogni casella, i documenti a cui si riferisce (nell'ordine in cui li cita). */
function documentiPerCasella(versione: VersioneCrm, d: DocumentiCrm): DocumentoLegale[][] {
  const termini = d.documenti[versione.termini_id];
  const accordo = d.documenti[versione.accordo_id];
  const informativa = d.documenti[versione.informativa_id];
  const presenti = (lista: Array<DocumentoLegale | undefined>) => lista.filter((x): x is DocumentoLegale => !!x);
  return [presenti([termini, accordo]), presenti([termini]), presenti([informativa])];
}

/**
 * Secondo passo: i requisiti. Le tre caselle dei documenti della sezione Clienti
 * (testo e versione dal database), ognuna con i bottoni che aprono il documento
 * in un popup. L'accettazione è la stessa di /area/clienti (`crm_accetta`), con
 * data e testo salvati come prova: dopo, la sezione Clienti non la richiede più.
 */
export function PassoRequisiti({ clienteId, versione, documenti, onAvanti }: PassoRequisitiProps) {
  const accetta = useAccettaCrm(clienteId);
  const [spuntate, setSpuntate] = useState([false, false, false]);
  const [aperto, setAperto] = useState<DocumentoLegale | null>(null);
  const caselle = [versione.casella_1, versione.casella_2, versione.casella_3];
  const perCasella = documentiPerCasella(versione, documenti);
  const tutte = spuntate.every(Boolean);

  return (
    <div className="grid gap-6">
      <div className="grid gap-2 text-center">
        <p className="eyebrow">Prima di iniziare</p>
        <h1 className="text-[clamp(28px,4vw,38px)] leading-tight">Cosa ti chiediamo di accettare</h1>
        <p className="mx-auto max-w-[520px] text-sm leading-relaxed text-muted-foreground">
          Nel tuo spazio segnerai anche le persone che ti contattano. I loro dati sono tuoi: noi li custodiamo solo per far funzionare il percorso.
          Leggi i documenti e spunta le caselle: lo fai una volta sola.
        </p>
      </div>
      <fieldset className="grid gap-3">
        <legend className="sr-only">Accettazione dei documenti</legend>
        {caselle.map((testo, i) => (
          <div key={i} className="grid gap-2 rounded-lg border bg-card p-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
              <Checkbox
                className="mt-0.5"
                checked={spuntate[i]}
                onCheckedChange={(v) => setSpuntate((s) => s.map((x, j) => (j === i ? v === true : x)))}
              />
              <span>{testo}</span>
            </label>
            {perCasella[i].length > 0 ? (
              <div className="flex flex-wrap gap-2 pl-7">
                {perCasella[i].map((d) => (
                  <Button key={d.id} type="button" variant="outline" size="sm" onClick={() => setAperto(d)}>
                    <FileText aria-hidden /> Leggi: {d.titolo}
                    {d.bozza ? <Badge variant="expiring">Bozza</Badge> : null}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </fieldset>
      <div className="flex flex-col items-center gap-3">
        <Button
          size="lg"
          disabled={!tutte || accetta.isPending}
          onClick={() => accetta.mutate(versione.versione, { onSuccess: () => onAvanti() })}
        >
          {accetta.isPending ? "Salvo…" : "Accetto e continuo"} <ArrowRight aria-hidden />
        </Button>
        <p className="text-xs text-muted-foreground">Versione {versione.versione} dei documenti. Salviamo cosa hai accettato e quando, come prova.</p>
      </div>
      <DocumentoLegaleDialog documento={aperto} onChiudi={() => setAperto(null)} />
    </div>
  );
}
