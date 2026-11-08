import type { CSSProperties } from "react";

/*
 * Il colore di una tipologia è un dato scelto dall'utente (hex `#rrggbb`, vincolo in DB), quindi
 * in UI va inline. Si usa PIENO (sfondo della pillola, barra della chip) e come TINTA leggera
 * (sfondo della chip nel calendario), così in un giorno con tante card le tipologie si
 * riconoscono a colpo d'occhio.
 */

/** Testo leggibile sopra un colore pieno: inchiostro sui colori chiari, bianco su quelli scuri. */
export function testoSu(colore: string): string {
  const r = parseInt(colore.slice(1, 3), 16);
  const g = parseInt(colore.slice(3, 5), 16);
  const b = parseInt(colore.slice(5, 7), 16);
  const luminanza = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminanza > 160 ? "var(--ink)" : "var(--primary-foreground)";
}

/** Sfondo pieno del colore della tipologia e testo in contrasto. */
export function stilePieno(colore: string): CSSProperties {
  return { backgroundColor: colore, color: testoSu(colore) };
}

/** Tinta leggera dello stesso colore (sfondo e bordo di una card): l'alfa si aggiunge in coda all'hex. */
export function stileTinta(colore: string): CSSProperties {
  return { backgroundColor: `${colore}1f`, borderColor: `${colore}80` };
}
