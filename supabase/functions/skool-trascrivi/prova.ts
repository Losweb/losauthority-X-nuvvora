/**
 * Diagnostica (solo admin / cron secret): crea un video di prova SENZA un video
 * vero. Il parlato lo sintetizza la voce di OpenAI (`/v1/audio/speech`, pochi
 * centesimi), il blocco va nel bucket come farebbe il browser e poi la coda
 * lavora come sempre: whisper → Aura → bozza. Serve a verificare chiavi e
 * pipeline da un Mac senza video a portata di mano.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { OPENAI_API_KEY } from "../_shared/config.ts";

const BUCKET = "skool-audio";
const MODELLO_VOCE = Deno.env.get("OPENAI_MODEL_VOCE") || "gpt-4o-mini-tts";

const TESTO_PROVA = `Ciao, benvenuto in questa lezione di prova per Los Creators. Oggi parliamo di tre cose. Primo: come scegliere il cliente ideale. Non puoi parlare a tutti: se parli a tutti, nessuno si sente chiamato in causa. Scegli una persona precisa, con un problema preciso, e scrivi i contenuti per lei.
Secondo: l'hook. I primi tre secondi del video decidono tutto. Apri con il problema, non con il tuo nome. Per esempio: «se pubblichi ogni giorno e nessuno ti scrive, il problema non è l'algoritmo».
Terzo: la chiamata all'azione. Alla fine del video chiedi una cosa sola. Un commento, un messaggio, un salvataggio. Non tre cose insieme.
Il compito per questa settimana: scrivi tre hook per il tuo cliente ideale e pubblicane uno. Ci vediamo nella prossima live.`;

export interface OpzioniProva {
  titolo: string;
  corso_id: string;
  corso_nome: string;
  corso_titolo: string;
  /** Durata «dichiarata» del video: sopra i 3600 s Aura scrive i capitoli, altrimenti il riassunto. */
  durata_sec: number;
  creato_da: string | null;
  testo?: string;
}

export type EsitoProva = { ok: true; video_id: string; byte: number } | { ok: false; dettaglio: string };

async function sintetizza(testo: string): Promise<{ ok: true; audio: Blob } | { ok: false; dettaglio: string }> {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: MODELLO_VOCE, voice: "alloy", input: testo, response_format: "mp3" }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) return { ok: false, dettaglio: `OpenAI speech ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}` };
  return { ok: true, audio: await res.blob() };
}

export async function creaVideoDiProva(admin: SupabaseClient, o: OpzioniProva): Promise<EsitoProva> {
  let voce: Awaited<ReturnType<typeof sintetizza>>;
  try {
    voce = await sintetizza(o.testo?.trim() || TESTO_PROVA);
  } catch (err) {
    // Diagnostica: l'eccezione (rete, timeout) va vista, non nascosta in un 500.
    return { ok: false, dettaglio: `voce: ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}` };
  }
  if (!voce.ok) return voce;
  const { data: riga, error } = await admin
    .from("skool_video")
    .insert({
      titolo: o.titolo,
      corso_id: o.corso_id,
      corso_nome: o.corso_nome,
      corso_titolo: o.corso_titolo,
      nome_file: "prova-sintetica.mp3",
      dimensione_byte: voce.audio.size,
      durata_sec: o.durata_sec,
      blocchi: 1,
      stato: "trascrizione",
      creato_da: o.creato_da,
    })
    .select("id")
    .single();
  if (error || !riga) return { ok: false, dettaglio: `riga video: ${error?.message ?? "non creata"}` };
  const path = `${riga.id}/000.mp3`;
  const { error: eUp } = await admin.storage.from(BUCKET).upload(path, voce.audio, { contentType: "audio/mpeg", upsert: true });
  if (eUp) return { ok: false, dettaglio: `upload: ${eUp.message}` };
  const { error: eBlocco } = await admin
    .from("skool_video_blocchi")
    .insert({ video_id: riga.id, indice: 0, inizio_sec: 0, durata_sec: Math.min(600, o.durata_sec), storage_path: path });
  if (eBlocco) return { ok: false, dettaglio: `riga blocco: ${eBlocco.message}` };
  return { ok: true, video_id: riga.id, byte: voce.audio.size };
}
