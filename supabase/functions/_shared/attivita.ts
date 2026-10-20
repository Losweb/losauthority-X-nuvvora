/**
 * Registro delle attività del team (tabella `attivita_team`, migrazione 66).
 * Le Edge Functions che agiscono col service role PER CONTO di un membro del team
 * (contratti-admin, gestione-utenti) scrivono qui la riga, perché i trigger delle
 * tabelle non vedono chi è il chiamante (auth.uid() è nullo col service role).
 * Non lancia mai: il registro non deve bloccare l'operazione vera.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { Chiamante } from "./supabase.ts";

export interface Attivita {
  /** Chiave breve: contratto_pagato, cliente_creato… */
  azione: string;
  /** La frase senza il nome: «ha segnato come pagato il contratto di «Mario Rossi»». */
  descrizione: string;
  entita?: string;
  entita_id?: string | null;
  cliente_id?: string | null;
}

export async function registraAttivita(admin: SupabaseClient, chi: Chiamante, a: Attivita): Promise<void> {
  try {
    await admin.from("attivita_team").insert({
      utente_id: chi.id,
      utente_nome: chi.nombre?.trim() || chi.email,
      azione: a.azione.slice(0, 60),
      descrizione: a.descrizione.slice(0, 300),
      entita: a.entita ?? null,
      entita_id: a.entita_id ?? null,
      cliente_id: a.cliente_id ?? null,
    });
  } catch (err) {
    console.error("[attivita]", err instanceof Error ? err.message : err);
  }
}
