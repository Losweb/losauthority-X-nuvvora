import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { ErroreCaricamento, SkeletonRighe } from "@/shared/components/layout/StatoCaricamento";
import { Button } from "@/shared/components/ui/button";
import { ListaVideo } from "../components/ListaVideo";
import { NuovoVideoDialog } from "../components/NuovoVideoDialog";
import { useElencoVideo } from "../hooks/useSkoolVideo";

const PASSI: Array<[string, string]> = [
  ["1 · Carichi il video", "Da qui parte solo l'audio: il video resta sul tuo computer."],
  ["2 · Aura trascrive e scrive", "Oltre l'ora: capitoli per tema con il minuto. Sotto l'ora: riassunto di cosa si è detto."],
  ["3 · Pubblichi su Skool", "La lezione nasce con testo e transcript nel corso scelto: tu ci aggiungi il video."],
];

/** Pagina «Skool Video» (solo admin): la lista dei video e il pulsante per caricarne uno. */
export default function SkoolVideoPage() {
  const elenco = useElencoVideo();
  const [nuovo, setNuovo] = useState(false);

  return (
    <div className="grid gap-6">
      <PageHeader
        titolo="Skool Video"
        sottotitolo="Dal video alla lezione nella classroom: trascrizione, testo di Aura e pubblicazione."
        azioni={
          <Button onClick={() => setNuovo(true)}>
            <Plus className="size-4" aria-hidden="true" /> Nuovo video
          </Button>
        }
      />
      <ol className="grid gap-3 sm:grid-cols-3">
        {PASSI.map(([titolo, testo]) => (
          <li key={titolo} className="rounded-lg border bg-card p-4">
            <p className="font-medium">{titolo}</p>
            <p className="mt-1 text-sm text-muted-foreground">{testo}</p>
          </li>
        ))}
      </ol>
      {elenco.isPending ? <SkeletonRighe righe={4} /> : null}
      {elenco.isError ? <ErroreCaricamento /> : null}
      {elenco.data ? <ListaVideo video={elenco.data} /> : null}
      <NuovoVideoDialog aperto={nuovo} onChiudi={() => setNuovo(false)} />
    </div>
  );
}
