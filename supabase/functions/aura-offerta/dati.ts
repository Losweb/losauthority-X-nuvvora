/**
 * Il blocco <dati>{…}</dati> che Aura chiude a ogni turno nella fase Offerta:
 * estrazione, pulizia (forma.ts) e salvataggio sulla riga `offerta`. Più lo
 * stato com'è ora in testo per il prompt e «l'offerta che porta» (le colonne
 * di prima, scritte con il metodo vecchio o vuote).
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { type Fermo, pulisciFermo, pulisciScheda, type SchedaOfferta, voce } from "../_shared/offerta/forma.ts";
import { logError } from "../_shared/log.ts";
import { notifyTelegram } from "../_shared/telegram.ts";

export type RigaOfferta = Record<string, unknown> & {
  id: string;
  cliente_id: string;
  strada: string | null;
  scheda: SchedaOfferta;
  fermo: Fermo | null;
  frase: string | null;
};

export interface DatiTurno {
  passo?: number;
  tipo?: "servizio" | "prodotto";
  brand?: string;
  frase?: { t: string; o: "vera" | "ipotesi" };
  fraseApprovata: boolean;
  /** undefined = non toccato; null = si riparte. */
  fermo?: Fermo | null;
  fine: boolean;
  scheda: SchedaOfferta;
}

export type MotivoDati = "ok" | "nessun_blocco" | "json_invalido";

export function estraiDati(testo: string): { risposta: string; dati: DatiTurno; motivo: MotivoDati; grezzo: string } {
  const vuoti: DatiTurno = { fraseApprovata: false, fine: false, scheda: {} };
  const pulisci = (t: string) => t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#{1,6}\s+/gm, "").trim();
  const apre = testo.indexOf("<dati>");
  if (apre === -1) return { risposta: pulisci(testo), dati: vuoti, motivo: "nessun_blocco", grezzo: "" };
  const chiude = testo.indexOf("</dati>", apre);
  const grezzo = chiude > apre ? testo.slice(apre + 6, chiude) : testo.slice(apre + 6);
  const risposta = pulisci(`${testo.slice(0, apre)}\n${chiude > apre ? testo.slice(chiude + 7) : ""}`);
  const a = grezzo.indexOf("{");
  const b = grezzo.lastIndexOf("}");
  let j: Record<string, unknown>;
  try {
    if (a === -1 || b <= a) throw new Error("niente JSON");
    j = JSON.parse(grezzo.slice(a, b + 1));
  } catch {
    return { risposta, dati: vuoti, motivo: "json_invalido", grezzo };
  }
  const d: DatiTurno = { fraseApprovata: j.frase_approvata === true, fine: j.fine === true, scheda: pulisciScheda(j.scheda) };
  const p = Number(j.passo);
  if (Number.isInteger(p) && p >= 0 && p <= 7) d.passo = p;
  if (j.tipo === "servizio" || j.tipo === "prodotto") d.tipo = j.tipo;
  if (typeof j.brand === "string" && j.brand.trim()) d.brand = j.brand.trim().slice(0, 120);
  const f = voce(j.frase);
  if (f) d.frase = { t: f.t.slice(0, 500), o: f.o };
  if ("fermo" in j) d.fermo = j.fermo === null ? null : pulisciFermo(j.fermo) ?? undefined;
  return { risposta, dati: d, motivo: "ok", grezzo };
}

/** Le colonne della scheda di prima (metodo vecchio): sono «l'offerta che porta». */
const VECCHIE = [
  ["nome", "Nome"], ["per_chi", "Per chi"], ["trasformazione", "Trasformazione"], ["prezzo", "Prezzo"], ["tipo", "Cos'è"],
  ["frase_presentazione", "Come si presenta"], ["snapshot", "In breve"], ["stack", "Cosa contiene"], ["incluso", "Incluso"],
  ["scala_entrata", "Gradino d'entrata"], ["scala_cuore", "Offerta cuore"], ["scala_vetta", "Gradino alto"], ["garanzia", "Garanzia"],
  ["bonus", "Bonus"], ["obiezioni_risposte", "Obiezioni"], ["clienti_attuali", "Clienti attuali"],
] as const;

export function renderOffertaAttuale(o: RigaOfferta, offertaOnboarding: string | null): string {
  const righe = VECCHIE.map(([k, etichetta]) => {
    const v = o[k];
    if (Array.isArray(v) && v.length > 0) return `${etichetta}: ${(v as string[]).join(" · ")}`;
    return typeof v === "string" && v.trim() ? `${etichetta}: ${v}` : null;
  }).filter((r): r is string => !!r);
  const parti: string[] = [];
  if (righe.length > 0) parti.push(`Scritta prima sul sito con Aura:\n${righe.join("\n")}`);
  if (offertaOnboarding?.trim()) parti.push(`Dall'onboarding (cosa vende oggi e a quanto): ${offertaOnboarding.trim()}`);
  return parti.length > 0 ? parti.join("\n\n") : "(nessuna: parte da zero)";
}

export function renderStato(o: RigaOfferta): string {
  return JSON.stringify({
    strada: o.strada,
    passo: o.passo ?? null,
    tipo: o.tipo_vendita ?? null,
    brand: o.brand ?? null,
    frase: o.frase ? { t: o.frase, o: o.frase_origine, approvata_il: o.frase_il ?? null } : null,
    fermo: o.fermo ?? null,
    scheda: o.scheda ?? {},
  });
}

/** Scrive il turno. Gli errori si loggano e non fanno perdere la risposta. */
export async function applicaDati(admin: SupabaseClient, o: RigaOfferta, d: DatiTurno, nomeCliente: string): Promise<void> {
  const update: Record<string, unknown> = { avatar_letto_il: new Date().toISOString() };
  if (d.passo !== undefined) update.passo = d.passo;
  if (d.tipo) update.tipo_vendita = d.tipo;
  if (d.brand) update.brand = d.brand;
  if (d.frase) {
    update.frase = d.frase.t;
    update.frase_origine = d.fraseApprovata ? "vera" : d.frase.o;
    if (d.fraseApprovata || d.frase.t !== o.frase) update.frase_il = d.fraseApprovata ? new Date().toISOString() : null;
  } else if (d.fraseApprovata && o.frase) {
    update.frase_origine = "vera";
    update.frase_il = new Date().toISOString();
  }
  if (Object.keys(d.scheda).length > 0) update.scheda = { ...(o.scheda ?? {}), ...d.scheda };
  if (d.fine) update[o.strada === "completa" ? "completa_fatta_il" : "breve_fatta_il"] = new Date().toISOString();
  if (d.fermo !== undefined) {
    update.fermo = d.fermo;
    update.fermo_il = d.fermo ? new Date().toISOString() : null;
  }
  const { error } = await admin.from("offerta").update(update).eq("id", o.id);
  if (error) {
    await logError("aura-offerta:update", error, { offerta: o.id, campi: Object.keys(update) }, { silent: true });
    return;
  }
  // Un «Fermo» nuovo avvisa il team: non basta un campo salvato (domanda aperta del documento).
  if (d.fermo && JSON.stringify(d.fermo) !== JSON.stringify(o.fermo ?? null)) {
    await notifyTelegram(`⛔️ Offerta ferma · ${nomeCliente}\nCosa: ${d.fermo.cosa}\nPerché conta: ${d.fermo.perche}\nPer ripartire: ${d.fermo.ripartire}`).catch(() => {});
  }
}
