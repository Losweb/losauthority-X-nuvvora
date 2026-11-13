import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logDev, MESSAGGIO_ERRORE_GENERICO } from "@/shared/utils/errors";

/**
 * OAuth 2.1 di Supabase Auth (server MCP del Workflow, docs/mcp-workflow.md): la pagina di
 * consenso legge la richiesta e la approva o la rifiuta; la pagina «Collega Claude» elenca
 * le app collegate e le scollega.
 */

export const chiaviClaude = {
  richiesta: (id: string) => ["oauth", "richiesta", id] as const,
  collegamenti: ["oauth", "collegamenti"] as const,
};

/** La richiesta di accesso (chi la fa, per quale account) o, se già consentita, l'indirizzo a cui tornare. */
export function useRichiestaAccesso(authorizationId: string) {
  return useQuery({
    queryKey: chiaviClaude.richiesta(authorizationId),
    enabled: authorizationId.length > 0,
    retry: false,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
      if (error) throw error;
      return data;
    },
  });
}

/** Consenti o rifiuta: Supabase restituisce l'indirizzo di Claude a cui mandare il browser. */
export function useDecisioneAccesso(authorizationId: string) {
  return useMutation({
    mutationFn: async (consenti: boolean) => {
      const { data, error } = consenti
        ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
        : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });
      if (error) throw error;
      return data.redirect_url;
    },
    onSuccess: (indirizzo) => {
      window.location.assign(indirizzo);
    },
    onError: (error) => {
      toast.error("Non è stato possibile completare il collegamento", { description: MESSAGGIO_ERRORE_GENERICO });
      logDev(error);
    },
  });
}

/** Le app (Claude) che l'utente ha collegato al suo account. */
export function useCollegamenti() {
  return useQuery({
    queryKey: chiaviClaude.collegamenti,
    queryFn: async () => {
      const { data, error } = await supabase.auth.oauth.listGrants();
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Scollega un'app: i suoi token smettono di funzionare subito. */
export function useScollega() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase.auth.oauth.revokeGrant({ clientId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Collegamento rimosso");
      void queryClient.invalidateQueries({ queryKey: chiaviClaude.collegamenti });
    },
    onError: (error) => {
      toast.error("Non è stato possibile scollegare", { description: MESSAGGIO_ERRORE_GENERICO });
      logDev(error);
    },
  });
}
