import { useRef, useState } from "react";
import { ArrowLeft, PlayCircle, RotateCcw, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth";
import {
  DubbiAvatar,
  ElencoSchede,
  FASI_MAPPA,
  FlussoAvatar,
  InizioAvatar,
  LINK_LEZIONE_AVATAR,
  MappaPonte,
  PassiAvatar,
  RicominciaAvatar,
  SceltaVista,
  SchedaDocumento,
  useIniziaMappa,
  useFermaMappa,
  useInviaMappa,
  useMappaAvatar,
  useMessaggiMappa,
  useModificaRiga,
  type MessaggioMappa,
  type VistaMobile,
} from "@/features/avatar";
import { ComposerAura } from "@/features/idee";
import { primoNome } from "@/features/scheda";
import { Badge } from "@/shared/components/ui/badge";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { ErroreCaricamento, SkeletonBlocco } from "@/shared/components/layout/StatoCaricamento";
import { scorriInCima } from "@/shared/utils/scroll";
import { cn } from "@/lib/utils";
import { BottoneChat, InizioChatNuova } from "../components/BottoneChat";
import { PassoDopo } from "../components/percorso/PassoDopo";

/**
 * /area/cervello/avatar → la fase Avatar (dal 25/11/2026): UNA conversazione
 * con Aura (a sinistra) che costruisce la mappa disegnata a ponte e le schede
 * (a destra). In alto la barra dei passi; sopra il composer i tre dubbi.
 * Una scheda aperta prende tutta la larghezza («Torna alla mappa»).
 * A lavoro finito (26/11/2026) la conversazione sta chiusa e mappa e schede prendono tutta la
 * larghezza; «Parla con Aura» la riapre accanto, «Chiudi la chat» la richiude.
 */
export default function AvatarPage() {
  const { utente } = useAuth();
  const clienteId = utente?.id ?? "";
  const nome = primoNome(utente?.nombre);
  const [pendente, setPendente] = useState<{ testo: string; auraId: string | null } | null>(null);
  const [daRipristinare, setDaRipristinare] = useState<string | undefined>(undefined);
  const [sceltaVista, setSceltaVista] = useState<VistaMobile | null>(null);
  const [schedaAperta, setSchedaAperta] = useState<number | null>(null);
  /** A lavoro finito la chat sta chiusa: si riapre con «Parla con Aura». null = decide il passo. */
  const [sceltaChat, setSceltaChat] = useState<boolean | null>(null);
  /** Quanti messaggi vecchi piegare quando la chat si riapre a lavoro finito (0 = mostrali tutti). */
  const [piegati, setPiegati] = useState(0);

  const inizia = useIniziaMappa(clienteId);
  const invia = useInviaMappa(clienteId);
  const ferma = useFermaMappa(clienteId);
  const modifica = useModificaRiga(clienteId);
  const [attivo, setAttivo] = useState(false);
  const dati = useMappaAvatar(utente?.id, attivo || inizia.isPending);
  const mappaId = dati.data?.mappa.id;
  const messaggi = useMessaggiMappa(mappaId);
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
  function riprova(m: MessaggioMappa) {
    setPendente({ testo: "", auraId: null });
    invia.mutate({ riprovaId: m.id, signal: nuovoStop() }, { onSuccess: (r) => setPendente({ testo: "", auraId: r.messaggio_id }), onError: () => setPendente(null) });
  }
  function apriScheda(ordine: number | null) {
    setSchedaAperta(ordine);
    scorriInCima();
  }

  const intestazione = (
    <>
      <Link to="/area/dashboard" className="inline-flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground pointer-coarse:-my-2 pointer-coarse:min-h-9 pointer-coarse:py-2">
        <ArrowLeft className="size-3.5" aria-hidden /> Il tuo percorso
      </Link>
      <PageHeader
        occhiello={`Fondamenta${nome ? ` · ${nome}` : ""}`}
        titolo="Avatar"
        sottotitolo="A chi parlano i tuoi contenuti. Aura legge quello che sa già di te, fa l'analisi e ti propone la mappa: tu correggi."
        azioni={
          LINK_LEZIONE_AVATAR ? (
            <a href={LINK_LEZIONE_AVATAR} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
              <PlayCircle aria-hidden /> Lezione «A chi parli?»
            </a>
          ) : null
        }
      />
    </>
  );

  if (dati.isLoading) return <div className="grid gap-7">{intestazione}<SkeletonBlocco altezza="h-96" /></div>;
  if (dati.isError) return <div className="grid gap-7">{intestazione}<ErroreCaricamento /></div>;
  if (!dati.data) {
    return (
      <div className="grid gap-7">
        {intestazione}
        <InizioAvatar nome={nome} occupato={inizia.isPending} onInizia={(d) => inizia.mutate(d)} />
      </div>
    );
  }

  const { mappa, schede } = dati.data;
  const fatto = mappa.passo === "fatto";
  const chat = auraScrive || (sceltaChat ?? !fatto);
  const vista: VistaMobile = chat ? (sceltaVista ?? "chat") : "carta";
  const scheda = schedaAperta !== null ? schede.find((s) => s.ordine === schedaAperta) : undefined;
  const onModifica = (m: Parameters<typeof modifica.mutate>[0]) => modifica.mutate(m);

  return (
    <div className="grid gap-5">
      {intestazione}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1 basis-[420px]">
          <PassiAvatar passo={mappa.passo} />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={mappa.stato === "rivista" ? "active" : "neutral"} dot>
            {mappa.stato === "rivista" ? "Rivista da Wesley" : "Bozza"}
          </Badge>
          <RicominciaAvatar clienteId={clienteId} mappaId={mappa.id} disabilitato={auraScrive} />
          {fatto && !scheda ? <BottoneChat aperta={chat} disabilitato={auraScrive} onCambia={(v) => { setSceltaChat(v); setSceltaVista(null); setPiegati(v ? lista.length : 0); }} /> : null}
        </div>
      </div>

      {fatto && !scheda ? <PassoDopo testo="Il tuo avatar è pronto. Il prossimo passo è la tua offerta completa: mercato, promessa, prezzo." href="/area/cervello/offerta" /> : null}

      {scheda ? (
        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" size="sm" onClick={() => apriScheda(null)}>
              <ArrowLeft aria-hidden /> Torna alla mappa
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Chiudi la scheda" onClick={() => apriScheda(null)}>
              <X aria-hidden />
            </Button>
          </div>
          <SchedaDocumento scheda={scheda} stato={mappa.stato} onModifica={onModifica} occupato={modifica.isPending} ampia />
        </div>
      ) : null}

      {!scheda && chat ? <SceltaVista vista={vista} onCambia={setSceltaVista} seconda="Mappa" /> : null}

      <div className={cn("grid min-w-0 grid-cols-1 gap-6 lg:items-start", chat && "lg:grid-cols-[minmax(0,1fr)_minmax(440px,560px)]", scheda && "hidden")}>
        <section
          id="chat-aura"
          aria-label="Conversazione con Aura"
          className={cn(
            "relative order-2 scroll-mt-[calc(var(--header-h)+1rem)] min-h-[360px] min-w-0 flex-col rounded-2xl border bg-card/70 h-[calc(var(--vh-finestra)-var(--header-h)-15rem)] md:h-auto md:min-h-[460px] lg:order-1 lg:h-[calc(var(--vh-finestra)-var(--header-h)-12rem)]",
            !chat ? "hidden" : vista === "chat" ? "flex" : "hidden md:flex",
          )}
        >
          {fatto ? (
            <Button variant="ghost" size="icon-sm" aria-label="Chiudi la chat" className="absolute top-2 right-2 z-10 text-muted-foreground" disabled={auraScrive} onClick={() => { setSceltaChat(false); setSceltaVista(null); setPiegati(0); }}>
              <X aria-hidden />
            </Button>
          ) : null}
          <div data-chat-scroll className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:thin] md:p-5" aria-live="polite">
            {messaggi.isLoading ? <SkeletonBlocco altezza="h-40" /> : null}
            {messaggi.isError ? <ErroreCaricamento /> : null}
            {messaggi.data && chat && piegati > 0 ? <InizioChatNuova nascosti={piegati} onMostra={() => setPiegati(0)} invito="Cosa vuoi cambiare? Dimmi cosa non torna nella mappa o in una scheda, oppure chiedimi un altro avatar." /> : null}
            {messaggi.data && chat ? <FlussoAvatar messaggi={piegati > 0 ? lista.slice(piegati) : lista} pendente={pendenteVisibile === null ? null : pendenteVisibile.testo} occupato={invia.isPending} onRiprova={riprova} fasi={FASI_MAPPA} stima="Può volerci fino a un minuto. Se serve, puoi fermarla." /> : null}
          </div>
          <div className="grid shrink-0 gap-2 p-2 md:p-3">
            <DubbiAvatar compatti onDubbio={manda} disabilitato={auraScrive} />
            <ComposerAura
              focusAllApertura={piegati > 0}
              inAttesa={auraScrive}
              onInvia={manda}
              onFerma={auraScrive ? () => ferma(fermaRef.current) : undefined}
              suggerito={daRipristinare}
              onSuggeritoUsato={() => setDaRipristinare(undefined)}
              placeholder={fatto ? "Vuoi cambiare qualcosa? Dillo ad Aura…" : "Rispondi ad Aura…"}
            />
          </div>
        </section>

        <aside className={cn("order-1 grid min-w-0 content-start gap-5 lg:order-2", !chat || vista === "carta" ? "grid" : "hidden md:grid")}>
          <MappaPonte mappa={mappa} schede={schede} onModifica={onModifica} occupato={modifica.isPending} />
          <ElencoSchede schede={schede} onApri={apriScheda} />
          {mappa.convertita ? (
            <p className="flex items-start gap-2 text-[13px] text-muted-foreground">
              <RotateCcw className="mt-0.5 size-3.5 shrink-0" aria-hidden /> Questa mappa è nata dagli avatar che avevi già scritto con Aura: le righe «lettura» sono da confermare.
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
