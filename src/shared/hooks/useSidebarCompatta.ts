import { createContext, useCallback, useContext, useEffect, useState } from "react";

const CHIAVE = "losauthority:sidebar-compatta";

function leggiSalvata(): boolean {
  try {
    return localStorage.getItem(CHIAVE) === "1";
  } catch {
    return false;
  }
}

/**
 * La sidebar può ridursi a una colonna di sole icone («Nascondi la barra»): la scelta
 * si ricorda per browser in localStorage (una comodità per chi guarda, non un dato).
 */
export function useSidebarCompatta(): [compatta: boolean, cambia: () => void] {
  const [compatta, setCompatta] = useState(leggiSalvata);

  useEffect(() => {
    try {
      localStorage.setItem(CHIAVE, compatta ? "1" : "0");
    } catch {
      // Storage non disponibile (navigazione privata…): la scelta vale solo per questa pagina.
    }
  }, [compatta]);

  const cambia = useCallback(() => setCompatta((c) => !c), []);
  return [compatta, cambia];
}

/**
 * true dentro la sidebar ridotta a icone: lo fornisce `SidebarSeto`, lo leggono voci, titoli di
 * sezione e piede utente per disegnarsi compatti. Fuori dalla sidebar (menu ☰) vale false.
 */
export const SidebarCompattaContext = createContext(false);

export function useSidebarCompattaAttiva(): boolean {
  return useContext(SidebarCompattaContext);
}
