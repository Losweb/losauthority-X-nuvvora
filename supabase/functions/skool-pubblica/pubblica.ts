/**
 * Un video in `pubblicazione` → una lezione su Skool: pagina nel corso (o nella
 * cartella) scelto e corpo in markdown (apertura + capitoli o riassunto). La
 * trascrizione NON va su Skool (decisione dell'utente, 27/10/2026): resta nel
 * gestionale e serve solo ad Aura per scrivere il testo. Poi la lezione entra nel
 * catalogo `lezioni` (così Aura e Wesley Coach la conoscono subito) e Telegram
 * avvisa con il link: il video lo carica Wesley a mano nella lezione.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { SKOOL_COMMUNITY_URL } from "../_shared/config.ts";
import { logError } from "../_shared/log.ts";
import { azione } from "../_shared/skool-api.ts";
import { notifyTelegram } from "../_shared/telegram.ts";

export interface VideoDaPubblicare {
  id: string;
  titolo: string;
  corso_id: string;
  corso_nome: string;
  corso_titolo: string;
  cartella_id: string | null;
  durata_sec: number;
  tentativi: number;
  tipo_testo: "capitoli" | "riassunto" | null;
  apertura: string | null;
  riassunto: string | null;
  parole_chiave: string[];
}

export interface Capitolo {
  inizio_sec: number;
  titolo: string;
  testo: string | null;
}

export const COLONNE_PUBBLICA =
  "id, titolo, corso_id, corso_nome, corso_titolo, cartella_id, durata_sec, tentativi, tipo_testo, apertura, riassunto, parole_chiave";

/** Skool rifiuta i titoli oltre 50 caratteri (HTTP 422 «Title is too long»): le lezioni esistenti arrivano a 50. */
export const MAX_TITOLO_SKOOL = 50;
const MAX_DESCRIZIONE_CATALOGO = 2000;

function tempo(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h > 0 ? `${h}:${String(m).padStart(2, "0")}` : String(m)}:${String(r).padStart(2, "0")}`;
}

/**
 * Il corpo della lezione in markdown (l'attore lo converte in TipTap). Dal
 * 15/10/2026 il testo di Aura è già markdown visivo (titoli con emoji, elenchi,
 * righe 💡/⚠️/✅): qui si aggiunge solo l'indice dei capitoli con i minuti.
 */
export function corpoMarkdown(v: VideoDaPubblicare, capitoli: Capitolo[]): string {
  const parti: string[] = [];
  if (v.apertura) parti.push(v.apertura.trim());
  if (v.tipo_testo === "capitoli" && capitoli.length > 0) {
    parti.push("## 🗂️ I capitoli del video");
    parti.push(capitoli.map((c) => `- **${tempo(c.inizio_sec)}** · ${c.titolo}`).join("\n"));
    for (const c of capitoli) {
      parti.push(`## ⏱️ ${tempo(c.inizio_sec)} — ${c.titolo}${c.testo ? `\n\n${c.testo.trim()}` : ""}`);
    }
  } else if (v.riassunto) {
    parti.push(v.riassunto.trim());
  }
  return parti.join("\n\n");
}

