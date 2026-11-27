/**
 * aura-avatar — "Cervello del tuo branding → Avatar" (dal 25/11/2026: UNA
 * conversazione per cliente che costruisce la mappa e da una a tre schede,
 * metodo «A chi parli? I 3 dubbi sull'avatar», vedi metodo.ts).
 * Body:
 *   { azione: "crea", messaggio? }    → mappa nuova + primo messaggio di Aura (lei legge e chiede i buchi;
 *                                       con `messaggio` = uno dei tre dubbi, prima risponde a quello). { ok, mappa_id }
 *   { messaggio }                     → turno di conversazione.   { ok, messaggio_id, risposta }
 *   { riprova_messaggio_id }          → rifà una risposta finita in errore.
 *   { azione: "ferma" }               → tasto stop: le risposte in corso diventano «Fermata» e quando arrivano si scartano. { ok }
 *   { azione: "modifica", dove, percorso, valore?, fatto? } → il cliente corregge una riga (conta come «vera»). { ok }
 * Ricominciare da capo = il cliente elimina la sua mappa (RLS) e richiama "crea".
 * Rate limit (solo per le chiamate ad Aura): aura_help_allowed(user, 40, 3600, 'avatar').
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { gestisciErrore, HttpError, json, leggiBody, preflight } from "../_shared/http.ts";
import { adminClient, richiediUtente } from "../_shared/supabase.ts";
import { ANTHROPIC_MODEL, HAS_ANTHROPIC, streamAnthropicText } from "../_shared/anthropic.ts";
import { logError } from "../_shared/log.ts";
import { leggiMateriale, nomeCliente, renderScheda } from "../_shared/materiale.ts";
import { leggiLettura, renderLettura } from "../_shared/onboarding/lettura.ts";
import { APERTURA, APERTURA_CON_DUBBIO, costruisciPrompt, SYSTEM, type Storico } from "./prompt.ts";
import { applicaDati, estraiDati, renderStato, type RigaMappa, type RigaScheda } from "./dati.ts";
import { type BodyModifica, modifica } from "./modifica.ts";
import { renderOfferte } from "./offerte.ts";
import { controllaCrediti } from "../_shared/crediti.ts";

type Body = BodyModifica & { azione?: unknown; messaggio?: unknown; riprova_messaggio_id?: unknown };

const MAX_MESSAGGIO = 4000;
// Finestra scorrevole: la memoria lunga è lo stato (mappa + schede), che entra intero a ogni turno.
const MAX_STORICO = 12;
const MSG_ERRORE_AURA = "Aura non riesce a rispondere in questo momento. Riprova tra poco.";

async function mappaDi(admin: SupabaseClient, clienteId: string): Promise<{ mappa: RigaMappa; schede: RigaScheda[] } | null> {
  const { data } = await admin.from("avatar_mappa").select("*").eq("cliente_id", clienteId).maybeSingle();
  if (!data) return null;
  const { data: schede } = await admin.from("avatar_scheda").select("id, ordine, principale, partenza, contenuto").eq("mappa_id", data.id).order("ordine");
  return { mappa: data as RigaMappa, schede: (schede ?? []) as RigaScheda[] };
}

async function richiediMappa(admin: SupabaseClient, clienteId: string) {
  const r = await mappaDi(admin, clienteId);
  if (!r) throw new HttpError(404, "Non hai ancora iniziato la fase Avatar.");
  return r;
}

/** Contesto del turno: si escludono la riga Aura in corso e il messaggio del cliente (entra a parte come NUOVO MESSAGGIO). */
async function contesto(admin: SupabaseClient, clienteId: string, mappaId: string, escludi: string[]) {
  const [scheda, storico, nome, lettura, offerte] = await Promise.all([
    leggiMateriale(admin, clienteId).catch(() => null),
    admin
      .from("avatar_mappa_messaggi")
      .select("ruolo, contenuto")
      .eq("mappa_id", mappaId)
      .not("id", "in", `(${escludi.join(",")})`)
      .eq("stato", "completato")
      .order("created_at", { ascending: false })
      .limit(MAX_STORICO),
    nomeCliente(admin, clienteId),
    leggiLettura(admin, clienteId).catch(() => null),
    renderOfferte(admin, clienteId),
  ]);
  return {
    nome,
    scheda: renderScheda(scheda),
    lettura: lettura ? renderLettura(lettura, "avatar") : "(non disponibile)",
    offerte,
    storico: ((storico.data ?? []) as Storico[]).reverse(),
  };
}

