import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { erroreMutation, invocaEdge } from "@/shared/utils/invocaEdge";
import { BUCKET_AUDIO, type CartellaSkool, type CorsoSkool, type SkoolVideo, STATI_IN_LAVORAZIONE, type StatoVideo, type CapitoloVideo, type BloccoAudio } from "../types";

export const chiaviSkoolVideo = {
  elenco: ["skool-video"] as const,
  video: (id: string) => ["skool-video", id] as const,
  corsi: ["skool-video", "corsi"] as const,
  cartelle: (corsoId: string) => ["skool-video", "cartelle", corsoId] as const,
};

const POLLING_MS = 5000;

/** Tutti i video, i più recenti prima; si rilegge da solo finché qualcuno è in lavorazione. */
export function useElencoVideo() {
  return useQuery({
    queryKey: chiaviSkoolVideo.elenco,
    queryFn: async (): Promise<SkoolVideo[]> => {
      const { data, error } = await supabase.from("skool_video").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: (q) => (q.state.data?.some((v) => STATI_IN_LAVORAZIONE.has(v.stato)) ? POLLING_MS : false),
  });
}

export type BloccoStato = Pick<BloccoAudio, "id" | "indice" | "stato" | "tentativi" | "errore">;

export interface VideoCompleto extends SkoolVideo {
  skool_video_capitoli: CapitoloVideo[];
  skool_video_blocchi: BloccoStato[];
}

/** Un video con i suoi capitoli e lo stato dei blocchi (polling mentre lavora). */
export function useVideo(id: string | undefined) {
  return useQuery({
    queryKey: chiaviSkoolVideo.video(id ?? ""),
    enabled: !!id,
    queryFn: async (): Promise<VideoCompleto | null> => {
      const { data, error } = await supabase
        .from("skool_video")
        .select("*, skool_video_capitoli(*), skool_video_blocchi(id, indice, stato, tentativi, errore)")
        .eq("id", id ?? "")
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        skool_video_capitoli: [...data.skool_video_capitoli].sort((a, b) => a.ordine - b.ordine),
        skool_video_blocchi: [...data.skool_video_blocchi].sort((a, b) => a.indice - b.indice),
      };
    },
    refetchInterval: (q) => (q.state.data && STATI_IN_LAVORAZIONE.has(q.state.data.stato) ? POLLING_MS : false),
  });
}

/** I corsi della classroom Skool (una run Apify: si tiene in cache 10 minuti). */
export function useCorsiSkool(attivo: boolean) {
  return useQuery({
    queryKey: chiaviSkoolVideo.corsi,
    enabled: attivo,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<CorsoSkool[]> => {
      const r = await invocaEdge<{ corsi: CorsoSkool[] }>("skool-pubblica", { azione: "corsi" });
      return [...r.corsi].sort((a, b) => a.titolo.localeCompare(b.titolo, "it"));
    },
  });
}

/** Le cartelle di un corso (per mettere la lezione dentro una cartella). */
export function useCartelleSkool(corsoId: string) {
  return useQuery({
    queryKey: chiaviSkoolVideo.cartelle(corsoId),
    enabled: corsoId.length > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<CartellaSkool[]> => {
      const r = await invocaEdge<{ cartelle: CartellaSkool[]; lezioni: number }>("skool-pubblica", { azione: "albero", corso_id: corsoId });
      return r.cartelle;
    },
  });
}

interface TestoDaSalvare {
  id: string;
  titolo: string;
  apertura: string | null;
  riassunto: string | null;
  capitoli: Array<Pick<CapitoloVideo, "id" | "titolo" | "testo">>;
}

/** Salva le correzioni dell'admin al testo scritto da Aura (titolo, apertura, riassunto, capitoli). */
export function useSalvaTesto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: TestoDaSalvare) => {
      const { error } = await supabase
        .from("skool_video")
        .update({ titolo: t.titolo, apertura: t.apertura, riassunto: t.riassunto })
        .eq("id", t.id);
      if (error) throw error;
      for (const c of t.capitoli) {
        const { error: eCap } = await supabase.from("skool_video_capitoli").update({ titolo: c.titolo, testo: c.testo }).eq("id", c.id);
        if (eCap) throw eCap;
      }
    },
    onSuccess: (_d, t) => {
      toast.success("Testo salvato");
      void qc.invalidateQueries({ queryKey: chiaviSkoolVideo.video(t.id) });
      void qc.invalidateQueries({ queryKey: chiaviSkoolVideo.elenco });
    },
    onError: erroreMutation("Non sono riuscito a salvare il testo"),
  });
}

const MESSAGGIO_STATO: Partial<Record<StatoVideo, string>> = {
  trascrizione: "Trascrizione ripartita",
  scrittura: "Aura sta riscrivendo il testo",
  pubblicazione: "Pubblicazione su Skool avviata",
};

/** Cambia stato dal browser: riprova (→ trascrizione / scrittura) o pubblica (bozza → pubblicazione). */
export function useCambiaStatoVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stato }: { id: string; stato: StatoVideo }) => {
      const { error } = await supabase.from("skool_video").update({ stato }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, { id, stato }) => {
      toast.success(MESSAGGIO_STATO[stato] ?? "Fatto");
      void qc.invalidateQueries({ queryKey: chiaviSkoolVideo.video(id) });
      void qc.invalidateQueries({ queryKey: chiaviSkoolVideo.elenco });
    },
    onError: erroreMutation("Operazione non riuscita"),
  });
}

/** Elimina il video dal gestionale (riga + blocchi audio nel bucket). La lezione su Skool resta. */
export function useEliminaVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await eliminaAudio(id);
      const { error } = await supabase.from("skool_video").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Video eliminato");
      void qc.invalidateQueries({ queryKey: chiaviSkoolVideo.elenco });
    },
    onError: erroreMutation("Non sono riuscito a eliminare il video"),
  });
}

/** Cancella i blocchi audio di un video dal bucket (best effort). */
export async function eliminaAudio(id: string): Promise<void> {
  const { data } = await supabase.storage.from(BUCKET_AUDIO).list(id);
  const nomi = (data ?? []).map((f) => `${id}/${f.name}`);
  if (nomi.length > 0) await supabase.storage.from(BUCKET_AUDIO).remove(nomi);
}
