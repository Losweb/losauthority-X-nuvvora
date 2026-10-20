import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { invocaEdge } from "@/shared/utils/invocaEdge";

/*
 * «Passa a Wesley ME» / «Torna al gestionale» (20/10/2026).
 *
 * Il team apre l'account personale (clienti.account_personale, migrazione 68) senza password:
 * gestione-utenti genera un accesso di un solo uso e il browser lo scambia con una sessione.
 * Prima di cambiare, la sessione del gestionale si mette da parte in QUESTO browser (stesso
 * localStorage dove Supabase tiene già la sessione) e non si chiude sul server: «Torna al
 * gestionale» la riprende. Senza quella sessione salvata non c'è ritorno, quindi chi entra in
 * Wesley ME con la sua password non arriva al gestionale.
 */

const CHIAVE = "losauthority:sessione-gestionale";
const URL_AUTH = `${import.meta.env.VITE_SUPABASE_URL as string}/auth/v1`;
const CHIAVE_PUBBLICA = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const TIPI_OTP: ReadonlyArray<EmailOtpType> = ["magiclink", "email"];

interface Token {
  access_token: string;
  refresh_token: string;
}

export interface SessioneGestionale extends Token {
  utente_id: string;
  /** Chi l'ha messa da parte: compare nel bottone «Torna al gestionale». */
  nome: string;
}

export type EsitoRitorno = "ok" | "scaduta" | "nessuna";

export function sessioneGestionaleSalvata(): SessioneGestionale | null {
  try {
    const grezza = localStorage.getItem(CHIAVE);
    if (!grezza) return null;
    const s = JSON.parse(grezza) as Partial<SessioneGestionale>;
    if (typeof s.access_token !== "string" || typeof s.refresh_token !== "string") return null;
    return { access_token: s.access_token, refresh_token: s.refresh_token, utente_id: String(s.utente_id ?? ""), nome: String(s.nome ?? "") };
  } catch {
    return null;
  }
}

function dimentica(): void {
  try {
    localStorage.removeItem(CHIAVE);
  } catch {
    /* storage non disponibile: non c'è niente da togliere */
  }
}

/** Il JWT scade entro 30 secondi (o non si legge). */
function scaduto(jwt: string): boolean {
  try {
    const parte = (jwt.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(parte)) as { exp?: number };
    return !exp || exp * 1000 < Date.now() + 30_000;
  } catch {
    return true;
  }
}

/**
 * Chiude sul server una sessione di cui abbiamo i token, senza toccare quella in uso nel browser.
 * Con l'access token scaduto ne chiede prima uno nuovo col refresh token (stessa sessione).
 */
async function chiudiSessione(t: Token): Promise<void> {
  try {
    let token = t.access_token;
    if (scaduto(token)) {
      const r = await fetch(`${URL_AUTH}/token?grant_type=refresh_token`, {
        method: "POST",
        headers: { apikey: CHIAVE_PUBBLICA, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: t.refresh_token }),
      });
      // Refresh token già non valido: la sessione è chiusa.
      if (!r.ok) return;
      token = ((await r.json()) as { access_token?: string }).access_token ?? "";
      if (!token) return;
    }
    await fetch(`${URL_AUTH}/logout?scope=local`, { method: "POST", headers: { apikey: CHIAVE_PUBBLICA, Authorization: `Bearer ${token}` } });
  } catch {
    /* rete: in questo browser i token non ci sono più, sul server la sessione resta orfana */
  }
}

/** «Passa a Wesley ME»: mette da parte la sessione del team e apre quella dell'account personale. */
export async function entraNellAccountPersonale(nome: string): Promise<void> {
  const { token_hash, tipo } = await invocaEdge<{ token_hash: string; tipo: string }>("gestione-utenti", { azione: "accedi_account_personale" });
  // La sessione si legge solo adesso: se durante la chiamata è partito un refresh, il refresh token è cambiato.
  const { data } = await supabase.auth.getSession();
  const s = data.session;
  if (!s) throw new Error("Sessione del gestionale non trovata.");
  // Se il browser non riesce a salvarla non si cambia account: senza non si potrebbe tornare.
  localStorage.setItem(CHIAVE, JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, utente_id: s.user.id, nome } satisfies SessioneGestionale));
  const tipoOtp = TIPI_OTP.find((t) => t === tipo) ?? "magiclink";
  const { error } = await supabase.auth.verifyOtp({ token_hash, type: tipoOtp });
  if (error) {
    dimentica();
    throw error;
  }
}

/** «Torna al gestionale»: riprende la sessione del team e chiude quella dell'account personale di questo browser. */
export async function tornaAlGestionale(): Promise<EsitoRitorno> {
  const salvata = sessioneGestionaleSalvata();
  if (!salvata) return "nessuna";
  dimentica();
  const { data } = await supabase.auth.getSession();
  const personale: Token | null = data.session ? { access_token: data.session.access_token, refresh_token: data.session.refresh_token } : null;
  const { error } = await supabase.auth.setSession({ access_token: salvata.access_token, refresh_token: salvata.refresh_token });
  if (error) {
    // La sessione del gestionale non vale più (scaduta o chiusa da un'altra parte): si esce del tutto.
    await supabase.auth.signOut({ scope: "local" });
    return "scaduta";
  }
  if (personale) await chiudiSessione(personale);
  return "ok";
}

/**
 * Uscendo dall'account personale aperto dal gestionale si chiude anche la sessione del team messa
 * da parte: su un computer condiviso non deve restare un passaggio verso il gestionale.
 */
export async function chiudiSessioneGestionaleSalvata(): Promise<void> {
  const salvata = sessioneGestionaleSalvata();
  if (!salvata) return;
  dimentica();
  await chiudiSessione(salvata);
}
