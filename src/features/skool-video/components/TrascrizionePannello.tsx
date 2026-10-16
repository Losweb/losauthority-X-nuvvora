import { useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";

/** La trascrizione completa con i tempi, chiusa di default (è lunga), con «Copia». */
export function TrascrizionePannello({ testo }: { testo: string }) {
  const [aperto, setAperto] = useState(false);
  const righe = testo.split("\n").length;

  async function copia() {
    try {
      await navigator.clipboard.writeText(testo);
      toast.success("Trascrizione copiata");
    } catch {
      toast.error("Non riesco a copiare: seleziona il testo a mano.");
    }
  }

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 p-4">
        <div>
          <h3 className="text-lg">Trascrizione</h3>
          <p className="text-sm text-muted-foreground">{righe} righe con i tempi · va nel campo «Transcript» della lezione su Skool.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => void copia()}>
            <Copy className="size-4" aria-hidden="true" /> Copia
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAperto((a) => !a)}>
            {aperto ? "Nascondi" : "Mostra"}
          </Button>
        </div>
      </div>
      {aperto ? (
        <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap border-t p-4 font-sans text-sm leading-relaxed">{testo}</pre>
      ) : null}
    </section>
  );
}
