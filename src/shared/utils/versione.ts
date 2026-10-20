/*
 * Nuova versione pubblicata (20/10/2026).
 *
 * Ogni build porta la sua versione dentro il codice (`__VERSIONE_APP__`, vite.config.ts) e pubblica
 * /version.json con la stessa stringa. Chi apre il sito dopo un deploy prende già la versione nuova;
 * una scheda rimasta aperta da prima no: confronta le due versioni (useNuovaVersione) e, se non
 * coincidono, il popup «AvvisoNuovaVersione» chiede di aggiornare. Lo stesso popup compare quando un
 * pezzo del codice del deploy precedente non esiste più (`vite:preloadError`, main.tsx).
 */

export const VERSIONE_APP: string = __VERSIONE_APP__;
export const EVENTO_NUOVA_VERSIONE = "losauthority:nuova-versione";

/** Parametro aggiunto all'indirizzo quando si aggiorna: niente copia vecchia della pagina. Si toglie all'avvio. */
const PARAMETRO = "_v";
const CHIAVE_TENTATIVI = "losauthority:aggiornamento";
/** Se dopo due aggiornamenti la versione non cambia (deploy a metà, cache ostinata), il popup non blocca più: niente giri infiniti. */
const MAX_TENTATIVI = 2;
/** Chiave dei tentativi quando non si conosce la versione nuova (pezzo di codice mancante). */
const SENZA_VERSIONE = "risorse";

let risorsaMancante = false;

interface Tentativi {
  versione: string;
  volte: number;
}

function leggiTentativi(): Tentativi | null {
  try {
    const grezzo = sessionStorage.getItem(CHIAVE_TENTATIVI);
    if (!grezzo) return null;
    const t = JSON.parse(grezzo) as Partial<Tentativi>;
    return typeof t.versione === "string" && typeof t.volte === "number" ? { versione: t.versione, volte: t.volte } : null;
  } catch {
    return null;
  }
}

/** La versione pubblicata adesso, o null se non si sa (rete, file assente: la SPA risponde con index.html). */
export async function versionePubblicata(): Promise<string | null> {
  try {
    const r = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!r.ok || !(r.headers.get("content-type") ?? "").includes("json")) return null;
    const dati = (await r.json()) as { versione?: unknown };
    return typeof dati.versione === "string" && dati.versione ? dati.versione : null;
  } catch {
    return null;
  }
}

/** Il popup per questa versione si può ancora mostrare (meno di due aggiornamenti andati a vuoto). */
export function puoMostrare(versione: string | null): boolean {
  const t = leggiTentativi();
  return !t || t.versione !== (versione ?? SENZA_VERSIONE) || t.volte < MAX_TENTATIVI;
}

/** La versione in uso è quella pubblicata: i tentativi si azzerano. */
export function aggiornamentoRiuscito(): void {
  try {
    sessionStorage.removeItem(CHIAVE_TENTATIVI);
  } catch {
    /* storage non disponibile */
  }
}

/** Un pezzo del codice non si carica più (main.tsx, `vite:preloadError`). Resta segnato anche se il popup non è ancora montato. */
export function segnalaNuovaVersione(): void {
  risorsaMancante = true;
  window.dispatchEvent(new Event(EVENTO_NUOVA_VERSIONE));
}

export function risorsaGiaSegnalata(): boolean {
  return risorsaMancante;
}

/** All'avvio (main.tsx): toglie ?_v= dall'indirizzo e, se si è arrivati alla versione chiesta, azzera i tentativi. */
export function dopoAggiornamento(): void {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has(PARAMETRO)) {
      url.searchParams.delete(PARAMETRO);
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
    if (leggiTentativi()?.versione === VERSIONE_APP) aggiornamentoRiuscito();
  } catch {
    /* indirizzo o storage non disponibili: niente da sistemare */
  }
}

/**
 * «Aggiorna ora»: svuota le cache che il sito può toccare (Cache Storage, service worker) e ricarica
 * la stessa pagina con ?_v=… nell'indirizzo, così il browser chiede l'HTML nuovo e non ne usa una copia.
 * La sessione resta: è nel localStorage.
 */
export async function aggiornaAllUltimaVersione(versione: string | null): Promise<void> {
  const chiave = versione ?? SENZA_VERSIONE;
  try {
    const t = leggiTentativi();
    sessionStorage.setItem(CHIAVE_TENTATIVI, JSON.stringify({ versione: chiave, volte: t?.versione === chiave ? t.volte + 1 : 1 } satisfies Tentativi));
  } catch {
    /* senza storage si ricarica lo stesso */
  }
  try {
    if ("caches" in window) {
      const nomi = await caches.keys();
      await Promise.all(nomi.map((nome) => caches.delete(nome)));
    }
    if ("serviceWorker" in navigator) {
      const registrazioni = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrazioni.map((r) => r.unregister()));
    }
  } catch {
    /* niente da svuotare */
  }
  const url = new URL(window.location.href);
  url.searchParams.set(PARAMETRO, versione ?? String(Date.now()));
  window.location.replace(url.toString());
}
