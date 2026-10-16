import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Progress } from "@/shared/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useCaricaVideo, type FaseCaricamento } from "../hooks/useCaricaVideo";
import { useCartelleSkool, useCorsiSkool } from "../hooks/useSkoolVideo";
import { dimensioneLeggibile } from "../types";

interface NuovoVideoDialogProps {
  aperto: boolean;
  onChiudi: () => void;
}

const NESSUNA_CARTELLA = "";

function titoloDaNomeFile(nome: string): string {
  return nome.replace(/\.[a-z0-9]{1,5}$/i, "").replace(/[_-]+/g, " ").trim().slice(0, 200);
}

function descrizioneFase(f: FaseCaricamento): { testo: string; percento: number | null } {
  switch (f.fase) {
    case "motore":
      return { testo: "Preparo il motore audio (la prima volta scarica ~30 MB)…", percento: null };
    case "estrazione":
      return { testo: `Estraggo l'audio dal video… ${f.percento}%`, percento: f.percento };
    case "caricamento":
      return { testo: `Carico i blocchi audio: ${f.fatti} di ${f.totale}`, percento: Math.round((f.fatti / Math.max(1, f.totale)) * 100) };
    default:
      return { testo: "", percento: null };
  }
}

/** Popup «Nuovo video»: file + titolo + corso (e cartella) → audio estratto qui, poi parte la coda. */
export function NuovoVideoDialog({ aperto, onChiudi }: NuovoVideoDialogProps) {
  const navigate = useNavigate();
  const { utente } = useAuth();
  const { fase, inCorso, carica, azzera } = useCaricaVideo();
  const [file, setFile] = useState<File | null>(null);
  const [titolo, setTitolo] = useState("");
  const [corsoId, setCorsoId] = useState("");
  const [cartellaId, setCartellaId] = useState(NESSUNA_CARTELLA);
  const corsi = useCorsiSkool(aperto);
  const cartelle = useCartelleSkool(corsoId);

  const corsiItems = useMemo(() => {
    const voci: Record<string, string> = { "": corsi.isPending ? "Leggo i corsi da Skool…" : "Scegli il corso…" };
    for (const c of corsi.data ?? []) voci[c.id] = c.titolo;
    return voci;
  }, [corsi.data, corsi.isPending]);
  const cartelleItems = useMemo(() => {
    const voci: Record<string, string> = { [NESSUNA_CARTELLA]: "Direttamente nel corso" };
    for (const c of cartelle.data ?? []) voci[c.id] = c.titolo;
    return voci;
  }, [cartelle.data]);

  const corso = corsi.data?.find((c) => c.id === corsoId) ?? null;
  const cartella = cartelle.data?.find((c) => c.id === cartellaId) ?? null;
  const pronto = !!file && titolo.trim().length >= 3 && !!corso && !!utente && !inCorso;
  const avanzamento = descrizioneFase(fase);

  function chiudi() {
    if (inCorso) return;
    azzera();
    setFile(null);
    setTitolo("");
    setCorsoId("");
    setCartellaId(NESSUNA_CARTELLA);
    onChiudi();
  }

  async function avvia() {
    if (!file || !corso || !utente) return;
    const id = await carica({ file, titolo: titolo.trim(), corso, cartella, utenteId: utente.id });
    if (id) {
      chiudi();
      navigate(`/skool-video/${id}`);
    }
  }

  return (
    <Dialog open={aperto} onOpenChange={(open) => (open ? null : chiudi())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuovo video per Skool</DialogTitle>
          <DialogDescription>
            Il video resta sul tuo computer: da qui parte solo l'audio. Aura lo trascrive, scrive il testo della lezione e tu lo pubblichi su Skool.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="skool-file">Video</Label>
            <Input
              id="skool-file"
              type="file"
              accept="video/*,audio/*,.mp4,.mov,.m4a,.mp3"
              disabled={inCorso}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !titolo) setTitolo(titoloDaNomeFile(f.name));
              }}
            />
            {file ? <p className="text-xs text-muted-foreground">{file.name} · {dimensioneLeggibile(file.size)}</p> : null}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="skool-titolo">Titolo della lezione</Label>
            <Input id="skool-titolo" value={titolo} maxLength={200} disabled={inCorso} onChange={(e) => setTitolo(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Corso su Skool</Label>
            <Select value={corsoId} items={corsiItems} disabled={inCorso || corsi.isPending} onValueChange={(v) => { setCorsoId(v ?? ""); setCartellaId(NESSUNA_CARTELLA); }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(corsi.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.titolo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {corsi.isError ? <p className="text-xs text-destructive">Non riesco a leggere i corsi da Skool: riprova tra poco.</p> : null}
          </div>
          {corsoId && (cartelle.data?.length ?? 0) > 0 ? (
            <div className="grid gap-1.5">
              <Label>Cartella</Label>
              <Select value={cartellaId} items={cartelleItems} disabled={inCorso} onValueChange={(v) => setCartellaId(v ?? NESSUNA_CARTELLA)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NESSUNA_CARTELLA}>Direttamente nel corso</SelectItem>
                  {(cartelle.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.titolo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {inCorso ? (
            <div className="grid gap-2 rounded-lg border bg-muted/40 p-3">
              <p className="text-sm">{avanzamento.testo}</p>
              <Progress value={avanzamento.percento} />
              <p className="text-xs text-muted-foreground">Lascia aperta questa pagina finché non finisce: il resto lo fa Aura da sola.</p>
            </div>
          ) : null}
          {fase.fase === "errore" ? (
            <Alert variant="destructive">
              <AlertTitle>Non sono riuscito a preparare il video</AlertTitle>
              <AlertDescription>{fase.messaggio}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={inCorso} onClick={chiudi}>
            Annulla
          </Button>
          <Button type="button" disabled={!pronto} onClick={() => void avvia()}>
            {inCorso ? "Lavoro…" : "Avvia"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
