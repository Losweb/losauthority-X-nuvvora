import { useEffect, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, ShieldCheck, X } from "lucide-react";
import { esTeam, useAuth } from "@/features/auth";
import { MarmoLogo } from "@/shared/components/brand/MarmoLogo";
import { ErroreCaricamento, SkeletonBlocco } from "@/shared/components/layout/StatoCaricamento";
import { Button } from "@/shared/components/ui/button";
import { useDecisioneAccesso, useRichiestaAccesso } from "../hooks/useCollegamentoClaude";
import { COSA_NON_PUO_FARE, COSA_NON_PUO_FARE_TEAM, COSA_PUO_FARE, COSA_PUO_FARE_TEAM } from "../testi";

/** Cornice a tutta pagina con solo il marchio, come le pagine pubbliche del contratto. */
function Cornice({ children }: { children: ReactNode }) {
  return (
    <div className="st-canvas">
      <div className="st-window flex flex-col">
        <header className="flex h-(--header-h) shrink-0 items-center justify-center px-5">
          <MarmoLogo altezza={20} />
        </header>
        <main data-scroll-principale className="mx-auto w-full max-w-[520px] min-h-0 flex-1 px-4 pt-6 pb-20 md:overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function Avviso({ titolo, testo }: { titolo: string; testo: string }) {
  return (
    <div className="grid gap-2 rounded-lg border border-line bg-card p-6 shadow-xs">
      <h1 className="text-[24px] leading-tight">{titolo}</h1>
      <p className="text-[15px] leading-relaxed text-muted-foreground">{testo}</p>
    </div>
  );
}

/** Dall'indirizzo di ritorno al solo dominio (es. «claude.ai»): è quello che l'utente riconosce. */
function dominio(indirizzo: string): string {
  try {
    return new URL(indirizzo).host;
  } catch {
    return indirizzo;
  }
}

/**
 * /oauth/consent?authorization_id=… → Supabase Auth manda qui l'utente quando Claude (o un altro
 * client MCP) chiede di collegarsi al suo account. Il login lo fa ProtectedRoute, che riporta qui con
 * la stessa query. Consenti → Supabase dà il codice a Claude; Rifiuta → Claude riceve access_denied.
 */
export default function ConsensoPage() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const { utente } = useAuth();
  const richiesta = useRichiestaAccesso(authorizationId);
  const decisione = useDecisioneAccesso(authorizationId);

  useEffect(() => {
    document.title = "Collega Claude — Wesley Caicedo";
    return () => {
      document.title = "Los Authority";
    };
  }, []);

  // Già consentito in passato: Supabase restituisce solo l'indirizzo a cui tornare.
  const giaConsentito = richiesta.data && !("authorization_id" in richiesta.data) ? richiesta.data.redirect_url : null;
  useEffect(() => {
    if (giaConsentito) window.location.assign(giaConsentito);
  }, [giaConsentito]);

  if (!authorizationId) {
    return (
      <Cornice>
        <Avviso titolo="Link non valido" testo="Manca la richiesta di collegamento. Riparti da Claude: aggiungi di nuovo il connettore." />
      </Cornice>
    );
  }
  if (richiesta.isLoading || giaConsentito) {
    return (
      <Cornice>
        <SkeletonBlocco altezza="h-80" />
      </Cornice>
    );
  }
  if (richiesta.isError || !richiesta.data || !("authorization_id" in richiesta.data)) {
    return (
      <Cornice>
        <ErroreCaricamento messaggio="Questa richiesta di collegamento è scaduta o non esiste più. Riparti da Claude: aggiungi di nuovo il connettore." />
      </Cornice>
    );
  }

  const dettagli = richiesta.data;
  const nomeApp = dettagli.client.name?.trim() || "Un'applicazione";
  const team = esTeam(utente?.rol ?? null);
  const puo = team ? COSA_PUO_FARE_TEAM : COSA_PUO_FARE;
  const nonPuo = team ? COSA_NON_PUO_FARE_TEAM : COSA_NON_PUO_FARE;
  const occupato = decisione.isPending || decisione.isSuccess;

  return (
    <Cornice>
      <section className="grid gap-6 rounded-lg border border-line bg-card p-6 shadow-xs">
        <div className="grid gap-2">
          <p className="eyebrow">Collegamento al tuo account</p>
          <h1 className="text-[26px] leading-tight">
            {nomeApp} vuole accedere {team ? "ai Workflow dei clienti" : "al tuo Workflow"}
          </h1>
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            Account: <span className="font-medium text-foreground">{dettagli.user.email}</span>
            <br />
            Dopo il consenso torni su <span className="font-medium text-foreground">{dominio(dettagli.redirect_uri)}</span>.
          </p>
        </div>

        <div className="grid gap-3">
          <p className="text-sm font-medium">Potrà:</p>
          <ul className="grid gap-2">
            {puo.map((voce) => (
              <li key={voce} className="flex gap-2 text-[14px] leading-snug">
                <Check className="mt-0.5 size-4 shrink-0 text-status-active" aria-hidden />
                {voce}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-sm font-medium">Non potrà:</p>
          <ul className="grid gap-2">
            {nonPuo.map((voce) => (
              <li key={voce} className="flex gap-2 text-[14px] leading-snug text-muted-foreground">
                <X className="mt-0.5 size-4 shrink-0" aria-hidden />
                {voce}
              </li>
            ))}
          </ul>
        </div>
        <p className="flex gap-2 rounded-md bg-muted px-3 py-2.5 text-[13px] leading-snug text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          Consenti solo se hai appena collegato tu Claude. Puoi scollegarlo quando vuoi dalla pagina «Collega Claude»
          {team ? " del gestionale" : " della tua area"}.
        </p>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={occupato} onClick={() => decisione.mutate(false)}>
            Rifiuta
          </Button>
          <Button type="button" disabled={occupato} onClick={() => decisione.mutate(true)}>
            {occupato ? "Collego…" : "Consenti"}
          </Button>
        </div>
      </section>
    </Cornice>
  );
}
