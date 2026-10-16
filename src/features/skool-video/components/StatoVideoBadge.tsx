import { Badge } from "@/shared/components/ui/badge";
import { ETICHETTA_STATO, STATI_IN_LAVORAZIONE, type StatoVideo } from "../types";

function variante(stato: StatoVideo): "active" | "expiring" | "churn" | "neutral" | "outline" {
  if (stato === "pubblicato") return "active";
  if (stato === "errore") return "churn";
  if (stato === "bozza") return "neutral";
  return "expiring";
}

/** Lo stato del video come badge Marmo (puntino che pulsa mentre lavora). */
export function StatoVideoBadge({ stato }: { stato: StatoVideo }) {
  return (
    <Badge variant={variante(stato)} dot={STATI_IN_LAVORAZIONE.has(stato)}>
      {ETICHETTA_STATO[stato] ?? stato}
    </Badge>
  );
}
