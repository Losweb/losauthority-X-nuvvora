/**
 * aura-posizionamento — la pagina «Posizionamento» del cliente (26/11/2026, richiesta di
 * Wesley al posto di Concorrenti e Marca). Aura lo scrive in un colpo partendo da
 * onboarding, avatar e offerta; il cliente lo corregge con la matita o chiedendo ad Aura.
 * Si fa solo con l'offerta completa chiusa (prima l'avatar, poi l'offerta, poi questo).
 * Body:
 *   { azione: "crea" }                        → scrive il posizionamento (anche per rifarlo da capo). { ok }
 *   { azione: "cambia", richiesta }           → Aura lo riscrive con la richiesta del cliente. { ok }
 *   { azione: "modifica", percorso, valore }  → il cliente corregge una riga da solo. { ok }
 * Rate limit: aura_help_allowed(user, 20, 3600, 'posizionamento') per crea e cambia.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { gestisciErrore, HttpError, json, leggiBody, preflight } from "../_shared/http.ts";
import { adminClient, richiediUtente } from "../_shared/supabase.ts";
import { HAS_ANTHROPIC, streamAnthropicText } from "../_shared/anthropic.ts";
import { logError } from "../_shared/log.ts";
import { leggiMateriale, nomeCliente, renderScheda } from "../_shared/materiale.ts";
import { LIMITI, pulisciPosizionamento, tagliaParola, type Posizionamento } from "../_shared/posizionamento/forma.ts";
import { avatarDi, renderAvatar } from "../aura-offerta/avatar.ts";
import { costruisciPrompt, SYSTEM } from "./prompt.ts";

type Body = { azione?: unknown; richiesta?: unknown; percorso?: unknown; valore?: unknown };

const MAX_RICHIESTA = 1500;
const MAX_TESTO = 400;

interface RigaOfferta {
  id: string;
  frase: string | null;
  scheda: Record<string, unknown> | null;
  completa_fatta_il: string | null;
}

async function offertaDi(admin: SupabaseClient, clienteId: string): Promise<RigaOfferta | null> {
  const { data } = await admin.from("offerta").select("id, frase, scheda, completa_fatta_il").eq("cliente_id", clienteId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data as RigaOfferta | null) ?? null;
}

/** L'offerta per il prompt: la frase e le parti che servono (gradini, promessa, presentazione, bonus, garanzia). */
function renderOfferta(o: RigaOfferta): string {
  const s = o.scheda ?? {};
  const utili = Object.fromEntries(["gradini", "promessa", "presentazione", "bonus", "garanzia", "arrivo", "centro"].filter((k) => k in s).map((k) => [k, s[k]]));
  return [o.frase ? `Frase dell'offerta: ${o.frase}` : "", JSON.stringify(utili)].filter(Boolean).join("\n").slice(0, 12000);
}

/** Estrae il JSON dal blocco <dati>. null se non c'è o non si legge. */
function estrai(testo: string): Posizionamento | null {
  const m = testo.match(/<dati>\s*([\s\S]*?)\s*<\/dati>/) ?? testo.match(/(\{[\s\S]*\})/);
  if (!m) return null;
  try {
    const p = pulisciPosizionamento(JSON.parse(m[1]));
    return p.profilo || p.chi_sei ? p : null;
  } catch {
    return null;
  }
}

/** Aura conta male i caratteri: se un testo supera il limite di Instagram, glielo fa accorciare (poi si taglia a fine parola). */
async function accorcia(testo: string, max: number, cosa: string, clienteId: string): Promise<string> {
  if (testo.length <= max) return testo;
  const corto = await streamAnthropicText({
    system: "Accorci testi per profili Instagram in italiano. Rispondi SOLO con il testo accorciato, niente virgolette, niente spiegazioni.",
    user: `Accorcia ${cosa} a massimo ${max} caratteri (adesso sono ${testo.length}), spazi, emoji e a capo compresi. Tieni il senso, le parole chiave e gli a capo.\n\n${testo}`,
    maxTokens: 400,
    tag: "aura-posizionamento-accorcia",
    utente: clienteId,
    timeoutMs: 30_000,
  });
  const t = corto?.trim().replace(/^["«]|["»]$/g, "") ?? "";
  return tagliaParola(t && t.length < testo.length ? t : testo, max);
}

/** Fa scrivere il posizionamento ad Aura e lo salva. Lancia HttpError se non riesce. */
async function scrivi(admin: SupabaseClient, clienteId: string, richiesta?: string, attuale?: Posizionamento) {
  const o = await offertaDi(admin, clienteId);
  const [materiale, nome, avatar] = await Promise.all([leggiMateriale(admin, clienteId).catch(() => null), nomeCliente(admin, clienteId), avatarDi(admin, clienteId)]);
  const testo = await streamAnthropicText({
    system: SYSTEM,
    user: costruisciPrompt({
      nome,
      onboarding: renderScheda(materiale),
      avatar: renderAvatar(avatar),
      offerta: o ? renderOfferta(o) : "(nessuna)",
      attuale: attuale ? JSON.stringify(attuale) : undefined,
      richiesta,
    }),
    maxTokens: 4000,
    tag: "aura-posizionamento",
    utente: clienteId,
    timeoutMs: 120_000,
  });
  const p = testo ? estrai(testo) : null;
  if (!p) {
    await logError("aura-posizionamento:scrivi", new Error(testo ? "risposta senza dati" : "nessuna risposta"), { cliente: clienteId, inizio: testo?.slice(0, 200) ?? null }, { silent: true });
    await admin.from("posizionamento").update({ stato: attuale ? "pronto" : "errore", errore: attuale ? null : "Aura non è riuscita a scriverlo" }).eq("cliente_id", clienteId);
    throw new HttpError(502, "Aura non è riuscita a scrivere il posizionamento. Riprova tra poco.");
  }
  if (p.profilo) {
    const [nome, bio] = await Promise.all([
      accorcia(p.profilo.nome, LIMITI.nome, "questo nome del profilo Instagram (nome della persona | mestiere)", clienteId),
      accorcia(p.profilo.bio, LIMITI.bio, "questa bio di Instagram", clienteId),
    ]);
    p.profilo.nome = nome;
    p.profilo.bio = bio;
  }
  const { error } = await admin.from("posizionamento").update({ contenuto: p, stato: "pronto", errore: null }).eq("cliente_id", clienteId);
  if (error) throw error;
}

