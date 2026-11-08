import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PanelLeftOpen, Plus } from "lucide-react";
import { useAuth } from "@/features/auth";
import { primoNome } from "@/features/scheda";
import {
  BARRA_COMPOSER,
  ComposerAura,
  FlussoMessaggi,
  RailSessioni,
  SheetIdeeSalvate,
  StudioVuoto,
  useCambiaStatoIdea,
  useIdeeSalvate,
  useInviaAdAura,
  usePortaNelWorkflow,
  useSessione,
  useSessioni,
  useStili,
  type Idea,
  type Messaggio,
} from "@/features/idee";
import { ErroreCaricamento, SkeletonBlocco } from "@/shared/components/layout/StatoCaricamento";
import { Button } from "@/shared/components/ui/button";
import { eInvioFermato } from "@/shared/utils/invocaEdge";
import { cn } from "@/lib/utils";

/**
 * /area/crea-idee → lo "studio" di Aura: a sinistra le sessioni, al centro la
 * conversazione con le proposte sotto ogni risposta, in basso il composer.
 * Con "/" nel composer (o arrivando da /area/stili con ?stile=) si aggancia
 * uno stile della pagina Stili: Aura scrive le proposte in quel format. Lo
 * stile resta agganciato per tutta la sessione (riaprendola torna quello
 * dell'ultimo messaggio) finché il cliente non lo toglie.
 */
