/**
 * Skool «API» via Apify (`cristiantala/skool-all-in-one-api`): l'unico attore
 * che SCRIVE su Skool (classroom: corsi, cartelle, lezioni, corpo, transcript).
 * Non è un'API ufficiale: entra con email+password di un admin della community
 * (Playwright, ~10 s, 0,02 $) e restituisce cookie validi ~3,5 giorni che le
 * azioni successive riusano (~2 s). I cookie si tengono in `skool_sessione`
 * (RLS senza policy: li legge solo il service role) e si rinnovano quando
 * un'azione risponde «non autorizzato».
 * Una run = un'azione. Costo: ~0,01 $ per scrittura, ~0,005 $ per lettura.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { APIFY_TOKEN, SKOOL_COMMUNITY_URL } from "./config.ts";

const ACTOR = Deno.env.get("APIFY_SKOOL_API_ACTOR") || "cristiantala~skool-all-in-one-api";
export const SKOOL_EMAIL = Deno.env.get("SKOOL_EMAIL") ?? "";
export const SKOOL_PASSWORD = Deno.env.get("SKOOL_PASSWORD") ?? "";
/** Lo slug della community: skool.com/{slug}. */
export const SKOOL_GROUP_SLUG =
  Deno.env.get("SKOOL_GROUP_SLUG") || (SKOOL_COMMUNITY_URL.match(/skool\.com\/([^/?#]+)/)?.[1] ?? "");
export const HAS_SKOOL_API = APIFY_TOKEN.length > 0 && SKOOL_EMAIL.length > 0 && SKOOL_PASSWORD.length > 0;

/** Secondi massimi concessi alla run (il login con Playwright ne prende ~10). */
const TIMEOUT_RUN_S = 90;
/** Dopo tanto i cookie si considerano scaduti e si rifà il login prima di usarli. */
const COOKIE_VALIDI_MS = 3 * 24 * 60 * 60 * 1000;

export type Azione =
  | "auth:login"
  | "classroom:listCourses"
  | "classroom:getTree"
  | "classroom:createCourse"
  | "classroom:createFolder"
  | "classroom:createPage"
  | "classroom:setBody"
  | "classroom:updateCourse"
  | "classroom:updateResources"
  | "classroom:deleteUnit";

export type EsitoAzione =
  | { ok: true; items: Record<string, unknown>[] }
  | { ok: false; stato: number; dettaglio: string; nonAutorizzato: boolean };

/** Mai far uscire token, cookie o password nei log/errori. */
function redigi(testo: string): string {
  return testo
    .replace(/auth_token=[^;\s"]+/gi, "auth_token=***")
    .replace(/aws-waf-token=[^;\s"]+/gi, "aws-waf-token=***")
    .replace(/client_id=[^;\s"]+/gi, "client_id=***")
    .replace(/"password"\s*:\s*"[^"]*"/gi, '"password":"***"');
}

function sembraNonAutorizzato(stato: number, testo: string): boolean {
  return stato === 401 || stato === 403 || /\b(401|403|unauthori[sz]ed|forbidden|not logged|login required|cookie)/i.test(testo);
}

/** Lancia UNA run sincrona dell'attore e ritorna gli item del dataset. */
async function run(input: Record<string, unknown>): Promise<EsitoAzione> {
  if (!APIFY_TOKEN) return { ok: false, stato: 0, dettaglio: "APIFY_TOKEN mancante", nonAutorizzato: false };
  const url = `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?timeout=${TIMEOUT_RUN_S}&clean=true`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${APIFY_TOKEN}` },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout((TIMEOUT_RUN_S + 20) * 1000),
    });
  } catch (err) {
    return { ok: false, stato: 0, dettaglio: `rete Apify: ${err instanceof Error ? err.message : String(err)}`, nonAutorizzato: false };
  }
  const testo = await res.text().catch(() => "");
  if (!res.ok) {
    return { ok: false, stato: res.status, dettaglio: redigi(testo).slice(0, 400), nonAutorizzato: sembraNonAutorizzato(res.status, testo) };
  }
  let dati: unknown;
  try {
    dati = JSON.parse(testo);
  } catch {
    return { ok: false, stato: res.status, dettaglio: "risposta Apify non JSON", nonAutorizzato: false };
  }
  const items = (Array.isArray(dati) ? dati : [dati]).filter((x): x is Record<string, unknown> => !!x && typeof x === "object");
  // L'attore può rispondere 200 con un item { error, status } quando Skool rifiuta l'azione.
  const errore = items.find((x) => x.error !== undefined || x.success === false);
  if (errore) {
    const stato = typeof errore.status === "number" ? errore.status : typeof errore.statusCode === "number" ? errore.statusCode : 0;
    const dettaglio = redigi(typeof errore.error === "string" ? errore.error : JSON.stringify(errore)).slice(0, 400);
    return { ok: false, stato, dettaglio, nonAutorizzato: sembraNonAutorizzato(stato, dettaglio) };
  }
  return { ok: true, items };
}

interface SessioneRiga {
  cookies: string;
  aggiornata_il: string;
}

async function cookiesSalvati(admin: SupabaseClient): Promise<string | null> {
  const { data } = await admin.from("skool_sessione").select("cookies, aggiornata_il").eq("id", true).maybeSingle();
  const r = data as SessioneRiga | null;
  if (!r?.cookies) return null;
  return Date.now() - new Date(r.aggiornata_il).getTime() < COOKIE_VALIDI_MS ? r.cookies : null;
}

/** Il login con Playwright: ritorna la stringa cookie e la salva. */
export async function login(admin: SupabaseClient): Promise<{ ok: true; cookies: string } | { ok: false; dettaglio: string }> {
  if (!SKOOL_EMAIL || !SKOOL_PASSWORD) return { ok: false, dettaglio: "SKOOL_EMAIL / SKOOL_PASSWORD mancanti" };
  const esito = await run({ action: "auth:login", email: SKOOL_EMAIL, password: SKOOL_PASSWORD, groupSlug: SKOOL_GROUP_SLUG });
  if (!esito.ok) return { ok: false, dettaglio: esito.dettaglio };
  const item = esito.items[0] ?? {};
  const cookies = typeof item.cookies === "string" ? item.cookies : typeof item.cookie === "string" ? item.cookie : "";
  if (!cookies) return { ok: false, dettaglio: `login senza cookie (chiavi: ${Object.keys(item).join(", ")})` };
  const { error } = await admin.from("skool_sessione").upsert({ id: true, cookies, aggiornata_il: new Date().toISOString() }, { onConflict: "id" });
  if (error) console.error("[skool-api] sessione non salvata:", error.message);
  return { ok: true, cookies };
}

/**
 * Esegue un'azione con i cookie salvati; se mancano o Skool rifiuta, rifà il
 * login UNA volta e riprova.
 */
export async function azione(admin: SupabaseClient, nome: Azione, params: Record<string, unknown>): Promise<EsitoAzione> {
  let cookies = await cookiesSalvati(admin);
  if (!cookies) {
    const l = await login(admin);
    if (!l.ok) return { ok: false, stato: 0, dettaglio: `login Skool: ${l.dettaglio}`, nonAutorizzato: true };
    cookies = l.cookies;
  }
  const primo = await run({ action: nome, cookies, groupSlug: SKOOL_GROUP_SLUG, params });
  if (primo.ok || !primo.nonAutorizzato) return primo;
  const l = await login(admin);
  if (!l.ok) return { ok: false, stato: 0, dettaglio: `login Skool: ${l.dettaglio}`, nonAutorizzato: true };
  return run({ action: nome, cookies: l.cookies, groupSlug: SKOOL_GROUP_SLUG, params });
}
