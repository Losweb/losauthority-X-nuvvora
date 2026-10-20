import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { todayIso } from "@/shared/utils/formatDate";
import { COLONNE_LISTA, conPrezzoNumerico, type ContrattoInLista } from "@/features/contratti/types";
import type { AttivitaRecente, ClienteDashboard, LeadDaFare, OnboardingRecente } from "../types";

export const CHIAVI_DASHBOARD = {
  clienti: ["dashboard", "clienti"] as const,
  onboarding: ["dashboard", "ultimi-onboarding"] as const,
  lead: ["dashboard", "lead-da-fare"] as const,
  attivita: ["dashboard", "attivita-team"] as const,
};

const MAX_ATTIVITA = 20;

/** Tutti i clienti (vista_clienti): da qui derivano contatori, prossime call e compiti aperti. */
export function useClientiDashboard() {
  return useQuery({
    queryKey: CHIAVI_DASHBOARD.clienti,
    queryFn: async (): Promise<ClienteDashboard[]> => {
      const { data, error } = await supabase
        .from("vista_clienti")
        .select("id, nombre, email, fase, stato_onboarding, prossima_call, di_wesley_aperti, created_at");
      if (error) throw error;
      return data;
    },
  });
}

/** Clienti per data di completamento onboarding (o di creazione), i più recenti prima: la pagina ne mostra 5. */
export function useUltimiOnboarding() {
  return useQuery({
    queryKey: CHIAVI_DASHBOARD.onboarding,
    queryFn: async (): Promise<OnboardingRecente[]> => {
      const { data, error } = await supabase
        .from("clienti")
        .select("id, stato_onboarding, onboarding_completato_il, created_at, user_roles!clienti_id_fkey(nombre, email)");
      if (error) throw error;
      return data
        .map((c) => ({
          id: c.id,
          nombre: c.user_roles?.nombre ?? "",
          email: c.user_roles?.email ?? "",
          stato_onboarding: c.stato_onboarding,
          data: c.onboarding_completato_il ?? c.created_at,
        }))
        .sort((a, b) => b.data.localeCompare(a.data));
    },
  });
}

/** Lead con prossima azione scaduta o di oggi (pipeline ancora aperta). */
export function useLeadDaFare() {
  return useQuery({
    queryKey: CHIAVI_DASHBOARD.lead,
    queryFn: async (): Promise<LeadDaFare[]> => {
      const { data, error } = await supabase
        .from("lead")
        .select("id, nome, stage, prossima_azione, prossima_azione_il")
        .lte("prossima_azione_il", todayIso())
        .not("stage", "in", "(cliente,perso)")
        .order("prossima_azione_il", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

/** Le ultime azioni di admin e staff (attivita_team, RLS: solo team). */
export function useAttivitaTeam() {
  return useQuery({
    queryKey: CHIAVI_DASHBOARD.attivita,
    queryFn: async (): Promise<AttivitaRecente[]> => {
      const { data, error } = await supabase
        .from("attivita_team")
        .select("id, created_at, utente_nome, azione, descrizione, cliente_id")
        .order("created_at", { ascending: false })
        .limit(MAX_ATTIVITA);
      if (error) throw error;
      return data;
    },
  });
}

/**
 * I contratti firmati che aspettano il pagamento (stato `firmato`): la card in cima alla dashboard.
 * La chiave sta sotto ["contratti", "lista"], così «Segna come pagato» (che invalida la lista) la aggiorna
 * e il contratto sparisce da qui. La RLS li fa leggere solo a chi vede i soldi: per lo staff la query non parte.
 */
export function useContrattiFirmati(abilitato: boolean) {
  return useQuery({
    queryKey: ["contratti", "lista", "firmati-da-incassare"],
    enabled: abilitato,
    // È un avviso: si ricontrolla da solo ogni minuto, anche senza ricaricare la pagina.
    refetchInterval: 60_000,
    queryFn: async (): Promise<ContrattoInLista[]> => {
      const { data, error } = await supabase
        .from("contratti")
        .select(COLONNE_LISTA)
        .eq("stato", "firmato")
        .order("firmato_il", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as ContrattoInLista[]).map(conPrezzoNumerico);
    },
  });
}
