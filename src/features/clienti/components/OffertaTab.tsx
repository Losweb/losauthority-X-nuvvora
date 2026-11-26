import { useState } from "react";
import { ChevronDown, FileDown } from "lucide-react";
import {
  CartaOfferta,
  DiagnosiOfferta,
  FermoOfferta,
  FraseOfferta,
  linkPdfOfferta,
  PassiOfferta,
  SchedaOffertaNuova,
  useDiagnosiOfferta,
  useOffertaCliente,
  type Offerta,
} from "@/features/offerta";
import { Badge } from "@/shared/components/ui/badge";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { ErroreCaricamento, SkeletonBlocco, StatoVuoto } from "@/shared/components/layout/StatoCaricamento";
import { formatDate } from "@/shared/utils/formatDate";
import type { ClienteDettaglio } from "../types";

/**
 * Tab "Offerta" della scheda cliente. Dal 26/11/2026: l'offerta del cliente
 * (una sola) con la strada, la frase, il blocco «Fermo» in evidenza (che arriva
 * anche su Telegram) e la scheda nuova. Sotto, piegata, la carta di prima con
 * la diagnosi per Wesley (che il cliente non vede).
 */
export function OffertaTab({ cliente }: { cliente: ClienteDettaglio }) {
  const { data: o, isLoading, isError } = useOffertaCliente(cliente.id);

  if (isLoading) return <SkeletonBlocco altezza="h-64" />;
  if (isError) return <ErroreCaricamento />;
  if (!o) return <StatoVuoto titolo="Offerta non ancora iniziata" testo="Il cliente la costruisce dalla sua area: Cervello del tuo branding → Offerta, in conversazione con Aura." />;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
        <div className="grid min-w-0 flex-1 basis-[360px] gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {o.fermo ? <Badge variant="churn">Ferma dal {formatDate(o.fermo_il ?? o.updated_at)}</Badge> : null}
            {o.completa_fatta_il ? <Badge variant="active">Scheda completa fatta</Badge> : o.breve_fatta_il ? <Badge variant="active">Frase fatta</Badge> : <Badge variant="neutral">In corso</Badge>}
            {o.tipo_vendita ? <Badge variant="outline">{o.tipo_vendita === "prodotto" ? `Prodotto${o.brand ? ` · ${o.brand}` : ""}` : "Servizio"}</Badge> : null}
          </div>
          {o.strada ? <PassiOfferta o={o} /> : <p className="text-[13px] text-muted-foreground">Non ha ancora parlato con Aura col metodo nuovo.</p>}
        </div>
        <a href={linkPdfOfferta(o.id)} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
          <FileDown aria-hidden /> Scarica PDF
        </a>
      </div>

      <FermoOfferta fermo={o.fermo} />
      <FraseOfferta o={o} />
      <SchedaOffertaNuova o={o} larga aperta />
      <OffertaDiPrimaTeam o={o as unknown as Offerta} nome={cliente.utente.nombre} />
    </div>
  );
}

/** La carta scritta col metodo di prima, piegata, con la diagnosi per Wesley. */
function OffertaDiPrimaTeam({ o, nome }: { o: Offerta; nome: string }) {
  const [aperta, setAperta] = useState(false);
  const diagnosi = useDiagnosiOfferta(aperta ? o.id : undefined);
  if (!o.nome && !o.trasformazione && !o.prezzo) return null;
  return (
    <section className="grid gap-4 border-t pt-5">
      <Button variant="ghost" className="w-fit" aria-expanded={aperta} onClick={() => setAperta((v) => !v)}>
        <ChevronDown aria-hidden className={aperta ? "rotate-180 transition-transform" : "transition-transform"} />
        L'offerta di prima{o.nome ? `: ${o.nome}` : ""} · con la diagnosi per Wesley
      </Button>
      {aperta ? (
        <div className="grid gap-5">
          <CartaOfferta offerta={o} numero={1} titolare={nome} inCompilazione={o.stato !== "completo"} larga />
          {diagnosi.isError ? <ErroreCaricamento /> : <DiagnosiOfferta diagnosi={diagnosi.data ?? null} completa={o.stato === "completo"} />}
        </div>
      ) : null}
    </section>
  );
}
