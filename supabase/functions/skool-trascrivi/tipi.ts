/** Righe di `skool_video` e `skool_video_blocchi` come le legge la funzione. */

export interface Video {
  id: string;
  titolo: string;
  durata_sec: number;
  blocchi: number;
  stato: string;
  tentativi: number;
  avviato_il: string | null;
  trascrizione: string | null;
  creato_da: string | null;
}

export interface Blocco {
  id: string;
  video_id: string;
  indice: number;
  inizio_sec: number;
  durata_sec: number;
  storage_path: string;
  stato: string;
  tentativi: number;
  avviato_il: string | null;
  testo: string | null;
}

export const COLONNE_VIDEO = "id, titolo, durata_sec, blocchi, stato, tentativi, avviato_il, trascrizione, creato_da";
export const COLONNE_BLOCCO = "id, video_id, indice, inizio_sec, durata_sec, storage_path, stato, tentativi, avviato_il, testo";

/** Secondi → «h:mm:ss» (o «m:ss» sotto l'ora), come nelle descrizioni delle live. */
export function tempo(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(r).padStart(2, "0")}`;
}

/** «h:mm:ss» / «mm:ss» → secondi (null se non è un tempo). */
export function secondi(testo: string): number | null {
  const m = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/.exec(testo.trim());
  if (!m) return null;
  const h = m[1] ? Number(m[1]) : 0;
  return h * 3600 + Number(m[2]) * 60 + Number(m[3]);
}
