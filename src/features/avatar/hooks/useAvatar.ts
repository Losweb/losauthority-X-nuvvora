import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Avatar, DiagnosiAvatar } from "../types";

export const chiaviAvatar = {
  lista: (clienteId: string) => ["avatar", "lista", clienteId] as const,
  uno: (id: string) => ["avatar", "uno", id] as const,
  messaggi: (id: string) => ["avatar", "messaggi", id] as const,
  diagnosi: (id: string) => ["avatar", "diagnosi", id] as const,
};

/** La diagnosi per Wesley di un avatar (solo team: per il cliente la RLS non restituisce righe → null). */
export function useDiagnosiAvatar(avatarId: string | undefined) {
  return useQuery({
    queryKey: chiaviAvatar.diagnosi(avatarId ?? ""),
    enabled: !!avatarId,
    queryFn: async (): Promise<DiagnosiAvatar | null> => {
      const { data, error } = await supabase.from("avatar_diagnosi").select("*").eq("avatar_id", avatarId ?? "").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Gli avatar del SISTEMA DI PRIMA (tabella `avatar`, fino al 24/11/2026), dal primo creato: dal 25/11/2026
 * la fase Avatar è la mappa (useMappaAvatar); questi restano leggibili dal team nella scheda cliente.
 */
export function useAvatars(clienteId: string | undefined) {
  return useQuery({
    queryKey: chiaviAvatar.lista(clienteId ?? ""),
    enabled: !!clienteId,
    queryFn: async (): Promise<Avatar[]> => {
      const { data, error } = await supabase.from("avatar").select("*").eq("cliente_id", clienteId ?? "").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}
