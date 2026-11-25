/**
 * Il blocco <dati>{…}</dati> che Aura chiude a ogni turno: estrazione,
 * pulizia (forma.ts) e salvataggio su avatar_mappa / avatar_scheda. Più lo
 * stato com'è ora reso in testo per il prompt (la memoria di Aura).
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  type CampiMappa,
  type ContenutoScheda,
  type Partenza,
  type Passo,
  PASSI,
  pulisciMappa,
  pulisciPartenza,
  pulisciScheda,
} from "../_shared/avatar/forma.ts";
import { logError } from "../_shared/log.ts";

export type RigaMappa = CampiMappa & { id: string; cliente_id: string; passo: Passo; stato: string; convertita: boolean };
export type RigaScheda = { id: string; ordine: number; principale: boolean; partenza: Partenza; contenuto: ContenutoScheda };

export interface DatiTurno {
  passo?: Passo;
  mappa: CampiMappa;
  partenze?: Partenza[];
  principale?: number;
  schede: Record<number, ContenutoScheda>;
}

export type MotivoDati = "ok" | "nessun_blocco" | "json_invalido";

/** Separa il testo per il cliente dal blocco <dati>; il testo arriva comunque anche se il blocco manca o è rotto. */
export function estraiDati(testo: string): { risposta: string; dati: DatiTurno; motivo: MotivoDati; grezzo: string } {
  const vuoti: DatiTurno = { mappa: {}, schede: {} };
  // Niente grassetti né titoli; le tabelle con | restano (il frontend le disegna).
  const pulisci = (t: string) => t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#{1,6}\s+/gm, "").trim();
  const apre = testo.indexOf("<dati>");
  if (apre === -1) return { risposta: pulisci(testo), dati: vuoti, motivo: "nessun_blocco", grezzo: "" };
  const chiude = testo.indexOf("</dati>", apre);
  const grezzo = chiude > apre ? testo.slice(apre + 6, chiude) : testo.slice(apre + 6);
  const risposta = pulisci(`${testo.slice(0, apre)}\n${chiude > apre ? testo.slice(chiude + 7) : ""}`);
  const a = grezzo.indexOf("{");
  const b = grezzo.lastIndexOf("}");
  let json: Record<string, unknown>;
  try {
    if (a === -1 || b <= a) throw new Error("niente JSON");
    json = JSON.parse(grezzo.slice(a, b + 1));
  } catch {
    return { risposta, dati: vuoti, motivo: "json_invalido", grezzo };
  }
  const dati: DatiTurno = { mappa: pulisciMappa(json.mappa), schede: {} };
  if ((PASSI as readonly string[]).includes(json.passo as string)) dati.passo = json.passo as Passo;
  if (Array.isArray(json.partenze) && json.partenze.length > 0) dati.partenze = json.partenze.slice(0, 3).map(pulisciPartenza);
  const p = Number(json.principale);
  if (Number.isInteger(p) && p >= 1 && p <= 3) dati.principale = p;
  if (json.schede && typeof json.schede === "object") {
    for (const [k, v] of Object.entries(json.schede as Record<string, unknown>)) {
      const n = Number(k);
      if (!Number.isInteger(n) || n < 1 || n > 3) continue;
      const s = pulisciScheda(v);
      if (Object.keys(s).length > 0) dati.schede[n] = s;
    }
  }
  return { risposta, dati, motivo: "ok", grezzo };
}

/** Mappa + schede in JSON compatto: è la memoria di Aura e il formato è lo stesso che lei scrive. */
export function renderStato(m: RigaMappa, schede: RigaScheda[]): string {
  const { id: _id, cliente_id: _c, convertita, stato, ...mappa } = m as RigaMappa & Record<string, unknown>;
  for (const k of ["created_at", "updated_at", "rivista_il", "rivista_da", "modello"]) delete (mappa as Record<string, unknown>)[k];
  const ordinate = [...schede].sort((a, b) => a.ordine - b.ordine);
  const stato_ = {
    stato: stato === "rivista" ? "rivista da Wesley" : "bozza",
    ...(convertita ? { nota: "Mappa nata dagli avatar del sistema di prima: rivedila con il cliente." } : {}),
    mappa,
    partenze: ordinate.map((s) => ({ numero: s.ordine, principale: s.principale, ...s.partenza })),
    schede: Object.fromEntries(ordinate.map((s) => [String(s.ordine), s.contenuto])),
  };
  return ordinate.length === 0 && !mappa.ponte?.length && !mappa.arrivo ? `${JSON.stringify(stato_)}\n(ancora vuota)` : JSON.stringify(stato_);
}

