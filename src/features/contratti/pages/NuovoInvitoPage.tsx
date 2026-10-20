import { ArrowLeft } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useLeadPerId } from "@/features/pipeline";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { ErroreCaricamento, SkeletonBlocco } from "@/shared/components/layout/StatoCaricamento";
import { NuovoInvitoForm } from "../components/admin/NuovoInvitoForm";
import { useImpostazioniContratti } from "../hooks/useContratti";
import { useOfferte } from "../hooks/useOfferte";

/**
 * /contratti/nuovo → nuovo invito: si sceglie l'offerta e si ottiene il link personale da mandare al cliente. Solo admin.
 * Con `?lead=` (da Clienti, «Crea il contratto») l'invito nasce intestato a quel lead; con `?da=clienti` (Clienti → «Nuovo contratto»)
 * si torna a Clienti, dove il contratto compare «in attesa» finché non è pagato.
 */
export default function NuovoInvitoPage() {
  const [params] = useSearchParams();
  const leadId = params.get("lead");
  const daClienti = params.get("da") === "clienti";
  const lead = useLeadPerId(leadId);
  const offerte = useOfferte();
  const impostazioni = useImpostazioniContratti();
  return (
    <div className="mx-auto grid max-w-[560px] gap-5">
      <Link to={daClienti ? "/clienti" : "/contratti"} className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> {daClienti ? "Clienti" : "Contratti"}
      </Link>
      <PageHeader
        titolo={daClienti && !leadId ? "Nuovo contratto" : "Nuovo invito"}
        sottotitolo="Scegli l'offerta e ottieni un link personale. Lo mandi al cliente: compila, legge e firma da lì. Al pagamento nasce il suo account con i dati che ha inserito."
      />
      {offerte.isLoading || impostazioni.isLoading || (leadId && lead.isLoading) ? <SkeletonBlocco /> : null}
      {offerte.isError || lead.isError ? <ErroreCaricamento /> : null}
      {leadId && lead.data === null ? <ErroreCaricamento messaggio="Lead non trovato: crea l'invito senza, oppure torna a Clienti." /> : null}
      {offerte.data && !impostazioni.isLoading && !(leadId && lead.isLoading) ? (
        <NuovoInvitoForm offerte={offerte.data} haFirma={!!impostazioni.data?.firma} lead={lead.data ?? null} daClienti={daClienti} />
      ) : null}
    </div>
  );
}
