/**
 * skool-lezioni — rinfresca il catalogo lezioni Skool (cron mensile o team a
 * mano; porta di src/lib/skool/sync.ts). Apify → upsert `lezioni` per key,
 * disattiva quelle sparite, sync_stati('skool'). Telegram (solo dal cron, come
 * nel vecchio: a mano Wesley vede l'esito a schermo) se ci sono nuove lezioni o
 * se i cookie sono scaduti. Risposta: { ok, lezioni, nuove }.
 */
import { errore, gestisciErrore, json, preflight } from "../_shared/http.ts";
import { adminClient, richiediCronOTeam } from "../_shared/supabase.ts";
import { aggiornaSync, logError } from "../_shared/log.ts";
import { notifyTelegram } from "../_shared/telegram.ts";
import { azione, HAS_SKOOL_API } from "../_shared/skool-api.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { fetchSkoolLessons } from "./catalogo.ts";

const MSG_COOKIE =
  "🔑 Accesso Skool scaduto\n\nNon riesco più a leggere la classroom di Los Creators: i cookie non sono più validi.\nRinnovali quando puoi (Cookie-Editor → Export JSON → segreto SKOOL_COOKIES) e rilancia la sincronizzazione dal gestionale.";

/** Il codice del corso nell'url di una lezione (skool.com/loscreators/classroom/42fc6c1a?md=…). */
const corsoDaUrl = (url: string | null): string | null => url?.match(/\/classroom\/([0-9a-f]{6,12})(?:[/?#]|$)/i)?.[1] ?? null;

/**
 * I corsi in bozza (nascosti ai membri), per codice. L'attore del catalogo entra
 * come amministratore e li vede: senza questo filtro il coach proporrebbe lezioni
 * che i clienti non possono aprire (26/11/2026: Cap.1 unito in un solo corso, i due
 * corsi vecchi messi in bozza). Se Skool non risponde si va avanti senza filtro.
 */
async function corsiInBozza(admin: SupabaseClient): Promise<Set<string>> {
  if (!HAS_SKOOL_API) return new Set();
  const r = await azione(admin, "classroom:listCourses", {}).catch(() => null);
  if (!r?.ok) return new Set();
  const bozze = new Set<string>();
  for (const x of r.items) {
    const u = (x.course && typeof x.course === "object" ? x.course : x) as Record<string, unknown>;
    if (typeof u.name === "string" && typeof u.state === "number" && u.state !== 2) bozze.add(u.name);
  }
  return bozze;
}

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const chi = await richiediCronOTeam(req);
    const daCron = chi === "cron";

    const r = await fetchSkoolLessons();
    if (!r.ok) {
      await logError("skool-sync", `skool sync: ${r.motivo}`, { dettaglio: r.dettaglio.slice(0, 300) });
      // Niente totale/nuove: il catalogo già salvato resta valido (Aura continua a usarlo).
      // sync_stati.esito accetta solo ok|errore|parziale: il motivo va nel dettaglio.
      await aggiornaSync("skool", { esito: "errore", dettaglio: `${r.motivo}: ${r.dettaglio}`.slice(0, 500) });
      const cookieScaduto = r.motivo === "cookie_scaduto";
      if (cookieScaduto && daCron) await notifyTelegram(MSG_COOKIE);
      const msg = r.motivo === "config"
        ? "Configurazione Skool incompleta (APIFY_TOKEN / SKOOL_COOKIES)."
        : cookieScaduto
        ? "I cookie Skool sono scaduti: rinnovali e riprova."
        : `Apify non ha risposto correttamente. ${r.dettaglio}`;
      return errore(msg, 502);
    }

    const admin = adminClient();
    const bozze = await corsiInBozza(admin);
    const lezioni = r.lezioni.filter((l) => !bozze.has(corsoDaUrl(l.url) ?? ""));
    const { data: esistenti, error: eSel } = await admin.from("lezioni").select("key");
    if (eSel) throw eSel;
    const note = new Set(((esistenti ?? []) as Array<{ key: string }>).map((x) => x.key));
    const nuove = lezioni.filter((l) => !note.has(l.key)).length;

    const inizio = new Date().toISOString();
    const righe = lezioni.map((l) => ({
      key: l.key,
      corso: l.corso,
      titolo: l.titolo,
      url: l.url,
      descrizione: l.descrizione,
      keywords: l.keywords,
      ordine: l.ordine,
      attiva: true,
      updated_at: inizio,
    }));
    const { error } = await admin.from("lezioni").upsert(righe, { onConflict: "key" });
    if (error) {
      await logError("skool-sync", `skool sync: errore`, { dettaglio: error.message.slice(0, 300) });
      await aggiornaSync("skool", { esito: "errore", dettaglio: error.message.slice(0, 500) });
      return errore("Non sono riuscito a salvare il catalogo. Riprova.", 500);
    }

    // Lezioni sparite dalla classroom: le disattivo (non le cancello, così i
    // link già finiti nei compiti restano tracciabili). Riconoscibili perché
    // NON sono state toccate da questo upsert (updated_at più vecchio di `inizio`).
    const { error: eOff } = await admin.from("lezioni").update({ attiva: false }).lt("updated_at", inizio);
    if (eOff) await logError("skool-sync:disattiva", eOff, {}, { silent: true });

    await aggiornaSync("skool", { esito: "ok", dettaglio: bozze.size ? `${bozze.size} corsi in bozza esclusi` : "", totale: lezioni.length, nuove });
    if (nuove > 0 && daCron) {
      await notifyTelegram(
        `📚 Skool: ${nuove} ${nuove === 1 ? "nuova lezione" : "nuove lezioni"}\n\nCatalogo aggiornato: ${lezioni.length} lezioni totali. Aura può già collegarle ai compiti.`,
      );
    }
    return json({ ok: true, lezioni: lezioni.length, nuove, bozze_escluse: bozze.size });
  } catch (err) {
    return gestisciErrore(err);
  }
});
