import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { leadDaVista, type Lead } from "@/features/pipeline";
import { COLONNE_LISTA, conPrezzoNumerico, type ContrattoInLista } from "@/features/contratti/types";
import type { DatiCliente } from "@contratti/tipi.ts";
import { chiaviClienti } from "./chiavi";

/**
 * Un futuro cliente senza ancora un account: un lead in stage «cliente» oppure un contratto creato
 * direttamente (Clienti → «Nuovo contratto»), finché non è pagato. Compare in Clienti senza scheda.
 */
export interface ClienteInAttesa {
  /** Id del lead oppure del contratto (stabile per la lista). */
  id: string;
  /** Il nome che sappiamo: dal lead, o quello che il cliente ha scritto nel modulo, o la nota dell'invito. */
  nome: string;
  contatto: string | null;
  /** Da dove viene: «dai Leads · Instagram» oppure «dal contratto». */
  origine: string;
  /** Da quando aspetta (ISO). */
  dal: string;
  lead: Lead | null;
  /** L'ultimo contratto non annullato (null = ancora da creare). Solo chi vede i contratti (finance) lo riceve. */
  contratto: ContrattoInLista | null;
}

/** Riga di `contratti` con i dati compilati dal cliente (per leggere nome e contatto prima della firma). */
type RigaContrattoAttesa = ContrattoInLista & { lead_id: string | null; dati: Partial<DatiCliente> | null };

/** Nome e contatto come li ha scritti il cliente nel modulo (o come li ha precompilati l'invito). */
function nomeContattoDaContratto(c: RigaContrattoAttesa): { nome: string | null; contatto: string | null } {
  // Il modulo cambia campi per tipo (privato / società): qui bastano i nomi, letti come mappa.
  const d = (c.dati ?? {}) as Record<string, string | undefined>;
  const nomeDati = [d.nome ?? d.partecipante_nome, d.cognome ?? d.partecipante_cognome]
    .filter((p): p is string => !!p && p.trim().length > 0)
    .join(" ");
  const nome = c.cliente_nome || nomeDati || null;
  const contatto = c.cliente_email || d.email || d.telefono || d.instagram || null;
  return { nome, contatto };
}

/**
 * I «clienti in attesa di contratto»: i lead in stage cliente senza account (`cliente_id` null) e i contratti
 * creati direttamente (senza lead) non ancora pagati. Al pagamento l'account nasce dai dati del contratto,
 * il lead (se c'è) viene agganciato e la riga sparisce da qui: quella vera della lista prende il suo posto.
 */
export function useClientiInAttesa() {
  return useQuery({
    queryKey: chiaviClienti.inAttesa,
    queryFn: async (): Promise<ClienteInAttesa[]> => {
      const { data: righe, error } = await supabase
        .from("lead_team")
        .select("*")
        .eq("stage", "cliente")
        .is("cliente_id", null)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const leads = righe.map(leadDaVista);

      // RLS: chi non è finance riceve 0 righe (nessun errore): vede solo i lead «in attesa di contratto».
      const { data: contratti } = await supabase
        .from("contratti")
        .select(`${COLONNE_LISTA}, lead_id, dati`)
        .is("cliente_id", null)
        .in("stato", ["inviato", "compilato", "firmato"])
        .order("created_at", { ascending: false });
      const tutti = (contratti ?? []).map((c) => conPrezzoNumerico(c) as unknown as RigaContrattoAttesa);

      const perLead = new Map<string, ContrattoInLista>();
      const diretti: ClienteInAttesa[] = [];
      for (const c of tutti) {
        if (c.lead_id) {
          if (!perLead.has(c.lead_id)) perLead.set(c.lead_id, c);
          continue;
        }
        const { nome, contatto } = nomeContattoDaContratto(c);
        diretti.push({
          id: c.id,
          nome: nome ?? c.note ?? `Invito ${c.programma}`,
          contatto,
          origine: nome ? "dal contratto" : "dal contratto · in attesa dei suoi dati",
          dal: c.created_at,
          lead: null,
          contratto: c,
        });
      }
      const daLead: ClienteInAttesa[] = leads.map((l) => ({
        id: l.id,
        nome: l.nome,
        contatto: l.contatto,
        origine: `dai Leads${l.fonte ? ` · ${l.fonte}` : ""}`,
        dal: l.updated_at,
        lead: l,
        contratto: perLead.get(l.id) ?? null,
      }));
      return [...daLead, ...diretti].sort((a, b) => (a.dal < b.dal ? 1 : a.dal > b.dal ? -1 : 0));
    },
  });
}
