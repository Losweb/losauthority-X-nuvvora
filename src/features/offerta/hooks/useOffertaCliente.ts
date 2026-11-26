import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { erroreMutation, invocaEdge } from "@/shared/utils/invocaEdge";
import { asNuova, type OffertaNuova } from "../nuova";

export const chiaveOffertaCliente = (clienteId: string) => ["offerta", "cliente", clienteId] as const;

/**
 * L'offerta del cliente (dal 26/11/2026 una sola: la più recente), null finché non ha iniziato.
 * Con `attivo` (Aura sta scrivendo) si ricarica ogni 2,5 s.
 */
export function useOffertaCliente(clienteId: string | undefined, attivo = false) {
  return useQuery({
    queryKey: chiaveOffertaCliente(clienteId ?? ""),
    enabled: !!clienteId,
    refetchInterval: attivo ? 2500 : false,
    queryFn: async (): Promise<OffertaNuova | null> => {
      const { data, error } = await supabase.from("offerta").select("*").eq("cliente_id", clienteId ?? "").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data ? asNuova(data) : null;
    },
  });
}

function useInvalida() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ["offerta"] });
}

/** Inizia la fase: la funzione crea (o ritrova) l'offerta e Aura scrive il primo messaggio. */
export function useIniziaOfferta() {
  const invalida = useInvalida();
  return useMutation({
    mutationFn: async (messaggio?: string) => invocaEdge<{ offerta_id: string }>("aura-offerta", messaggio ? { azione: "crea", messaggio } : { azione: "crea" }),
    onSettled: invalida,
    onError: erroreMutation("Aura non è riuscita a iniziare"),
  });
}

/** Un turno con Aura (o la riprova di una risposta in errore). */
export function useInviaOffertaCliente() {
  const invalida = useInvalida();
  return useMutation({
    mutationFn: async (input: ({ messaggio: string } | { riprovaId: string }) & { signal?: AbortSignal }) =>
      invocaEdge<{ messaggio_id: string; risposta: string }>("aura-offerta", "riprovaId" in input ? { riprova_messaggio_id: input.riprovaId } : { messaggio: input.messaggio }, { signal: input.signal }),
    onSettled: invalida,
    onError: erroreMutation("Aura non ha risposto"),
  });
}

/** Ricomincia da capo: elimina l'offerta e la sua conversazione (i lead del CRM perdono il collegamento). */
export function useRicominciaOfferta() {
  const invalida = useInvalida();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("offerta").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalida,
    onError: erroreMutation("Non è stato possibile ricominciare"),
  });
}

