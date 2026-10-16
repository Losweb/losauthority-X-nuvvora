import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "@/features/pipeline";
import { COLONNE_LISTA, conPrezzoNumerico, type ContrattoInLista } from "@/features/contratti/types";
import { chiaviClienti } from "./chiavi";

/** Un lead arrivato allo stage «cliente» che non ha ancora un contratto pagato: compare in Clienti senza scheda. */
export interface ClienteInAttesa {
  lead: Lead;
  /** L'ultimo contratto non annullato nato da questo lead (null = ancora da creare). Solo chi vede i contratti (finance) lo riceve. */
  contratto: ContrattoInLista | null;
}

/**
 * I «clienti in attesa di contratto»: i lead in stage cliente senza account (`cliente_id` null).
 * Al pagamento del contratto il lead viene agganciato all'account e sparisce da qui: la riga
 * vera della lista clienti prende il suo posto, senza doppioni.
 */
export function useClientiInAttesa() {
  return useQuery({
    queryKey: chiaviClienti.inAttesa,
    queryFn: async (): Promise<ClienteInAttesa[]> => {
      const { data: leads, error } = await supabase
        .from("lead")
        .select("*")
        .eq("stage", "cliente")
        .is("cliente_id", null)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      if (leads.length === 0) return [];
      // RLS: chi non è finance riceve 0 righe (nessun errore) e vede solo «in attesa di contratto».
      const { data: contratti } = await supabase
        .from("contratti")
        .select(`${COLONNE_LISTA}, lead_id`)
        .in(
          "lead_id",
          leads.map((l) => l.id),
        )
        .neq("stato", "annullato")
        .order("created_at", { ascending: false });
      const perLead = new Map<string, ContrattoInLista>();
      for (const c of contratti ?? []) {
        if (c.lead_id && !perLead.has(c.lead_id)) perLead.set(c.lead_id, conPrezzoNumerico(c) as unknown as ContrattoInLista);
      }
      return leads.map((l) => ({ lead: { ...l, valore: Number(l.valore) || 0 }, contratto: perLead.get(l.id) ?? null }));
    },
  });
}
