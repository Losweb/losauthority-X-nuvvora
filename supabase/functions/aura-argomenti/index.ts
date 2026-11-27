/**
 * aura-argomenti — tiene aggiornata la mappa delle lezioni per argomenti (27/11/2026,
 * richiesta di Wesley: «un database per argomenti» al posto del catalogo intero nel
 * prompt di Wesley Coach). Legge le lezioni nuove o cambiate, una alla volta, e per
 * ognuna scrive le voci in `lezioni_argomenti` (argomento, minuto, profondità, riassunto).
 *
 * Cosa legge per lezione: per una lezione di corso la descrizione intera; per una live
 * pubblicata dal gestionale i capitoli di `skool_video_capitoli` (cosa dice davvero); per
 * le altre live la descrizione con i capitoli. Si rilegge solo se quel testo cambia
 * (`lezioni_indice.fonte_hash`): `lezioni.updated_at` cambia a ogni sync settimanale.
 *
 * { azione: "riordina" } unisce gli argomenti doppioni; lo fa anche da solo quando non c'è niente
 * da leggere, al massimo una volta a settimana (`sync_stati` chiave aura_argomenti_riordino).
 * Chiamata: cron ogni 15 minuti (migrazione 080) o team. Body: { max? } lezioni per giro
 * (default 6; non se ne comincia una nuova dopo 45 s). Risposta: { ok, fatte, errori, restano }.
 * Le voci scritte dal team (origine «team») non si toccano.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { gestisciErrore, json, leggiBody, preflight } from "../_shared/http.ts";
import { adminClient, richiediCronOTeam } from "../_shared/supabase.ts";
import { HAS_ANTHROPIC, streamAnthropicText } from "../_shared/anthropic.ts";
import { logError } from "../_shared/log.ts";
import { eRicompensa } from "../_shared/lezioni.ts";
import { type Argomento, elencoArgomenti, leggiArgomenti, type Profondita } from "../_shared/argomenti.ts";
import { formattaTempo, secondiDa } from "../aura-coach/capitoli.ts";
import { costruisciPrompt, SYSTEM, SYSTEM_RIORDINA } from "./prompt.ts";

interface Lezione {
  id: string;
  corso: string | null;
  titolo: string;
  url: string | null;
  descrizione: string | null;
}

const MAX_FONTE = 14000;
// Una live con molti capitoli richiede ~60-90 s: dopo 45 s non se ne comincia un'altra, così il giro
// resta sotto il limite delle Edge Functions (150 s). Prima una live partita tardi veniva interrotta e
// il giro dopo ripartiva sempre da lei (27/11/2026).
const BUDGET_MS = 45_000;
const PROFONDITA = new Set<Profondita>(["passo_passo", "spiegazione", "accenno"]);

async function sha(testo: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(testo));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

/** Il testo da cui si scompone ogni lezione: capitoli veri per le live del gestionale, altrimenti la descrizione. */
async function fonti(admin: SupabaseClient, lezioni: Lezione[]): Promise<Map<string, string>> {
  const urls = lezioni.map((l) => l.url).filter((u): u is string => !!u);
  const { data: video } = await admin.from("skool_video").select("id, skool_url, durata_sec").in("skool_url", urls);
  const perUrl = new Map(((video ?? []) as Array<{ id: string; skool_url: string; durata_sec: number | null }>).map((v) => [v.skool_url, v]));
  const ids = [...perUrl.values()].map((v) => v.id);
  const capitoli = new Map<string, Array<{ inizio_sec: number; titolo: string; testo: string | null }>>();
  if (ids.length) {
    const { data } = await admin.from("skool_video_capitoli").select("video_id, inizio_sec, titolo, testo").in("video_id", ids).order("ordine");
    for (const c of (data ?? []) as Array<{ video_id: string; inizio_sec: number; titolo: string; testo: string | null }>) {
      capitoli.set(c.video_id, [...(capitoli.get(c.video_id) ?? []), c]);
    }
  }
  const out = new Map<string, string>();
  for (const l of lezioni) {
    const v = l.url ? perUrl.get(l.url) : undefined;
    const caps = v ? capitoli.get(v.id) : undefined;
    if (v && caps?.length) {
      const righe = caps.map((c, i) => {
        const fine = caps[i + 1]?.inizio_sec ?? v.durata_sec ?? null;
        const durata = fine !== null ? ` (${Math.max(1, Math.round((fine - c.inizio_sec) / 60))} min)` : "";
        return `${formattaTempo(c.inizio_sec)}${durata} ${c.titolo}\n${(c.testo ?? "").trim()}`;
      });
      out.set(l.id, `LIVE con i capitoli (minuto, durata, titolo e cosa si dice):\n${righe.join("\n\n")}`.slice(0, MAX_FONTE));
    } else {
      out.set(l.id, (l.descrizione ?? "").trim().slice(0, MAX_FONTE));
    }
  }
  return out;
}

