/**
 * skool-trascrivi — la coda dei video Skool (team o cron secret; la chiamano
 * i trigger di `skool_video`/`skool_video_blocchi` e il cron ogni 5 minuti).
 * Ogni invocazione fa UNA cosa, per restare nel tempo massimo della funzione:
 *  1. se ci sono blocchi audio da trascrivere (video in `trascrizione`), ne
 *     prende in carico fino a 2 e li manda a OpenAI; quando l'ultimo blocco di
 *     un video è fatto, compone la trascrizione e passa il video a `scrittura`
 *     (il trigger richiama la funzione);
 *  2. altrimenti, se c'è un video in `scrittura`, Aura scrive capitoli (≥ 60 min)
 *     o riassunto (< 60) → `bozza` + Telegram.
 * POST { video_id? } → dà la precedenza a quel video. Risposta: { ok, blocchi, scritti }.
 * POST { azione: "prova", prova: { corso_id, corso_nome, corso_titolo, durata_sec? } } → video sintetico (vedi prova.ts).
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { HAS_ANTHROPIC } from "../_shared/anthropic.ts";
import { HAS_OPENAI } from "../_shared/config.ts";
import { errore, gestisciErrore, HttpError, json, leggiBody, preflight } from "../_shared/http.ts";
import { logError } from "../_shared/log.ts";
import { rigaLink, sitoGestionale } from "../_shared/sito.ts";
import { adminClient, autorizzatoCron, chiamante, esTeam } from "../_shared/supabase.ts";
import { notifyTelegram } from "../_shared/telegram.ts";
import { creaVideoDiProva } from "./prova.ts";
import { scriviTesto } from "./scrivi.ts";
import { type Blocco, COLONNE_BLOCCO, COLONNE_VIDEO, type Video } from "./tipi.ts";
import { trascriviBlocco } from "./trascrivi.ts";

const MAX_BLOCCHI_PER_GIRO = 2;
const BUDGET_MS = 95_000;
const MAX_TENTATIVI = 3;
/** Un blocco o una scrittura «in corso» da più di tanto è morta: si riprende. */
const SOGLIA_MORTO_MS = 10 * 60 * 1000;
const MSG_TENTATIVI = "La trascrizione non è riuscita dopo 3 tentativi: controlla gli errori e riprova.";

const soglia = () => new Date(Date.now() - SOGLIA_MORTO_MS).toISOString();

/** Prende in carico un blocco (update condizionale: due invocazioni non lo fanno due volte). */
async function prendiBlocco(admin: SupabaseClient, b: Blocco): Promise<Blocco | null> {
  const { data, error } = await admin
    .from("skool_video_blocchi")
    .update({ stato: "in_corso", avviato_il: new Date().toISOString(), tentativi: b.tentativi + 1, errore: null })
    .eq("id", b.id)
    .eq("stato", b.stato)
    .eq("tentativi", b.tentativi)
    .select(COLONNE_BLOCCO);
  if (error) throw error;
  return ((data ?? []) as Blocco[])[0] ?? null;
}

