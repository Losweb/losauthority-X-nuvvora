/**
 * aura-offerta — "Cervello del tuo branding → Offerta" (dal 26/11/2026, istruzioni
 * di Wesley «la fase Offerta»): UNA offerta per cliente (la riga più recente di
 * `offerta`, così i lead del CRM restano collegati) e due strade decise dal sito:
 * versione breve (una frase) finché la mappa Avatar non è chiusa, scheda completa
 * (sette fasi) dopo. Il prompt è metodo.ts (testo di Wesley) + prompt.ts.
 * Dal 26/11/2026 la versione breve non si apre più: senza mappa Avatar chiusa la funzione risponde 409.
 * Body:
 *   { azione: "crea", messaggio? }    → l'offerta del cliente (nuova se non c'è) + primo messaggio di Aura
 *                                       (con `messaggio`, parte da quello che la persona ha scritto). { ok, offerta_id }
 *   { messaggio }                     → turno di conversazione. { ok, messaggio_id, risposta }
 *   { riprova_messaggio_id }          → rifà una risposta finita in errore.
 *   { azione: "ferma" }               → tasto stop: le risposte in corso diventano «Fermata» e quando arrivano si scartano. { ok }
 *   { azione: "modifica", percorso, valore } → il cliente corregge da solo una riga dell'offerta (modifica.ts). { ok }
 * Nel prompt entrano solo i messaggi da `nuova_dal` in poi (quelli del metodo di prima no).
 * Un «Fermo» avvisa il team su Telegram (dati.ts). Rate limit: aura_help_allowed(user, 40, 3600, 'offerta').
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { gestisciErrore, HttpError, json, leggiBody, preflight } from "../_shared/http.ts";
import { adminClient, richiediUtente } from "../_shared/supabase.ts";
import { ANTHROPIC_MODEL, HAS_ANTHROPIC, streamAnthropicText } from "../_shared/anthropic.ts";
import { logError } from "../_shared/log.ts";
import { leggiMateriale, nomeCliente, renderScheda } from "../_shared/materiale.ts";
import { leggiLettura, renderLettura } from "../_shared/onboarding/lettura.ts";
import { APERTURA, APERTURA_CON_MESSAGGIO, costruisciPrompt, SYSTEM, type Storico } from "./prompt.ts";
import { avatarDi, renderAvatar } from "./avatar.ts";
import { modificaOfferta } from "./modifica.ts";
import { applicaDati, estraiDati, renderOffertaAttuale, renderStato, type RigaOfferta } from "./dati.ts";
import { controllaCrediti } from "../_shared/crediti.ts";

type Body = { azione?: unknown; messaggio?: unknown; riprova_messaggio_id?: unknown; percorso?: unknown; valore?: unknown };

const MAX_MESSAGGIO = 4000;
const MAX_STORICO = 12;
const MSG_ERRORE_AURA = "Aura non riesce a rispondere in questo momento. Riprova tra poco.";

/** L'offerta del cliente: la più recente (dal 26/11/2026 ce n'è una sola per cliente). */
async function offertaDi(admin: SupabaseClient, clienteId: string): Promise<RigaOfferta | null> {
  const { data } = await admin.from("offerta").select("*").eq("cliente_id", clienteId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data as RigaOfferta | null) ?? null;
}

async function nuovaRigaAura(admin: SupabaseClient, offertaId: string): Promise<string> {
  const { data, error } = await admin.from("offerta_messaggi").insert({ offerta_id: offertaId, ruolo: "aura", stato: "in_corso", modello: ANTHROPIC_MODEL }).select("id").single();
  if (error || !data) throw error ?? new Error("messaggio aura non creato");
  return (data as { id: string }).id;
}