/** Scrive il turno. Gli errori si loggano e non fanno perdere la risposta al cliente. */
export async function applicaDati(admin: SupabaseClient, m: RigaMappa, schede: RigaScheda[], d: DatiTurno, modello: string): Promise<void> {
  const contenutoCambiato = Object.keys(d.mappa).length > 0 || d.partenze !== undefined || d.principale !== undefined || Object.keys(d.schede).length > 0;
  const update: Record<string, unknown> = { ...d.mappa, modello };
  if (d.passo) update.passo = d.passo;
  if (contenutoCambiato && m.stato === "rivista") update.stato = "bozza"; // cambiata dopo la revisione: torna bozza
  const { error: e1 } = await admin.from("avatar_mappa").update(update).eq("id", m.id);
  if (e1) await logError("aura-avatar:mappa", e1, { mappa: m.id, campi: Object.keys(update) }, { silent: true });

  const perOrdine = new Map(schede.map((s) => [s.ordine, s]));
  const nuovaRiga = async (ordine: number, campi: Record<string, unknown>) => {
    const { data, error } = await admin
      .from("avatar_scheda")
      .insert({ mappa_id: m.id, cliente_id: m.cliente_id, ordine, ...campi })
      .select("id, ordine, principale, partenza, contenuto")
      .single();
    if (error) await logError("aura-avatar:scheda_insert", error, { mappa: m.id, ordine }, { silent: true });
    else perOrdine.set(ordine, data as RigaScheda);
  };

  if (d.partenze) {
    for (const [i, partenza] of d.partenze.entries()) {
      const ordine = i + 1;
      const riga = perOrdine.get(ordine);
      if (riga) {
        const { error } = await admin.from("avatar_scheda").update({ partenza }).eq("id", riga.id);
        if (error) await logError("aura-avatar:partenza", error, { mappa: m.id, ordine }, { silent: true });
      } else await nuovaRiga(ordine, { partenza });
    }
    const via = [...perOrdine.keys()].filter((o) => o > (d.partenze?.length ?? 0));
    if (via.length > 0) {
      await admin.from("avatar_scheda").delete().eq("mappa_id", m.id).in("ordine", via);
      for (const o of via) perOrdine.delete(o);
    }
  }

  for (const [k, sezioni] of Object.entries(d.schede)) {
    const ordine = Number(k);
    const riga = perOrdine.get(ordine);
    if (riga) {
      const contenuto = { ...riga.contenuto, ...sezioni };
      const { error } = await admin.from("avatar_scheda").update({ contenuto }).eq("id", riga.id);
      if (error) await logError("aura-avatar:scheda", error, { mappa: m.id, ordine, sezioni: Object.keys(sezioni) }, { silent: true });
    } else if (ordine === perOrdine.size + 1) await nuovaRiga(ordine, { contenuto: sezioni });
  }

  // Una sola principale: quella indicata, o quella di prima, o la prima.
  if (perOrdine.size > 0) {
    const attuale = [...perOrdine.values()].find((s) => s.principale)?.ordine;
    const scelta = d.principale && perOrdine.has(d.principale) ? d.principale : attuale && perOrdine.has(attuale) ? attuale : Math.min(...perOrdine.keys());
    if (scelta !== attuale) {
      await admin.from("avatar_scheda").update({ principale: false }).eq("mappa_id", m.id).eq("principale", true);
      const { error } = await admin.from("avatar_scheda").update({ principale: true }).eq("mappa_id", m.id).eq("ordine", scelta);
      if (error) await logError("aura-avatar:principale", error, { mappa: m.id, scelta }, { silent: true });
    }
  }
}