/** Un turno di Aura sulla riga `auraId` già creata 'in_corso'. */
async function turno(admin: SupabaseClient, clienteId: string, auraId: string, escludi: string[], messaggio: string, signal?: AbortSignal) {
  const { mappa, schede } = await richiediMappa(admin, clienteId);
  const dati = await contesto(admin, clienteId, mappa.id, escludi);
  const testo = await streamAnthropicText({
    system: SYSTEM,
    user: costruisciPrompt({ ...dati, stato: renderStato(mappa, schede), messaggio }),
    maxTokens: 8000,
    tag: "aura-avatar",
    utente: clienteId,
    signal,
  });
  if (!testo && signal?.aborted) {
    // Tasto stop: il browser ha chiuso la richiesta. La riga resta riprovabile, senza errore nei log.
    await admin.from("avatar_mappa_messaggi").update({ stato: "errore", errore: "Fermata" }).eq("id", auraId);
    throw new HttpError(499, "Fermata dal cliente.");
  }
  if (!testo) {
    await admin.from("avatar_mappa_messaggi").update({ stato: "errore", errore: "Nessuna risposta dal modello" }).eq("id", auraId);
    await logError("aura-avatar:anthropic", "Nessuna risposta da Aura", { user: clienteId, mappa: mappa.id }, { silent: true });
    throw new HttpError(503, MSG_ERRORE_AURA);
  }
  // Stop esplicito ({ azione: "ferma" }): la riga non è più in corso, la risposta si scarta e non tocca la mappa.
  const { data: ancora } = await admin.from("avatar_mappa_messaggi").select("stato").eq("id", auraId).maybeSingle();
  if ((ancora as { stato: string } | null)?.stato !== "in_corso") throw new HttpError(499, "Fermata dal cliente.");
  const { risposta, dati: nuovi, motivo, grezzo } = estraiDati(testo);
  if (motivo !== "ok") await logError(`aura-avatar:dati_${motivo}`, `Blocco <dati> ${motivo}`, { mappa: mappa.id, estratto: grezzo.slice(0, 500) }, { silent: true });
  await applicaDati(admin, mappa, schede, nuovi, ANTHROPIC_MODEL);
  const contenuto = risposta || "Ho aggiornato la mappa qui accanto.";
  const { error } = await admin.from("avatar_mappa_messaggi").update({ stato: "completato", contenuto, errore: null }).eq("id", auraId);
  if (error) throw error;
  return { messaggio_id: auraId, risposta: contenuto };
}

