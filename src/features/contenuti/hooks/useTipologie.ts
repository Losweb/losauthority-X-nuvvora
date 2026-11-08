import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth";
import { logDev, MESSAGGIO_ERRORE_GENERICO } from "@/shared/utils/errors";
import type { TipologiaFormValues } from "../schema";
import type { ChiaveTipologia, Tipologia } from "../types";
import { chiaviContenuti } from "./useContenuti";

export const chiaviTipologie = {
  lista: (utenteId: string) => ["contenuti", "tipologie", utenteId] as const,
};

/** Le tipologie che chi è collegato vede: le predefinite (prima, nel loro ordine) e le proprie. Filtra la RLS. */
export function useTipologie() {
  const { utente } = useAuth();
  return useQuery({
    queryKey: chiaviTipologie.lista(utente?.id ?? ""),
    enabled: !!utente,
    queryFn: async (): Promise<Tipologia[]> => {
      const { data, error } = await supabase
        .from("tipologie_contenuto")
        .select("*")
        .order("predefinita", { ascending: false })
        .order("ordine")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Id della predefinita con quella chiave (travaso delle idee di Aura nel Workflow); null se manca. */
export async function tipologiaIdPerChiave(chiave: ChiaveTipologia): Promise<string | null> {
  const { data, error } = await supabase.from("tipologie_contenuto").select("id").eq("chiave", chiave).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

/** Testo per l'utente: il nome doppio è l'indice unico, i limiti del trigger parlano già italiano. */
function descrizioneErrore(error: unknown): string {
  const e = error as { code?: string; message?: string } | null;
  if (e?.code === "23505") return "Hai già una tipologia con questo nome.";
  if (e?.code === "P0001" && e.message) return e.message;
  return MESSAGGIO_ERRORE_GENERICO;
}

function useInvalidaTipologie() {
  const queryClient = useQueryClient();
  const { utente } = useAuth();
  return () => {
    void queryClient.invalidateQueries({ queryKey: chiaviTipologie.lista(utente?.id ?? "") });
  };
}

/** Crea una tipologia propria (nome + colore); `creato_da` = chi è collegato, come vuole la RLS. */
export function useCreaTipologia() {
  const { utente } = useAuth();
  const invalida = useInvalidaTipologie();
  return useMutation({
    mutationFn: async (valori: TipologiaFormValues) => {
      if (!utente) throw new Error("Utente non disponibile");
      const { error } = await supabase
        .from("tipologie_contenuto")
        .insert({ nome: valori.nome, colore: valori.colore.toLowerCase(), creato_da: utente.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tipologia aggiunta");
      invalida();
    },
    onError: (error) => {
      toast.error("Impossibile aggiungere la tipologia", { description: descrizioneErrore(error) });
      logDev(error);
    },
  });
}

/** Cambia nome o colore di una tipologia propria (le predefinite la RLS non le fa toccare). */
export function useAggiornaTipologia() {
  const invalida = useInvalidaTipologie();
  return useMutation({
    mutationFn: async ({ id, ...valori }: TipologiaFormValues & { id: string }) => {
      const { error } = await supabase
        .from("tipologie_contenuto")
        .update({ nome: valori.nome, colore: valori.colore.toLowerCase() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tipologia aggiornata");
      invalida();
    },
    onError: (error) => {
      toast.error("Impossibile aggiornare la tipologia", { description: descrizioneErrore(error) });
      logDev(error);
    },
  });
}

/** Elimina una tipologia propria: i contenuti che la usavano restano, senza tipologia (FK set null). */
export function useEliminaTipologia() {
  const queryClient = useQueryClient();
  const { utente } = useAuth();
  const invalida = useInvalidaTipologie();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tipologie_contenuto").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tipologia eliminata");
      invalida();
      void queryClient.invalidateQueries({ queryKey: chiaviContenuti.lista(utente?.id ?? "") });
    },
    onError: (error) => {
      toast.error("Impossibile eliminare la tipologia", { description: descrizioneErrore(error) });
      logDev(error);
    },
  });
}
