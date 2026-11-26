import { useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, FileDown, RotateCcw, X } from "lucide-react";
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
  SchedaGradino,
  SchedaOffertaNuova,
  useIniziaOfferta,
  useFermaOfferta,
  useInviaOffertaCliente,
  useModificaOfferta,
  useMessaggiOfferta,
  useOffertaCliente,
  VetrinaOfferte,
  type MessaggioOfferta,
} from "@/features/offerta";
import { primoNome } from "@/features/scheda";
import { AuraSfera } from "@/shared/components/brand/AuraSfera";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { ErroreCaricamento, SkeletonBlocco } from "@/shared/components/layout/StatoCaricamento";
import { scorriInCima } from "@/shared/utils/scroll";
import { cn } from "@/lib/utils";
import { AltreAzioni } from "../components/AltreAzioni";
import { BottoneChat, InizioChatNuova } from "../components/BottoneChat";
import { PassoDopo } from "../components/percorso/PassoDopo";

/**
 * /area/cervello/offerta → la fase Offerta (dal 26/11/2026): UNA offerta per
 * cliente, una conversazione con Aura (a sinistra) e a destra la frase, il
 * blocco «Fermo» se c'è e la scheda. Dal 26/11/2026 senza avatar pronto la pagina manda all'avatar
 * (la versione breve non si apre più). La strada (versione breve o scheda
 * completa) la decide il sito guardando se la mappa Avatar è chiusa.
 * A lavoro finito (26/11/2026) la conversazione sta chiusa e la scheda prende tutta la
 * larghezza; «Parla con Aura» la riapre accanto.
 */