interface VoceGrezza {
  argomento?: unknown;
  descrizione?: unknown;
  inizio?: unknown;
  durata_min?: unknown;
  profondita?: unknown;
  riassunto?: unknown;
}

function estrai(testo: string): VoceGrezza[] | null {
  const m = testo.match(/<dati>\s*([\s\S]*?)\s*<\/dati>/) ?? testo.match(/(\{[\s\S]*\})/);
  if (!m) return null;
  try {
    const v = JSON.parse(m[1]) as { voci?: unknown };
    return Array.isArray(v.voci) ? (v.voci as VoceGrezza[]) : null;
  } catch {
    return null;
  }
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Scompone una lezione e salva le voci. Lancia se Aura non risponde o il JSON non si legge. */
async function indicizza(admin: SupabaseClient, l: Lezione, fonte: string, argomenti: Argomento[]) {
  const testo = await streamAnthropicText({
    system: SYSTEM,
    user: costruisciPrompt({ lezione: `Corso: ${l.corso ?? "—"}\nTitolo: ${l.titolo}`, fonte, elenco: elencoArgomenti(argomenti) }),
    maxTokens: 3000,
    tag: "aura-argomenti",
    timeoutMs: 90_000,
  });
  const voci = testo ? estrai(testo) : null;
  if (!voci) throw new Error(testo ? "risposta senza voci" : "nessuna risposta");

  const perNome = new Map(argomenti.map((a) => [a.nome.toLowerCase(), a]));
  const righe: Array<Record<string, unknown>> = [];
  for (const v of voci.slice(0, 40)) {
    const nome = str(v.argomento, 60);
    const riassunto = str(v.riassunto, 600);
    const profondita = str(v.profondita, 20) as Profondita;
    if (nome.length < 2 || !riassunto || !PROFONDITA.has(profondita)) continue;
    let arg = perNome.get(nome.toLowerCase());
    if (!arg) {
      const { data, error } = await admin
        .from("argomenti")
        .upsert({ nome, descrizione: str(v.descrizione, 300) || null }, { onConflict: "nome", ignoreDuplicates: false })
        .select("id, nome, descrizione")
        .single();
      if (error || !data) throw error ?? new Error("argomento non creato");
      arg = data as Argomento;
      perNome.set(nome.toLowerCase(), arg);
      argomenti.push(arg);
    }
    const inizio = typeof v.inizio === "string" ? secondiDa(v.inizio) : null;
    const durata = typeof v.durata_min === "number" && Number.isFinite(v.durata_min) ? Math.min(600, Math.max(0, Math.round(v.durata_min))) : null;
    righe.push({ lezione_id: l.id, argomento_id: arg.id, inizio_sec: inizio, durata_min: durata, profondita, riassunto, origine: "aura" });
  }
  if (righe.length === 0) throw new Error("nessuna voce valida");
  const { error: eDel } = await admin.from("lezioni_argomenti").delete().eq("lezione_id", l.id).eq("origine", "aura");
  if (eDel) throw eDel;
  const { error: eIns } = await admin.from("lezioni_argomenti").insert(righe);
  if (eIns) throw eIns;
}

/**
 * Unisce gli argomenti doppioni (stesso tema, nomi diversi): le voci passano sotto un
 * argomento solo, gli altri si cancellano. Restituisce quanti gruppi ha unito.
 */
async function riordina(admin: SupabaseClient): Promise<{ gruppi: number; tolti: number }> {
  const argomenti = await leggiArgomenti(admin);
  if (argomenti.length < 2) return { gruppi: 0, tolti: 0 };
  const { data: voci, error } = await admin.from("lezioni_argomenti").select("argomento_id, lezioni(titolo)").limit(5000);
  if (error) throw error;
  const esempi = new Map<string, string[]>();
  for (const v of (voci ?? []) as unknown as Array<{ argomento_id: string; lezioni: { titolo: string } | null }>) {
    esempi.set(v.argomento_id, [...(esempi.get(v.argomento_id) ?? []), v.lezioni?.titolo ?? ""]);
  }
  const elenco = argomenti
    .map((a) => {
      const ls = esempi.get(a.id) ?? [];
      return `- ${a.nome}${a.descrizione ? ` — ${a.descrizione}` : ""} (${ls.length} voci; es. ${[...new Set(ls)].slice(0, 3).join(" | ")})`;
    })
    .join("\n");
  const testo = await streamAnthropicText({
    system: SYSTEM_RIORDINA,
    user: `=== ELENCO DEGLI ARGOMENTI ===\n${elenco}\n\nTrova i doppioni e rispondi solo con il blocco <dati>.`,
    maxTokens: 6000,
    tag: "aura-argomenti-riordina",
    timeoutMs: 120_000,
  });
  const m = testo?.match(/<dati>\s*([\s\S]*?)\s*<\/dati>/);
  if (!m) throw new Error(testo ? "riordino senza dati" : "nessuna risposta");
  const gruppi = (JSON.parse(m[1]) as { unisci?: Array<{ nome?: unknown; descrizione?: unknown; da?: unknown }> }).unisci ?? [];
  const perNome = new Map(argomenti.map((a) => [a.nome.toLowerCase(), a]));
  let uniti = 0;
  let tolti = 0;
  for (const g of gruppi) {
    const nome = str(g.nome, 60);
    const membri = (Array.isArray(g.da) ? g.da : []).map((n) => perNome.get(str(n, 60).toLowerCase())).filter((a): a is Argomento => !!a);
    const unici = [...new Map(membri.map((a) => [a.id, a])).values()];
    if (nome.length < 2 || unici.length < 2) continue;
    // Si tiene quello che ha già il nome finale, se c'è; altrimenti il primo, rinominato.
    const tieni = unici.find((a) => a.nome.toLowerCase() === nome.toLowerCase()) ?? unici[0];
    const altri = unici.filter((a) => a.id !== tieni.id);
    const { error: eUpd } = await admin.from("lezioni_argomenti").update({ argomento_id: tieni.id }).in("argomento_id", altri.map((a) => a.id));
    if (eUpd) throw eUpd;
    const { error: eDel } = await admin.from("argomenti").delete().in("id", altri.map((a) => a.id));
    if (eDel) throw eDel;
    for (const a of altri) perNome.delete(a.nome.toLowerCase());
    const occupato = perNome.get(nome.toLowerCase());
    if (!occupato || occupato.id === tieni.id) {
      await admin.from("argomenti").update({ nome, descrizione: str(g.descrizione, 300) || tieni.descrizione }).eq("id", tieni.id);
      perNome.delete(tieni.nome.toLowerCase());
      perNome.set(nome.toLowerCase(), { ...tieni, nome });
    }
    uniti++;
    tolti += altri.length;
  }
  return { gruppi: uniti, tolti };
}

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    await richiediCronOTeam(req);
    if (!HAS_ANTHROPIC) return json({ ok: false, error: "ANTHROPIC_API_KEY non configurata." }, 500);
    const body = await leggiBody<{ max?: unknown; azione?: unknown }>(req).catch(() => ({}) as { max?: unknown; azione?: unknown });
    const max = typeof body.max === "number" ? Math.min(20, Math.max(1, Math.round(body.max))) : 6;
    const admin = adminClient();
    if (body.azione === "riordina") return json({ ok: true, ...(await riordina(admin)) });
    const inizio = Date.now();

    const [{ data: lez, error }, { data: indice }] = await Promise.all([
      admin.from("lezioni").select("id, corso, titolo, url, descrizione").eq("attiva", true).order("corso").order("ordine"),
      admin.from("lezioni_indice").select("lezione_id, fonte_hash, stato, indicizzata_il"),
    ]);
    if (error) throw error;
    const lezioni = ((lez ?? []) as Lezione[]).filter((l) => !eRicompensa(l.corso));
    const testi = await fonti(admin, lezioni);
    const giaFatte = new Map(((indice ?? []) as Array<{ lezione_id: string; fonte_hash: string; stato: string; indicizzata_il: string }>).map((r) => [r.lezione_id, r]));
    const ieri = Date.now() - 24 * 3600 * 1000;

    const daFare: Array<{ l: Lezione; hash: string }> = [];
    for (const l of lezioni) {
      const fonte = testi.get(l.id) ?? "";
      const hash = await sha(`${l.corso}\n${l.titolo}\n${fonte}`);
      const g = giaFatte.get(l.id);
      // Si rilegge se il testo è cambiato; una lezione finita in errore si riprova dopo un giorno.
      if (!g || g.fonte_hash !== hash || (g.stato === "errore" && Date.parse(g.indicizzata_il) < ieri)) daFare.push({ l, hash });
    }

    // Niente da leggere: è il momento del riordino, al massimo una volta a settimana
    // (subito dopo una passata grande, e poi quando entrano lezioni nuove). Stato in sync_stati.
    if (daFare.length === 0) {
      const { data: st } = await admin.from("sync_stati").select("synced_at").eq("chiave", "aura_argomenti_riordino").maybeSingle();
      const ultimo = st ? Date.parse((st as { synced_at: string }).synced_at) : 0;
      if (Date.now() - ultimo < 7 * 24 * 3600 * 1000) return json({ ok: true, fatte: 0, errori: 0, restano: 0 });
      const r = await riordina(admin);
      await admin.from("sync_stati").upsert({ chiave: "aura_argomenti_riordino", synced_at: new Date().toISOString(), esito: "ok", dettaglio: `${r.gruppi} gruppi uniti, ${r.tolti} argomenti tolti`, totale: r.gruppi, nuove: 0 });
      return json({ ok: true, fatte: 0, errori: 0, restano: 0, riordino: r });
    }

    const argomenti = await leggiArgomenti(admin);
    let fatte = 0;
    let errori = 0;
    for (const { l, hash } of daFare.slice(0, max)) {
      if (Date.now() - inizio > BUDGET_MS) break;
      try {
        await indicizza(admin, l, testi.get(l.id) ?? "", argomenti);
        await admin.from("lezioni_indice").upsert({ lezione_id: l.id, fonte_hash: hash, stato: "fatto", errore: null, indicizzata_il: new Date().toISOString() });
        fatte++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // Aura non risponde (credito finito, API giù): ci si ferma qui senza segnare la lezione,
        // così al prossimo giro riparte da dove era (27/11/2026: 54 lezioni segnate errore per il credito finito).
        if (msg === "nessuna risposta") {
          await logError("aura-argomenti:anthropic", e, { lezione: l.id }, { silent: true });
          return json({ ok: false, fatte, errori, restano: daFare.length - fatte - errori, motivo: "Aura non risponde" });
        }
        errori++;
        await admin.from("lezioni_indice").upsert({ lezione_id: l.id, fonte_hash: hash, stato: "errore", errore: msg.slice(0, 500), indicizzata_il: new Date().toISOString() });
        await logError("aura-argomenti:lezione", e, { lezione: l.id, titolo: l.titolo }, { silent: true });
      }
    }
    return json({ ok: true, fatte, errori, restano: Math.max(0, daFare.length - fatte - errori) });
  } catch (err) {
    return gestisciErrore(err);
  }
});
