import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { erroreMutation } from "@/shared/utils/invocaEdge";
import type { ErroreLog } from "../types";

export const CHIAVE_ERRORI = ["errori", "lista"] as const;
/** Gli errori non gestiti (dashboard): stessa radice, così «Gestito» aggiorna entrambe le viste. */
export const CHIAVE_ERRORI_DA_GESTIRE = ["errori", "da-gestire"] as const;
const LIMITE = 100;
const MAX_DA_GESTIRE = 6;

export type ErroreDaGestire = Pick<ErroreLog, "id" | "created_at" | "scope" | "message">;

/** Ultimi 100 errori applicativi (scritti dalle Edge Functions), i più recenti per primi. */
export function useErrori() {
  return useQuery({
    queryKey: CHIAVE_ERRORI,
    queryFn: async (): Promise<ErroreLog[]> => {
      const { data, error } = await supabase
        .from("error_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(LIMITE);
      if (error) throw error;
      return data;
    },
  });
}

/** Gli errori nuovi non ancora gestiti: i primi 6 per la card della dashboard e il totale. */
export function useErroriDaGestire() {
  return useQuery({
    queryKey: CHIAVE_ERRORI_DA_GESTIRE,
    queryFn: async (): Promise<{ righe: ErroreDaGestire[]; totale: number }> => {
      const { data, error, count } = await supabase
        .from("error_log")
        .select("id, created_at, scope, message", { count: "exact" })
        .is("gestito_il", null)
        .order("created_at", { ascending: false })
        .limit(MAX_DA_GESTIRE);
      if (error) throw error;
      return { righe: data, totale: count ?? data.length };
    },
  });
}

/**
 * «Gestito» / «Da gestire» su uno o più errori. La RLS lascia al team solo questa modifica
 * (trigger error_log_solo_gestione: chi lo segna finisce in gestito_da).
 */
export function useSegnaErroriGestiti() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, gestito }: { ids: number[]; gestito: boolean }) => {
      const { error } = await supabase
        .from("error_log")
        .update({ gestito_il: gestito ? new Date().toISOString() : null })
        .in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (n, { gestito }) => {
      toast.success(gestito ? (n === 1 ? "Errore segnato come gestito" : `${n} errori segnati come gestiti`) : "Errore riaperto");
      void queryClient.invalidateQueries({ queryKey: ["errori"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "attivita-team"] });
    },
    onError: erroreMutation("Non sono riuscito ad aggiornare l'errore"),
  });
}
