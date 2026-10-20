import { Link } from "react-router-dom";
import { ArrowRight, Check, TriangleAlert } from "lucide-react";
import { useSegnaErroriGestiti, type ErroreDaGestire } from "@/features/errori";
import { Button } from "@/shared/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatRelative } from "@/shared/utils/formatDate";

/**
 * Prima card della dashboard, SOLO quando un'automazione ha segnalato un errore nuovo che nessuno
 * ha ancora gestito. Ogni riga ha «Gestito»: sparisce da qui e resta nella pagina Errori con chi l'ha visto.
 */
export function ErroriDaGestire({ errori, totale }: { errori: ErroreDaGestire[]; totale: number }) {
  const segna = useSegnaErroriGestiti();
  const altri = totale - errori.length;
  return (
    <Card className="border-status-churn/40 bg-status-churn-soft/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TriangleAlert className="size-[18px] text-status-churn" aria-hidden />
          {totale === 1 ? "Un errore da gestire" : `${totale} errori da gestire`}
        </CardTitle>
        <CardDescription>Segnalati dalle automazioni e non ancora visti. Segna «Gestito» quando te ne sei occupato.</CardDescription>
        <CardAction>
          <Link to="/errori" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            Tutti gli errori
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-line">
          {errori.map((e) => (
            // Telefono: data e bottone sotto il messaggio, che così ha tutta la larghezza.
            <li key={e.id} className="flex items-start justify-between gap-3 py-2.5 max-sm:flex-col max-sm:gap-2">
              <div className="min-w-0">
                <p className="font-mono text-xs font-semibold break-all text-status-churn">{e.scope}</p>
                <p className="line-clamp-2 break-words text-sm text-foreground">{e.message}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatRelative(e.created_at)}</p>
              </div>
              <Button size="sm" variant="outline" className="shrink-0" disabled={segna.isPending} onClick={() => segna.mutate({ ids: [e.id], gestito: true })}>
                <Check aria-hidden /> Gestito
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
      {totale > 1 ? (
        <CardFooter className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{altri > 0 ? `E altri ${altri} nella pagina Errori.` : ""}</span>
          <Button size="sm" variant="ghost" disabled={segna.isPending} onClick={() => segna.mutate({ ids: errori.map((e) => e.id), gestito: true })}>
            Segna questi come gestiti
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
