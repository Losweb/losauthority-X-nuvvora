/**
 * Un video in `pubblicazione` → una lezione su Skool: pagina nel corso (o nella
 * cartella) scelto, corpo in markdown (apertura + capitoli o riassunto) e la
 * trascrizione intera nel campo «transcript» di Skool. Poi la lezione entra nel
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
  trascrizione: string | null;
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
  "id, titolo, corso_id, corso_nome, corso_titolo, cartella_id, durata_sec, tentativi, trascrizione, tipo_testo, apertura, riassunto, parole_chiave";

/** Skool accetta transcript lunghi, ma oltre tanto conviene tagliare (il testo intero resta nel gestionale). */
const MAX_TRANSCRIPT = 200_000;
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

/** La descrizione per il catalogo `lezioni`: apertura + righe «tempo titolo» (le usa Wesley Coach per il minuto). */
export function descrizioneCatalogo(v: VideoDaPubblicare, capitoli: Capitolo[]): string {
  const righe = [testoPiatto(v.apertura ?? "")];
  if (capitoli.length > 0) righe.push(capitoli.map((c) => `${tempo(c.inizio_sec)} ${testoPiatto(c.titolo)}`).join(" "));
  else if (v.riassunto) righe.push(testoPiatto(v.riassunto));
  return righe.filter(Boolean).join(" ").slice(0, MAX_DESCRIZIONE_CATALOGO);
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

  const creata = await azione(admin, "classroom:createPage", { courseId: v.corso_id, parentId: v.cartella_id ?? v.corso_id, title: v.titolo });
  const pageId = creata.ok ? idDi(creata.items[0]) : null;
  if (!creata.ok || !pageId) {
    await chiudiInErrore(admin, v, `Skool non ha creato la lezione: ${creata.ok ? "risposta senza id" : creata.dettaglio}`);
    return false;
  }
  // Prima con il transcript; se Skool lo rifiuta, almeno il corpo.
  const transcript = (v.trascrizione ?? "").slice(0, MAX_TRANSCRIPT);
  let corpoEsito = await azione(admin, "classroom:setBody", { pageId, title: v.titolo, bodyMarkdown: corpo, transcript });
  let senzaTranscript = false;
  if (!corpoEsito.ok && transcript) {
    corpoEsito = await azione(admin, "classroom:setBody", { pageId, title: v.titolo, bodyMarkdown: corpo });
    senzaTranscript = corpoEsito.ok;
  }
  const url = urlLezione(v.corso_nome, pageId);
  if (!corpoEsito.ok) {
    await admin.from("skool_video").update({ skool_page_id: pageId, skool_url: url }).eq("id", v.id);
    await chiudiInErrore(admin, v, `La lezione è stata creata ma Skool ha rifiutato il testo: ${corpoEsito.dettaglio}`);
    return false;
  }

  const adesso = new Date().toISOString();
  const { error: eUp } = await admin
    .from("skool_video")
    .update({ stato: "pubblicato", skool_page_id: pageId, skool_url: url, pubblicato_il: adesso, errore: senzaTranscript ? "Pubblicata senza transcript (Skool lo ha rifiutato)." : null, avviato_il: null, tentativi: 0 })
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
    `✅ Lezione creata su Skool\n«${v.titolo}» in ${v.corso_titolo}${senzaTranscript ? " (senza transcript)" : ""}.\nOra carica il video nella lezione:\n👉 ${url}`,
  );
  return true;
}
