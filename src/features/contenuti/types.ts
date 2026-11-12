import type { Tables } from "@/integrations/supabase/types";

/** Pipeline del Workflow: l'ordine delle chiavi è l'ordine delle colonne. */
export const STATO_CONTENUTO_KEYS = ["fase_script", "da_registrare", "da_editare", "pronto_upload", "pubblicato"] as const;
export type StatoContenuto = (typeof STATO_CONTENUTO_KEYS)[number];

export const ETICHETTA_STATO_CONTENUTO: Record<StatoContenuto, string> = {
  fase_script: "Fase script",
  da_registrare: "Da registrare",
  da_editare: "Da editare",
  pronto_upload: "Pronti per l'upload",
  pubblicato: "Pubblicato",
};

/**
 * Colore minimo per fase (solo token del design system): grigio per l'idea,
 * poi ocra → argilla → inchiostro → salvia quando è pubblicato.
 */
export const COLORE_STATO_CONTENUTO: Record<StatoContenuto, { punto: string; bordo: string }> = {
  fase_script: { punto: "bg-muted-foreground/60", bordo: "border-t-muted-foreground/40" },
  da_registrare: { punto: "bg-status-expiring", bordo: "border-t-status-expiring" },
  da_editare: { punto: "bg-status-churn", bordo: "border-t-status-churn" },
  pronto_upload: { punto: "bg-foreground", bordo: "border-t-foreground" },
  pubblicato: { punto: "bg-status-active", bordo: "border-t-status-active" },
};

/**
 * Le quattro tipologie con cui Aura classifica le IDEE (`idee.tipologia`, prompt di aura-idee).
 * Nel Workflow le tipologie sono righe di `tipologie_contenuto` (le predefinite più quelle
 * dell'utente): quando un'idea passa nel Workflow, la sua tipologia diventa la predefinita
 * corrispondente (`CHIAVE_PER_TIPOLOGIA_IDEA`).
 */
export const TIPOLOGIA_CONTENUTO_KEYS = ["virale", "consolidazione", "vendita", "content_series"] as const;
export type TipologiaContenuto = (typeof TIPOLOGIA_CONTENUTO_KEYS)[number];

type TonoBadge = "active" | "expiring" | "churn" | "neutral" | "outline";

export const TIPOLOGIE_CONTENUTO: Record<TipologiaContenuto, { label: string; tono: TonoBadge }> = {
  virale: { label: "Contenuto virale", tono: "expiring" },
  consolidazione: { label: "Contenuto di consolidazione", tono: "neutral" },
  vendita: { label: "Contenuto di vendita", tono: "active" },
  content_series: { label: "Content series", tono: "outline" },
};

/** Chiavi stabili delle tipologie predefinite (`tipologie_contenuto.chiave`). */
export const CHIAVI_TIPOLOGIA_PREDEFINITA = ["valore", "intrattenimento", "connessione", "vendita"] as const;
export type ChiaveTipologia = (typeof CHIAVI_TIPOLOGIA_PREDEFINITA)[number];

/** Da tipologia di un'idea di Aura alla predefinita del Workflow. */
export const CHIAVE_PER_TIPOLOGIA_IDEA: Record<TipologiaContenuto, ChiaveTipologia> = {
  virale: "intrattenimento",
  consolidazione: "valore",
  vendita: "vendita",
  content_series: "connessione",
};

export type Contenuto = Tables<"contenuti">;

/** Una tipologia del Workflow: predefinita (uguale per tutti, `creato_da` null) o creata dall'utente, con il suo colore. */
export type Tipologia = Tables<"tipologie_contenuto">;

/** Massimo di tipologie proprie per utente (lo stesso numero del trigger in DB). */
export const MAX_TIPOLOGIE = 30;

/** Colore di partenza di una tipologia nuova (l'inchiostro `--action`): l'utente lo cambia dal selettore. */
export const COLORE_TIPOLOGIA_NUOVA = "#0f1921";

/** Campi che il form scrive (il resto lo mettono la base e gli hook). */
export type ContenutoDati = Pick<
  Contenuto,
  "titolo" | "stato" | "tipologia_id" | "pubblicazione_prevista" | "ora_prevista" | "pubblicato_il" | "drive_url" | "note" | "script" | "descrizione" | "riferimenti"
>;

/** L'ora prevista come «18:30» (il DB la restituisce «18:30:00»), o null se non c'è. */
export function oraBreve(ora: string | null | undefined): string | null {
  return ora ? ora.slice(0, 5) : null;
}

/** Ordine dentro un giorno: prima i contenuti con l'ora, dal più presto; poi quelli senza. */
export function perOra(a: Contenuto, b: Contenuto): number {
  if (a.ora_prevista && b.ora_prevista) return a.ora_prevista.localeCompare(b.ora_prevista);
  if (a.ora_prevista) return -1;
  if (b.ora_prevista) return 1;
  return 0;
}

/** Con cosa nasce un contenuto creato dal calendario: il giorno toccato e la fase di partenza (script o video). */
export interface ContenutoPredefiniti {
  stato?: StatoContenuto;
  /** "YYYY-MM-DD" */
  pubblicazione_prevista?: string;
}

export function eStatoContenuto(valore: string): valore is StatoContenuto {
  return (STATO_CONTENUTO_KEYS as ReadonlyArray<string>).includes(valore);
}

export function eTipologiaContenuto(valore: string | null): valore is TipologiaContenuto {
  return valore !== null && (TIPOLOGIA_CONTENUTO_KEYS as ReadonlyArray<string>).includes(valore);
}

/** Mappa id → tipologia, per risolvere `contenuti.tipologia_id` in card e calendario. */
export function mappaTipologie(lista: Tipologia[] | undefined): Map<string, Tipologia> {
  return new Map((lista ?? []).map((t) => [t.id, t]));
}