async function nuovaRigaAura(admin: SupabaseClient, mappaId: string, clienteId: string): Promise<string> {
  const { data, error } = await admin
    .from("avatar_mappa_messaggi")
    .insert({ mappa_id: mappaId, cliente_id: clienteId, ruolo: "aura", stato: "in_corso", modello: ANTHROPIC_MODEL })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("messaggio aura non creato");
  return (data as { id: string }).id;
}

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const c = await richiediUtente(req);
    if (c.rol !== "cliente") throw new HttpError(403, "La fase Avatar è riservata ai clienti.");
    const body = await leggiBody<Body>(req);
    const admin = adminClient();

    if (body.azione === "modifica") {
      const { mappa, schede } = await richiediMappa(admin, c.id);
      await modifica(admin, mappa, schede, body);
      return json({ ok: true });
    }

    if (body.azione === "ferma") {
      await admin.from("avatar_mappa_messaggi").update({ stato: "errore", errore: "Fermata" }).eq("cliente_id", c.id).eq("ruolo", "aura").eq("stato", "in_corso");
      return json({ ok: true });
    }

    // Rate limit nel proprio ambito, prima di qualsiasi chiamata ad Aura.
    // Crediti del mese (_shared/crediti.ts): a credito finito Aura si ferma, prima di ogni altra cosa.
    await controllaCrediti(admin, c, "aura-avatar");
    const { data: permesso, error: errLimite } = await admin.rpc("aura_help_allowed", { p_user: c.id, p_max: 40, p_window_secs: 3600, p_scope: "avatar" });
    if (errLimite) await logError("aura-avatar:rate_limit", errLimite, { user: c.id }, { silent: true });
    else if (permesso === false) throw new HttpError(429, "Hai scritto molto in poco tempo: riprova tra un'ora.");
    if (!HAS_ANTHROPIC) throw new HttpError(500, "ANTHROPIC_API_KEY non configurata.");

    if (body.azione === "crea") {
      const esiste = await mappaDi(admin, c.id);
      if (esiste) return json({ ok: true, mappa_id: esiste.mappa.id });
      const { data: m, error } = await admin.from("avatar_mappa").insert({ cliente_id: c.id, modello: ANTHROPIC_MODEL }).select("id").single();
      if (error || !m) {
        if (error?.code === "23505") return json({ ok: true, mappa_id: (await richiediMappa(admin, c.id)).mappa.id });
        throw error ?? new Error("mappa non creata");
      }
      const mappaId = (m as { id: string }).id;
      // Si può partire da uno dei tre dubbi: il suo messaggio apre la conversazione.
      const dubbio = typeof body.messaggio === "string" ? body.messaggio.trim().slice(0, MAX_MESSAGGIO) : "";
      const escludi: string[] = [];
      if (dubbio.length >= 2) {
        const { data: mio, error: e0 } = await admin
          .from("avatar_mappa_messaggi")
          .insert({ mappa_id: mappaId, cliente_id: c.id, ruolo: "cliente", contenuto: dubbio })
          .select("id")
          .single();
        if (e0 || !mio) throw e0 ?? new Error("messaggio cliente non creato");
        escludi.push((mio as { id: string }).id);
      }
      const auraId = await nuovaRigaAura(admin, mappaId, c.id);
      const messaggio = dubbio.length >= 2 ? `${dubbio}\n\n${APERTURA_CON_DUBBIO}` : APERTURA;
      await turno(admin, c.id, auraId, [auraId, ...escludi], messaggio, req.signal);
      return json({ ok: true, mappa_id: mappaId });
    }

    if (typeof body.riprova_messaggio_id === "string" && body.riprova_messaggio_id) {
      const { data: aura } = await admin
        .from("avatar_mappa_messaggi")
        .select("id, mappa_id, created_at")
        .eq("id", body.riprova_messaggio_id)
        .eq("cliente_id", c.id)
        .eq("ruolo", "aura")
        .maybeSingle();
      if (!aura) throw new HttpError(404, "Messaggio non trovato.");
      const a = aura as { id: string; mappa_id: string; created_at: string };
      const { data: prec } = await admin
        .from("avatar_mappa_messaggi")
        .select("id, contenuto")
        .eq("mappa_id", a.mappa_id)
        .eq("ruolo", "cliente")
        .lt("created_at", a.created_at)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      await admin.from("avatar_mappa_messaggi").update({ stato: "in_corso", errore: null, contenuto: "" }).eq("id", a.id);
      // Senza un messaggio del cliente prima era l'apertura: si rifà quella.
      const p = prec as { id: string; contenuto: string } | null;
      return json({ ok: true, ...(await turno(admin, c.id, a.id, p ? [a.id, p.id] : [a.id], p?.contenuto ?? APERTURA, req.signal)) });
    }

    const messaggio = typeof body.messaggio === "string" ? body.messaggio.trim().slice(0, MAX_MESSAGGIO) : "";
    if (messaggio.length < 2) throw new HttpError(400, "Scrivi una risposta ad Aura.");
    const { mappa } = await richiediMappa(admin, c.id);
    const { data: mio, error: e1 } = await admin
      .from("avatar_mappa_messaggi")
      .insert({ mappa_id: mappa.id, cliente_id: c.id, ruolo: "cliente", contenuto: messaggio })
      .select("id")
      .single();
    if (e1 || !mio) throw e1 ?? new Error("messaggio cliente non creato");
    const auraId = await nuovaRigaAura(admin, mappa.id, c.id);
    return json({ ok: true, ...(await turno(admin, c.id, auraId, [auraId, (mio as { id: string }).id], messaggio, req.signal)) });
  } catch (err) {
    return gestisciErrore(err);
  }
});
