/**
 * Crediti di Aura al mese (27/11/2026, migrazione 083). 1 credito = 1 centesimo di costo
 * reale; base 1000 al mese (500 fino al 28/11/2026) + quelli aggiunti dal team; si ricaricano il 1° del mese.
 * Si controlla prima di chiamare Aura, accanto al limite orario. Il team non ha limiti.
 * Se il controllo stesso fallisce (database), si lascia passare: meglio una risposta in
 * più che un cliente bloccato per un errore nostro.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { HttpError } from "./http.ts";
import { logError } from "./log.ts";
import { esTeam, type Chiamante } from "./supabase.ts";

interface StatoCrediti {
  limite: number;
  usati: number;
  residui: number;
  ricarica: string;
  illimitato: boolean;
}

export function messaggioCreditiFiniti(ricarica: string): string {
  // La ricarica è sempre il primo del mese: «il 1° dicembre».
  const mese = new Date(`${ricarica}T12:00:00Z`).toLocaleDateString("it-IT", { month: "long", timeZone: "Europe/Rome" });
  return `Hai usato tutti i crediti di Aura di questo mese. Si ricaricano il 1° ${mese}. Se ti servono prima, scrivici.`;
}

export async function controllaCrediti(admin: SupabaseClient, c: Chiamante, funzione: string): Promise<void> {
  if (esTeam(c.rol)) return;
  const { data, error } = await admin.rpc("aura_crediti_stato", { p_user: c.id });
  if (error) {
    await logError(`${funzione}:crediti`, error, { user: c.id }, { silent: true });
    return;
  }
  const s = (Array.isArray(data) ? data[0] : data) as StatoCrediti | undefined;
  if (s && !s.illimitato && s.residui <= 0) throw new HttpError(402, messaggioCreditiFiniti(s.ricarica));
}
