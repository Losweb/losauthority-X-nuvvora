import { useState } from "react";
import { Coins } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { dataRicarica, useAggiungiCrediti, useCreditiAura } from "../hooks/useCreditiAura";

/**
 * Gestionale → scheda cliente → Impostazioni: i crediti di Aura del cliente questo mese
 * e il modulo per aggiungerne (valgono fino alla ricarica del 1°; un numero negativo li toglie).
 */
export function CreditiAuraCliente({ clienteId }: { clienteId: string }) {
  const { data, isLoading } = useCreditiAura(clienteId);
  const aggiungi = useAggiungiCrediti(clienteId);
  const [crediti, setCrediti] = useState("100");
  const [nota, setNota] = useState("");
  const numero = Number.parseInt(crediti, 10);
  const valido = Number.isFinite(numero) && numero !== 0 && Math.abs(numero) <= 100000;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crediti di Aura</CardTitle>
        <CardDescription>1 credito = 1 centesimo di costo. 500 al mese, si ricaricano il 1°.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {isLoading ? (
          <span className="text-sm text-muted-foreground">Carico…</span>
        ) : data ? (
          data.illimitato ? (
            <span className="text-sm text-muted-foreground">Account del team: nessun limite ({data.usati} usati questo mese).</span>
          ) : (
            <span className="text-sm">
              <strong className="tabular-nums">{data.residui}</strong> rimasti di {data.limite} · {data.usati} usati · ricarica il {dataRicarica(data.ricarica)}
            </span>
          )
        ) : null}
        {data && !data.illimitato ? (
          <form
            className="grid gap-2 border-t pt-3 sm:grid-cols-[110px_1fr_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (!valido) return;
              aggiungi.mutate({ crediti: numero, nota: nota.trim() || undefined }, { onSuccess: () => setNota("") });
            }}
          >
            <div className="grid gap-1">
              <Label htmlFor="crediti-n">Crediti</Label>
              <Input id="crediti-n" type="number" inputMode="numeric" value={crediti} onChange={(e) => setCrediti(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="crediti-nota">Nota (facoltativa)</Label>
              <Input id="crediti-nota" value={nota} maxLength={200} placeholder="Es. lancio del nuovo servizio" onChange={(e) => setNota(e.target.value)} />
            </div>
            <Button type="submit" size="sm" disabled={!valido || aggiungi.isPending}>
              <Coins aria-hidden />
              {aggiungi.isPending ? "Aggiungo…" : "Aggiungi"}
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
