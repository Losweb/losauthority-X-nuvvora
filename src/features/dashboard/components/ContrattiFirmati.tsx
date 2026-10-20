import { Link } from "react-router-dom";
import { ArrowRight, FileSignature } from "lucide-react";
import type { ContrattoInLista } from "@/features/contratti";
import { Button } from "@/shared/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatRelative } from "@/shared/utils/formatDate";
import { euroContratto } from "@contratti/documento.ts";

/** Chi ha firmato: il nome che ha scritto nel modulo, altrimenti la nota dell'invito. */
function nomeCliente(c: ContrattoInLista): string {
  return c.cliente_nome || c.note || "Cliente";
}

/**
 * Card in cima alla dashboard, SOLO quando un cliente ha firmato e il pagamento non è ancora segnato
 * (contratto in stato `firmato`). Sparisce da sola con «Segna come pagato», che crea l'account del cliente.
 */
export function ContrattiFirmati({ contratti }: { contratti: ContrattoInLista[] }) {
  const n = contratti.length;
  return (
    <Card className="border-status-active/40 bg-status-active-soft/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="size-[18px] text-status-active" aria-hidden />
          {n === 1 ? "Un contratto firmato" : `${n} contratti firmati`}
        </CardTitle>
        <CardDescription>Il cliente ha firmato. Quando arriva il pagamento, segnalo dal contratto: nasce il suo account.</CardDescription>
        <CardAction>
          <Link to="/contratti" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            Tutti i contratti
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-line">
          {contratti.map((c) => (
            // Telefono: il bottone va sotto, il nome ha tutta la larghezza.
            <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 max-sm:flex-col max-sm:items-start max-sm:gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{nomeCliente(c)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.programma} · {euroContratto(c.prezzo)} € · firmato {formatRelative(c.firmato_il)}
                </p>
              </div>
              <Button size="sm" variant="outline" className="shrink-0" nativeButton={false} render={<Link to={`/contratti/${c.id}`} />}>
                Segna il pagamento <ArrowRight aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
