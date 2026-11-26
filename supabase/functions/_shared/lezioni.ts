/**
 * Regole sul catalogo Skool (`lezioni`) che valgono per tutta Aura.
 *
 * 26/11/2026, Wesley: «quando c'è scritto nel modulo "livello" è una ricompensa, non
 * un modulo di lezioni». I corsi «Livello 5| …», «Livello 6| …», «Livello 7| …» sono
 * premi che il cliente sblocca salendo di livello nella community (un'analisi del
 * profilo, una content series fatta insieme, chiamate 1:1): non si «guardano», quindi
 * Aura non li propone mai come lezione da vedere.
 */

/** Un corso che è una ricompensa di livello, non lezioni («Livello 6| Ti costruiamo una content series»). */
export function eRicompensa(corso: string | null | undefined): boolean {
  return /^\s*livello\s*\d+/i.test(corso ?? "");
}
