import type { Tables } from "@/integrations/supabase/types";

export type Sessione = Tables<"idee_sessioni">;
export type Messaggio = Tables<"idee_messaggi">;
export type Idea = Tables<"idee">;
/** Pagina "Stili": un format che Aura ha imparato dagli script del cliente e che riusa in Crea idee. */
export type Stile = Tables<"stili">;

/** `idee_messaggi.errore` quando il cliente ferma Aura con il tasto stop (lo scrive aura-idee). */
export const ERRORE_FERMATA = "Fermata";

export type StatoIdea = "proposta" | "salvata" | "usata" | "scartata";

export const ETICHETTA_STATO_IDEA: Record<StatoIdea, string> = {
  proposta: "Proposta",
  salvata: "Salvata",
  usata: "Nel Workflow",
  scartata: "Scartata",
};

export function eStatoIdea(v: string): v is StatoIdea {
  return v === "proposta" || v === "salvata" || v === "usata" || v === "scartata";
}

export type StatoStile = "in_corso" | "pronta" | "errore";

export function eStatoStile(v: string): v is StatoStile {
  return v === "in_corso" || v === "pronta" || v === "errore";
}

/** Massimo di script che si possono incollare per uno stile (stesso limite del DB). */
export const MAX_SCRIPT_STILE = 10;

/** Link alla pagina "Crea idee" con lo stile già agganciato al composer. */
export const linkCreaIdee = (stileId: string) => `/area/crea-idee?stile=${stileId}`;

/** Spunti per la schermata vuota: un clic li mette nel composer. */
export const SPUNTI = [
  "Un video che insegna una cosa pratica sul problema più grande dei miei clienti",
  "Un video di connessione: come lavoro e perché lo faccio così",
  "Un contenuto di vendita per la mia offerta principale, senza sembrare uno spot",
  "Proponimi una content series che posso ripetere ogni settimana",
] as const;
