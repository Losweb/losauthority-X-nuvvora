import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logDev } from "@/shared/utils/errors";

/** L'account cliente del team («Wesley ME»): la riga clienti con account_personale (migrazione 68). */
export interface AccountPersonale {
  id: string;
  nome: string;
  email: string;
}

export const CHIAVE_ACCOUNT_PERSONALE = ["auth", "account-personale"] as const;

/**
 * Per il team: quale cliente è l'account personale. Serve al bottone «Passa a …» e a togliere
 * l'account dai contatori. Senza flag (o prima della migrazione 68) restituisce null e il bottone non c'è.
 */
export function useAccountPersonale(abilitato = true) {
  return useQuery({
    queryKey: CHIAVE_ACCOUNT_PERSONALE,
    enabled: abilitato,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<AccountPersonale | null> => {
      const { data, error } = await supabase
        .from("clienti")
        .select("id, user_roles!clienti_id_fkey(nombre, email)")
        .eq("account_personale", true)
        .maybeSingle();
      if (error) {
        logDev(error);
        return null;
      }
      if (!data) return null;
      return { id: data.id, nome: data.user_roles?.nombre || "Wesley ME", email: data.user_roles?.email ?? "" };
    },
  });
}
