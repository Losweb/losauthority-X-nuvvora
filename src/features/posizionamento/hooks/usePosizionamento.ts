import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Posizionamento } from "@posizionamento-forma/forma";
import { supabase } from "@/integrations/supabase/client";
import { erroreMutation, invocaEdge } from "@/shared/utils/invocaEdge";

export interface RigaPosizionamento {
  id: string;
  cliente_id: string;
  contenuto: Posizionamento;
  stato: "in_corso" | "pronto" | "errore";
  errore: string | null;
  updated_at: string;
}

export const chiavePosizionamento = (clienteId: string) => ["posizionamento", clienteId] as const;

// La tabella è nuova (migrazione 20261126000076): finché i tipi generati non la conoscono si legge senza tipi.
const tabella = () => supabase.from("posizionamento" as "offerta");

/** Il posizionamento del cliente, null finché non l'ha creato. Mentre Aura scrive si ricarica ogni 3 s. */
export function usePosizionamento(clienteId: string | undefined) {
  return useQuery({
    queryKey: chiavePosizionamento(clienteId ?? ""),
    enabled: !!clienteId,
    refetchInterval: (q) => ((q.state.data as RigaPosizionamento | null | undefined)?.stato === "in_corso" ? 3000 : false),
    queryFn: async (): Promise<RigaPosizionamento | null> => {
      const { data, error } = await tabella().select("*").eq("cliente_id", clienteId ?? "").maybeSingle();
      if (error) throw error;
      return (data as unknown as RigaPosizionamento | null) ?? null;
    },
  });
}

function useInvalida() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ["posizionamento"] });
}

/** Aura scrive il posizionamento (anche per rifarlo da capo). Ci mette circa un minuto. */
export function useCreaPosizionamento() {
  const invalida = useInvalida();
  return useMutation({
    mutationFn: async () => invocaEdge<Record<string, never>>("aura-posizionamento", { azione: "crea" }),
    onSettled: invalida,
    onError: erroreMutation("Aura non è riuscita a scrivere il posizionamento"),
  });
}

/** Aura lo riscrive con la richiesta del cliente («la bio più corta», «togli l'emoji»…). */
export function useCambiaPosizionamento() {
  const invalida = useInvalida();
  return useMutation({
    mutationFn: async (richiesta: string) => invocaEdge<Record<string, never>>("aura-posizionamento", { azione: "cambia", richiesta }),
    onSettled: invalida,
    onError: erroreMutation("Modifica non riuscita"),
  });
}

/** Il cliente corregge da solo una riga (la matita). */
export function useModificaPosizionamento() {
  const invalida = useInvalida();
  return useMutation({
    mutationFn: async (m: { percorso: string; valore?: string | Record<string, string> | null }) => invocaEdge<Record<string, never>>("aura-posizionamento", { azione: "modifica", ...m }),
    onSettled: invalida,
    onError: erroreMutation("Modifica non salvata"),
  });
}

/** Ricomincia da capo: cancella il posizionamento. */
export function useEliminaPosizionamento() {
  const invalida = useInvalida();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tabella().delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalida,
    onError: erroreMutation("Non è stato possibile ricominciare"),
  });
}
