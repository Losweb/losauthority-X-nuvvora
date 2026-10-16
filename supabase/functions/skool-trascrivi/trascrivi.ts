/**
 * Un blocco audio → testo con i tempi, via OpenAI `whisper-1` (l'unico modello
 * di OpenAI che dà i timestamp dei segmenti, necessari per i capitoli).
 * Il blocco arriva dal bucket `skool-audio` (≤ 25 MB, limite di OpenAI per
 * richiesta: il browser taglia l'audio in blocchi da 10 minuti a 32 kbps mono,
 * ~2,5 MB). I tempi si riportano al video intero sommando `inizio_sec`.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { OPENAI_API_KEY } from "../_shared/config.ts";
import { type Blocco, tempo } from "./tipi.ts";

const BUCKET = "skool-audio";
const MODELLO = Deno.env.get("OPENAI_MODEL_TRASCRIZIONE") || "whisper-1";
/** Lessico della community: aiuta Whisper a scrivere bene i nomi e i termini ricorrenti. */
const GLOSSARIO =
  "Los Creators, Los Authority, Upscale, Wesley Caicedo, Aura, Skool, TikTok, Instagram, reel, hook, content series, avatar, offerta, funnel, lead, call, live, classroom, Claude, ChatGPT, prompt.";
const TIMEOUT_MS = 100_000;
const MAX_BYTE = 25 * 1024 * 1024;

interface Segmento {
  start: number;
  end: number;
  text: string;
}

export type EsitoTrascrizione = { ok: true; testo: string; segmenti: number } | { ok: false; dettaglio: string; definitivo: boolean };

function leggiSegmenti(dati: unknown): Segmento[] {
  if (!dati || typeof dati !== "object") return [];
  const o = dati as Record<string, unknown>;
  const lista = Array.isArray(o.segments) ? o.segments : [];
  return lista
    .map((s): Segmento | null => {
      if (!s || typeof s !== "object") return null;
      const x = s as Record<string, unknown>;
      const start = typeof x.start === "number" ? x.start : null;
      const end = typeof x.end === "number" ? x.end : start;
      const text = typeof x.text === "string" ? x.text.trim() : "";
      return start === null || !text ? null : { start, end: end ?? start, text };
    })
    .filter((s): s is Segmento => s !== null);
}

/**
 * Righe «[h:mm:ss] testo»: una ogni ~20-30 secondi (i segmenti brevi si
 * accorpano), così la trascrizione resta leggibile e i capitoli hanno tempi veri.
 */
export function righeConTempi(segmenti: Segmento[], inizioSec: number, passoSec = 25): string {
  const righe: string[] = [];
  let apertura = -1;
  let frasi: string[] = [];
  for (const s of segmenti) {
    if (apertura < 0) apertura = s.start;
    frasi.push(s.text);
    if (s.end - apertura >= passoSec || /[.!?]$/.test(s.text) && s.end - apertura >= passoSec * 0.6) {
      righe.push(`[${tempo(inizioSec + apertura)}] ${frasi.join(" ")}`);
      apertura = -1;
      frasi = [];
    }
  }
  if (frasi.length > 0) righe.push(`[${tempo(inizioSec + Math.max(0, apertura))}] ${frasi.join(" ")}`);
  return righe.join("\n");
}

export async function trascriviBlocco(admin: SupabaseClient, b: Blocco, lingua = "it"): Promise<EsitoTrascrizione> {
  if (!OPENAI_API_KEY) return { ok: false, dettaglio: "OPENAI_API_KEY mancante", definitivo: true };
  const { data: blob, error } = await admin.storage.from(BUCKET).download(b.storage_path);
  if (error || !blob) return { ok: false, dettaglio: `audio non trovato (${error?.message ?? "file assente"})`, definitivo: true };
  if (blob.size > MAX_BYTE) return { ok: false, dettaglio: `blocco troppo grande (${Math.round(blob.size / 1024 / 1024)} MB)`, definitivo: true };

  const form = new FormData();
  form.append("file", blob, `blocco-${b.indice}.mp3`);
  form.append("model", MODELLO);
  form.append("language", lingua);
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  form.append("temperature", "0");
  form.append("prompt", GLOSSARIO);

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    return { ok: false, dettaglio: `rete OpenAI: ${err instanceof Error ? err.message : String(err)}`, definitivo: false };
  }
  if (!res.ok) {
    const testo = await res.text().catch(() => "");
    // 4xx (chiave, formato, quota esaurita) non si risolve riprovando; 5xx/429 sì.
    const definitivo = res.status >= 400 && res.status < 500 && res.status !== 429;
    return { ok: false, dettaglio: `OpenAI ${res.status}: ${testo.slice(0, 200)}`, definitivo };
  }
  let dati: unknown;
  try {
    dati = await res.json();
  } catch {
    return { ok: false, dettaglio: "risposta OpenAI non JSON", definitivo: false };
  }
  const segmenti = leggiSegmenti(dati);
  if (segmenti.length === 0) {
    const t = dati && typeof dati === "object" && typeof (dati as Record<string, unknown>).text === "string" ? ((dati as Record<string, unknown>).text as string).trim() : "";
    // Audio muto o senza parlato: blocco valido ma vuoto (non è un errore).
    return { ok: true, testo: t ? `[${tempo(b.inizio_sec)}] ${t}` : "", segmenti: 0 };
  }
  return { ok: true, testo: righeConTempi(segmenti, b.inizio_sec), segmenti: segmenti.length };
}