/** Toglie i segni del markdown e le emoji di testa: nel catalogo serve testo piatto. */
function testoPiatto(md: string): string {
  return md
    .replace(/^\s*(#{1,6}\s*|- |\* |\d+\.\s)/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Titolo del capitolo per il catalogo: testo piatto, senza l'emoji iniziale. */
function titoloPiatto(titolo: string): string {
  return testoPiatto(titolo).replace(/^[\p{Extended_Pictographic}\u{FE0F}\u{200D}\s]+/u, "").trim();
}

/** Toglie dal testo libero i «10:30» che `aura-coach/capitoli.ts` scambierebbe per l'inizio di un capitolo. */
const senzaTempi = (testo: string) => testo.replace(/(\d):(\d{2})/g, "$1.$2");

/** Taglia a `max` caratteri senza spezzare l'ultima parola. */
function tagliaAParola(testo: string, max: number): string {
  if (testo.length <= max) return testo;
  const taglio = testo.slice(0, max);
  const spazio = taglio.lastIndexOf(" ");
  return `${(spazio > max * 0.6 ? taglio.slice(0, spazio) : taglio).trim()}…`;
}

/**
 * La descrizione per il catalogo `lezioni`. Con i capitoli: apertura e poi
 * «tempo titolo» di ogni capitolo, il formato che `aura-coach/capitoli.ts`
 * legge per dire «guarda dal minuto 27:40». I capitoli entrano sempre interi:
 * è l'apertura ad accorciarsi per stare nei 2000 caratteri.
 */
export function descrizioneCatalogo(v: VideoDaPubblicare, capitoli: Capitolo[]): string {
  const apertura = senzaTempi(testoPiatto(v.apertura ?? ""));
  if (capitoli.length === 0) {
    const resto = v.riassunto ? senzaTempi(testoPiatto(v.riassunto)) : "";
    return [apertura, resto].filter(Boolean).join(" ").slice(0, MAX_DESCRIZIONE_CATALOGO);
  }
  const indice = capitoli.map((c) => `${tempo(c.inizio_sec)} ${senzaTempi(titoloPiatto(c.titolo))}`).join(" ");
  const spazio = MAX_DESCRIZIONE_CATALOGO - indice.length - 1;
  const testa = spazio >= 60 ? tagliaAParola(apertura, spazio) : "";
  return (testa ? `${testa} ${indice}` : indice).slice(0, MAX_DESCRIZIONE_CATALOGO);
}

export function urlLezione(corsoNome: string, pageId: string): string {
  return `${SKOOL_COMMUNITY_URL.replace(/\/$/, "")}/classroom/${corsoNome}?md=${pageId}`;
}

function idDi(item: unknown): string | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  return typeof o.id === "string" && /^[0-9a-f]{32}$/i.test(o.id) ? o.id : null;
}

async function chiudiInErrore(admin: SupabaseClient, v: VideoDaPubblicare, messaggio: string): Promise<void> {
  await logError("skool-pubblica", messaggio, { video: v.id, titolo: v.titolo });
  await admin.from("skool_video").update({ stato: "errore", errore: messaggio.slice(0, 500), avviato_il: null }).eq("id", v.id);
}

/**
 * Su Skool non è nato nulla: il video torna in `bozza` con il motivo, così si
 * corregge (es. il titolo) e si ripubblica senza far riscrivere il testo ad Aura.
 */
async function tornaInBozza(admin: SupabaseClient, v: VideoDaPubblicare, messaggio: string, registra = true): Promise<void> {
  if (registra) await logError("skool-pubblica", messaggio, { video: v.id, titolo: v.titolo }, { silent: true });
  await admin.from("skool_video").update({ stato: "bozza", errore: messaggio.slice(0, 500), avviato_il: null, tentativi: 0 }).eq("id", v.id);
}

export async function pubblicaVideo(admin: SupabaseClient, v: VideoDaPubblicare): Promise<boolean> {
  const { data: righe, error: eCap } = await admin
    .from("skool_video_capitoli")
    .select("inizio_sec, titolo, testo")
    .eq("video_id", v.id)
    .order("ordine");
  if (eCap) throw eCap;
  const capitoli = (righe ?? []) as Capitolo[];
  const corpo = corpoMarkdown(v, capitoli);
  if (!corpo) {
    await chiudiInErrore(admin, v, "Il testo della lezione è vuoto: fallo scrivere ad Aura prima di pubblicare.");
    return false;
  }
  const lunghezzaTitolo = [...v.titolo.trim()].length;
  if (lunghezzaTitolo > MAX_TITOLO_SKOOL) {
    await tornaInBozza(admin, v, `Il titolo ha ${lunghezzaTitolo} caratteri: Skool ne accetta al massimo ${MAX_TITOLO_SKOOL}. Accorcialo e pubblica di nuovo.`, false);
    return false;
  }

  const creata = await azione(admin, "classroom:createPage", { courseId: v.corso_id, parentId: v.cartella_id ?? v.corso_id, title: v.titolo });
  const pageId = creata.ok ? idDi(creata.items[0]) : null;
  if (!creata.ok || !pageId) {
    await tornaInBozza(admin, v, `Skool non ha creato la lezione: ${creata.ok ? "risposta senza id" : creata.dettaglio}`);
    return false;
  }
  const corpoEsito = await azione(admin, "classroom:setBody", { pageId, title: v.titolo, bodyMarkdown: corpo });
  const url = urlLezione(v.corso_nome, pageId);
  if (!corpoEsito.ok) {
    await admin.from("skool_video").update({ skool_page_id: pageId, skool_url: url }).eq("id", v.id);
    await chiudiInErrore(admin, v, `La lezione è stata creata ma Skool ha rifiutato il testo: ${corpoEsito.dettaglio}`);
    return false;
  }

  const adesso = new Date().toISOString();
  const { error: eUp } = await admin
    .from("skool_video")
    .update({ stato: "pubblicato", skool_page_id: pageId, skool_url: url, pubblicato_il: adesso, errore: null, avviato_il: null, tentativi: 0 })
    .eq("id", v.id);
  if (eUp) throw eUp;

  const { error: eLez } = await admin.from("lezioni").upsert(
    {
      key: url,
      corso: v.corso_titolo,
      titolo: v.titolo.slice(0, 300),
      url,
      descrizione: descrizioneCatalogo(v, capitoli),
      keywords: v.parole_chiave.slice(0, 12),
      ordine: null,
      attiva: true,
      updated_at: adesso,
    },
    { onConflict: "key" },
  );
  if (eLez) await logError("skool-pubblica:catalogo", eLez, { video: v.id }, { silent: true });

  await notifyTelegram(
    `✅ Lezione creata su Skool\n«${v.titolo}» in ${v.corso_titolo}.\nOra carica il video nella lezione:\n👉 ${url}`,
  );
  return true;
}
