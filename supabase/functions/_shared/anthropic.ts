import { registraConsumo, type ConsumoAnthropic } from "./consumi.ts";
import { adminClient } from "./supabase.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
export const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";
export const HAS_ANTHROPIC = ANTHROPIC_API_KEY.length > 0;

/** Un blocco di contenuto (testo, documento, immagine) come lo vuole l'API Messages. */
export type Blocco = Record<string, unknown>;

/** Blocco di testo semplice. */
export function bloccoTesto(text: string): Blocco {
  return { type: "text", text };
}

/**
 * Blocco di testo che chiude un tratto di prompt da mettere in CACHE: tutto ciò
 * che precede (system compreso) viene riusato nelle chiamate successive se è
 * identico byte per byte. Sotto il minimo del modello (~1024 token) l'API lo
 * ignora senza errori. Massimo 4 blocchi così per richiesta.
 */
export function bloccoCache(text: string): Blocco {
  return { type: "text", text, cache_control: { type: "ephemeral" } };
}

/**
 * Compone il messaggio utente dei chat in tre tratti, dal più stabile al più
 * variabile: `fisso` (metodo, regole: uguale per tutti i clienti), `cliente`
 * (scheda, fotografia: uguale per tutta la conversazione) e `variabile` (carta,
 * storico, messaggio). I primi due chiudono un tratto di cache. Il testo che il
 * modello legge è identico a `[...fisso, ...cliente, ...variabile].join("\n\n")`.
 */
export function blocchiPrompt(fisso: string[], cliente: string[], variabile: string[]): Blocco[] {
  const blocchi: Blocco[] = [];
  const parti = [fisso, cliente, variabile];
  parti.forEach((p, i) => {
    if (p.length === 0) return;
    const testo = (blocchi.length > 0 ? "\n\n" : "") + p.join("\n\n");
    blocchi.push(i < 2 ? bloccoCache(testo) : bloccoTesto(testo));
  });
  return blocchi;
}

export interface StreamAnthropicOptions {
  /** Stringa (messa in cache automaticamente) o blocchi già composti. */
  system: string | Blocco[];
  /** Testo semplice o blocchi (es. document PDF / image + testo, o tratti con cache). */
  user: string | Blocco[];
  maxTokens: number;
  /** Etichetta per i log e per `aura_consumi.funzione`. */
  tag: string;
  model?: string;
  /** Utente per cui si lavora: finisce in `aura_consumi.user_id` (null per i job di sistema). */
  utente?: string | null;
  /** Tempo massimo per tutta la risposta (stream compreso): oltre si interrompe e torna null. Facoltativo. */
  timeoutMs?: number;
  /** Quanto ragiona un modello della famiglia 5 (default ANTHROPIC_EFFORT o "low"). Ignorato dai modelli vecchi. */
  effort?: Effort;
  /** Interruzione dall'esterno (di solito `req.signal`: il cliente ha premuto stop): si chiude lo stream e torna null. */
  signal?: AbortSignal;
  /**
   * Modello di riserva: se il primo non dà testo (rifiuto, errore, risposta vuota) e il cliente non
   * ha fermato, si rifà la stessa richiesta con questo. Serve con Opus, che a volte rifiuta (28/11/2026).
   */
  riserva?: { model: string; effort?: Effort };
}

/**
 * I modelli della famiglia 5 (27/11/2026: Sonnet 5.5, Haiku 5.5) costano meno per token
 * ma ragionano prima di rispondere, e il ragionamento si paga come output. Si regola
 * con `effort` (low = ragiona poco o niente sulle richieste semplici). Il ragionamento
 * conta dentro max_tokens: si aggiunge spazio perché non tagli la risposta.
 */
export type Effort = "low" | "medium" | "high";
export function eModelloNuovo(model: string): boolean {
  return /^claude-(sonnet|haiku|opus)-5/.test(model);
}
const EFFORT_DEFAULT = (Deno.env.get("ANTHROPIC_EFFORT") || "low") as Effort;
const SPAZIO_RAGIONAMENTO = 4000;

function corpo(model: string, effort: Effort | undefined, maxTokens: number, system: Blocco[], user: string | Blocco[]): Record<string, unknown> {
  const base: Record<string, unknown> = { model, max_tokens: maxTokens, stream: true, system, messages: [{ role: "user", content: user }] };
  if (!eModelloNuovo(model)) return base;
  return { ...base, max_tokens: maxTokens + SPAZIO_RAGIONAMENTO, output_config: { effort: effort ?? EFFORT_DEFAULT } };
}

/**
 * Chiama Anthropic in STREAMING e accumula il testo. Ritorna null per QUALSIASI
 * fallimento (chiave assente, rete, non-200, stream interrotto, output vuoto).
 * NON lancia mai: il chiamante decide il fallback.
 * Prompt caching: il system (se stringa) viene marcato per la cache; i tratti
 * fissi del messaggio utente li marca il chiamante con `bloccoCache`.
 * Il consumo (token normali, letti e scritti in cache, output) si registra in
 * `aura_consumi` senza bloccare la risposta.
 * Prova dei modelli (secret ANTHROPIC_MODEL_CONFRONTO): la stessa richiesta si rifà in
 * sottofondo con i modelli della prova e le due versioni finiscono in `aura_confronti`.
 */
