import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Una riga del quadro generale che si apre al clic (26/11/2026): titolo, un riassunto corto
 * («3 obiezioni», «bio, video, chat») e la freccia. Dentro, i dettagli. Le righe vanno messe
 * in un contenitore `divide-y` così hanno una linea tra l'una e l'altra.
 */
export function Dettaglio({ titolo, riassunto, aperto = false, children, className }: { titolo: string; riassunto?: ReactNode; aperto?: boolean; children: ReactNode; className?: string }) {
  return (
    <details className={cn("group/dettaglio", className)} open={aperto}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 py-3 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="shrink-0 text-[15px] font-semibold">{titolo}</span>
        {riassunto ? <span className="ml-auto min-w-0 truncate text-right text-[13px] text-muted-foreground">{riassunto}</span> : <span className="ml-auto" />}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open/dettaglio:rotate-180" aria-hidden />
      </summary>
      <div className="grid gap-4 pb-5">{children}</div>
    </details>
  );
}
