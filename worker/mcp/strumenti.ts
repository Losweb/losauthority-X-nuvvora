import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/integrations/supabase/types";
import {
  ETICHETTA_STATO_CONTENUTO,
  STATI_PROGRAMMAZIONE,
  STATO_CONTENUTO_KEYS,
  type Contenuto,
  type StatoContenuto,
} from "../../src/features/contenuti/types";
import { MAX_RIFERIMENTI } from "../../src/features/contenuti/schema";

/**
 * Gli strumenti che il server MCP del Workflow offre a Claude. Lavorano con il token
 * dell'utente: la RLS di `contenuti` e `tipologie_contenuto` vale come nell'app.
 * Un account cliente lavora sul suo Workflow; un account del team (admin, staff) su quello
 * del cliente che indica a ogni chiamata (`cliente`), come nel gestionale.
 * Niente eliminazione (decisione del 13/11/2026: una scheda cancellata non torna).
 */

export type Db = SupabaseClient<Database>;

export interface Contesto {
  db: Db;
  /** Chi è collegato: va in `contenuti.creato_da`. */
  utenteId: string;
  /** Account cliente: il suo id (= `contenuti.cliente_id`). null = account del team, il cliente si sceglie a ogni chiamata. */
  clienteFisso: string | null;
  /** Origine del sito, per i link nelle risposte. */
  sito: string;
}

/** Il cliente su cui lavora una chiamata. */
interface ClienteScelto {
  id: string;
  nome: string | null;
}

/** Risultato di uno strumento: testo per Claude e, se c'è, il dato strutturato. */
export interface EsitoStrumento {
  testo: string;
  dati?: Record<string, unknown>;
  errore?: boolean;
}

/** Errore pensato per Claude: il messaggio arriva com'è nella risposta. */
export class ErroreStrumento extends Error {}

