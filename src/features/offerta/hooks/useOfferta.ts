import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DiagnosiOfferta, MessaggioOfferta, Offerta } from "../types";

export const chiaviOfferta = {
  lista: (clienteId: string) => ["offerta", "lista", clienteId] as const,
  una: (id: string) => ["offerta", "una", id] as const,
  messaggi: (id: string) => ["offerta", "messaggi", id] as const,
  diagnosi: (id: string) => ["offerta", "diagnosi", id] as const,
};

/** La diagnosi per Wesley di un'offerta (solo team: per il cliente la RLS non restituisce righe → null). */
export function useDiagnosiOfferta(offertaId: string | undefined) {
  return useQuery({
    queryKey: chiaviOfferta.diagnosi(offertaId ?? ""),
    enabled: !!offertaId,
    queryFn: async (): Promise<DiagnosiOfferta | null> => {
      const { data, error } = await supabase.from("offerta_diagnosi").select("*").eq("offerta_id", offertaId ?? "").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Tutte le offerte del cliente, dalla prima creata: la posizione dà il numero di serie sulla carta. */
export function useOfferte(clienteId: string | undefined) {
  return useQuery({
    queryKey: chiaviOfferta.lista(clienteId ?? ""),
    enabled: !!clienteId,
    queryFn: async (): Promise<Offerta[]> => {
      const { data, error } = await supabase.from("offerta").select("*").eq("cliente_id", clienteId ?? "").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Un'offerta; con `attiva` (Aura sta scrivendo) si ricarica ogni 2,5 s così la carta si compila sotto gli occhi. */
export function useOfferta(id: string | undefined, attiva = false) {
  return useQuery({
    queryKey: chiaviOfferta.una(id ?? ""),
    enabled: !!id,
    refetchInterval: attiva ? 2500 : false,
    queryFn: async (): Promise<Offerta | null> => {
      const { data, error } = await supabase.from("offerta").select("*").eq("id", id ?? "").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** La conversazione di un'offerta. Si aggiorna da sola finché Aura sta scrivendo. */
export function useMessaggiOfferta(offertaId: string | undefined) {
  return useQuery({
    queryKey: chiaviOfferta.messaggi(offertaId ?? ""),
    enabled: !!offertaId,
    refetchInterval: (query) => (query.state.data?.some((m) => m.stato === "in_corso") ? 2500 : false),
    queryFn: async (): Promise<MessaggioOfferta[]> => {
      const { data, error } = await supabase.from("offerta_messaggi").select("*").eq("offerta_id", offertaId ?? "").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}
