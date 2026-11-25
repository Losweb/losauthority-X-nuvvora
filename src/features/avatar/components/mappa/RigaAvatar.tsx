import { useState, type FormEvent, type ReactNode } from "react";
import { Pencil } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ETICHETTA_ORIGINE, type Origine } from "../../mappa";
import type { Modifica } from "../../hooks/useMappaAvatar";

/** «vera» verde, «riassunto» neutra, «lettura» ocra: le ipotesi di Aura si riconoscono a colpo d'occhio. */
export function EtichettaOrigine({ origine, className }: { origine: Origine; className?: string }) {
  const variante = origine === "vera" ? "active" : origine === "lettura" ? "expiring" : "neutral";
  return (
    <Badge variant={variante} className={cn("shrink-0", className)} title={origine === "lettura" ? "Ipotesi di Aura, da confermare" : undefined}>
      {ETICHETTA_ORIGINE[origine]}
    </Badge>
  );
}

/** Chi può correggere: il cliente sì (onModifica), il team legge e basta. */
export interface Correzione {
  onModifica?: (m: Omit<Modifica, "dove">) => void;
  occupato?: boolean;
}

interface RigaProps extends Correzione {
  percorso: string;
  origine?: Origine;
  /** Il testo (o i due testi della coppia) com'è ora. */
  valori: string[];
  /** Per le coppie: le chiavi da mandare ({a, b}, {chi, perche}, {persona, frase}) e le loro etichette. */
  chiavi?: string[];
  etichette?: string[];
  children: ReactNode;
  /** Le righe di sola stringa (nome, età) non hanno origine né «elimina». */
  semplice?: boolean;
  /** Nelle carte strette (partenze, passi del ponte) etichetta e matita vanno sotto il testo. */
  compatta?: boolean;
}

/** Una riga della mappa o della scheda: il contenuto, l'origine e (per il cliente) la matita per correggerla. */
export function RigaAvatar({ percorso, origine, valori, chiavi, etichette, children, semplice = false, compatta = false, onModifica, occupato }: RigaProps) {
  const [aperta, setAperta] = useState(false);
  const [bozza, setBozza] = useState<string[]>(valori);

  function salva(e: FormEvent) {
    e.preventDefault();
    if (!onModifica || bozza.some((t) => !t.trim())) return;
    const valore = chiavi ? Object.fromEntries(chiavi.map((k, i) => [k, bozza[i].trim()])) : bozza[0].trim();
    onModifica({ percorso, valore });
    setAperta(false);
  }

  if (aperta) {
    return (
      <form onSubmit={salva} className="grid gap-2 rounded-lg border border-line bg-card p-3">
        {bozza.map((t, i) => (
          <label key={i} className="grid gap-1">
            {etichette?.[i] ? <span className="text-[12px] font-medium text-muted-foreground">{etichette[i]}</span> : null}
            <Textarea
              value={t}
              rows={2}
              autoFocus={i === 0}
              maxLength={600}
              onChange={(e) => setBozza((b) => b.map((x, j) => (j === i ? e.target.value : x)))}
              onKeyDown={(e) => {
                if (e.key === "Escape") setAperta(false);
              }}
            />
          </label>
        ))}
        <p className="text-[12px] text-muted-foreground">La tua correzione conta come frase vera.</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm" disabled={occupato || bozza.some((t) => !t.trim())}>
            Salva
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setAperta(false)}>
            Annulla
          </Button>
          {!semplice ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="ml-auto text-muted-foreground"
              disabled={occupato}
              onClick={() => {
                onModifica?.({ percorso, valore: null });
                setAperta(false);
              }}
            >
              Elimina la riga
            </Button>
          ) : null}
        </div>
      </form>
    );
  }

  const matita = onModifica ? (
    <Button
      type="button"
      size="icon-xs"
      variant="ghost"
      aria-label="Correggi questa riga"
      className="-mt-0.5 text-muted-foreground opacity-60 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
      onClick={() => {
        setBozza(valori);
        setAperta(true);
      }}
    >
      <Pencil aria-hidden />
    </Button>
  ) : null;
  return (
    <div className={cn("group flex items-start gap-2", compatta && "flex-col gap-1", origine === "lettura" && "border-l-2 border-dashed border-status-expiring/50 pl-2")}>
      <div className="min-w-0 flex-1">{children}</div>
      {compatta ? (
        <div className="flex items-center gap-1">
          {origine ? <EtichettaOrigine origine={origine} /> : null}
          {matita}
        </div>
      ) : (
        <>
          {origine ? <EtichettaOrigine origine={origine} className="mt-0.5" /> : null}
          {matita}
        </>
      )}
    </div>
  );
}

/** Una riga da spuntare (Da verificare): il cliente la spunta quando l'ha controllata. */
export function RigaSpunta({ percorso, testo, fatto, onModifica, occupato }: { percorso: string; testo: string; fatto: boolean } & Correzione) {
  return (
    <label className={cn("flex items-start gap-2.5 text-[14px] leading-snug", onModifica ? "cursor-pointer" : "")}>
      <Checkbox className="mt-0.5" checked={fatto} disabled={!onModifica || occupato} onCheckedChange={(v) => onModifica?.({ percorso, fatto: v === true })} />
      <span className={cn(fatto && "text-muted-foreground line-through")}>{testo}</span>
    </label>
  );
}
