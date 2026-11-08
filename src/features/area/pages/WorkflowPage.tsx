import { useMemo, useState } from "react";
import { CalendarDays, Columns3, Plus } from "lucide-react";
import { useAuth } from "@/features/auth";
import { primoNome } from "@/features/scheda";
import {
  BoardContenuti,
  CalendarioContenuti,
  ContenutoDialog,
  mappaTipologie,
  useContenuti,
  useRipianificaContenuto,
  useSpostaContenuto,
  useTipologie,
  type Contenuto,
  type ContenutoPredefiniti,
} from "@/features/contenuti";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { ErroreCaricamento, SkeletonBlocco } from "@/shared/components/layout/StatoCaricamento";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

type Vista = "board" | "calendario";

const SUGGERIMENTO: Record<Vista, string> = {
  board: "Trascina una card per cambiarle stato.",
  calendario: "Tocca un giorno per aggiungere uno script o un video, trascina una card per spostarla.",
};

interface StatoDialog {
  open: boolean;
  /** null → nuova idea. */
  contenuto: Contenuto | null;
  /** Giorno e fase scelti dal calendario per una nuova idea. */
  predefiniti?: ContenutoPredefiniti;
}

/** /area/workflow → pipeline dei video del cliente: tabella per stato o calendario per data prevista. */
export default function WorkflowPage() {
  const { utente } = useAuth();
  const clienteId = utente?.id ?? "";
  const contenuti = useContenuti(utente?.id);
  // Le tipologie (predefinite + proprie) servono a card, calendario e popup; qui si leggono una volta sola.
  const tipologie = useTipologie();
  const mappa = useMemo(() => mappaTipologie(tipologie.data), [tipologie.data]);
  const sposta = useSpostaContenuto(clienteId);
  const ripianifica = useRipianificaContenuto(clienteId);
  const [vista, setVista] = useState<Vista>("board");
  const [dialog, setDialog] = useState<StatoDialog>({ open: false, contenuto: null });

  if (!utente) return null;
  const nome = primoNome(utente.nombre);
  const totale = contenuti.data?.length ?? 0;
  const pubblicati = contenuti.data?.filter((c) => c.stato === "pubblicato").length ?? 0;
  const conteggio =
    totale > 0
      ? `${totale} ${totale === 1 ? "contenuto" : "contenuti"} · ${pubblicati} ${pubblicati === 1 ? "pubblicato" : "pubblicati"}.`
      : "Le idee dei tuoi video, dalla scrittura alla pubblicazione.";
  const apri = (c: Contenuto) => setDialog({ open: true, contenuto: c });
  const nuovo = (predefiniti?: ContenutoPredefiniti) => setDialog({ open: true, contenuto: null, predefiniti });

  return (
    <div className="grid gap-2">
      <PageHeader
        occhiello={`Il tuo percorso${nome ? ` · ${nome}` : ""}`}
        titolo="Workflow"
        sottotitolo={`${conteggio} ${SUGGERIMENTO[vista]}`}
        azioni={
          <>
            <Tabs value={vista} onValueChange={(v) => setVista(v === "calendario" ? "calendario" : "board")}>
              {/* Su touch il segmented control cresce: le due voci arrivano a 36 px. */}
              <TabsList aria-label="Vista" className="pointer-coarse:min-h-[42px]">
                <TabsTrigger value="board" className="pointer-coarse:min-h-9">
                  <Columns3 aria-hidden /> Tabella
                </TabsTrigger>
                <TabsTrigger value="calendario" className="pointer-coarse:min-h-9">
                  <CalendarDays aria-hidden /> Calendario
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button size="sm" onClick={() => nuovo()}>
              <Plus aria-hidden />
              Nuova idea
            </Button>
          </>
        }
      />

      {contenuti.isLoading ? <SkeletonBlocco altezza="h-64" /> : null}
      {contenuti.isError ? <ErroreCaricamento /> : null}
      {contenuti.data && vista === "board" ? (
        <BoardContenuti contenuti={contenuti.data} tipologie={mappa} onApri={apri} onSposta={(id, stato) => sposta.mutate({ id, stato })} />
      ) : null}
      {contenuti.data && vista === "calendario" ? (
        <CalendarioContenuti
          contenuti={contenuti.data}
          tipologie={tipologie.data ?? []}
          onApri={apri}
          onRipianifica={(id, data) => ripianifica.mutate({ id, pubblicazione_prevista: data })}
          onNuovo={(data, stato) => nuovo({ pubblicazione_prevista: data, stato })}
        />
      ) : null}

      <ContenutoDialog
        clienteId={clienteId}
        open={dialog.open}
        contenuto={dialog.contenuto}
        predefiniti={dialog.predefiniti}
        tipologie={tipologie.data ?? []}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      />
    </div>
  );
}
