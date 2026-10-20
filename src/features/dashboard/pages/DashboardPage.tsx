import { esFinance, useAccountPersonale, useAuth } from "@/features/auth";
import { ChiamateNonAssegnate } from "@/features/chiamate";
import { useErroriDaGestire } from "@/features/errori";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { AttivitaTeam } from "../components/AttivitaTeam";
import { ContrattiFirmati } from "../components/ContrattiFirmati";
import { DaFareOggi } from "../components/DaFareOggi";
import { ErroriDaGestire } from "../components/ErroriDaGestire";
import { ProssimeCall } from "../components/ProssimeCall";
import { StatCard } from "../components/StatCard";
import { UltimiOnboarding } from "../components/UltimiOnboarding";
import { useAttivitaTeam, useClientiDashboard, useContrattiFirmati, useLeadDaFare, useUltimiOnboarding } from "../hooks/useDashboard";
import type { ClienteDashboard, StatisticheDashboard } from "../types";

const SETTE_GIORNI_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ONBOARDING = 5;

function calcolaStatistiche(clienti: ClienteDashboard[]): StatisticheDashboard {
  const adesso = Date.now();
  const adessoIso = new Date(adesso).toISOString();
  const limite = new Date(adesso + SETTE_GIORNI_MS).toISOString();
  return {
    clientiAttivi: clienti.filter((c) => c.fase !== "completato").length,
    onboardingDaLavorare: clienti.filter(
      (c) => c.stato_onboarding === "nuovo" || c.stato_onboarding === "in_lavorazione",
    ).length,
    prontiPerHub: clienti.filter((c) => c.stato_onboarding === "completato").length,
    callProssimi7Giorni: clienti.filter(
      (c) => !!c.prossima_call && c.prossima_call >= adessoIso && c.prossima_call <= limite,
    ).length,
  };
}

export default function DashboardPage() {
  const clienti = useClientiDashboard();
  const onboarding = useUltimiOnboarding();
  const lead = useLeadDaFare();
  const errori = useErroriDaGestire();
  const attivita = useAttivitaTeam();
  const { utente } = useAuth();
  const firmati = useContrattiFirmati(esFinance(utente?.rol ?? null));
  // «Wesley ME» è l'account del team, non un cliente da seguire: fuori da contatori e liste.
  const idPersonale = useAccountPersonale().data?.id;
  const clientiVeri = clienti.data?.filter((c) => c.id !== idPersonale);
  const onboardingVeri = onboarding.data?.filter((o) => o.id !== idPersonale).slice(0, MAX_ONBOARDING);

  const stat = clientiVeri ? calcolaStatistiche(clientiVeri) : undefined;

  return (
    <div className="grid gap-6">
      <PageHeader titolo="Dashboard" sottotitolo="Il punto sui clienti, le call e le cose da fare." />

      {/* Solo se un'automazione ha segnalato un errore nuovo che nessuno ha ancora gestito. */}
      {errori.data && errori.data.righe.length > 0 ? <ErroriDaGestire errori={errori.data.righe} totale={errori.data.totale} /> : null}

      {/* Solo se un cliente ha firmato e il pagamento non è ancora segnato. */}
      {firmati.data && firmati.data.length > 0 ? <ContrattiFirmati contratti={firmati.data} /> : null}

      <section aria-label="Contatori" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard etichetta="Clienti attivi" valore={stat?.clientiAttivi} caricamento={clienti.isLoading} />
        <StatCard etichetta="Onboarding da lavorare" valore={stat?.onboardingDaLavorare} caricamento={clienti.isLoading} />
        <StatCard etichetta="Pronti per l'hub" valore={stat?.prontiPerHub} caricamento={clienti.isLoading} />
        <StatCard etichetta="Call nei prossimi 7 giorni" valore={stat?.callProssimi7Giorni} caricamento={clienti.isLoading} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProssimeCall clienti={clientiVeri} caricamento={clienti.isLoading} errore={clienti.isError} />
        <DaFareOggi
          clienti={clientiVeri}
          lead={lead.data}
          caricamento={clienti.isLoading || lead.isLoading}
          errore={clienti.isError || lead.isError}
        />
        <AttivitaTeam attivita={attivita.data} caricamento={attivita.isLoading} errore={attivita.isError} />
        <UltimiOnboarding onboarding={onboardingVeri} caricamento={onboarding.isLoading} errore={onboarding.isError} />
        <ChiamateNonAssegnate />
      </div>
    </div>
  );
}
