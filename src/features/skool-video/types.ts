import type { Tables } from "@/integrations/supabase/types";

export type SkoolVideo = Tables<"skool_video">;
export type BloccoAudio = Tables<"skool_video_blocchi">;
export type CapitoloVideo = Tables<"skool_video_capitoli">;

export type StatoVideo = SkoolVideo["stato"];

export const BUCKET_AUDIO = "skool-audio";
/** Durata di ogni blocco audio (10 minuti ≈ 2,5 MB a 32 kbps: ben sotto i 25 MB di OpenAI). */
export const BLOCCO_SEC = 600;
/** Oltre quest'ora Aura scrive i capitoli, sotto il riassunto (regola del 12/10/2026). */
export const SOGLIA_CAPITOLI_SEC = 3600;
export const MAX_DURATA_SEC = 6 * 3600;

export const ETICHETTA_STATO: Record<string, string> = {
  caricamento: "Caricamento audio",
  trascrizione: "Trascrizione",
  scrittura: "Aura scrive",
  bozza: "Da rivedere",
  pubblicazione: "Pubblicazione",
  pubblicato: "Su Skool",
  errore: "Errore",
};

export const STATI_IN_LAVORAZIONE = new Set<string>(["caricamento", "trascrizione", "scrittura", "pubblicazione"]);

/** Un corso della classroom Skool come lo restituisce `skool-pubblica` (azione corsi/albero). */
export interface CorsoSkool {
  id: string;
  /** Il nome breve che forma l'URL della classroom. */
  name: string;
  titolo: string;
  privacy: number | null;
}

export interface CartellaSkool {
  id: string;
  name: string;
  titolo: string;
}

/** Secondi → «h:mm:ss» (o «m:ss» sotto l'ora). */
export function tempo(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h > 0 ? `${h}:${String(m).padStart(2, "0")}` : String(m)}:${String(r).padStart(2, "0")}`;
}

/** «1 h 23 min» / «18 min», per la lista. */
export function durataLeggibile(sec: number): string {
  const m = Math.round(sec / 60);
  if (m < 60) return `${Math.max(1, m)} min`;
  const h = Math.floor(m / 60);
  const resto = m % 60;
  return resto > 0 ? `${h} h ${resto} min` : `${h} h`;
}

export function dimensioneLeggibile(byte: number | null): string {
  if (!byte) return "";
  if (byte >= 1024 ** 3) return `${(byte / 1024 ** 3).toFixed(1)} GB`;
  return `${Math.round(byte / 1024 ** 2)} MB`;
}
