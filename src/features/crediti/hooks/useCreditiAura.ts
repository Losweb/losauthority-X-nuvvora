import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logDev } from "@/shared/utils/errors";

/**
 * Crediti di Aura del mese (27/11/2026, migrazione 083): 1 credito = 1 centesimo di costo
 * reale, base 500 al mese + quelli aggiunti dal team, ricarica il 1° del mese. Il team e
 * l'account del team non hanno limiti (`illimitato`). Il blocco vero lo fanno le Edge Function.
 */
export interface StatoCrediti {
  limite: number;
  usati: number;
  residui: number;
  /** Data della ricarica (YYYY-MM-DD, sempre il primo del mese). */
  ricarica: string;
  illimitato: boolean;
}

const chiave = (userId: string) => ["crediti-aura", userId] as const;

/** Lo stato dei crediti: del cliente loggato (senza `userId`) o di un cliente (team). */
export function useCreditiAura(userId: string | undefined) {
  return useQuery({
    queryKey: chiave(userId ?? ""),
    enabled: !!userId,
    // Si consumano mentre il cliente usa Aura: si rilegge ogni minuto e quando torna sulla pagina.
    refetchInterval: 60_000,
    queryFn: async (): Promise<StatoCrediti | null> => {
      const { data, error } = await supabase.rpc("aura_crediti_stato", { p_user: userId });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}

/** Il team aggiunge crediti a un cliente per il mese corrente. */
export function useAggiungiCrediti(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { crediti: number; nota?: string }) => {
      const { error } = await supabase.rpc("aura_crediti_aggiungi", { p_user: userId, p_crediti: input.crediti, p_nota: input.nota });
      if (error) throw error;
    },
    onSuccess: (_d, input) => {
      void queryClient.invalidateQueries({ queryKey: chiave(userId) });
      toast.success(`${input.crediti > 0 ? "Aggiunti" : "Tolti"} ${Math.abs(input.crediti)} crediti per questo mese.`);
    },
    onError: (error) => {
      toast.error("Crediti non aggiunti", { description: "Riprova tra poco." });
      logDev(error);
    },
  });
}

/** «1° dicembre» dalla data della ricarica. */
export function dataRicarica(ricarica: string): string {
  const mese = new Date(`${ricarica}T12:00:00Z`).toLocaleDateString("it-IT", { month: "long", timeZone: "Europe/Rome" });
  return `1° ${mese}`;
}
