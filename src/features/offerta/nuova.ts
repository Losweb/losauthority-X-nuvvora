/**
 * Fase Offerta dal 26/11/2026: una offerta per cliente, due strade (versione
 * breve → la frase; scheda completa → sette fasi). La forma della scheda è la
 * stessa della Edge Function: `@offerta-forma/forma` (supabase/functions/_shared/offerta).
 */
import type { Offerta } from "./types";
import type { Criterio, Esito, Fermo, Leva, LevaValore, SchedaOfferta, Strada, Test } from "@offerta-forma/forma";

export type { Fermo, Origine, SchedaOfferta, Strada, Voce } from "@offerta-forma/forma";
export { FASI_COMPLETA, PASSI_BREVE } from "@offerta-forma/forma";

/** La riga `offerta` con le colonne nuove già tipizzate. */
export type OffertaNuova = Omit<Offerta, "scheda" | "fermo" | "strada"> & { scheda: SchedaOfferta; fermo: Fermo | null; strada: Strada | null };

export const asNuova = (o: Offerta): OffertaNuova => o as unknown as OffertaNuova;

export const ETICHETTA_TEST: Record<Test, string> = {
  una_frase: "Si capisce in una frase?",
  persona_precisa: "È per una persona in una situazione precisa?",
  risultato_tempo: "C'è un risultato che si vede e un tempo?",
  dieci_volte: "Vale almeno dieci volte il prezzo per chi compra?",
  consegnabile: "Si può consegnare con il tempo e le prove di oggi?",
  diversa: "È diversa da quella dei concorrenti?",
};
export const ETICHETTA_CRITERIO: Record<Criterio, string> = {
  dolore: "Dolore vero",
  soldi: "Ha i soldi",
  raggiunge: "Si raggiunge",
  cresce: "Il mercato cresce",
  credibilita: "La tua credibilità oggi",
};
export const ETICHETTA_LEVA: Record<Leva, string> = { dove: "Dove", quando: "Quando", come: "Come", per_chi: "Per chi", cosa_togli: "Cosa togli" };
export const ETICHETTA_VALORE: Record<LevaValore, string> = { risultato: "Risultato", probabilita: "Probabilità che funzioni", tempo: "Tempo", fatica: "Fatica" };
export const SIMBOLO_ESITO: Record<Esito, string> = { si: "✅", quasi: "⚠️", no: "❌" };
export const ETICHETTA_POSTO: Record<string, string> = { dentro: "Dentro", bonus: "Bonus", fuori: "Fuori" };
export const ETICHETTA_GRADINO: Record<string, string> = { entrata: "Entrata", cuore: "Cuore", premium: "Premium" };

/** Frasi di stato mentre Aura scrive. */
export const FASI_AURA_OFFERTA = [
  "Rileggo quello che hai già scritto…",
  "Guardo come fanno tutti nel tuo mercato…",
  "Scrivo la proposta…",
  "Controllo che la promessa regga…",
  "Ancora un attimo…",
] as const;

/** C'è qualcosa della scheda di prima (metodo vecchio)? Allora è «l'offerta che porti». */
export const haOffertaDiPrima = (o: Offerta) => !!(o.nome || o.trasformazione || o.prezzo || (o.stack?.length ?? 0) > 0);

/** La scheda nuova ha qualcosa da mostrare? */
export const schedaIniziata = (o: OffertaNuova) => !!o.frase || Object.keys(o.scheda ?? {}).length > 0;
