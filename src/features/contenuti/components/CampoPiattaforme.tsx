import { useController, type Control } from "react-hook-form";
import { Instagram, Music2, Youtube, type LucideIcon } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ContenutoFormValues } from "../schema";
import {
  CAMPO_PIATTAFORMA,
  ETICHETTA_PIATTAFORMA_CONTENUTO,
  ETICHETTA_PROGRAMMAZIONE,
  PIATTAFORME_CONTENUTO,
  type PiattaformaContenuto,
} from "../types";

/** lucide non ha TikTok: la nota musicale, come in Pubblicazioni. */
const ICONA: Record<PiattaformaContenuto, LucideIcon> = { tiktok: Music2, instagram: Instagram, youtube: Youtube };

interface CampoProps {
  control: Control<ContenutoFormValues>;
}

/**
 * I tre riquadri della programmazione: uno per piattaforma, un clic passa da
 * «Da programmare» a «Programmato» e viceversa. Nessun vincolo con la fase:
 * li legge l'agente IA che carica i video, che ha le sue regole.
 */
export function CampoPiattaforme({ control }: CampoProps) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm leading-none font-medium">Programmazione sui social</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {PIATTAFORME_CONTENUTO.map((p) => (
          <RiquadroPiattaforma key={p} control={control} piattaforma={p} />
        ))}
      </div>
    </fieldset>
  );
}

function RiquadroPiattaforma({ control, piattaforma }: CampoProps & { piattaforma: PiattaformaContenuto }) {
  const {
    field: { value, onChange, onBlur, ref },
  } = useController({ control, name: CAMPO_PIATTAFORMA[piattaforma] });
  const programmato = value === "programmato";
  const Icona = ICONA[piattaforma];
  const nome = ETICHETTA_PIATTAFORMA_CONTENUTO[piattaforma];

  return (
    <button
      type="button"
      ref={ref}
      aria-pressed={programmato}
      aria-label={`${nome}: ${ETICHETTA_PROGRAMMAZIONE[value]}. Clic per cambiare.`}
      title="Clic per cambiare"
      onClick={() => onChange(programmato ? "da_programmare" : "programmato")}
      onBlur={onBlur}
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:border-input focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        programmato && "border-status-active/40 bg-status-active-soft/40",
      )}
    >
      <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
        <Icona className="size-4 shrink-0" aria-hidden />
        {nome}
      </span>
      <Badge variant={programmato ? "active" : "expiring"} dot>
        {ETICHETTA_PROGRAMMAZIONE[value]}
      </Badge>
    </button>
  );
}