export default function CreaIdeePage() {
  const { utente } = useAuth();
  const clienteId = utente?.id ?? "";
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessioneId, setSessioneId] = useState<string | null>(null);
  const [spunto, setSpunto] = useState<string | undefined>(undefined);
  /** Pannello conversazioni: chiuso all'ingresso, la chat prende tutta la larghezza. */
  const [railAperto, setRailAperto] = useState(false);
  /**
   * Stile scelto a mano in questa sessione (da "/", dalla X della chip o dal link "Usa in Crea idee").
   * undefined = nessuna scelta: vale lo stile dell'ultimo messaggio della sessione.
   */
  const [stileManuale, setStileManuale] = useState<string | null | undefined>(() => searchParams.get("stile") ?? undefined);
  /**
   * Invio in corso: sessione da cui è partito (null = nuova), testo del cliente ("" per una riprova),
   * stile agganciato e id della risposta Aura attesa. Si vede SOLO in quella sessione.
   */
  const [pendente, setPendente] = useState<{ sessioneId: string | null; testo: string; stileId: string | null; auraId: string | null } | null>(null);
  /** Per il tasto stop: interrompe la richiesta in corso. */
  const fermaRef = useRef<AbortController | null>(null);
  /** Sessione a schermo, letta dalle callback dell'invio (che arrivano dopo, quando magari il cliente è altrove). */
  const sessioneAperta = useRef(sessioneId);
  useEffect(() => {
    sessioneAperta.current = sessioneId;
  }, [sessioneId]);

  const sessioni = useSessioni(utente?.id);
  const sessione = useSessione(sessioneId);
  const salvate = useIdeeSalvate(utente?.id);
  const stili = useStili(utente?.id);
  const invia = useInviaAdAura(clienteId);
  const cambia = useCambiaStatoIdea(clienteId);
  const porta = usePortaNelWorkflow(clienteId);

  // ?stile= serve solo all'arrivo: lo togliamo dall'URL per non riagganciarlo a ogni ricarica.
  useEffect(() => {
    if (searchParams.has("stile")) setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  // Il segnaposto "Aura pensa" resta finché la risposta vera non compare tra i messaggi caricati (derivato, niente effetti),
  // e solo nella sessione da cui è partito: aprendo un'altra conversazione o "Nuova sessione" non ci deve comparire.
  const rispostaArrivata = pendente?.auraId != null && (sessione.data?.messaggi.some((m) => m.id === pendente.auraId) ?? false);
  const pendenteVisibile = pendente !== null && pendente.sessioneId === sessioneId && !rispostaArrivata ? pendente : null;

  if (!utente) return null;
  const nome = primoNome(utente.nombre);
  const occupato = cambia.isPending || porta.isPending;
  // Solo quello che succede nella sessione a schermo: un invio partito da un'altra non blocca questa.
  const auraScrive = pendenteVisibile !== null || (sessione.data?.messaggi.some((m) => m.stato === "in_corso") ?? false);
  const listaStili = stili.data ?? [];
  const stileDellaSessione = (sessione.data?.messaggi.filter((m) => m.ruolo === "cliente").at(-1)?.stile_id ?? null);
  const stileId = stileManuale !== undefined ? stileManuale : stileDellaSessione;
  const stileScelto = stileId ? (listaStili.find((s) => s.id === stileId && s.stato === "pronta") ?? null) : null;

  /** Apre una sessione (null = nuova): lo stile riparte da quello della sessione aperta. */
  function apriSessione(id: string | null) {
    setSessioneId(id);
    setStileManuale(undefined);
  }

  function nuovoFerma() {
    const controller = new AbortController();
    fermaRef.current = controller;
    return controller.signal;
  }

  function manda(testo: string) {
    const conStile = stileScelto?.id ?? null;
    const da = sessioneId;
    setPendente({ sessioneId: da, testo, stileId: conStile, auraId: null });
    // Lo stile resta agganciato: i messaggi dopo il primo continuano nello stesso format.
    setStileManuale(conStile);
    invia.mutate(
      { sessioneId: da, messaggio: testo, stileId: conStile, signal: nuovoFerma() },
      {
        onSuccess: (r) => {
          // Se il cliente nel frattempo ha aperto un'altra conversazione non lo riportiamo indietro.
          if (sessioneAperta.current === da) setSessioneId(r.sessione_id);
          setPendente({ sessioneId: r.sessione_id, testo, stileId: conStile, auraId: r.messaggio_id });
        },
        onError: (err) => {
          setPendente(null);
          // Il testo torna nel composer: non si perde quello che il cliente ha scritto.
          // Fermato in una sessione esistente il messaggio è già nella conversazione (con «Riprova»).
          if (!eInvioFermato(err) || da === null) setSpunto(testo);
        },
      },
    );
  }
  function riprova(m: Messaggio) {
    setPendente({ sessioneId: m.sessione_id, testo: "", stileId: null, auraId: null });
    invia.mutate(
      { riprovaId: m.id, sessioneId: m.sessione_id, signal: nuovoFerma() },
      {
        onSuccess: (r) => setPendente({ sessioneId: m.sessione_id, testo: "", stileId: null, auraId: r.messaggio_id }),
        onError: () => setPendente(null),
      },
    );
  }
  /** Tasto stop: chiude la richiesta, aura-idee se ne accorge e segna la risposta come fermata. */
  function ferma() {
    fermaRef.current?.abort();
    fermaRef.current = null;
  }
  const salva = (idea: Idea) => cambia.mutate({ idea, stato: "salvata" });
  const scarta = (idea: Idea) => cambia.mutate({ idea, stato: "scartata" });
  const workflow = (idea: Idea) => porta.mutate(idea);

  // Con un invio in corso su una sessione nuova mostriamo già il flusso, non la schermata vuota.
  const vuota = sessioneId === null && pendenteVisibile === null;
  const messaggi = sessione.data?.messaggi ?? [];
  const idee = sessione.data?.idee ?? [];
  // Una riprova mostra solo Aura che pensa (il messaggio del cliente è già nel flusso).
  const testoPendente = pendenteVisibile === null ? null : pendenteVisibile.testo;
  const stilePendente = pendenteVisibile?.stileId ? (listaStili.find((s) => s.id === pendenteVisibile.stileId)?.titolo ?? null) : null;

  return (
    // Pagina fissa: scorre solo la conversazione. Il main dello shell ha pt-10 + pb-20: con -mt-4 e -mb-16
    // il composer arriva a 1rem dal fondo della finestra e la pagina non scorre.
    // Sul telefono scorre la pagina e il composer resta incollato in basso (sticky); -mb-16 annulla il pb-16 del main.
    <div
      className={cn(
        // grid-rows minmax(0,1fr): la riga è alta quanto il contenitore anche se la chat è lunga (Safari incluso).
        "-mb-16 grid gap-6 md:-mb-10 md:h-[calc(var(--vh-finestra)-var(--header-h)-1.5rem)] md:grid-rows-[minmax(0,1fr)] md:overflow-hidden",
        railAperto && "lg:grid-cols-[220px_minmax(0,1fr)]",
      )}
    >
      {railAperto ? (
        <div className="hidden min-h-0 lg:block">
          <RailSessioni
            sessioni={sessioni.data ?? []}
            correnteId={sessioneId}
            onApri={apriSessione}
            onNuova={() => apriSessione(null)}
            onChiudi={() => setRailAperto(false)}
          />
        </div>
      ) : null}

      <section className="flex min-h-0 min-w-0 flex-col" aria-label="Studio di Aura">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {!railAperto ? (
              <Button
                size="icon"
                variant="outline"
                className="hidden text-muted-foreground lg:inline-flex"
                aria-label="Mostra conversazioni"
                title="Mostra conversazioni"
                onClick={() => setRailAperto(true)}
              >
                <PanelLeftOpen aria-hidden />
              </Button>
            ) : null}
            <div>
              <p className="eyebrow">Il tuo percorso{nome ? ` · ${nome}` : ""}</p>
              <h2 className="text-[28px] leading-tight">Crea idee</h2>
            </div>
          </div>
          {/* Su telefono il gruppo va a capo e si stringe (la select per prima): «Salvate» resta visibile. */}
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            {!railAperto ? (
              <Button size="sm" variant="outline" className="hidden lg:inline-flex" disabled={sessioneId === null} onClick={() => apriSessione(null)}>
                <Plus aria-hidden /> Nuova sessione
              </Button>
            ) : null}
            <select
              aria-label="Sessione"
              className="h-8 max-w-[180px] min-w-0 flex-1 rounded-sm border bg-card px-2 text-base pointer-coarse:h-9 sm:flex-none md:text-sm lg:hidden"
              value={sessioneId ?? ""}
              onChange={(e) => apriSessione(e.target.value || null)}
            >
              <option value="">Nuova sessione</option>
              {(sessioni.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.titolo}
                </option>
              ))}
            </select>
            <SheetIdeeSalvate idee={salvate.data ?? []} occupato={occupato} onScarta={scarta} onWorkflow={workflow} />
          </div>
        </header>

        <div data-chat-scroll className="min-h-0 flex-1 overflow-y-auto px-1 pb-4 [scrollbar-width:thin]" aria-live="polite">
          {vuota ? <StudioVuoto nome={nome} onSpunto={setSpunto} /> : null}
          {!vuota && sessioneId !== null && sessione.isLoading ? <SkeletonBlocco altezza="h-48" /> : null}
          {!vuota && sessione.isError ? <ErroreCaricamento /> : null}
          {!vuota && (sessione.data || sessioneId === null) ? (
            <FlussoMessaggi
              messaggi={messaggi}
              idee={idee}
              stili={listaStili}
              pendente={testoPendente}
              pendenteStile={stilePendente}
              occupato={occupato}
              onRiprova={riprova}
              onSalva={salva}
              onScarta={scarta}
              onWorkflow={workflow}
            />
          ) : null}
        </div>

        <div className={BARRA_COMPOSER}>
          <ComposerAura
            auraViva={!vuota}
            inAttesa={auraScrive}
            onInvia={manda}
            onFerma={pendenteVisibile !== null && pendenteVisibile.auraId === null ? ferma : undefined}
            suggerito={spunto}
            onSuggeritoUsato={() => setSpunto(undefined)}
            stili={listaStili}
            stileScelto={stileScelto}
            onStileChange={(s) => setStileManuale(s?.id ?? null)}
          />
        </div>
      </section>
    </div>
  );
}