const DATA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data nel formato AAAA-MM-GG");
const ORA = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ora nel formato HH:MM (24 ore)");
const LINK = z
  .string()
  .trim()
  .max(2000, "Link troppo lungo")
  .regex(/^https?:\/\//i, "Il link deve iniziare con http:// o https://");
const STATO = z.enum(STATO_CONTENUTO_KEYS);
const PROGRAMMAZIONE = z.enum(STATI_PROGRAMMAZIONE);
const ID = z.string().uuid("Id non valido");

/** Solo per gli account del team (gli account cliente non lo vedono nemmeno nello schema). */
const CLIENTE = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .describe("Solo account del team: il cliente su cui lavorare (nome, email o id; vedi `elenca_clienti`).");

const descrizioneStati = STATO_CONTENUTO_KEYS.map((s) => `${s} = «${ETICHETTA_STATO_CONTENUTO[s]}»`).join(", ");

/** Campi della scheda che Claude può scrivere (gli stessi del popup del Workflow). */
const campiScheda = {
  titolo: z.string().trim().min(1).max(200).describe("L'idea del video, in breve (massimo 200 caratteri)."),
  stato: STATO.describe(`Fase del Workflow: ${descrizioneStati}.`),
  tipologia: z
    .string()
    .trim()
    .max(60)
    .nullable()
    .describe("Nome (o id) di una tipologia esistente: vedi `elenca_tipologie`. null per toglierla."),
  pubblicazione_prevista: DATA.nullable().describe("Giorno previsto di pubblicazione (AAAA-MM-GG). null per toglierlo (toglie anche l'ora)."),
  ora_prevista: ORA.nullable().describe("Ora prevista (HH:MM, ora italiana). Solo se c'è il giorno. null per toglierla."),
  script: z.string().max(20000).nullable().describe("Il testo completo del video (hook, sviluppo, chiusura)."),
  descrizione: z
    .string()
    .max(5000)
    .nullable()
    .describe("Tutto ciò che non è script: contesto, cosa mostrare, didascalia, hashtag."),
  drive_url: LINK.nullable().describe("Link alla cartella o al file su Google Drive del video."),
  riferimenti: z
    .array(LINK)
    .max(MAX_RIFERIMENTI)
    .describe(`Link di ispirazione o riferimento (massimo ${MAX_RIFERIMENTI}). Sostituisce l'elenco intero.`),
  note: z.string().trim().max(2000).nullable().describe("Appunti veloci."),
};

const campiPiattaforme = {
  tiktok_stato: PROGRAMMAZIONE.describe("Programmazione su TikTok: da_programmare | programmato."),
  instagram_stato: PROGRAMMAZIONE.describe("Programmazione su Instagram: da_programmare | programmato."),
  youtube_stato: PROGRAMMAZIONE.describe("Programmazione su YouTube: da_programmare | programmato."),
};

const schemaElenca = z.object({
  cliente: CLIENTE.optional(),
  stato: STATO.optional().describe("Solo le schede in questa fase."),
  da: DATA.optional().describe("Solo con pubblicazione prevista da questo giorno (incluso)."),
  a: DATA.optional().describe("Solo con pubblicazione prevista fino a questo giorno (incluso)."),
  cerca: z.string().trim().max(100).optional().describe("Testo da cercare nel titolo."),
  limite: z.number().int().min(1).max(200).optional().describe("Quante schede al massimo (predefinito 50)."),
});

const schemaLeggi = z.object({ id: ID.describe("Id della scheda (da `elenca_contenuti`).") });

const schemaCrea = z.object({
  cliente: CLIENTE.optional(),
  ...campiScheda,
  stato: campiScheda.stato.optional(),
  tipologia: campiScheda.tipologia.optional(),
  pubblicazione_prevista: campiScheda.pubblicazione_prevista.optional(),
  ora_prevista: campiScheda.ora_prevista.optional(),
  script: campiScheda.script.optional(),
  descrizione: campiScheda.descrizione.optional(),
  drive_url: campiScheda.drive_url.optional(),
  riferimenti: campiScheda.riferimenti.optional(),
  note: campiScheda.note.optional(),
  tiktok_stato: campiPiattaforme.tiktok_stato.optional(),
  instagram_stato: campiPiattaforme.instagram_stato.optional(),
  youtube_stato: campiPiattaforme.youtube_stato.optional(),
});

const schemaAggiorna = z.object({
  id: schemaLeggi.shape.id,
  titolo: campiScheda.titolo.optional(),
  stato: campiScheda.stato.optional(),
  tipologia: campiScheda.tipologia.optional(),
  pubblicazione_prevista: campiScheda.pubblicazione_prevista.optional(),
  ora_prevista: campiScheda.ora_prevista.optional(),
  script: campiScheda.script.optional(),
  descrizione: campiScheda.descrizione.optional(),
  drive_url: campiScheda.drive_url.optional(),
  riferimenti: campiScheda.riferimenti.optional(),
  note: campiScheda.note.optional(),
  pubblicato_il: DATA.nullable().optional().describe("Giorno reale di pubblicazione: conta solo in fase «pubblicato» (se manca lo mette il sistema)."),
  tiktok_stato: campiPiattaforme.tiktok_stato.optional(),
  instagram_stato: campiPiattaforme.instagram_stato.optional(),
  youtube_stato: campiPiattaforme.youtube_stato.optional(),
});

const schemaTipologie = z.object({ cliente: CLIENTE.optional() });

const schemaClienti = z.object({
  cerca: z.string().trim().max(100).optional().describe("Parte del nome o dell'email del cliente."),
});

// ---------------------------------------------------------------------------------------------
// Lettura e scrittura
// ---------------------------------------------------------------------------------------------

type Tipologia = Database["public"]["Tables"]["tipologie_contenuto"]["Row"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Testo sicuro dentro un filtro `ilike` / `or` di PostgREST. */
function perFiltro(testo: string): string {
  return testo.replace(/[%_\\,()*]/g, " ").trim();
}

/**
 * Su quale cliente lavora la chiamata. Account cliente: sempre il suo. Account del team: quello indicato
 * in `cliente` (id, email o nome; con più omonimi chiede di scegliere).
 */
async function clientePer(ctx: Contesto, valore: string | undefined): Promise<ClienteScelto> {
  if (ctx.clienteFisso) return { id: ctx.clienteFisso, nome: null };
  if (!valore) {
    throw new ErroreStrumento("Con un account del team serve il cliente: passa `cliente` (nome, email o id). Per trovarlo usa `elenca_clienti`.");
  }
  const cercato = valore.trim();
  let q = ctx.db.from("user_roles").select("id, nombre, email").eq("rol", "cliente");
  if (UUID.test(cercato)) q = q.eq("id", cercato);
  else if (cercato.includes("@")) q = q.ilike("email", cercato.replace(/[%_\\]/g, (c) => `\\${c}`));
  else q = q.ilike("nombre", `%${perFiltro(cercato)}%`);
  const { data, error } = await q.order("nombre").limit(20);
  if (error) throw error;
  const trovati = data ?? [];
  const esatto = trovati.filter((c) => (c.nombre ?? "").toLowerCase() === cercato.toLowerCase());
  const scelti = esatto.length === 1 ? esatto : trovati;
  if (scelti.length === 0) throw new ErroreStrumento(`Nessun cliente trovato con «${cercato}». Usa \`elenca_clienti\` per vedere i nomi.`);
  if (scelti.length > 1) {
    throw new ErroreStrumento(
      `Più clienti corrispondono a «${cercato}»: ${scelti.map((c) => `${c.nombre ?? "senza nome"} (${c.email}, id ${c.id})`).join("; ")}. Indica l'id o l'email.`,
    );
  }
  return { id: scelti[0].id, nome: scelti[0].nombre };
}

/** Le tipologie che vede quel cliente: le predefinite più le sue. */
async function tipologieVisibili(ctx: Contesto, clienteId: string): Promise<Tipologia[]> {
  const { data, error } = await ctx.db
    .from("tipologie_contenuto")
    .select("*")
    .or(`predefinita.eq.true,creato_da.eq.${clienteId}`)
    .order("ordine")
    .order("nome");
  if (error) throw error;
  return data ?? [];
}

/** Dal nome (senza maiuscole) o dall'id all'id della tipologia; errore chiaro se non esiste. */
async function idTipologia(ctx: Contesto, clienteId: string, valore: string | null | undefined): Promise<string | null | undefined> {
  if (valore === undefined) return undefined;
  if (valore === null || valore === "") return null;
  const lista = await tipologieVisibili(ctx, clienteId);
  const cercato = valore.trim().toLowerCase();
  const trovata = lista.find((t) => t.id === valore.trim() || t.nome.toLowerCase() === cercato);
  if (!trovata) {
    throw new ErroreStrumento(
      `La tipologia «${valore}» non esiste. Tipologie disponibili: ${lista.map((t) => t.nome).join(", ") || "nessuna"}.`,
    );
  }
  return trovata.id;
}

/** Una scheda come la legge Claude: la tipologia per nome, l'ora senza secondi. */
function perClaude(c: Contenuto, tipologie: Map<string, string>) {
  return {
    id: c.id,
    cliente_id: c.cliente_id,
    titolo: c.titolo,
    stato: c.stato,
    fase: ETICHETTA_STATO_CONTENUTO[c.stato as StatoContenuto] ?? c.stato,
    tipologia: c.tipologia_id ? (tipologie.get(c.tipologia_id) ?? null) : null,
    pubblicazione_prevista: c.pubblicazione_prevista,
    ora_prevista: c.ora_prevista ? c.ora_prevista.slice(0, 5) : null,
    pubblicato_il: c.pubblicato_il,
    tiktok_stato: c.tiktok_stato,
    instagram_stato: c.instagram_stato,
    youtube_stato: c.youtube_stato,
    drive_url: c.drive_url,
    riferimenti: c.riferimenti,
    script: c.script,
    descrizione: c.descrizione,
    note: c.note,
    aggiornato_il: c.updated_at,
  };
}

async function mappaNomiTipologie(ctx: Contesto, clienteId: string): Promise<Map<string, string>> {
  return new Map((await tipologieVisibili(ctx, clienteId)).map((t) => [t.id, t.nome]));
}

/** Una scheda per id: il cliente solo tra le sue, il team tra tutte (RLS). */
async function leggiRiga(ctx: Contesto, id: string): Promise<Contenuto> {
  let q = ctx.db.from("contenuti").select("*").eq("id", id);
  if (ctx.clienteFisso) q = q.eq("cliente_id", ctx.clienteFisso);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  if (!data) throw new ErroreStrumento(`Nessuna scheda con id ${id}${ctx.clienteFisso ? " nel tuo Workflow" : ""}.`);
  return data;
}

/** Prossimo `ordine` libero in una colonna (in coda), come fa l'app. */
async function prossimoOrdine(ctx: Contesto, clienteId: string, stato: string): Promise<number> {
  const { data, error } = await ctx.db
    .from("contenuti")
    .select("ordine")
    .eq("cliente_id", clienteId)
    .eq("stato", stato)
    .order("ordine", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? data[0].ordine + 1 : 0;
}

/** Errori del database tradotti per Claude (i check della tabella). */
function erroreDb(error: { message?: string; code?: string }): never {
  const msg = error.message ?? "";
  if (msg.includes("contenuti_ora_con_data")) throw new ErroreStrumento("L'ora si può mettere solo se c'è anche il giorno di pubblicazione.");
  if (error.code === "23514") throw new ErroreStrumento(`Valore non accettato dal Workflow: ${msg}`);
  if (error.code === "42501") throw new ErroreStrumento("Il tuo account non può modificare questa scheda.");
  throw error;
}

/** Dove si vede il risultato: il Workflow per il cliente, la sua scheda nel gestionale per il team. */
function link(ctx: Contesto, clienteId: string): string {
  return ctx.clienteFisso ? `${ctx.sito}/area/workflow` : `${ctx.sito}/clienti/${clienteId}`;
}

// ---------------------------------------------------------------------------------------------
// Gli strumenti
// ---------------------------------------------------------------------------------------------

interface Strumento<S extends z.ZodType> {
  nome: string;
  titolo: string;
  descrizione: string;
  schema: S;
  soloLettura: boolean;
  /** Solo per gli account del team: non compare agli account cliente. */
  soloTeam?: boolean;
  esegui: (input: z.infer<S>, ctx: Contesto) => Promise<EsitoStrumento>;
}

function strumento<S extends z.ZodType>(s: Strumento<S>): Strumento<S> {
  return s;
}

export const STRUMENTI = [
  strumento({
    nome: "elenca_clienti",
    titolo: "Elenca i clienti",
    descrizione: "Solo account del team: i clienti con id, nome ed email, da usare nel campo `cliente` degli altri strumenti.",
    schema: schemaClienti,
    soloLettura: true,
    soloTeam: true,
    async esegui(input, ctx) {
      let q = ctx.db.from("user_roles").select("id, nombre, email").eq("rol", "cliente");
      const cercato = input.cerca ? perFiltro(input.cerca) : "";
      if (cercato) q = q.or(`nombre.ilike.%${cercato}%,email.ilike.%${cercato}%`);
      const { data, error } = await q.order("nombre").limit(200);
      if (error) throw error;
      const clienti = (data ?? []).map((c) => ({ id: c.id, nome: c.nombre, email: c.email }));
      return {
        testo: clienti.length ? clienti.map((c) => `- ${c.nome ?? "senza nome"} · ${c.email} (id ${c.id})`).join("\n") : "Nessun cliente trovato.",
        dati: { clienti },
      };
    },
  }),
  strumento({
    nome: "elenca_tipologie",
    titolo: "Elenca le tipologie",
    descrizione: "Le tipologie di contenuto disponibili (predefinite e create dal cliente), da usare nel campo `tipologia` delle schede.",
    schema: schemaTipologie,
    soloLettura: true,
    async esegui(input, ctx) {
      const cliente = await clientePer(ctx, input.cliente);
      const lista = await tipologieVisibili(ctx, cliente.id);
      const tipologie = lista.map((t) => ({ id: t.id, nome: t.nome, predefinita: t.predefinita }));
      return { testo: tipologie.map((t) => `- ${t.nome}${t.predefinita ? " (predefinita)" : ""}`).join("\n") || "Nessuna tipologia.", dati: { tipologie } };
    },
  }),
  strumento({
    nome: "elenca_contenuti",
    titolo: "Elenca le schede del Workflow",
    descrizione:
      "Le schede dei video del Workflow del cliente, con fase, data e ora previste, tipologia, link Drive e stato di programmazione per piattaforma. Senza filtri restituisce le più recenti. Il testo completo (script, descrizione) si legge con `leggi_contenuto`.",
    schema: schemaElenca,
    soloLettura: true,
    async esegui(input, ctx) {
      const cliente = await clientePer(ctx, input.cliente);
      let q = ctx.db.from("contenuti").select("*").eq("cliente_id", cliente.id);
      if (input.stato) q = q.eq("stato", input.stato);
      if (input.da) q = q.gte("pubblicazione_prevista", input.da);
      if (input.a) q = q.lte("pubblicazione_prevista", input.a);
      if (input.cerca) q = q.ilike("titolo", `%${input.cerca.replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
      const { data, error } = await q.order("updated_at", { ascending: false }).limit(input.limite ?? 50);
      if (error) throw error;
      const nomi = await mappaNomiTipologie(ctx, cliente.id);
      const schede = (data ?? []).map((c) => {
        const { script, descrizione, note, ...resto } = perClaude(c, nomi);
        return { ...resto, ha_script: !!script, ha_descrizione: !!descrizione, ha_note: !!note };
      });
      const righe = schede.map(
        (s) =>
          `- ${s.titolo} · ${s.fase}${s.pubblicazione_prevista ? ` · ${s.pubblicazione_prevista}${s.ora_prevista ? ` ${s.ora_prevista}` : ""}` : ""} (id ${s.id})`,
      );
      return {
        testo:
          (cliente.nome ? `Workflow di ${cliente.nome}. ` : "") +
          (schede.length ? `${schede.length} schede:\n${righe.join("\n")}` : "Nessuna scheda trovata con questi filtri."),
        dati: { schede },
      };
    },
  }),
  strumento({
    nome: "leggi_contenuto",
    titolo: "Leggi una scheda",
    descrizione: "Tutti i campi di una scheda del Workflow, compresi script, descrizione, riferimenti e note.",
    schema: schemaLeggi,
    soloLettura: true,
    async esegui(input, ctx) {
      const riga = await leggiRiga(ctx, input.id);
      const scheda = perClaude(riga, await mappaNomiTipologie(ctx, riga.cliente_id));
      return { testo: JSON.stringify(scheda, null, 2), dati: { scheda } };
    },
  }),
  strumento({
    nome: "crea_contenuto",
    titolo: "Crea una scheda",
    descrizione:
      "Crea una scheda video nel Workflow del cliente. Basta il titolo; il resto è facoltativo (fase predefinita: fase_script). Le piattaforme partono «da_programmare».",
    schema: schemaCrea,
    soloLettura: false,
    async esegui(input, ctx) {
      if (input.ora_prevista && !input.pubblicazione_prevista) {
        throw new ErroreStrumento("L'ora si può mettere solo se c'è anche il giorno di pubblicazione.");
      }
      const cliente = await clientePer(ctx, input.cliente);
      const stato = input.stato ?? "fase_script";
      const tipologia_id = (await idTipologia(ctx, cliente.id, input.tipologia)) ?? null;
      const riga = {
        cliente_id: cliente.id,
        creato_da: ctx.utenteId,
        titolo: input.titolo,
        stato,
        tipologia_id,
        pubblicazione_prevista: input.pubblicazione_prevista ?? null,
        ora_prevista: input.ora_prevista ?? null,
        script: input.script?.trim() || null,
        descrizione: input.descrizione?.trim() || null,
        drive_url: input.drive_url || null,
        riferimenti: [...new Set(input.riferimenti ?? [])],
        note: input.note || null,
        ordine: await prossimoOrdine(ctx, cliente.id, stato),
        ...(input.tiktok_stato ? { tiktok_stato: input.tiktok_stato } : {}),
        ...(input.instagram_stato ? { instagram_stato: input.instagram_stato } : {}),
        ...(input.youtube_stato ? { youtube_stato: input.youtube_stato } : {}),
      };
      const { data, error } = await ctx.db.from("contenuti").insert(riga).select("*").single();
      if (error) erroreDb(error);
      const scheda = perClaude(data, await mappaNomiTipologie(ctx, cliente.id));
      return {
        testo: `Scheda creata${cliente.nome ? ` nel Workflow di ${cliente.nome}` : ""}: «${scheda.titolo}» in «${scheda.fase}» (id ${scheda.id}). ${link(ctx, cliente.id)}`,
        dati: { scheda },
      };
    },
  }),
  strumento({
    nome: "aggiorna_contenuto",
    titolo: "Aggiorna una scheda",
    descrizione:
      "Modifica una scheda esistente: si mandano solo i campi da cambiare. Serve anche per spostarla di fase (`stato`), cambiarle data e ora, aggiungere il link Drive o segnare le piattaforme come programmate. Togliere il giorno toglie anche l'ora.",
    schema: schemaAggiorna,
    soloLettura: false,
    async esegui(input, ctx) {
      const attuale = await leggiRiga(ctx, input.id);
      const { id, tipologia, riferimenti, ...resto } = input;
      const modifiche: Database["public"]["Tables"]["contenuti"]["Update"] = {};
      for (const [chiave, valore] of Object.entries(resto)) {
        if (valore !== undefined) (modifiche as Record<string, unknown>)[chiave] = typeof valore === "string" && chiave !== "titolo" ? valore.trim() || null : valore;
      }
      if (input.titolo !== undefined) modifiche.titolo = input.titolo;
      if (riferimenti !== undefined) modifiche.riferimenti = [...new Set(riferimenti)];
      const idTip = await idTipologia(ctx, attuale.cliente_id, tipologia);
      if (idTip !== undefined) modifiche.tipologia_id = idTip;
      // Senza giorno non c'è ora (lo impone anche il check in DB).
      if (modifiche.pubblicazione_prevista === null) modifiche.ora_prevista = null;
      const giorno = modifiche.pubblicazione_prevista !== undefined ? modifiche.pubblicazione_prevista : attuale.pubblicazione_prevista;
      if (modifiche.ora_prevista && !giorno) throw new ErroreStrumento("L'ora si può mettere solo se c'è anche il giorno di pubblicazione.");
      // Cambio di fase: in coda alla nuova colonna, come nell'app; la data reale vale solo in «pubblicato».
      const stato = modifiche.stato ?? attuale.stato;
      if (modifiche.stato && modifiche.stato !== attuale.stato) modifiche.ordine = await prossimoOrdine(ctx, attuale.cliente_id, modifiche.stato);
      if (stato !== "pubblicato") delete modifiche.pubblicato_il;
      if (Object.keys(modifiche).length === 0) throw new ErroreStrumento("Nessun campo da modificare.");

      const { data, error } = await ctx.db.from("contenuti").update(modifiche).eq("id", id).eq("cliente_id", attuale.cliente_id).select("*").single();
      if (error) erroreDb(error);
      const scheda = perClaude(data, await mappaNomiTipologie(ctx, attuale.cliente_id));
      const campi = Object.keys(modifiche).filter((k) => k !== "ordine");
      return {
        testo: `Scheda «${scheda.titolo}» aggiornata (${campi.join(", ")}). Fase: «${scheda.fase}».`,
        dati: { scheda },
      };
    },
  }),
] as const;

export type NomeStrumento = (typeof STRUMENTI)[number]["nome"];

/**
 * Le definizioni per `tools/list` (JSON Schema dagli schemi Zod: una sola fonte). Gli account cliente
 * non vedono gli strumenti del team né il campo `cliente`.
 */
export function definizioniStrumenti(team: boolean) {
  return STRUMENTI.filter((s) => team || !("soloTeam" in s && s.soloTeam)).map((s) => ({
    name: s.nome,
    title: s.titolo,
    description: s.descrizione,
    inputSchema: team ? jsonSchema(s.schema) : senzaCliente(jsonSchema(s.schema)),
    annotations: {
      title: s.titolo,
      readOnlyHint: s.soloLettura,
      destructiveHint: false,
      idempotentHint: s.soloLettura,
      openWorldHint: false,
    },
  }));
}

function senzaCliente(schema: Record<string, unknown>): Record<string, unknown> {
  const proprieta = schema.properties as Record<string, unknown> | undefined;
  if (!proprieta || !("cliente" in proprieta)) return schema;
  const { cliente: _ignorato, ...resto } = proprieta;
  return { ...schema, properties: resto };
}

function jsonSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _ignorato, ...resto } = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as Record<string, unknown>;
  return resto;
}

/** Esegue uno strumento validando l'input; gli errori pensati per Claude tornano come `errore`. */
export async function eseguiStrumento(nome: string, argomenti: unknown, ctx: Contesto): Promise<EsitoStrumento> {
  const s = STRUMENTI.find((x) => x.nome === nome);
  if (!s || ("soloTeam" in s && s.soloTeam && ctx.clienteFisso)) return { testo: `Strumento sconosciuto: ${nome}.`, errore: true };
  const input = (s.schema as z.ZodType).safeParse(argomenti ?? {});
  if (!input.success) {
    const dettagli = input.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ");
    return { testo: `Dati non validi. ${dettagli}`, errore: true };
  }
  try {
    // Il cast è sicuro: lo schema appena usato è quello dello strumento.
    return await (s.esegui as (i: unknown, c: Contesto) => Promise<EsitoStrumento>)(input.data, ctx);
  } catch (e) {
    if (e instanceof ErroreStrumento) return { testo: e.message, errore: true };
    throw e;
  }
}
