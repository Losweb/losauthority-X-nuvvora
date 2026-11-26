import { useState } from "react";
import { ArrowLeft, FileDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth";
import { FlussoAvatar, SceltaVista, useMappaAvatar, type VistaMobile } from "@/features/avatar";
import { ComposerAura, PensieroAura } from "@/features/idee";
import {
  AvvisiOfferta,
  FASI_AURA_OFFERTA,
  FermoOfferta,
  FraseOfferta,
  linkPdfOfferta,
  OffertaDiPrima,
  PassiOfferta,
  RicominciaOfferta,
  SchedaOffertaNuova,
  useIniziaOfferta,
  useInviaOffertaCliente,
  useMessaggiOfferta,
  useOffertaCliente,
  type MessaggioOfferta,
} from "@/features/offerta";
import { primoNome } from "@/features/scheda";
import { AuraSfera } from "@/shared/components/brand/AuraSfera";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { ErroreCaricamento, SkeletonBlocco } from "@/shared/components/layout/StatoCaricamento";
import { cn } from "@/lib/utils";

/**
 * /area/cervello/offerta → la fase Offerta (dal 26/11/2026): UNA offerta per
 * cliente, una conversazione con Aura (a sinistra) e a destra la frase, il
 * blocco «Fermo» se c'è e la scheda. La strada (versione breve o scheda
 * completa) la decide il sito guardando se la mappa Avatar è chiusa.
 */
export default function OffertaPage() {
  const { utente } = useAuth();
  const nome = primoNome(utente?.nombre);
  const [pendente, setPendente] = useState<{ testo: string; auraId: string | null } | null>(null);
  const [daRipristinare, setDaRipristinare] = useState<string | undefined>(undefined);
  const [sceltaVista, setSceltaVista] = useState<VistaMobile | null>(null);
  const [attivo, setAttivo] = useState(false);

  const inizia = useIniziaOfferta();
  const invia = useInviaOffertaCliente();
  const offerta = useOffertaCliente(utente?.id, attivo || inizia.isPending);
  const avatar = useMappaAvatar(utente?.id);
  const messaggi = useMessaggiOfferta(offerta.data?.id);
  const lista = messaggi.data ?? [];
  const rispostaArrivata = pendente?.auraId != null && lista.some((m) => m.id === pendente.auraId);
  const pendenteVisibile = pendente !== null && !rispostaArrivata ? pendente : null;
  const auraScrive = pendenteVisibile !== null || invia.isPending || inizia.isPending || lista.some((m) => m.stato === "in_corso");
  if (auraScrive !== attivo) setAttivo(auraScrive);

  if (!utente) return null;

  function manda(testo: string) {
    setPendente({ testo, auraId: null });
    invia.mutate(
      { messaggio: testo },
      {
        onSuccess: (r) => setPendente({ testo, auraId: r.messaggio_id }),
        onError: () => {
          setPendente(null);
          setDaRipristinare(testo);
        },
      },
    );
  }
  function riprova(m: MessaggioOfferta) {
    setPendente({ testo: "", auraId: null });
    invia.mutate({ riprovaId: m.id }, { onSuccess: (r) => setPendente({ testo: "", auraId: r.messaggio_id }), onError: () => setPendente(null) });
  }

  const intestazione = (
    <>
      <Link to="/area/dashboard" className="inline-flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground pointer-coarse:-my-2 pointer-coarse:min-h-9 pointer-coarse:py-2">
        <ArrowLeft className="size-3.5" aria-hidden /> Il tuo percorso
      </Link>
      <PageHeader
        occhiello={`Fondamenta${nome ? ` · ${nome}` : ""}`}
        titolo="Offerta"
        sottotitolo="Cosa vendi, a chi, dove lo porti e perché proprio tu. Aura legge quello che sa già di te e propone; tu correggi."
        azioni={
          offerta.data ? (
            <a href={linkPdfOfferta(offerta.data.id)} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
              <FileDown aria-hidden /> Scarica PDF
            </a>
          ) : null
        }
      />
    </>
  );

  if (offerta.isLoading) return <div className="grid gap-7">{intestazione}<SkeletonBlocco altezza="h-96" /></div>;
  if (offerta.isError) return <div className="grid gap-7">{intestazione}<ErroreCaricamento /></div>;
  const o = offerta.data;
  if (!o) {
    return (
      <div className="grid gap-7">
        {intestazione}
        <section className="mx-auto grid w-full max-w-[680px] gap-5 rounded-2xl border bg-card/70 p-6 md:p-8">
          <div className="flex items-start gap-4">
            <AuraSfera dimensione={56} conNome={false} />
            <div className="grid gap-2">
              <h2 className="text-[22px] leading-tight font-bold">{nome ? `${nome}, cosa vendi?` : "Cosa vendi?"}</h2>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                Se il tuo avatar non è ancora pronto partiamo dalla versione breve: in due o tre scambi scriviamo la tua offerta in una frase. Quando l'avatar è pronto, la frase diventa una scheda completa: mercato, promessa, freni, prezzo e come la presenti.
              </p>
            </div>
          </div>
          {inizia.isPending ? (
            <PensieroAura fasi={FASI_AURA_OFFERTA} />
          ) : (
            <div className="border-t pt-5">
              <Button size="lg" onClick={() => inizia.mutate(undefined)}>
                Iniziamo
              </Button>
            </div>
          )}
        </section>
      </div>
    );
  }

  const vista: VistaMobile = sceltaVista ?? "chat";
  return (
    <div className="grid gap-5">
      {intestazione}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1 basis-[420px]">{o.strada ? <PassiOfferta o={o} /> : null}</div>
        <RicominciaOfferta offertaId={o.id} disabilitato={auraScrive} />
      </div>
      <SceltaVista vista={vista} onCambia={setSceltaVista} seconda="Scheda" />

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(440px,600px)] lg:items-start">
        <section
          aria-label="Conversazione con Aura"
          className={cn(
            "order-2 min-h-[360px] min-w-0 flex-col rounded-2xl border bg-card/70 h-[calc(var(--vh-finestra)-var(--header-h)-15rem)] md:h-auto md:min-h-[460px] lg:order-1 lg:h-[calc(var(--vh-finestra)-var(--header-h)-12rem)]",
            vista === "chat" ? "flex" : "hidden md:flex",
          )}
        >
          <div data-chat-scroll className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:thin] md:p-5" aria-live="polite">
            {messaggi.isLoading ? <SkeletonBlocco altezza="h-40" /> : null}
            {messaggi.isError ? <ErroreCaricamento /> : null}
            {messaggi.data ? <FlussoAvatar messaggi={lista} pendente={pendenteVisibile === null ? null : pendenteVisibile.testo} occupato={invia.isPending} onRiprova={riprova} fasi={FASI_AURA_OFFERTA} /> : null}
          </div>
          <div className="shrink-0 p-2 md:p-3">
            <ComposerAura inAttesa={auraScrive} onInvia={manda} suggerito={daRipristinare} onSuggeritoUsato={() => setDaRipristinare(undefined)} placeholder="Rispondi ad Aura…" />
          </div>
        </section>

        <aside className={cn("order-1 grid min-w-0 content-start gap-5 lg:order-2", vista === "carta" ? "grid" : "hidden md:grid")}>
          <AvvisiOfferta o={o} avatarAggiornatoIl={avatar.data?.mappa.updated_at ?? null} />
          <FermoOfferta fermo={o.fermo} />
          <FraseOfferta o={o} />
          <SchedaOffertaNuova o={o} />
          <OffertaDiPrima o={o} />
        </aside>
      </div>
    </div>
  );
}