async function blocchiDaFare(admin: SupabaseClient, videoId: string | null): Promise<Blocco[]> {
  let q = admin
    .from("skool_video_blocchi")
    .select(`${COLONNE_BLOCCO}, skool_video!inner(stato)`)
    .eq("skool_video.stato", "trascrizione")
    .lt("tentativi", MAX_TENTATIVI)
    .or(`stato.eq.da_fare,stato.eq.errore,and(stato.eq.in_corso,avviato_il.lt.${soglia()})`)
    .order("indice")
    .limit(MAX_BLOCCHI_PER_GIRO);
  if (videoId) q = q.eq("video_id", videoId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Blocco[];
}

/** Dopo un blocco: se tutti sono fatti compone la trascrizione; se uno è morto chiude in errore. */
async function chiudiSeCompleto(admin: SupabaseClient, videoId: string): Promise<void> {
  const { data, error } = await admin
    .from("skool_video_blocchi")
    .select("indice, stato, tentativi, testo")
    .eq("video_id", videoId)
    .order("indice");
  if (error) throw error;
  const blocchi = (data ?? []) as Array<{ indice: number; stato: string; tentativi: number; testo: string | null }>;
  if (blocchi.some((b) => b.stato === "errore" && b.tentativi >= MAX_TENTATIVI)) {
    await admin.from("skool_video").update({ stato: "errore", errore: MSG_TENTATIVI }).eq("id", videoId).eq("stato", "trascrizione");
    return;
  }
  if (blocchi.length === 0 || !blocchi.every((b) => b.stato === "fatto")) return;
  const trascrizione = blocchi.map((b) => (b.testo ?? "").trim()).filter(Boolean).join("\n");
  const { error: eUp } = await admin
    .from("skool_video")
    .update({ trascrizione, stato: trascrizione ? "scrittura" : "errore", errore: trascrizione ? null : "Nessun parlato riconosciuto nell'audio.", avviato_il: null })
    .eq("id", videoId)
    .eq("stato", "trascrizione");
  if (eUp) throw eUp;
}

async function lavoraBlocco(admin: SupabaseClient, b: Blocco): Promise<boolean> {
  const presa = await prendiBlocco(admin, b);
  if (!presa) return false;
  const esito = await trascriviBlocco(admin, presa);
  if (esito.ok) {
    const { error } = await admin.from("skool_video_blocchi").update({ stato: "fatto", testo: esito.testo, errore: null }).eq("id", presa.id);
    if (error) throw error;
  } else {
    await logError("skool-trascrivi:blocco", esito.dettaglio, { video: presa.video_id, blocco: presa.indice, tentativo: presa.tentativi }, { silent: true });
    await admin
      .from("skool_video_blocchi")
      .update({ stato: "errore", errore: esito.dettaglio.slice(0, 500), tentativi: esito.definitivo ? MAX_TENTATIVI : presa.tentativi })
      .eq("id", presa.id);
  }
  await chiudiSeCompleto(admin, presa.video_id);
  return true;
}

/** Il video da scrivere: in `scrittura` e non già preso (o preso da troppo). */
async function prendiDaScrivere(admin: SupabaseClient, videoId: string | null): Promise<Video | null> {
  let q = admin
    .from("skool_video")
    .select(COLONNE_VIDEO)
    .eq("stato", "scrittura")
    .lt("tentativi", MAX_TENTATIVI)
    .or(`avviato_il.is.null,avviato_il.lt.${soglia()}`)
    .order("created_at")
    .limit(1);
  if (videoId) q = q.eq("id", videoId);
  const { data, error } = await q;
  if (error) throw error;
  const v = ((data ?? []) as Video[])[0];
  if (!v) return null;
  const { data: presa, error: ePresa } = await admin
    .from("skool_video")
    .update({ avviato_il: new Date().toISOString(), tentativi: v.tentativi + 1 })
    .eq("id", v.id)
    .eq("tentativi", v.tentativi)
    .select(COLONNE_VIDEO);
  if (ePresa) throw ePresa;
  return ((presa ?? []) as Video[])[0] ?? null;
}

async function scrivi(admin: SupabaseClient, v: Video): Promise<boolean> {
  if (!v.trascrizione) {
    await admin.from("skool_video").update({ stato: "errore", errore: "Trascrizione assente." }).eq("id", v.id);
    return false;
  }
  const esito = await scriviTesto(v, v.trascrizione);
  if (!esito) {
    const ultimo = v.tentativi + 1 >= MAX_TENTATIVI;
    await logError("skool-trascrivi:scrittura", "Aura non ha scritto un testo valido", { video: v.id, tentativo: v.tentativi + 1 }, { silent: !ultimo });
    if (ultimo) await admin.from("skool_video").update({ stato: "errore", errore: "Aura non è riuscita a scrivere il testo. Riprova." }).eq("id", v.id);
    else await admin.from("skool_video").update({ avviato_il: null }).eq("id", v.id);
    return false;
  }
  const { testo, modello } = esito;
  await admin.from("skool_video_capitoli").delete().eq("video_id", v.id);
  if (testo.capitoli.length > 0) {
    const { error } = await admin
      .from("skool_video_capitoli")
      .insert(testo.capitoli.map((c, i) => ({ video_id: v.id, ordine: i, inizio_sec: c.inizio_sec, titolo: c.titolo, testo: c.testo || null })));
    if (error) throw error;
  }
  const { error } = await admin
    .from("skool_video")
    .update({ stato: "bozza", tipo_testo: testo.tipo, apertura: testo.apertura, riassunto: testo.riassunto, parole_chiave: testo.parole_chiave, modello, errore: null, avviato_il: null, tentativi: 0 })
    .eq("id", v.id);
  if (error) throw error;
  const sito = await sitoGestionale(admin);
  await notifyTelegram(
    `🎬 Skool Video: testo pronto\n«${v.titolo}» — ${testo.tipo === "capitoli" ? `${testo.capitoli.length} capitoli` : "riassunto"}. Rivedilo e pubblicalo su Skool.` +
      rigaLink(sito, `/skool-video/${v.id}`),
  );
  return true;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    if (!autorizzatoCron(req)) {
      const c = await chiamante(req);
      if (!c || !esTeam(c.rol)) throw new HttpError(403, "Riservato al team.");
    }
    if (!HAS_OPENAI) return errore("OPENAI_API_KEY non configurata.", 500);
    if (!HAS_ANTHROPIC) return errore("ANTHROPIC_API_KEY non configurata.", 500);
    const body = await leggiBody<{ video_id?: string; azione?: string; prova?: Record<string, unknown> }>(req);
    const admin = adminClient();
    let videoId = typeof body.video_id === "string" && body.video_id ? body.video_id : null;
    if (body.azione === "prova") {
      // Diagnostica: un video sintetico, poi la coda lavora subito su di lui.
      const p = body.prova ?? {};
      const esito = await creaVideoDiProva(admin, {
        titolo: typeof p.titolo === "string" && p.titolo ? p.titolo : "Prova sintetica (da cancellare)",
        corso_id: String(p.corso_id ?? ""),
        corso_nome: String(p.corso_nome ?? ""),
        corso_titolo: String(p.corso_titolo ?? ""),
        durata_sec: typeof p.durata_sec === "number" ? p.durata_sec : 1200,
        creato_da: typeof p.creato_da === "string" ? p.creato_da : null,
        testo: typeof p.testo === "string" ? p.testo : undefined,
      });
      if (!esito.ok) return errore(`prova: ${esito.dettaglio}`, 502);
      videoId = esito.video_id;
    }
    const inizio = Date.now();

    let blocchi = 0;
    for (const b of await blocchiDaFare(admin, videoId)) {
      if (blocchi > 0 && Date.now() - inizio > BUDGET_MS / 2) break;
      if (await lavoraBlocco(admin, b)) blocchi++;
    }
    if (blocchi > 0) return json({ ok: true, blocchi, scritti: 0, video_id: videoId });

    const v = await prendiDaScrivere(admin, videoId);
    const scritti = v ? (await scrivi(admin, v)) ? 1 : 0 : 0;
    return json({ ok: true, blocchi: 0, scritti, video_id: videoId });
  } catch (err) {
    return gestisciErrore(err);
  }
});