export async function streamAnthropicText(opts: StreamAnthropicOptions): Promise<string | null> {
  if (!ANTHROPIC_API_KEY) return null;
  const model = opts.model ?? ANTHROPIC_MODEL;
  const system = typeof opts.system === "string" ? [bloccoCache(opts.system)] : opts.system;
  const esito = await chiama(model, opts.effort, system, opts, opts.tag, segnale(opts));
  let testo = esito?.testo ?? null;
  if (!testo && opts.riserva && opts.riserva.model !== model && !opts.signal?.aborted) {
    console.error(`[${opts.tag}] ${model} senza risposta: riprovo con ${opts.riserva.model}`);
    const seconda = await chiama(opts.riserva.model, opts.riserva.effort, system, opts, opts.tag, segnale(opts));
    testo = seconda?.testo ?? null;
  }
  if (CONFRONTI.length > 0 && !opts.signal?.aborted) inSottofondo(confronta(model, testo, system, opts));
  return testo;
}

interface Esito {
  testo: string | null;
  consumo: ConsumoAnthropic;
  ms: number;
}

async function chiama(model: string, effort: Effort | undefined, system: Blocco[], opts: StreamAnthropicOptions, tag: string, signal: AbortSignal | undefined): Promise<Esito | null> {
  const inizio = Date.now();
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      signal,
      // toWellFormed: un'emoji spezzata da un taglio (surrogato spaiato) farebbe rifiutare il JSON all'API.
      body: JSON.stringify(corpo(model, effort, opts.maxTokens, system, opts.user), (_chiave, valore) => (typeof valore === "string" ? valore.toWellFormed() : valore)),
    });
  } catch (err) {
    console.error(`[${tag}] errore rete Anthropic:`, err);
    return null;
  }
  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => "");
    console.error(`[${tag}] Anthropic`, res.status, errText.slice(0, 300));
    return null;
  }
  const consumo: ConsumoAnthropic = { funzione: tag, utente: opts.utente ?? null, modello: model, input: 0, cacheLettura: 0, cacheScrittura: 0, output: 0 };
  let text = "";
  try {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const payload = t.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload);
          // Solo il testo: i blocchi `thinking` dei modelli nuovi (vuoti di default) si saltano.
          if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
            text += evt.delta.text as string;
          } else if (evt.type === "message_start") {
            leggiUsage(consumo, evt.message?.usage);
          } else if (evt.type === "message_delta") {
            leggiUsage(consumo, evt.usage);
            if (evt.delta?.stop_reason === "refusal") console.error(`[${tag}] Anthropic ha rifiutato la richiesta`);
          }
        } catch {
          /* riga SSE non-JSON */
        }
      }
    }
  } catch (err) {
    console.error(`[${tag}] lettura stream:`, err);
    return null;
  } finally {
    await registraConsumo(consumo);
  }
  const out = text.trim();
  return { testo: out.length > 0 ? out : null, consumo, ms: Date.now() - inizio };
}

/** "claude-sonnet-5-5@low,claude-haiku-5-5@low" → i modelli della prova. Vuoto = nessuna prova. */
const CONFRONTI: Array<{ model: string; effort?: Effort }> = (Deno.env.get("ANTHROPIC_MODEL_CONFRONTO") ?? "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean)
  .map((v) => {
    const [model, effort] = v.split("@");
    return { model, effort: (effort || undefined) as Effort | undefined };
  });

async function confronta(modelloOriginale: string, testoOriginale: string | null, system: Blocco[], opts: StreamAnthropicOptions): Promise<void> {
  for (const c of CONFRONTI) {
    if (c.model === modelloOriginale) continue;
    const esito = await chiama(c.model, c.effort, system, opts, `${opts.tag}~confronto`, AbortSignal.timeout(180_000));
    if (!esito) continue;
    const { error } = await adminClient().from("aura_confronti").insert({
      funzione: opts.tag,
      user_id: opts.utente ?? null,
      modello_originale: modelloOriginale,
      testo_originale: testoOriginale,
      modello: c.model,
      effort: eModelloNuovo(c.model) ? (c.effort ?? EFFORT_DEFAULT) : null,
      testo: esito.testo,
      input_tokens: esito.consumo.input,
      cache_lettura_tokens: esito.consumo.cacheLettura,
      cache_scrittura_tokens: esito.consumo.cacheScrittura,
      output_tokens: esito.consumo.output,
      millisecondi: esito.ms,
    });
    if (error) console.error(`[${opts.tag}] aura_confronti:`, error.message);
  }
}

/** Lavoro dopo la risposta: su Supabase la funzione resta viva finché la promessa finisce. */
function inSottofondo(p: Promise<void>): void {
  const er = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime;
  const sicura = p.catch((err) => console.error("[confronto]", err));
  if (er) er.waitUntil(sicura);
}

function segnale(opts: StreamAnthropicOptions): AbortSignal | undefined {
  const segnali = [opts.timeoutMs ? AbortSignal.timeout(opts.timeoutMs) : null, opts.signal ?? null].filter((s): s is AbortSignal => s !== null);
  if (segnali.length === 0) return undefined;
  return segnali.length === 1 ? segnali[0] : AbortSignal.any(segnali);
}

/** `message_start` porta input e cache; `message_delta` l'output cumulativo. */
function leggiUsage(c: ConsumoAnthropic, u: Record<string, unknown> | undefined): void {
  if (!u) return;
  if (typeof u.input_tokens === "number") c.input = u.input_tokens;
  if (typeof u.cache_read_input_tokens === "number") c.cacheLettura = u.cache_read_input_tokens;
  if (typeof u.cache_creation_input_tokens === "number") c.cacheScrittura = u.cache_creation_input_tokens;
  if (typeof u.output_tokens === "number") c.output = u.output_tokens;
}

/** Estrae il primo oggetto JSON da un testo (tra la prima { e l'ultima }). */
export function estraiJson<T>(testo: string | null): T | null {
  if (!testo) return null;
  const a = testo.indexOf("{");
  const b = testo.lastIndexOf("}");
  if (a === -1 || b === -1 || b <= a) return null;
  try {
    return JSON.parse(testo.slice(a, b + 1)) as T;
  } catch {
    return null;
  }
}
