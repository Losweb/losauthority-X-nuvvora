import { useAuth } from "@/features/auth";
import { primoNome } from "@/features/scheda";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { ErroreCaricamento, SkeletonBlocco } from "@/shared/components/layout/StatoCaricamento";
import { ElencoTappe, ProssimaChiamata, TappaOra } from "../components/percorso/MappaPercorso";
import { LineaTempoPiano } from "../components/piano/LineaTempoPiano";
import { usePercorso } from "../hooks/usePercorso";

/**
 * /area/dashboard → «Il tuo percorso» (dal 26/11/2026, studio dell'esperienza
 * cliente): le sette tappe del metodo in ordine, la tappa di adesso in evidenza
 * con un solo bottone, e sotto il piano d'azione scritto dopo la chiamata.
 */
export default function DashboardClientePage() {
  const { utente } = useAuth();
  const percorso = usePercorso(utente?.id);
  if (!utente) return null;
  const nome = primoNome(utente.nombre);
  const numeroOra = percorso.ora ? percorso.tappe.indexOf(percorso.ora) + 1 : 0;

  return (
    <div className="mx-auto grid w-full max-w-[760px] gap-7">
      <PageHeader
        occhiello={percorso.caricamento ? "Il tuo percorso" : percorso.fatte === 1 ? `1 tappa su ${percorso.tappe.length} fatta` : `${percorso.fatte} tappe su ${percorso.tappe.length} fatte`}
        titolo={nome ? `${nome}, il tuo percorso` : "Il tuo percorso"}
      />
      {percorso.caricamento ? <SkeletonBlocco altezza="h-64" /> : null}
      {percorso.errore ? <ErroreCaricamento /> : null}
      {!percorso.caricamento && !percorso.errore ? (
        <>
          {percorso.ora ? (
            <TappaOra tappa={percorso.ora} numero={numeroOra} />
          ) : (
            <p className="rounded-2xl border bg-card p-5 text-[15px]">Hai fatto tutte le tappe. Da qui in avanti si lavora sui contenuti e sui clienti, una settimana alla volta.</p>
          )}
          <ElencoTappe tappe={percorso.tappe} />
          <ProssimaChiamata quando={percorso.prossimaCall} />
        </>
      ) : null}
      <section className="grid gap-3 border-t pt-6">
        <h2 className="text-[18px] font-bold">Il piano dopo la chiamata</h2>
        <LineaTempoPiano clienteId={utente.id} />
      </section>
    </div>
  );
}
