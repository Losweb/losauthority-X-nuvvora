import { cn } from "@/lib/utils";

interface MarmoLogoProps {
  /** Altezza del marchio in px; la scritta si scala di conseguenza. */
  altezza?: number;
  /** Solo il marchio "W", senza la scritta. */
  soloMonogramma?: boolean;
  className?: string;
}

/**
 * Logo "Wesley Caicedo" nella riga brand di Seto: un quadratino `action` con la W e il nome
 * in maiuscolo spaziato (14/700, letter-spacing .08em). Quando ci sarà il logo vero, sostituire il quadratino.
 */
export function MarmoLogo({ altezza = 20, soloMonogramma = false, className }: MarmoLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-current", className)}>
      <span
        aria-hidden
        className="inline-flex shrink-0 items-center justify-center rounded-sm bg-primary font-bold text-primary-foreground"
        style={{ width: altezza, height: altezza, fontSize: Math.round(altezza * 0.6), borderRadius: Math.max(4, Math.round(altezza * 0.3)) }}
      >
        W
      </span>
      {soloMonogramma ? null : (
        <span className="font-bold tracking-[0.08em] whitespace-nowrap uppercase" style={{ fontSize: Math.max(12, Math.round(altezza * 0.7)) }}>
          Wesley Caicedo
        </span>
      )}
    </span>
  );
}