export default function OffertaPage() {
  const { utente } = useAuth();
  const nome = primoNome(utente?.nombre);
  const [pendente, setPendente] = useState<{ testo: string; auraId: string | null } | null>(null);
  const [daRipristinare, setDaRipristinare] = useState<string | undefined>(undefined);
  const [sceltaVista, setSceltaVista] = useState<VistaMobile | null>(null);
  const [attivo, setAttivo] = useState(false);
  /** A lavoro finito la chat sta chiusa: si riapre con «Parla con Aura». null = decide lo stato. */
  const [sceltaChat, setSceltaChat] = useState<boolean | null>(null);
  /** Quanti messaggi vecchi piegare quando la chat si riapre a lavoro finito (0 = mostrali tutti). */
  const [piegati, setPiegati] = useState(0);
  const [ricomincia, setRicomincia] = useState(false);
  /** Vetrina: l'offerta aperta (indice nei gradini), null = tutte le offerte. */
  const [offertaAperta, setOffertaAperta] = useState<number | null>(null);

  const inizia = useIniziaOfferta();
  const invia = useInviaOffertaCliente();
  const ferma = useFermaOfferta();
  const modifica = useModificaOfferta();
  const offerta = useOffertaCliente(utente?.id, attivo || inizia.isPending);
  const avatar = useMappaAvatar(utente?.id);
  const messaggi = useMessaggiOfferta(offerta.data?.id);
  const lista = messaggi.data ?? [];
  const rispostaArrivata = pendente?.auraId != null && lista.some((m) => m.id === pendente.auraId);
  const pendenteVisibile = pendente !== null && !rispostaArrivata ? pendente : null;
  const auraScrive = pendenteVisibile !== null || invia.isPending || inizia.isPending || lista.some((m) => m.stato === "in_corso");
  if (auraScrive !== attivo) setAttivo(auraScrive);

  const fermaRef = useRef<AbortController | null>(null);
  if (!utente) return null;

  function nuovoStop() {
    fermaRef.current = new AbortController();
    return fermaRef.current.signal;
  }
  function manda(testo: string) {
    setPendente({ testo, auraId: null });
    invia.mutate(
      { messaggio: testo, signal: nuovoStop() },
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
    invia.mutate({ riprovaId: m.id, signal: nuovoStop() }, { onSuccess: (r) => setPendente({ testo: "", auraId: r.messaggio_id }), onError: () => setPendente(null) });
  }

  // Intestazione (26/11/2026, pulizia UX): «← Il tuo percorso», il titolo e a destra le azioni.
  // La frase sotto il titolo serve finché si lavora; a lavoro finito si toglie.
  const intestazione = (azioni?: ReactNode, conSottotitolo = true) => (
    <>
      <Link to="/area/dashboard" className="inline-flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground pointer-coarse:-my-2 pointer-coarse:min-h-9 pointer-coarse:py-2">
        <ArrowLeft className="size-3.5" aria-hidden /> Il tuo percorso
      </Link>
      <PageHeader titolo="Offerta" sottotitolo={conSottotitolo ? "Cosa vendi, a chi e a quanto. Aura legge quello che sa già di te e propone: tu correggi." : undefined} azioni={azioni} />
    </>
  );

  // L'offerta si fa per una persona: senza avatar pronto la pagina manda all'avatar (26/11/2026, tolta la versione breve).
  const avatarPronto = avatar.data?.mappa.passo === "fatto" && (avatar.data?.schede.length ?? 0) > 0;

  if (offerta.isLoading || avatar.isLoading) return <div className="grid gap-7">{intestazione()}<SkeletonBlocco altezza="h-96" /></div>;
  if (offerta.isError) return <div className="grid gap-7">{intestazione()}<ErroreCaricamento /></div>;
  const o = offerta.data;
  if (!avatarPronto && !o?.completa_fatta_il) {
    const iniziato = !!avatar.data;
    return (
      <div className="grid gap-7">
        {intestazione()}
        <section className="grid w-full max-w-[680px] gap-5 rounded-2xl border bg-card/70 p-6 md:p-8">
          <div className="flex items-start gap-4">
            <AuraSfera dimensione={56} conNome={false} />
            <div className="grid gap-2">
              <h2 className="text-[22px] leading-tight font-bold">Prima il tuo avatar</h2>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                L'offerta si costruisce per una persona precisa: la promessa, il prezzo e le risposte alle obiezioni partono da lei. {iniziato ? "Finisci il tuo avatar" : "Fai prima il tuo avatar"}, poi torna qui.
              </p>
            </div>
          </div>
          <div className="border-t pt-5">
            <Link to="/area/cervello/avatar" className={buttonVariants({ size: "lg" })}>
              {iniziato ? "Continua l'avatar" : "Vai all'avatar"} <ArrowRight aria-hidden />
            </Link>
          </div>
        </section>
      </div>
    );
  }
  if (!o) {
    return (
      <div className="grid gap-7">
        {intestazione()}
        <section className="grid w-full max-w-[680px] gap-5 rounded-2xl border bg-card/70 p-6 md:p-8">
          <div className="flex items-start gap-4">
            <AuraSfera dimensione={56} conNome={false} />
            <div className="grid gap-2">
              <h2 className="text-[22px] leading-tight font-bold">{nome ? `${nome}, cosa vendi?` : "Cosa vendi?"}</h2>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                Aura parte dal tuo avatar e costruisce con te l'offerta: promessa, prezzo e come la presenti.
              </p>
            </div>
          </div>
          {inizia.isPending ? (
            <PensieroAura fasi={FASI_AURA_OFFERTA} stima="Può volerci fino a un minuto." intervalloMs={9000} />
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

  const fatta = o.strada === "completa" ? !!o.completa_fatta_il : !!o.breve_fatta_il;
  const chat = auraScrive || (sceltaChat ?? !fatta);
  const vista: VistaMobile = chat ? (sceltaVista ?? "chat") : "carta";
  // A lavoro finito, con più gradini, prima la vetrina delle offerte; al clic la singola offerta.
  const gradini = o.scheda?.gradini ?? [];
  const conVetrina = fatta && gradini.length >= 2;
  const iCuore = gradini.findIndex((g) => g.livello === "cuore");
  const scelto = conVetrina && offertaAperta !== null ? gradini[offertaAperta] : undefined;
  const apri = (i: number | null) => {
    setOffertaAperta(i);
    scorriInCima();
  };
  const correzione = { onModifica: (m: { percorso: string; valore?: string | Record<string, string> | null }) => modifica.mutate(m), occupato: modifica.isPending || auraScrive };
  const scheda = !conVetrina ? (
    <SchedaOffertaNuova o={o} larga={!chat} {...correzione} />
  ) : !scelto || offertaAperta === null ? (
    <VetrinaOfferte o={o} onApri={apri} />
  ) : (
    <div className="grid gap-3">
      <Button variant="ghost" size="sm" className="-ml-2 justify-self-start" onClick={() => apri(null)}>
        <ArrowLeft aria-hidden /> Tutte le offerte
      </Button>
      {scelto.livello === "cuore" ? (
        <SchedaOffertaNuova o={o} gradino={offertaAperta} larga={!chat} {...correzione} />
      ) : (
        <SchedaGradino g={scelto} indice={offertaAperta} principale={gradini[iCuore]} {...correzione} onApriPrincipale={iCuore >= 0 ? () => apri(iCuore) : undefined} />
      )}
    </div>
  );
  const azioni = (
    <>
      {fatta ? <BottoneChat aperta={chat} disabilitato={auraScrive} onCambia={(v) => { setSceltaChat(v); setSceltaVista(null); setPiegati(v ? lista.length : 0); }} /> : null}
      <AltreAzioni
        voci={[
          { etichetta: "Scarica PDF", icona: FileDown, onClick: () => window.open(linkPdfOfferta(o.id), "_blank", "noopener") },
          { etichetta: "Ricomincia da capo", icona: RotateCcw, onClick: () => setRicomincia(true), distruttiva: true, disabilitata: auraScrive },
        ]}
      />
    </>
  );
  // Il passo dopo, in fondo alla pagina: dove si va quando questa fase è finita.
  const passoDopo = o.completa_fatta_il ? (
    <PassoDopo testo="Prossimo passo: il tuo posizionamento" href="/area/cervello/posizionamento" />
  ) : o.strada === "breve" && o.breve_fatta_il ? (
    <PassoDopo testo="Prossimo passo: il tuo avatar" href="/area/cervello/avatar" />
  ) : null;

  return (
    <div className="grid gap-5">
      {intestazione(azioni, !fatta)}
      <RicominciaOfferta offertaId={o.id} aperto={ricomincia} onOpenChange={setRicomincia} />
      {o.strada && !fatta ? <PassiOfferta o={o} /> : null}
      {chat ? <SceltaVista vista={vista} onCambia={setSceltaVista} seconda="Scheda" /> : null}

      <div className={cn("grid min-w-0 grid-cols-1 gap-6 lg:items-start", chat && "lg:grid-cols-[minmax(0,1fr)_minmax(440px,600px)]")}>
        <section
          id="chat-aura"
          aria-label="Conversazione con Aura"
          className={cn(
            "relative order-2 scroll-mt-[calc(var(--header-h)+1rem)] min-h-[360px] min-w-0 flex-col rounded-2xl border bg-card/70 h-[calc(var(--vh-finestra)-var(--header-h)-15rem)] md:h-auto md:min-h-[460px] lg:order-1 lg:h-[calc(var(--vh-finestra)-var(--header-h)-12rem)]",
            !chat ? "hidden" : vista === "chat" ? "flex" : "hidden md:flex",
          )}
        >
          {fatta ? (
            <Button variant="ghost" size="icon-sm" aria-label="Chiudi la chat" className="absolute top-2 right-2 z-10 text-muted-foreground" disabled={auraScrive} onClick={() => { setSceltaChat(false); setSceltaVista(null); setPiegati(0); }}>
              <X aria-hidden />
            </Button>
          ) : null}
          <div data-chat-scroll className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:thin] md:p-5" aria-live="polite">
            {messaggi.isLoading ? <SkeletonBlocco altezza="h-40" /> : null}
            {messaggi.isError ? <ErroreCaricamento /> : null}
            {messaggi.data && chat && piegati > 0 ? <InizioChatNuova nascosti={piegati} onMostra={() => setPiegati(0)} invito="Cosa vuoi cambiare? Il prezzo, la promessa, un bonus o una frase: dimmelo e aggiorno la scheda." /> : null}
            {messaggi.data && chat ? <FlussoAvatar messaggi={piegati > 0 ? lista.slice(piegati) : lista} pendente={pendenteVisibile === null ? null : pendenteVisibile.testo} occupato={invia.isPending} onRiprova={riprova} fasi={FASI_AURA_OFFERTA} stima="Può volerci fino a un minuto. Se serve, puoi fermarla." /> : null}
          </div>
          <div className="shrink-0 p-2 md:p-3">
            <ComposerAura focusAllApertura={piegati > 0} inAttesa={auraScrive} onInvia={manda} onFerma={auraScrive ? () => ferma(fermaRef.current) : undefined} suggerito={daRipristinare} onSuggeritoUsato={() => setDaRipristinare(undefined)} placeholder={fatta ? "Vuoi cambiare qualcosa? Dillo ad Aura…" : "Rispondi ad Aura…"} />
          </div>
        </section>

        <aside className={cn("order-1 grid min-w-0 grid-cols-1 content-start gap-5 lg:order-2", !chat || vista === "carta" ? "grid" : "hidden md:grid", !chat && "w-full max-w-[860px]")}>
          <AvvisiOfferta o={o} avatarAggiornatoIl={avatar.data?.mappa.updated_at ?? null} />
          <FermoOfferta fermo={o.fermo} />
          <FraseOfferta o={o} />
          {scheda}
          <OffertaDiPrima o={o} />
        </aside>
      </div>
      {!scelto && passoDopo ? <div className={cn(!chat && "max-w-[860px]")}>{passoDopo}</div> : null}
    </div>
  );
}
