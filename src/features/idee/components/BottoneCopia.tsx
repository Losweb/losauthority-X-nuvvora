import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";

interface BottoneCopiaProps {
  testo: string;
  /** Etichetta per il lettore di schermo e il tooltip (default «Copia il testo»). */
  etichetta?: string;
  className?: string;
  /** icon-xs accanto ai messaggi, icon-sm sulle card delle proposte. */
  dimensione?: "icon-xs" | "icon-sm";
}

/** Bottone minimo: copia il testo negli appunti e per un attimo mostra la spunta. */
export function BottoneCopia({ testo, etichetta = "Copia il testo", className, dimensione = "icon-xs" }: BottoneCopiaProps) {
  const [copiato, setCopiato] = useState(false);
  async function copia() {
    try {
      await navigator.clipboard.writeText(testo);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 1500);
    } catch {
      toast.error("Copia non riuscita", { description: "Seleziona il testo e copialo a mano." });
    }
  }
  return (
    <Button
      type="button"
      size={dimensione}
      variant="ghost"
      className={cn("text-muted-foreground hover:text-foreground", className)}
      title={copiato ? "Copiato" : etichetta}
      aria-label={copiato ? "Copiato" : etichetta}
      onClick={() => void copia()}
    >
      {copiato ? <Check aria-hidden /> : <Copy aria-hidden />}
    </Button>
  );
}
