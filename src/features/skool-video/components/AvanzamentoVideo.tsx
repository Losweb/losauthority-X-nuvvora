import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { useCambiaStatoVideo, type VideoCompleto } from "../hooks/useSkoolVideo";
import { SOGLIA_CAPITOLI_SEC } from "../types";

/** Cosa sta succedendo a un video in lavorazione (o in errore, con i pulsanti per ripartire). */
export function AvanzamentoVideo({ video }: { video: VideoCompleto }) {
  const cambia = useCambiaStatoVideo();
  const blocchi = video.skool_video_blocchi;
  const fatti = blocchi.filter((b) => b.stato === "fatto").length;
  const tipo = video.durata_sec >= SOGLIA_CAPITOLI_SEC ? "i capitoli" : "il riassunto";

  if (video.stato === "caricamento") {
    return <Alert><AlertTitle>Caricamento interrotto</AlertTitle><AlertDescription>I blocchi audio non sono arrivati tutti. Elimina questo video e caricalo di nuovo.</AlertDescription></Alert>;
  }
  if (video.stato === "trascrizione") {
    return (
      <div className="grid gap-2 rounded-lg border bg-card p-4">
        <p className="text-sm font-medium">Trascrizione in corso</p>
        <Progress value={Math.round((fatti / Math.max(1, blocchi.length)) * 100)} />
        <p className="text-xs text-muted-foreground">
          {fatti} blocchi su {blocchi.length} (ognuno da 10 minuti). Puoi chiudere la pagina: quando il testo è pronto arriva un messaggio su Telegram.
        </p>
      </div>
    );
  }
  if (video.stato === "scrittura") {
    return (
      <div className="grid gap-2 rounded-lg border bg-card p-4">
        <p className="text-sm font-medium">Aura sta scrivendo {tipo}</p>
        <Progress value={null} />
        <p className="text-xs text-muted-foreground">Di solito ci vuole un minuto. La pagina si aggiorna da sola.</p>
      </div>
    );
  }
  if (video.stato === "pubblicazione") {
    return (
      <div className="grid gap-2 rounded-lg border bg-card p-4">
        <p className="text-sm font-medium">Creo la lezione su Skool</p>
        <Progress value={null} />
        <p className="text-xs text-muted-foreground">Pochi secondi: il testo va nella classroom.</p>
      </div>
    );
  }
  if (video.stato === "errore") {
    const dopoTrascrizione = !!video.trascrizione;
    return (
      <Alert variant="destructive">
        <AlertTitle>Qualcosa non è andato</AlertTitle>
        <AlertDescription>
          <p>{video.errore ?? "Errore sconosciuto."}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {dopoTrascrizione ? (
              <Button size="sm" variant="outline" disabled={cambia.isPending} onClick={() => cambia.mutate({ id: video.id, stato: "scrittura" })}>
                Fai riscrivere il testo ad Aura
              </Button>
            ) : null}
            <Button size="sm" variant="outline" disabled={cambia.isPending} onClick={() => cambia.mutate({ id: video.id, stato: "trascrizione" })}>
              Riprova la trascrizione
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }
  return null;
}
