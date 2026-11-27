import { useAuth } from "@/features/auth";
import { useSidebarCompattaAttiva } from "@/shared/hooks/useSidebarCompatta";
import { cn } from "@/lib/utils";
import { dataRicarica, useCreditiAura } from "../hooks/useCreditiAura";

/**
 * I crediti di Aura nella sidebar dell'area cliente, sopra Wesley Coach: quanti ne restano
 * questo mese e quando si ricaricano. Dall'80 % usato il testo avvisa; a zero dice la data.
 * Non si mostra al team, all'account del team e nella sidebar compatta.
 */
export function CreditiAura() {
  const { utente } = useAuth();
  const compatta = useSidebarCompattaAttiva();
  const { data } = useCreditiAura(utente?.id);
  if (!data || data.illimitato || compatta) return null;

  const usato = data.limite > 0 ? Math.min(1, data.usati / data.limite) : 1;
  const finiti = data.residui <= 0;
  const pochi = !finiti && usato >= 0.8;

  return (
    <div className="mb-3 grid gap-1.5 px-3" aria-label="Crediti di Aura">
      <div className="flex items-baseline justify-between gap-2 text-[12px]">
        <span className="font-medium text-muted-foreground">Crediti di Aura</span>
        <span className={cn("tabular-nums", finiti || pochi ? "font-semibold text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
          {data.residui} / {data.limite}
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={data.limite} aria-valuenow={data.residui}>
        <div
          className={cn("h-full rounded-full transition-[width]", finiti || pochi ? "bg-amber-500" : "bg-primary")}
          style={{ width: `${Math.round((1 - usato) * 100)}%` }}
        />
      </div>
      {finiti ? (
        <span className="text-[12px] text-muted-foreground">Finiti per questo mese: si ricaricano il {dataRicarica(data.ricarica)}.</span>
      ) : pochi ? (
        <span className="text-[12px] text-muted-foreground">Ne restano pochi: si ricaricano il {dataRicarica(data.ricarica)}.</span>
      ) : null}
    </div>
  );
}
