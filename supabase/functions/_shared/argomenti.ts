/**
 * La mappa delle lezioni per argomenti (27/11/2026, tabelle `argomenti`,
 * `lezioni_argomenti`, `lezioni_indice`, migrazione 080). La scrive aura-argomenti,
 * la legge aura-coach: a ogni domanda il coach sceglie gli argomenti da un elenco
 * corto e riceve solo le lezioni collegate, con profondità e minuto.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type Profondita = "passo_passo" | "spiegazione" | "accenno";

export interface Argomento {
  id: string;
  nome: string;
  descrizione: string | null;
}

export interface VoceArgomento {
  lezione_id: string;
  argomento_id: string;
  inizio_sec: number | null;
  durata_min: number | null;
  profondita: Profondita;
  riassunto: string;
}

export const ETICHETTA_PROFONDITA: Record<Profondita, string> = {
  passo_passo: "PASSO PASSO (lo mostra e lo spiega a fondo)",
  spiegazione: "SPIEGAZIONE (lo spiega, senza mostrare tutti i passaggi)",
  accenno: "ACCENNO (ne parla di passaggio: non è un tutorial)",
};

export async function leggiArgomenti(admin: SupabaseClient): Promise<Argomento[]> {
  const { data, error } = await admin.from("argomenti").select("id, nome, descrizione").order("nome");
  if (error) throw error;
  return (data ?? []) as Argomento[];
}

/** L'elenco per il prompt: una riga per argomento, con il numero da usare per sceglierlo. */
export function elencoArgomenti(argomenti: Argomento[]): string {
  return argomenti.map((a, i) => `${i + 1}. ${a.nome}${a.descrizione ? ` — ${a.descrizione}` : ""}`).join("\n");
}

/** Le voci della mappa per questi argomenti. */
export async function vociPerArgomenti(admin: SupabaseClient, ids: string[]): Promise<VoceArgomento[]> {
  if (ids.length === 0) return [];
  const { data, error } = await admin
    .from("lezioni_argomenti")
    .select("lezione_id, argomento_id, inizio_sec, durata_min, profondita, riassunto")
    .in("argomento_id", ids);
  if (error) throw error;
  return (data ?? []) as VoceArgomento[];
}

/** Ordine di utilità: prima passo passo, poi spiegazione, poi accenno. */
export const PESO_PROFONDITA: Record<Profondita, number> = { passo_passo: 3, spiegazione: 2, accenno: 1 };
