import { Link } from "react-router-dom";
import { ArrowRight, FileSignature } from "lucide-react";
import { useAuth } from "@/features/auth";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { formatDate } from "@/shared/utils/formatDate";
import { statoMeta } from "@contratti/tipi.ts";
import type { ClienteInAttesa } from "../hooks/useClientiInAttesa";

/** Lo stato della riga: il contratto se c'è (con il suo badge), altrimenti «da contrattualizzare». */
function StatoAttesa({ riga }: { riga: ClienteInAttesa }) {
  if (!riga.contratto) {
    return (
      <Badge variant="expiring" dot>
        In attesa di contratto
      </Badge>
    );
  }
  const stato = statoMeta(riga.contratto.stato, !!riga.contratto.aperto_il);
  return (
    <Badge variant={stato.tone} dot>
      Contratto {stato.label.toLowerCase()}
    </Badge>
  );
}

/** Il passo successivo, come bottone: creare l'invito (solo admin) o aprire il contratto già creato (finance). */
function AzioneAttesa({ riga, eAdmin, eFinance }: { riga: ClienteInAttesa; eAdmin: boolean; eFinance: boolean }) {
  if (riga.contratto) {
    if (!eFinance) return null;
    return (
      <Button size="sm" variant="outline" nativeButton={false} render={<Link to={`/contratti/${riga.contratto.id}`} />}>
        Apri il contratto <ArrowRight aria-hidden />
      </Button>
    );
  }
  if (!riga.lead) return null;
  if (!eAdmin) return <span className="text-[13px] text-muted-foreground">L'invito lo crea l'admin</span>;
  return (
    <Button size="sm" nativeButton={false} render={<Link to={`/contratti/nuovo?lead=${riga.lead.id}&da=clienti`} />}>
      <FileSignature aria-hidden /> Crea il contratto
    </Button>
  );
}

/**
 * I futuri clienti senza account: lead diventati clienti e contratti creati direttamente, finché il contratto
 * non è pagato. Niente scheda da aprire (nasce col pagamento, dai dati che il cliente compila nel modulo):
 * solo il nome, da dove arrivano, lo stato del contratto e il bottone per il passo successivo.
 */
export function ClientiInAttesa({ righe, testo }: { righe: ClienteInAttesa[]; testo: string }) {
  const { utente } = useAuth();
  const eAdmin = utente?.rol === "admin";
  const eFinance = eAdmin || utente?.rol === "staff_fatture";
  const q = testo.trim().toLowerCase();
  const visibili = q ? righe.filter((r) => `${r.nome} ${r.contatto ?? ""}`.toLowerCase().includes(q)) : righe;
  if (visibili.length === 0) return null;

  return (
    <section aria-label="Clienti in attesa di contratto" className="mb-5 grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-semibold">In attesa di contratto</h3>
        <p className="text-[13px] text-muted-foreground">Dai Leads o da «Nuovo contratto». La scheda si apre quando il contratto è pagato.</p>
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-card">
        {visibili.map((r) => (
          <li key={r.id} className="grid gap-3 px-4 py-3.5 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center md:gap-5">
            <span className="grid min-w-0 gap-0.5">
              <span className="truncate font-medium">{r.nome}</span>
              <span className="truncate text-xs text-muted-foreground">
                {r.contatto ?? "senza contatto"} · {r.origine} · dal {formatDate(r.dal)}
              </span>
            </span>
            <StatoAttesa riga={r} />
            <AzioneAttesa riga={r} eAdmin={eAdmin} eFinance={eFinance} />
          </li>
        ))}
      </ul>
    </section>
  );
}
