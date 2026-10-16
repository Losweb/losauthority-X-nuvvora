import { Aura, type StatoAura } from "@/shared/components/aura";
import { cn } from "@/lib/utils";

/**
 * "Aura" — il volto dell'assistente: la sfera di puntini di AURA_MANUALE.md (canvas, motore in
 * `shared/components/aura`). Questo è il wrapper con l'API storica del progetto (`dimensione`,
 * `parla`, `conNome`) più lo stato esplicito. Regola del manuale: UNA sola Aura "viva" per
 * schermata (segue il cursore e cambia stato); le altre restano ferme. Per default è viva quella
 * grande (≥ 56px: hero delle schermate), ferma quella piccola accanto ai messaggi.
 * Scelta del progetto: si muove anche con «riduci movimento» (è un elemento di brand).
 */
interface AuraSferaProps {
  dimensione?: number;
  /** Aura "parla" (stato speaking). Ignorato se si passa `stato`. */
  parla?: boolean;
  /** Stato esplicito del volto. */
  stato?: StatoAura;
  /** Questa è l'Aura viva della schermata (default: sì se è grande, no se è piccola). */
  viva?: boolean;
  /** Mostra la scritta "Aura" sopra la sfera. */
  conNome?: boolean;
  className?: string;
}

export function AuraSfera({ dimensione = 64, parla = false, stato, viva, conNome = true, className }: AuraSferaProps) {
  const state: StatoAura = stato ?? (parla ? "speaking" : "idle");
  const live = viva ?? dimensione >= 56;
  return (
    <div className={cn("flex shrink-0 flex-col items-center gap-2", className)}>
      {conNome ? <span className="text-[12px] leading-4 font-medium text-muted-foreground">Aura</span> : null}
      <Aura state={state} size={dimensione} live={live} count={dimensione <= 40 ? 64 : undefined} reduced={false} label="Aura" />
    </div>
  );
}
