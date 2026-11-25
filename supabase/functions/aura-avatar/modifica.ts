/**
 * Il cliente corregge da solo una riga della mappa o di una scheda (senza
 * passare da Aura). La correzione conta come frase VERA (o = "vera"); le
 * righe da spuntare cambiano solo `fatto`. `valore: null` toglie la riga.
 *
 * Body: { azione: "modifica", dove: "mappa" | 1 | 2 | 3, percorso: "dolori.dice.2", valore?, fatto? }
 *   - dove = "mappa": il primo pezzo del percorso è la colonna (ponte, arrivo, fuori, esempi, da_verificare…)
 *   - dove = n: la scheda n; il primo pezzo è "partenza" o una sezione della scheda (nome, dolori, …)
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { HttpError } from "../_shared/http.ts";
import { pulisciMappa, pulisciPartenza, pulisciScheda } from "../_shared/avatar/forma.ts";
import type { RigaMappa, RigaScheda } from "./dati.ts";

const COLONNE_MAPPA = ["ponte", "arrivo", "principale_perche", "proporzione", "fuori", "esempi", "da_verificare"] as const;
const MAX_TESTO = 600;

export type BodyModifica = {
  dove?: unknown;
  percorso?: unknown;
  valore?: unknown;
  fatto?: unknown;
};

const testo = (v: unknown): string => {
  if (typeof v !== "string") throw new HttpError(400, "Scrivi il testo della riga.");
  const t = v.replace(/\s+/g, " ").trim();
  if (!t) throw new HttpError(400, "La riga non può essere vuota: per toglierla usa «Elimina».");
  return t.slice(0, MAX_TESTO);
};

/** Applica la modifica al bersaglio (una riga dentro l'oggetto `radice`). */
function applica(radice: Record<string, unknown>, pezzi: string[], body: BodyModifica): void {
  let padre: unknown = radice;
  for (const p of pezzi.slice(0, -1)) {
    padre = Array.isArray(padre) ? padre[Number(p)] : (padre as Record<string, unknown> | undefined)?.[p];
    if (!padre || typeof padre !== "object") throw new HttpError(404, "Riga non trovata.");
  }
  const ultimo = pezzi.at(-1) as string;
  const lista = Array.isArray(padre) ? (padre as unknown[]) : null;
  const oggetto = lista ? null : (padre as Record<string, unknown>);
  const attuale = lista ? lista[Number(ultimo)] : oggetto?.[ultimo];

  if (body.valore === null) {
    if (lista) lista.splice(Number(ultimo), 1);
    else delete oggetto?.[ultimo];
    return;
  }
  let nuovo: unknown;
  if (typeof attuale === "string" || (attuale === undefined && typeof body.valore === "string" && (ultimo === "nome" || ultimo === "eta"))) {
    nuovo = testo(body.valore); // nome di lavoro, età
  } else if (attuale && typeof attuale === "object") {
    const r = { ...(attuale as Record<string, unknown>) };
    if ("fatto" in r) {
      if (typeof body.fatto === "boolean") r.fatto = body.fatto;
      if (body.valore !== undefined) r.t = testo(body.valore);
    } else {
      const v = body.valore;
      if (typeof v === "string" && "t" in r) r.t = testo(v);
      else if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        for (const k of ["a", "b", "chi", "perche", "persona", "frase"]) if (k in r && k in o) r[k] = testo(o[k]);
      } else throw new HttpError(400, "Valore non valido.");
      r.o = "vera"; // le correzioni del cliente sono frasi vere
    }
    nuovo = r;
  } else throw new HttpError(404, "Riga non trovata.");
  if (lista) lista[Number(ultimo)] = nuovo;
  else if (oggetto) oggetto[ultimo] = nuovo;
}

export async function modifica(admin: SupabaseClient, m: RigaMappa, schede: RigaScheda[], body: BodyModifica): Promise<void> {
  const percorso = typeof body.percorso === "string" ? body.percorso : "";
  const pezzi = percorso.split(".");
  if (pezzi.length < 1 || pezzi.length > 4 || pezzi.some((p) => !/^([a-z_]{1,30}|\d{1,2})$/.test(p))) throw new HttpError(400, "Riga non valida.");
  const tornaBozza = m.stato === "rivista" ? { stato: "bozza" } : {};

  if (body.dove === "mappa") {
    const colonna = pezzi[0] as (typeof COLONNE_MAPPA)[number];
    if (!COLONNE_MAPPA.includes(colonna)) throw new HttpError(400, "Riga non valida.");
    const radice = { [colonna]: structuredClone((m as unknown as Record<string, unknown>)[colonna] ?? null) };
    applica(radice, pezzi, body);
    const pulita = pulisciMappa(radice) as Record<string, unknown>;
    const valore = pulita[colonna] ?? (Array.isArray(radice[colonna]) ? [] : null);
    const { error } = await admin.from("avatar_mappa").update({ [colonna]: valore, ...tornaBozza }).eq("id", m.id);
    if (error) throw error;
    return;
  }

  const scheda = schede.find((s) => s.ordine === Number(body.dove));
  if (!scheda) throw new HttpError(404, "Scheda non trovata.");
  if (pezzi[0] === "partenza") {
    const radice = { partenza: structuredClone(scheda.partenza) as Record<string, unknown> };
    applica(radice, pezzi, body);
    const { error } = await admin.from("avatar_scheda").update({ partenza: pulisciPartenza(radice.partenza) }).eq("id", scheda.id);
    if (error) throw error;
  } else {
    const radice = structuredClone(scheda.contenuto) as Record<string, unknown>;
    applica(radice, pezzi, body);
    // pulisciScheda butta le sezioni vuote: una sezione svuotata sparisce dalla scheda.
    const { error } = await admin.from("avatar_scheda").update({ contenuto: pulisciScheda(radice) }).eq("id", scheda.id);
    if (error) throw error;
  }
  if (tornaBozza.stato) await admin.from("avatar_mappa").update(tornaBozza).eq("id", m.id);
}
