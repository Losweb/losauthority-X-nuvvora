/**
 * Il cliente corregge da solo la sua offerta, senza passare da Aura (26/11/2026, Wesley: «una volta
 * creata l'offerta può essere modificata in futuro se cambia il prezzo o qualcosa, dal cliente
 * direttamente»). La correzione conta come VERA (o = "vera"). `valore: null` toglie la riga
 * (un bonus, un'obiezione, una cosa da confermare).
 *
 * Body: { azione: "modifica", percorso: "gradini.1" | "promessa.tagliente" | "bonus.0" | "garanzia"
 *         | "presentazione.bio" | "presentazione.obiezioni.2" | "da_confermare.3", valore }
 *   - riga {t, o}: valore = testo
 *   - gradino, bonus, obiezione: valore = { nome?, prezzo?, contiene?, bonus?, a?, b? } (solo i campi da cambiare)
 *   - testo semplice (promessa, frasi della presentazione): valore = testo
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { HttpError } from "../_shared/http.ts";
import { pulisciScheda } from "../_shared/offerta/forma.ts";
import type { RigaOfferta } from "./dati.ts";

const MAX_TESTO = 600;
/** Le sezioni che il cliente può toccare: il ragionamento di Aura (test, mercato, valore, freni) no. */
const SEZIONI = ["gradini", "promessa", "bonus", "garanzia", "presentazione", "da_confermare"] as const;
const CAMPI = ["nome", "prezzo", "contiene", "bonus", "a", "b"] as const;

export type BodyModifica = { percorso?: unknown; valore?: unknown };

const testo = (v: unknown): string => {
  if (typeof v !== "string") throw new HttpError(400, "Scrivi il testo.");
  const t = v.replace(/\s+/g, " ").trim();
  if (!t) throw new HttpError(400, "Il testo non può essere vuoto: per toglierlo usa «Elimina la riga».");
  return t.slice(0, MAX_TESTO);
};

export async function modificaOfferta(admin: SupabaseClient, o: RigaOfferta, body: BodyModifica): Promise<void> {
  const percorso = typeof body.percorso === "string" ? body.percorso : "";
  const pezzi = percorso.split(".");
  if (pezzi.length < 1 || pezzi.length > 3 || pezzi.some((p) => !/^([a-z_]{1,30}|\d{1,2})$/.test(p))) throw new HttpError(400, "Riga non valida.");
  if (!(SEZIONI as readonly string[]).includes(pezzi[0])) throw new HttpError(400, "Questa parte la cambia Aura.");

  const radice = structuredClone(o.scheda ?? {}) as Record<string, unknown>;
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

  let nuovo: unknown;
  if (body.valore === null) {
    if (lista) lista.splice(Number(ultimo), 1);
    else delete oggetto?.[ultimo];
  } else if (typeof attuale === "string") {
    nuovo = testo(body.valore);
  } else if (attuale && typeof attuale === "object") {
    const r = { ...(attuale as Record<string, unknown>) };
    const v = body.valore;
    if (typeof v === "string" && "t" in r) r.t = testo(v);
    else if (v && typeof v === "object") {
      const campi = v as Record<string, unknown>;
      for (const k of CAMPI) if (k in r && k in campi) r[k] = testo(campi[k]);
    } else throw new HttpError(400, "Valore non valido.");
    r.o = "vera"; // le correzioni del cliente sono vere
    nuovo = r;
  } else throw new HttpError(404, "Riga non trovata.");
  if (nuovo !== undefined) {
    if (lista) lista[Number(ultimo)] = nuovo;
    else if (oggetto) oggetto[ultimo] = nuovo;
  }

  const { error } = await admin.from("offerta").update({ scheda: pulisciScheda(radice) }).eq("id", o.id);
  if (error) throw error;
}
