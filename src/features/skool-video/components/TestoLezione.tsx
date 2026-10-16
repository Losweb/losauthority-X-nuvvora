import { useState } from "react";
import { ExternalLink, Sparkles, Upload } from "lucide-react";
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
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { useCambiaStatoVideo, useSalvaTesto, type VideoCompleto } from "../hooks/useSkoolVideo";
import { tempo } from "../types";

const NOTA_MARKDOWN = "Il testo è in markdown, come lo mostra Skool: «## 🔑 Titolo» per le sezioni, «- » per gli elenchi, **grassetto**, righe «💡 Nota:», «⚠️ Attenzione:», «✅ Risultato:».";

interface CapitoloBozza {
  id: string;
  inizio_sec: number;
  titolo: string;
  testo: string;
}

/** Il testo scritto da Aura, da rivedere e pubblicare (o già pubblicato: si può ancora correggere qui). */
export function TestoLezione({ video }: { video: VideoCompleto }) {
  const salva = useSalvaTesto();
  const cambia = useCambiaStatoVideo();
  const [titolo, setTitolo] = useState(video.titolo);
  const [apertura, setApertura] = useState(video.apertura ?? "");
  const [riassunto, setRiassunto] = useState(video.riassunto ?? "");
  const [capitoli, setCapitoli] = useState<CapitoloBozza[]>(
    video.skool_video_capitoli.map((c) => ({ id: c.id, inizio_sec: c.inizio_sec, titolo: c.titolo, testo: c.testo ?? "" })),
  );
  const [confermaPubblica, setConfermaPubblica] = useState(false);
  const bozza = video.stato === "bozza";
  const pubblicato = video.stato === "pubblicato";
  const modificato =
    titolo !== video.titolo ||
    apertura !== (video.apertura ?? "") ||
    riassunto !== (video.riassunto ?? "") ||
    capitoli.some((c, i) => c.titolo !== video.skool_video_capitoli[i]?.titolo || c.testo !== (video.skool_video_capitoli[i]?.testo ?? ""));

  function aggiornaCapitolo(id: string, campo: "titolo" | "testo", valore: string) {
    setCapitoli((lista) => lista.map((c) => (c.id === id ? { ...c, [campo]: valore } : c)));
  }

  function salvaTesto() {
    salva.mutate({
      id: video.id,
      titolo: titolo.trim() || video.titolo,
      apertura: apertura.trim() || null,
      riassunto: video.tipo_testo === "riassunto" ? riassunto.trim() || null : null,
      capitoli: capitoli.map((c) => ({ id: c.id, titolo: c.titolo.trim() || "Capitolo", testo: c.testo.trim() || null })),
    });
  }

  async function pubblica() {
    if (modificato) await salva.mutateAsync({ id: video.id, titolo: titolo.trim() || video.titolo, apertura: apertura.trim() || null, riassunto: video.tipo_testo === "riassunto" ? riassunto.trim() || null : null, capitoli: capitoli.map((c) => ({ id: c.id, titolo: c.titolo.trim() || "Capitolo", testo: c.testo.trim() || null })) });
    cambia.mutate({ id: video.id, stato: "pubblicazione" });
  }

  return (
    <div className="grid gap-5">
      {pubblicato && video.skool_url ? (
        <div className="rounded-lg border border-status-active/40 bg-status-active-soft p-4">
          <p className="font-medium">La lezione è su Skool. Ora carica il video dentro la lezione.</p>
          <p className="mt-1 text-sm text-muted-foreground">Apri la lezione, aggiungi il video (caricalo o incolla il link) e salva: testo e transcript ci sono già.</p>
          <Button className="mt-3" render={<a href={video.skool_url} target="_blank" rel="noreferrer" />}>
            Apri la lezione su Skool <ExternalLink className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ) : null}
      <div className="grid gap-1.5">
        <Label htmlFor="sv-titolo">Titolo</Label>
        <Input id="sv-titolo" value={titolo} maxLength={200} onChange={(e) => setTitolo(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="sv-apertura">Apertura</Label>
        <Textarea id="sv-apertura" value={apertura} rows={3} maxLength={2000} onChange={(e) => setApertura(e.target.value)} />
      </div>
      {video.tipo_testo === "riassunto" ? (
        <div className="grid gap-1.5">
          <Label htmlFor="sv-riassunto">Riassunto</Label>
          <Textarea id="sv-riassunto" value={riassunto} rows={18} maxLength={8000} className="font-mono text-sm" onChange={(e) => setRiassunto(e.target.value)} />
          <p className="text-xs text-muted-foreground">{NOTA_MARKDOWN}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          <p className="eyebrow">Capitoli · {capitoli.length}</p>
          <ol className="grid gap-3">
            {capitoli.map((c, i) => (
              <li key={c.id} className="grid gap-2 rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2">
                  <span className="figure w-16 shrink-0 text-sm text-muted-foreground tabular-nums">{tempo(c.inizio_sec)}</span>
                  <Input value={c.titolo} maxLength={120} aria-label={`Titolo del capitolo ${i + 1}`} onChange={(e) => aggiornaCapitolo(c.id, "titolo", e.target.value)} />
                </div>
                <Textarea value={c.testo} rows={5} maxLength={1500} className="font-mono text-sm" aria-label={`Testo del capitolo ${i + 1}`} onChange={(e) => aggiornaCapitolo(c.id, "testo", e.target.value)} />
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted-foreground">{NOTA_MARKDOWN}</p>
        </div>
      )}
      {video.parole_chiave.length > 0 ? (
        <p className="text-xs text-muted-foreground">Parole chiave per il catalogo: {video.parole_chiave.join(", ")}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" disabled={!modificato || salva.isPending} onClick={salvaTesto}>
          {salva.isPending ? "Salvo…" : "Salva le modifiche"}
        </Button>
        {bozza ? (
          <>
            <Button variant="outline" disabled={cambia.isPending} onClick={() => cambia.mutate({ id: video.id, stato: "scrittura" })}>
              <Sparkles className="size-4" aria-hidden="true" /> Riscrivi con Aura
            </Button>
            <Button disabled={cambia.isPending || salva.isPending} onClick={() => setConfermaPubblica(true)}>
              <Upload className="size-4" aria-hidden="true" /> Pubblica su Skool
            </Button>
          </>
        ) : null}
      </div>
      <AlertDialog open={confermaPubblica} onOpenChange={setConfermaPubblica}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pubblicare la lezione su Skool?</AlertDialogTitle>
            <AlertDialogDescription>
              Creo la lezione «{titolo.trim() || video.titolo}» in {video.cartella_titolo ? `${video.corso_titolo} › ${video.cartella_titolo}` : video.corso_titolo} con questo testo e la trascrizione. Il video lo aggiungi tu dopo, dentro Skool.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => void pubblica()}>Pubblica</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