const pulito = (v: unknown): string => {
  if (typeof v !== "string") throw new HttpError(400, "Scrivi il testo.");
  const t = v.replace(/[ \t]+/g, " ").trim();
  if (!t) throw new HttpError(400, "Il testo non può essere vuoto: per toglierlo usa «Elimina la riga».");
  return t.slice(0, MAX_TESTO);
};

/** Il cliente corregge una riga: "profilo.bio", "profilo.evidenza.1", "perche_tu.2", "chi_sei"… */
async function modifica(admin: SupabaseClient, clienteId: string, body: Body) {
  const { data } = await admin.from("posizionamento").select("contenuto").eq("cliente_id", clienteId).maybeSingle();
  if (!data) throw new HttpError(404, "Posizionamento non trovato.");
  const percorso = typeof body.percorso === "string" ? body.percorso : "";
  const pezzi = percorso.split(".");
  if (pezzi.length < 1 || pezzi.length > 3 || pezzi.some((p) => !/^([a-z_]{1,30}|\d{1,2})$/.test(p))) throw new HttpError(400, "Riga non valida.");
  const radice = structuredClone((data as { contenuto: Record<string, unknown> }).contenuto ?? {}) as Record<string, unknown>;
  let padre: unknown = radice;
  for (const p of pezzi.slice(0, -1)) {
    padre = Array.isArray(padre) ? padre[Number(p)] : (padre as Record<string, unknown> | undefined)?.[p];
    if (!padre || typeof padre !== "object") throw new HttpError(404, "Riga non trovata.");
  }
  const ultimo = pezzi.at(-1) as string;
  const lista = Array.isArray(padre) ? (padre as unknown[]) : null;
  const oggetto = lista ? null : (padre as Record<string, unknown>);
  const attuale = lista ? lista[Number(ultimo)] : oggetto?.[ultimo];
  if (attuale === undefined) throw new HttpError(404, "Riga non trovata.");
  if (body.valore === null) {
    if (lista) lista.splice(Number(ultimo), 1);
    else delete oggetto?.[ultimo];
  } else {
    let nuovo: unknown;
    if (typeof attuale === "string") nuovo = pulito(body.valore);
    else if (attuale && typeof attuale === "object" && body.valore && typeof body.valore === "object") {
      const r = { ...(attuale as Record<string, unknown>) };
      const v = body.valore as Record<string, unknown>;
      for (const k of ["titolo", "contiene", "perche"]) if (k in r && k in v) r[k] = pulito(v[k]);
      nuovo = r;
    } else throw new HttpError(400, "Valore non valido.");
    if (lista) lista[Number(ultimo)] = nuovo;
    else if (oggetto) oggetto[ultimo] = nuovo;
  }
  const { error } = await admin.from("posizionamento").update({ contenuto: pulisciPosizionamento(radice) }).eq("cliente_id", clienteId);
  if (error) throw error;
}

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const c = await richiediUtente(req);
    if (c.rol !== "cliente") throw new HttpError(403, "Il posizionamento è riservato ai clienti.");
    const body = await leggiBody<Body>(req);
    const admin = adminClient();

    if (body.azione === "modifica") {
      await modifica(admin, c.id, body);
      return json({ ok: true });
    }

    if (body.azione !== "crea" && body.azione !== "cambia") throw new HttpError(400, "Azione non valida.");
    const o = await offertaDi(admin, c.id);
    if (!o?.completa_fatta_il) throw new HttpError(409, "Prima chiudi la tua offerta: il posizionamento parte da lì.");

    const { data: permesso, error: errLimite } = await admin.rpc("aura_help_allowed", { p_user: c.id, p_max: 20, p_window_secs: 3600, p_scope: "posizionamento" });
    if (errLimite) await logError("aura-posizionamento:rate_limit", errLimite, { user: c.id }, { silent: true });
    else if (permesso === false) throw new HttpError(429, "Hai chiesto molte modifiche in poco tempo: riprova tra un'ora.");
    if (!HAS_ANTHROPIC) throw new HttpError(500, "ANTHROPIC_API_KEY non configurata.");

    if (body.azione === "crea") {
      const { error } = await admin.from("posizionamento").upsert({ cliente_id: c.id, stato: "in_corso", errore: null }, { onConflict: "cliente_id" });
      if (error) throw error;
      await scrivi(admin, c.id);
      return json({ ok: true });
    }

    const richiesta = typeof body.richiesta === "string" ? body.richiesta.trim().slice(0, MAX_RICHIESTA) : "";
    if (richiesta.length < 3) throw new HttpError(400, "Scrivi cosa vuoi cambiare.");
    const { data } = await admin.from("posizionamento").select("contenuto").eq("cliente_id", c.id).maybeSingle();
    if (!data) throw new HttpError(404, "Prima crea il posizionamento.");
    await admin.from("posizionamento").update({ stato: "in_corso" }).eq("cliente_id", c.id);
    await scrivi(admin, c.id, richiesta, pulisciPosizionamento((data as { contenuto: unknown }).contenuto));
    return json({ ok: true });
  } catch (err) {
    return gestisciErrore(err);
  }
});
