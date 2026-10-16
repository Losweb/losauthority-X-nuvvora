import { cn } from "@/lib/utils";

const DIMENSIONI = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 } as const;

interface MonogrammaProps {
  nome?: string | null;
  dimensione?: keyof typeof DIMENSIONI;
  /** Fondo scuro con iniziali chiare. */
  inverso?: boolean;
  /** Tinta del disco (Seto): rose (default) | lilac | peach. */
  tono?: "rose" | "lilac" | "peach";
  /** Pallino verde di presenza, in basso a destra. */
  online?: boolean;
  className?: string;
}

export function iniziali(nome: string | null | undefined): string {
  return (nome ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parola) => parola[0])
    .join("")
    .toUpperCase();
}

const TONI = {
  rose: "bg-tint-rose text-foreground",
  lilac: "bg-tint-lilac text-foreground",
  peach: "bg-glow-peach text-foreground",
} as const;

/** Avatar di Seto: iniziali (12/600) su un disco tinto, anello della superficie, pallino di presenza opzionale. */
export function Monogramma({ nome, dimensione = "sm", inverso = false, tono = "rose", online = false, className }: MonogrammaProps) {
  const px = DIMENSIONI[dimensione];
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-[0.01em]",
        inverso ? "bg-primary text-primary-foreground" : TONI[tono],
        className,
      )}
      style={{ width: px, height: px, fontSize: Math.max(12, Math.round(px * 0.38)) }}
    >
      {iniziali(nome) || "—"}
      {online ? <span className="absolute -right-px -bottom-px size-2.5 rounded-full bg-online ring-2 ring-card" /> : null}
    </span>
  );
}
