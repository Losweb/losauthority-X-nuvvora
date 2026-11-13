/** Cosa può fare Claude collegato con il server MCP (worker/mcp/strumenti.ts): stessi testi in consenso e pagina. */
export const COSA_PUO_FARE = [
  "vedere le schede dei tuoi video nel Workflow",
  "creare schede nuove",
  "modificarle: titolo, script, descrizione, link Drive, riferimenti, note, giorno e ora, tipologia",
  "spostarle di fase e segnare TikTok, Instagram e YouTube come programmati",
] as const;

export const COSA_NON_PUO_FARE = ["eliminare le schede", "vedere o toccare le altre sezioni della tua area"] as const;

/** Account del team (admin, staff): lavora sui Workflow di tutti i clienti, indicando ogni volta quale. */
export const COSA_PUO_FARE_TEAM = [
  "vedere l'elenco dei clienti e le schede del Workflow di ognuno",
  "creare schede nel Workflow del cliente che gli indichi",
  "modificarle: titolo, script, descrizione, link Drive, riferimenti, note, giorno e ora, tipologia",
  "spostarle di fase e segnare TikTok, Instagram e YouTube come programmati",
] as const;

export const COSA_NON_PUO_FARE_TEAM = ["eliminare le schede", "vedere o toccare le altre sezioni del gestionale"] as const;

/** Indirizzo del server MCP: lo stesso dominio del sito, quindi vale anche in locale. */
export function indirizzoMcp(): string {
  return `${window.location.origin}/mcp`;
}
