import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { dopoAggiornamento, segnalaNuovaVersione } from "@/shared/utils/versione";

// Si arriva da «Aggiorna ora»: via ?_v= dall'indirizzo prima che lo legga il router.
dopoAggiornamento();

/**
 * Dopo un nuovo deploy i chunk vecchi non esistono più: una scheda aperta da prima fallisce al primo
 * cambio di pagina. Vite lo segnala con `vite:preloadError`: invece della pagina rotta, il popup
 * «C'è una nuova versione» (AvvisoNuovaVersione). In sviluppo l'errore resta visibile.
 */
window.addEventListener("vite:preloadError", (evento) => {
  if (import.meta.env.DEV) return;
  evento.preventDefault();
  segnalaNuovaVersione();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