/** Un turno di Aura sulla riga `auraId` già creata 'in_corso'. */
async function turno(admin: SupabaseClient, clienteId: string, auraId: string, escludi: string[], messaggio: string, signal?: AbortSignal) {
  const o = await offertaDi(admin, clienteId);
  if (!o) throw new HttpError(404, "Non hai ancora iniziato la fase Offerta.");
  const [scheda, storico, nome, lettura, avatar] = await Promise.all([
    leggiMateriale(admin, clienteId).catch(() => null),
    admin
      .from("offerta_messaggi")
      .select("ruolo, contenuto")
      .eq("offerta_id", o.id)
      .gte("created_at", (o.nuova_dal as string | null) ?? "1970-01-01")
      .not("id", "in", `(${escludi.join(",")})`)
      .eq("stato", "completato")
      .order("created_at", { ascending: false })
      .limit(MAX_STORICO),
    nomeCliente(admin, clienteId),
    leggiLettura(admin, clienteId).catch(() => null),
    avatarDi(admin, clienteId, (o.avatar_letto_il as string | null) ?? null),
  ]);
  // La strada la decide il sito: completa solo con la mappa Avatar chiusa.
  // Un'offerta già chiusa resta completa anche se poi l'avatar si rifà.
  const strada = avatar.approvata || o.completa_fatta_il ? "completa" : "breve";
  const cambioStrada = o.strada !== strada;
  if (cambioStrada) {
    await admin.from("offerta").update({ strada, passo: strada === "completa" ? 0 : 1 }).eq("id", o.id);
    o.strada = strada;
    o.passo = strada === "completa" ? 0 : 1;
  }
  const testoStrada =
    strada === "completa"
      ? `SCHEDA COMPLETA: la mappa Avatar è chiusa.${cambioStrada && o.frase ? " Si è appena aperta: la persona ha già la frase, si parte dalla fase 0." : ""}`
      : "VERSIONE BREVE: la mappa Avatar non è ancora chiusa. Alla fine della frase porta la persona alla fase Avatar.";
  const offertaOnboarding = scheda && typeof (scheda as Record<string, unknown>).offerta_attuale === "string" ? ((scheda as Record<string, unknown>).offerta_attuale as string) : null;
  const testo = await streamAnthropicText({
    system: SYSTEM,
    user: costruisciPrompt({
      nome,
      strada: testoStrada,
      scheda: renderScheda(scheda),
      lettura: lettura ? renderLettura(lettura, "offerta") : "(non disponibile)",
      avatar: renderAvatar(avatar),
      frase: o.frase ? `${o.frase} (${o.frase_il ? `approvata il ${String(o.frase_il).slice(0, 10)}` : "non ancora approvata"})` : "(nessuna)",
      offertaAttuale: renderOffertaAttuale(o, offertaOnboarding),
      stato: renderStato(o),
      storico: ((storico.data ?? []) as Storico[]).reverse(),
      messaggio,
    }),
    maxTokens: 8000,
    tag: "aura-offerta",
    utente: clienteId,
    signal,
  });
  if (!testo && signal?.aborted) {
    // Tasto stop: il browser ha chiuso la richiesta. La riga resta riprovabile, senza errore nei log.
    await admin.from("offerta_messaggi").update({ stato: "errore", errore: "Fermata" }).eq("id", auraId);
    throw new HttpError(499, "Fermata dal cliente.");
  }
  if (!testo) {
    await admin.from("offerta_messaggi").update({ stato: "errore", errore: "Nessuna risposta dal modello" }).eq("id", auraId);
    await logError("aura-offerta:anthropic", "Nessuna risposta da Aura", { user: clienteId, offerta: o.id }, { silent: true });
    throw new HttpError(503, MSG_ERRORE_AURA);
  }
  // Stop esplicito ({ azione: "ferma" }): la riga non è più in corso, la risposta si scarta e non tocca l'offerta.
  const { data: ancora } = await admin.from("offerta_messaggi").select("stato").eq("id", auraId).maybeSingle();
  if ((ancora as { stato: string } | null)?.stato !== "in_corso") throw new HttpError(499, "Fermata dal cliente.");
  const { risposta, dati, motivo, grezzo } = estraiDati(testo);
  if (motivo !== "ok") await logError(`aura-offerta:dati_${motivo}`, `Blocco <dati> ${motivo}`, { offerta: o.id, estratto: grezzo.slice(0, 500) }, { silent: true });
  await applicaDati(admin, o, dati, nome);
  const contenuto = risposta || "Ho aggiornato la scheda qui accanto.";
  const { error } = await admin.from("offerta_messaggi").update({ stato: "completato", contenuto, errore: null }).eq("id", auraId);
  if (error) throw error;
  return { messaggio_id: auraId, risposta: contenuto };
}

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const c = await richiediUtente(req);
    if (c.rol !== "cliente") throw new HttpError(403, "La fase Offerta è riservata ai clienti.");
    const body = await leggiBody<Body>(req);
    const admin = adminClient();

    if (body.azione === "ferma") {
      const o = await offertaDi(admin, c.id);
      if (o) await admin.from("offerta_messaggi").update({ stato: "errore", errore: "Fermata" }).eq("offerta_id", o.id).eq("ruolo", "aura").eq("stato", "in_corso");
      return json({ ok: true });
    }

    if (body.azione === "modifica") {
      const o = await offertaDi(admin, c.id);
      if (!o) throw new HttpError(404, "Offerta non trovata.");
      await modificaOfferta(admin, o, body);
      return json({ ok: true });
    }

    // Crediti del mese (_shared/crediti.ts): a credito finito Aura si ferma, prima di ogni altra cosa.
    await controllaCrediti(admin, c, "aura-offerta");
    const { data: permesso, error: errLimite } = await admin.rpc("aura_help_allowed", { p_user: c.id, p_max: 40, p_window_secs: 3600, p_scope: "offerta" });
    if (errLimite) await logError("aura-offerta:rate_limit", errLimite, { user: c.id }, { silent: true });
    else if (permesso === false) throw new HttpError(429, "Hai scritto molto in poco tempo: riprova tra un'ora.");
    if (!HAS_ANTHROPIC) throw new HttpError(500, "ANTHROPIC_API_KEY non configurata.");

    // L'offerta si costruisce per l'avatar (26/11/2026, Wesley: prima l'avatar, poi l'offerta; tolta la
    // versione breve): senza mappa Avatar chiusa Aura non parte. Un'offerta già chiusa si può sempre rivedere.
    const avatarPronto = (await avatarDi(admin, c.id)).approvata;
    if (!avatarPronto) {
      const gia = await offertaDi(admin, c.id);
      if (!gia?.completa_fatta_il) throw new HttpError(409, "Prima fai il tuo avatar: l'offerta si costruisce per lui.");
    }

    if (body.azione === "crea") {
      const esiste = await offertaDi(admin, c.id);
      if (esiste) return json({ ok: true, offerta_id: esiste.id });
      const { data: nuova, error } = await admin.from("offerta").insert({ cliente_id: c.id, modello: ANTHROPIC_MODEL, nuova_dal: new Date().toISOString() }).select("id").single();
      if (error || !nuova) throw error ?? new Error("offerta non creata");
      const offertaId = (nuova as { id: string }).id;
      // Si può aprire la fase scrivendo già qualcosa: il suo messaggio apre la conversazione.
      const primo = typeof body.messaggio === "string" ? body.messaggio.trim().slice(0, MAX_MESSAGGIO) : "";
      const escludi: string[] = [];
      if (primo.length >= 2) {
        const { data: mio, error: e0 } = await admin.from("offerta_messaggi").insert({ offerta_id: offertaId, ruolo: "cliente", contenuto: primo }).select("id").single();
        if (e0 || !mio) throw e0 ?? new Error("messaggio cliente non creato");
        escludi.push((mio as { id: string }).id);
      }
      const auraId = await nuovaRigaAura(admin, offertaId);
      await turno(admin, c.id, auraId, [auraId, ...escludi], primo.length >= 2 ? `${primo}\n\n${APERTURA_CON_MESSAGGIO}` : APERTURA, req.signal);
      return json({ ok: true, offerta_id: offertaId });
    }

    const o = await offertaDi(admin, c.id);
    if (!o) throw new HttpError(404, "Non hai ancora iniziato la fase Offerta.");

    if (typeof body.riprova_messaggio_id === "string" && body.riprova_messaggio_id) {
      const { data: aura } = await admin.from("offerta_messaggi").select("id, created_at").eq("id", body.riprova_messaggio_id).eq("offerta_id", o.id).eq("ruolo", "aura").maybeSingle();
      if (!aura) throw new HttpError(404, "Messaggio non trovato.");
      const a = aura as { id: string; created_at: string };
      const { data: prec } = await admin
        .from("offerta_messaggi")
        .select("id, contenuto")
        .eq("offerta_id", o.id)
        .eq("ruolo", "cliente")
        .gte("created_at", (o.nuova_dal as string | null) ?? "1970-01-01")
        .lt("created_at", a.created_at)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      await admin.from("offerta_messaggi").update({ stato: "in_corso", errore: null, contenuto: "" }).eq("id", a.id);
      const p = prec as { id: string; contenuto: string } | null;
      return json({ ok: true, ...(await turno(admin, c.id, a.id, p ? [a.id, p.id] : [a.id], p?.contenuto ?? APERTURA, req.signal)) });
    }

    const messaggio = typeof body.messaggio === "string" ? body.messaggio.trim().slice(0, MAX_MESSAGGIO) : "";
    if (messaggio.length < 2) throw new HttpError(400, "Scrivi una risposta ad Aura.");
    const { data: mio, error: e1 } = await admin.from("offerta_messaggi").insert({ offerta_id: o.id, ruolo: "cliente", contenuto: messaggio }).select("id").single();
    if (e1 || !mio) throw e1 ?? new Error("messaggio cliente non creato");
    const auraId = await nuovaRigaAura(admin, o.id);
    return json({ ok: true, ...(await turno(admin, c.id, auraId, [auraId, (mio as { id: string }).id], messaggio, req.signal)) });
  } catch (err) {
    return gestisciErrore(err);
  }
});
