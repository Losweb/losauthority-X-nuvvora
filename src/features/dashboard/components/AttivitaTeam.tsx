import { Link } from "react-router-dom";
import { Monogramma } from "@/shared/components/brand/Monogramma";
import { formatRelative } from "@/shared/utils/formatDate";
import type { AttivitaRecente } from "../types";
import { ListaCard } from "./ListaCard";

/** Le ultime azioni di admin e staff (tabella attivita_team): «Marina ha registrato la fattura…», con quando. */
export function AttivitaTeam({ attivita, caricamento, errore }: { attivita: AttivitaRecente[] | undefined; caricamento: boolean; errore: boolean }) {
  return (
    <ListaCard
      titolo="Attività del team"
      sottotitolo="Le ultime azioni di admin e staff"
      caricamento={caricamento}
      errore={errore}
      vuoto={!attivita || attivita.length === 0}
      testoVuoto="Ancora nessuna azione registrata."
    >
      {(attivita ?? []).map((a) => (
        <li key={a.id} className="flex items-start gap-3 py-2.5">
          <Monogramma nome={a.utente_nome} dimensione="xs" tono="lilac" className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-snug break-words">
              <span className="font-semibold">{a.utente_nome || "Team"}</span> {a.descrizione}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatRelative(a.created_at)}
              {a.cliente_id ? (
                <>
                  {" · "}
                  <Link to={`/clienti/${a.cliente_id}`} className="underline-offset-2 hover:underline">
                    Apri la scheda
                  </Link>
                </>
              ) : null}
            </p>
          </div>
        </li>
      ))}
    </ListaCard>
  );
}
