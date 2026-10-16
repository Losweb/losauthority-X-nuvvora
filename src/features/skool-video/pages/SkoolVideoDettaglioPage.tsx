import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { ErroreCaricamento, SkeletonBlocco, StatoVuoto } from "@/shared/components/layout/StatoCaricamento";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { formatDateTime } from "@/shared/utils/formatDate";
import { AvanzamentoVideo } from "../components/AvanzamentoVideo";
import { StatoVideoBadge } from "../components/StatoVideoBadge";
import { TestoLezione } from "../components/TestoLezione";
import { TrascrizionePannello } from "../components/TrascrizionePannello";
import { useEliminaVideo, useVideo } from "../hooks/useSkoolVideo";
import { dimensioneLeggibile, durataLeggibile, SOGLIA_CAPITOLI_SEC } from "../types";

/** Dettaglio di un video: avanzamento mentre lavora, testo da rivedere e pubblicare quando è pronto. */
export default function SkoolVideoDettaglioPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const video = useVideo(id);
  const elimina = useEliminaVideo();
  const [confermaElimina, setConfermaElimina] = useState(false);
  const v = video.data;

  const indietro = (
    <Link to="/skool-video" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden="true" /> Skool Video
    </Link>
  );

  if (video.isPending) return <div className="grid gap-4">{indietro}<SkeletonBlocco /></div>;
  if (video.isError) return <div className="grid gap-4">{indietro}<ErroreCaricamento /></div>;
  if (!v) return <div className="grid gap-4">{indietro}<StatoVuoto titolo="Video non trovato" /></div>;

  const conTesto = v.stato === "bozza" || v.stato === "pubblicato";
  const dove = v.cartella_titolo ? `${v.corso_titolo} › ${v.cartella_titolo}` : v.corso_titolo;

  return (
    <div className="grid gap-6">
      {indietro}
      <PageHeader
        occhiello={dove}
        titolo={v.titolo}
        azioni={<StatoVideoBadge stato={v.stato} />}
      />
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Durata</dt>
          <dd className="font-medium">{durataLeggibile(v.durata_sec)} · {v.durata_sec >= SOGLIA_CAPITOLI_SEC ? "capitoli" : "riassunto"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">File</dt>
          <dd className="truncate font-medium" title={v.nome_file ?? ""}>{v.nome_file ?? "—"} {dimensioneLeggibile(v.dimensione_byte)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Caricato</dt>
          <dd className="font-medium">{formatDateTime(v.created_at)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Pubblicato</dt>
          <dd className="font-medium">{v.pubblicato_il ? formatDateTime(v.pubblicato_il) : "—"}</dd>
        </div>
      </dl>
      {pubblicatoConAvviso(v.stato, v.errore)}
      {conTesto ? <TestoLezione key={v.updated_at} video={v} /> : <AvanzamentoVideo video={v} />}
      {v.trascrizione ? <TrascrizionePannello testo={v.trascrizione} /> : null}
      <div className="border-t pt-4">
        <Button variant="ghost" className="text-destructive" onClick={() => setConfermaElimina(true)}>
          <Trash2 className="size-4" aria-hidden="true" /> Elimina dal gestionale
        </Button>
      </div>
      <AlertDialog open={confermaElimina} onOpenChange={setConfermaElimina}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo video?</AlertDialogTitle>
            <AlertDialogDescription>
              Cancella trascrizione, testo e blocchi audio dal gestionale. {v.skool_url ? "La lezione già creata su Skool resta com'è." : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => elimina.mutate(v.id, { onSuccess: () => navigate("/skool-video") })}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Un video pubblicato può avere una nota (es. transcript rifiutato da Skool). */
function pubblicatoConAvviso(stato: string, errore: string | null) {
  if (stato !== "pubblicato" || !errore) return null;
  return <p className="rounded-lg border border-status-expiring/40 bg-status-expiring-soft p-3 text-sm">{errore}</p>;
}
