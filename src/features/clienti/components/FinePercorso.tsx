import { differenceInCalendarDays, isValid, parseISO } from "date-fns";
import { formatDate } from "@/shared/utils/formatDate";
import { cn } from "@/lib/utils";

/** Giorni prima della fine in cui parte il promemoria Telegram (come `scadenze-programmi`). */
export const GIORNI_PROMEMORIA_FINE = 30;

function giorniAllaFine(iso: string | null): number | null {
  if (!iso) return null;
  const d = parseISO(iso);
  return isValid(d) ? differenceInCalendarDays(d, new Date()) : null;
}

function nota(giorni: number): string {
  if (giorni < 0) return "finito";
  if (giorni === 0) return "finisce oggi";
  if (giorni === 1) return "finisce domani";
  return `tra ${giorni} giorni`;
}

/** Fine del programma: la data (colore del contenitore; scura nell'ultimo mese) e, vicino alla fine, quanto manca. */
export function FinePercorso({ data, className }: { data: string | null; className?: string }) {
  const giorni = giorniAllaFine(data);
  const vicina = giorni !== null && giorni <= GIORNI_PROMEMORIA_FINE;
  return (
    <span className={cn("inline-flex flex-col", className)}>
      <span className={vicina && giorni >= 0 ? "text-foreground" : undefined}>{formatDate(data)}</span>
      {vicina ? (
        <span className={cn("text-xs", giorni < 0 ? "text-muted-foreground" : "font-medium text-warning")}>{nota(giorni)}</span>
      ) : null}
    </span>
  );
}
