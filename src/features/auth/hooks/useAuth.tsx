import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logDev } from "@/shared/utils/errors";
import { chiudiSessioneGestionaleSalvata } from "../accountPersonale";
import type { Rol, UtenteCorrente } from "../types";

interface AuthContextValue {
  session: Session | null;
  utente: UtenteCorrente | null;
  /** true finché non sappiamo se c'è una sessione e quale ruolo ha. */
  caricamento: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function caricaUtente(session: Session): Promise<UtenteCorrente | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("id, email, nombre, rol")
    .eq("id", session.user.id)
    .maybeSingle();
  if (error) {
    logDev(error);
    return null;
  }
  if (!data) return null;
  const rol = data.rol as Rol;
  return { id: data.id, email: data.email, nombre: data.nombre, rol, accountPersonale: rol === "cliente" ? await eAccountPersonale(data.id) : false };
}

/** L'account cliente del team («Wesley ME»)? Senza la colonna (prima della migrazione 68) è no. */
async function eAccountPersonale(id: string): Promise<boolean> {
  const { data, error } = await supabase.from("clienti").select("account_personale").eq("id", id).maybeSingle();
  if (error) {
    logDev(error);
    return false;
  }
  return data?.account_personale === true;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [utente, setUtente] = useState<UtenteCorrente | null>(null);
  const [caricamento, setCaricamento] = useState(true);
  const queryClient = useQueryClient();
  /** Di chi è la sessione: se cambia (Wesley ME ↔ gestionale, anche da un'altra scheda) la cache si svuota. */
  const ultimoUtente = useRef<string | null>(null);

  useEffect(() => {
    let attivo = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!attivo) return;
      ultimoUtente.current = data.session?.user.id ?? null;
      setSession(data.session);
      setUtente(data.session ? await caricaUtente(data.session) : null);
      setCaricamento(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((evento, nuovaSessione) => {
      if (!attivo) return;
      setSession(nuovaSessione);
      if (evento === "SIGNED_OUT" || !nuovaSessione) {
        ultimoUtente.current = null;
        setUtente(null);
        queryClient.clear();
        return;
      }
      if (ultimoUtente.current && ultimoUtente.current !== nuovaSessione.user.id) {
        // Un altro account nello stesso browser: niente ruolo né dati del precedente finché non si ricarica il profilo.
        setUtente(null);
        queryClient.clear();
      }
      ultimoUtente.current = nuovaSessione.user.id;
      if (evento === "SIGNED_IN" || evento === "USER_UPDATED" || evento === "TOKEN_REFRESHED") {
        // setTimeout: mai chiamare Supabase dentro il callback di onAuthStateChange (deadlock).
        setTimeout(() => {
          void caricaUtente(nuovaSessione).then((u) => {
            if (attivo) setUtente(u);
          });
        }, 0);
      }
    });

    return () => {
      attivo = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  const accountPersonale = utente?.accountPersonale ?? false;
  const signOut = useCallback(async () => {
    // Se questo browser aveva messo da parte la sessione del gestionale (Passa a Wesley ME), si chiude anche quella.
    await chiudiSessioneGestionaleSalvata();
    // L'account personale lo usano più persone insieme: si esce solo da questo browser, senza buttare fuori gli altri.
    await supabase.auth.signOut(accountPersonale ? { scope: "local" } : undefined);
    setSession(null);
    setUtente(null);
    queryClient.clear();
  }, [queryClient, accountPersonale]);

  const value = useMemo(
    () => ({ session, utente, caricamento, signOut }),
    [session, utente, caricamento, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth va usato dentro <AuthProvider>");
  return ctx;
}
