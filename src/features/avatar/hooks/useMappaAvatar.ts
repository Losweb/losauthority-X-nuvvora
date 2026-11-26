import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { erroreMutation, invocaEdge } from "@/shared/utils/invocaEdge";
import type { MappaAvatar, MessaggioMappa, SchedaAvatar } from "../mappa";

export const chiaviMappa = {
  mappa: (clienteId: string) => ["avatar-mappa", "mappa", clienteId] as const,
  messaggi: (mappaId: string) => ["avatar-mappa", "messaggi", mappaId] as const,
};

export interface MappaConSchede {
  mappa: MappaAvatar;
  schede: SchedaAvatar[];
}

/**
 * La mappa del cliente con le sue schede (null finché non ha iniziato).
 * Con `attivo` (Aura sta scrivendo) si ricarica ogni 2,5 s: mappa e schede si riempiono sotto gli occhi.
 */
export function useMappaAvatar(clienteId: string | undefined, attivo = false) {
  return useQuery({
    queryKey: chiaviMappa.mappa(clienteId ?? ""),
    enabled: !!clienteId,
    refetchInterval: attivo ? 2500 : false,
    queryFn: async (): Promise<MappaConSchede | null> => {
      const { data: mappa, error } = await supabase.from("avatar_mappa").select("*").eq("cliente_id", clienteId ?? "").maybeSingle();
      if (error) throw error;
      if (!mappa) return null;
      const { data: schede, error: e2 } = await supabase.from("avatar_scheda").select("*").eq("mappa_id", mappa.id).order("ordine");
      if (e2) throw e2;
      return { mappa: mappa as unknown as MappaAvatar, schede: (schede ?? []) as unknown as SchedaAvatar[] };
    },
  });
}

/** La conversazione. Si aggiorna da sola finché Aura sta scrivendo. */
export function useMessaggiMappa(mappaId: string | undefined) {
  return useQuery({
    queryKey: chiaviMappa.messaggi(mappaId ?? ""),
    enabled: !!mappaId,
    refetchInterval: (query) => (query.state.data?.some((m) => m.stato === "in_corso") ? 2500 : false),
    queryFn: async (): Promise<MessaggioMappa[]> => {
      const { data, error } = await supabase.from("avatar_mappa_messaggi").select("*").eq("mappa_id", mappaId ?? "").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Dopo ogni scrittura si rileggono mappa, schede e conversazione (tutte sotto la chiave "avatar-mappa"). */
function useInvalida(_clienteId: string) {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ["avatar-mappa"] });
}

/** Inizia la fase: la funzione crea la mappa e Aura scrive il primo messaggio (parte anche da uno dei tre dubbi). */
export function useIniziaMappa(clienteId: string) {
  const invalida = useInvalida(clienteId);
  return useMutation({
    mutationFn: async (dubbio?: string) => invocaEdge<{ mappa_id: string }>("aura-avatar", dubbio ? { azione: "crea", messaggio: dubbio } : { azione: "crea" }),
    onSettled: invalida,
    onError: erroreMutation("Aura non è riuscita a iniziare"),
  });
}

type InvioInput = ({ messaggio: string } | { riprovaId: string }) & { signal?: AbortSignal };

/** Un turno con Aura o la riprova di una risposta in errore. */
export function useInviaMappa(clienteId: string) {
  const invalida = useInvalida(clienteId);
  return useMutation({
    mutationFn: async (input: InvioInput) =>
      invocaEdge<{ messaggio_id: string; risposta: string }>("aura-avatar", "riprovaId" in input ? { riprova_messaggio_id: input.riprovaId } : { messaggio: input.messaggio }, { signal: input.signal }),
    onSettled: invalida,
    onError: erroreMutation("Aura non ha risposto"),
  });
}

/** Tasto stop: chiude la richiesta nel browser e dice alla funzione di scartare la risposta in corso. */
export function useFermaMappa(clienteId: string) {
  const invalida = useInvalida(clienteId);
  return (controller: AbortController | null) => {
    controller?.abort();
    void invocaEdge<Record<string, never>>("aura-avatar", { azione: "ferma" }).catch(() => null).finally(invalida);
  };
}

export interface Modifica {
  /** "mappa" o il numero della scheda. */
  dove: "mappa" | number;
  percorso: string;
  /** Testo nuovo, coppia nuova, o null per togliere la riga. Assente = cambia solo `fatto`. */
  valore?: string | Record<string, string> | null;
  fatto?: boolean;
}

/** Il cliente corregge una riga da solo: la correzione conta come frase vera. */
export function useModificaRiga(clienteId: string) {
  const invalida = useInvalida(clienteId);
  return useMutation({
    mutationFn: async (m: Modifica) => invocaEdge<Record<string, never>>("aura-avatar", { azione: "modifica", ...m }),
    onSettled: invalida,
    onError: erroreMutation("Correzione non salvata"),
  });
}

/** Ricomincia da capo: elimina mappa, schede e conversazione (on delete cascade). */
export function useRicominciaMappa(clienteId: string) {
  const invalida = useInvalida(clienteId);
  return useMutation({
    mutationFn: async (mappaId: string) => {
      const { error } = await supabase.from("avatar_mappa").delete().eq("id", mappaId);
      if (error) throw error;
    },
    onSettled: invalida,
    onError: erroreMutation("Non è stato possibile ricominciare"),
  });
}

/** Team: segna la mappa «rivista da Wesley» o la rimette in bozza. */
export function useStatoMappa(clienteId: string) {
  const invalida = useInvalida(clienteId);
  return useMutation({
    mutationFn: async ({ mappaId, rivista }: { mappaId: string; rivista: boolean }) => {
      const { error } = await supabase.from("avatar_mappa").update({ stato: rivista ? "rivista" : "bozza" }).eq("id", mappaId);
      if (error) throw error;
      return rivista;
    },
    onSuccess: (rivista) => toast.success(rivista ? "Mappa segnata come rivista" : "Mappa rimessa in bozza"),
    onSettled: invalida,
    onError: erroreMutation("Stato non cambiato"),
  });
}
