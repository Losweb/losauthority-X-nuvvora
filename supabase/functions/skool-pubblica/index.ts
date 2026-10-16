/**
 * skool-pubblica — scrive su Skool via Apify (`_shared/skool-api.ts`). Solo
 * admin (o il cron secret: la chiama il trigger di `skool_video`). Azioni:
 *   { azione: "corsi" }             → i corsi della classroom (id, name, titolo, privacy)
 *   { azione: "albero", corso_id }  → le cartelle del corso (per scegliere dove va la lezione)
 *   { azione: "pubblica", video_id? } o {} → pubblica i video in `pubblicazione` (max 2)
 *   { azione: "elimina", unit_id }  → cancella una lezione (i corsi Skool li rifiuta: 400)
 *   { azione: "raw", nome, params } → diagnostica: un'azione qualsiasi dell'attore
 *   { azione: "stato" }             → segreti presenti + login di prova
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { APIFY_TOKEN } from "../_shared/config.ts";
import { errore, gestisciErrore, HttpError, json, leggiBody, preflight } from "../_shared/http.ts";
import { type Azione, azione, HAS_SKOOL_API, login, SKOOL_EMAIL, SKOOL_GROUP_SLUG, SKOOL_PASSWORD } from "../_shared/skool-api.ts";
import { adminClient, autorizzatoCron, chiamante } from "../_shared/supabase.ts";
import { COLONNE_PUBBLICA, pubblicaVideo, type VideoDaPubblicare } from "./pubblica.ts";

interface Body extends Record<string, unknown> {
  azione?: string;
  corso_id?: string;
  video_id?: string;
  unit_id?: string;
  nome?: string;
  params?: unknown;
}

const MAX_PER_GIRO = 2;
const MAX_TENTATIVI = 3;
const SOGLIA_MORTO_MS = 10 * 60 * 1000;

interface Unita {
  id: string;
  name: string;
  titolo: string | null;
  privacy: number | null;
  unit_type: string | null;
}

/** Un item dell'attore (corso o nodo dell'albero `{ course, children }`) → unità compatta. */
function unita(x: unknown): Unita | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const u = (o.course && typeof o.course === "object" ? o.course : o) as Record<string, unknown>;
  if (typeof u.id !== "string" || typeof u.name !== "string") return null;
  const meta = u.metadata && typeof u.metadata === "object" ? (u.metadata as Record<string, unknown>) : {};
  return {
    id: u.id,
    name: u.name,
    titolo: typeof meta.title === "string" ? meta.title : null,
    privacy: typeof meta.privacy === "number" ? meta.privacy : null,
    unit_type: typeof u.unit_type === "string" ? u.unit_type : null,
  };
}

const compatta = (u: Unita) => ({ id: u.id, name: u.name, titolo: u.titolo ?? u.name, privacy: u.privacy });

/** Prende in carico i video in `pubblicazione` (update condizionale) e li pubblica uno alla volta. */
async function pubblicaInCoda(admin: SupabaseClient, videoId: string | null): Promise<number> {
  const soglia = new Date(Date.now() - SOGLIA_MORTO_MS).toISOString();
  let q = admin
    .from("skool_video")
    .select(COLONNE_PUBBLICA)
    .eq("stato", "pubblicazione")
    .lt("tentativi", MAX_TENTATIVI)
    .or(`avviato_il.is.null,avviato_il.lt.${soglia}`)
    .order("created_at")
    .limit(MAX_PER_GIRO);
  if (videoId) q = q.eq("id", videoId);
  const { data, error } = await q;
  if (error) throw error;
  let fatti = 0;
  for (const v of (data ?? []) as VideoDaPubblicare[]) {
    const { data: presa, error: ePresa } = await admin
      .from("skool_video")
      .update({ avviato_il: new Date().toISOString(), tentativi: v.tentativi + 1 })
      .eq("id", v.id)
      .eq("stato", "pubblicazione")
      .eq("tentativi", v.tentativi)
      .select("id");
    if (ePresa) throw ePresa;
    if ((presa ?? []).length === 0) continue;
    if (await pubblicaVideo(admin, v)) fatti++;
  }
  return fatti;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    if (!autorizzatoCron(req)) {
      const c = await chiamante(req);
      if (!c || c.rol !== "admin") throw new HttpError(403, "Riservato all'admin.");
    }
    const body = await leggiBody<Body>(req);
    const admin = adminClient();

    if (body.azione === "stato") {
      const config = { apify: APIFY_TOKEN.length > 0, email: SKOOL_EMAIL.length > 0, password: SKOOL_PASSWORD.length > 0, slug: SKOOL_GROUP_SLUG };
      if (!HAS_SKOOL_API) return json({ ok: false, config, login: "configurazione incompleta" });
      const l = await login(admin);
      return json({ ok: l.ok, config, login: l.ok ? `ok (${l.cookies.length} caratteri)` : l.dettaglio });
    }
    if (!HAS_SKOOL_API) return errore("Configurazione Skool incompleta (APIFY_TOKEN, SKOOL_EMAIL, SKOOL_PASSWORD).", 500);

    if (body.azione === "corsi") {
      const r = await azione(admin, "classroom:listCourses", {});
      if (!r.ok) return errore(`Skool: ${r.dettaglio}`, 502);
      const corsi = r.items.map(unita).filter((u): u is Unita => u !== null).map(compatta);
      return json({ ok: true, corsi });
    }
    if (body.azione === "albero") {
      if (!body.corso_id || !/^[0-9a-f]{32}$/i.test(body.corso_id)) throw new HttpError(400, "corso_id mancante");
      const r = await azione(admin, "classroom:getTree", { courseId: body.corso_id });
      if (!r.ok) return errore(`Skool: ${r.dettaglio}`, 502);
      const radice = r.items[0] as { children?: unknown[] } | undefined;
      const figli = (Array.isArray(radice?.children) ? radice.children : []).map(unita).filter((u): u is Unita => u !== null);
      return json({
        ok: true,
        cartelle: figli.filter((u) => u.unit_type === "set").map(compatta),
        lezioni: figli.filter((u) => u.unit_type !== "set").length,
      });
    }
    if (body.azione === "elimina") {
      if (!body.unit_id) throw new HttpError(400, "unit_id mancante");
      const r = await azione(admin, "classroom:deleteUnit", { id: body.unit_id });
      return r.ok ? json({ ok: true, esito: r.items[0] ?? true }) : errore(`deleteUnit: ${r.dettaglio}`, 502);
    }
    if (body.azione === "raw") {
      if (typeof body.nome !== "string" || !body.nome) throw new HttpError(400, "nome mancante");
      const params = body.params && typeof body.params === "object" ? (body.params as Record<string, unknown>) : {};
      const r = await azione(admin, body.nome as Azione, params);
      return json(r.ok ? { ok: true, items: r.items } : { ok: false, stato: r.stato, dettaglio: r.dettaglio });
    }
    if (body.azione === "pubblica" || body.azione === undefined) {
      const videoId = typeof body.video_id === "string" && body.video_id ? body.video_id : null;
      const pubblicati = await pubblicaInCoda(admin, videoId);
      return json({ ok: true, pubblicati });
    }
    throw new HttpError(400, "Azione non valida.");
  } catch (err) {
    return gestisciErrore(err);
  }
});
