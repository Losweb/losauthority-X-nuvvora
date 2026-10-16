/**
 * Porta in cima la pagina. Da md scorre il <main> della finestra Seto (`data-scroll-principale`),
 * sul telefono la finestra del browser: `window.scrollTo` da solo non basterebbe più.
 */
export function scorriInCima(): void {
  document.querySelector<HTMLElement>("[data-scroll-principale]")?.scrollTo({ top: 0 });
  window.scrollTo({ top: 0 });
}
