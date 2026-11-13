import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/integrations/supabase/types";
import { gestisciCorpo, type Sessione } from "./mcp/protocollo";

/** Ruoli del team (come `RUOLI_TEAM` del frontend, senza importare React). */
const RUOLI_TEAM = ["admin", "staff", "staff_fatture"];

/**
 * Worker del sito (upscales.wesleycaicedo.com). Tutto il resto lo servono gli static assets
 * (SPA, wrangler.jsonc); qui passano solo le rotte in `assets.run_worker_first`:
 *   /mcp                                   → server MCP del Workflow (Claude del cliente)
 *   /.well-known/oauth-protected-resource  → dove Claude scopre il server OAuth (Supabase Auth)
 * L'accesso è OAuth 2.1 di Supabase Auth: Claude riceve un token dell'utente dopo la pagina di
 * consenso /oauth/consent, e il server lo usa così com'è, quindi vale la RLS come nell'app.
 * Account cliente → il suo Workflow; account del team → tutti, indicando il cliente a ogni chiamata.
 * Guida: docs/mcp-workflow.md
 */

interface Env {
  ASSETS: { fetch: (richiesta: Request) => Promise<Response> };
}

// Stessi valori pubblici del frontend (Vite li scrive nel bundle anche per il Worker).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const EMITTENTE = `${SUPABASE_URL}/auth/v1`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
  "Access-Control-Max-Age": "86400",
};

/** Client per verificare i token (chiavi pubbliche JWKS in cache nell'isolate). */
const verificatore = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

function json(dati: unknown, stato = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(dati), {
    status: stato,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS, ...extra },
  });
}

function metadatiRisorsa(origine: string) {
  return {
    resource: `${origine}/mcp`,
    authorization_servers: [EMITTENTE],
    bearer_methods_supported: ["header"],
    scopes_supported: ["email"],
    resource_name: "Workflow · Wesley Caicedo",
    resource_documentation: `${origine}/area/claude`,
  };
}

function nonAutorizzato(origine: string, motivo?: string): Response {
  const parti = [`resource_metadata="${origine}/.well-known/oauth-protected-resource/mcp"`];
  if (motivo) parti.push(`error="invalid_token"`, `error_description="${motivo}"`);
  return json(
    { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Serve l'accesso: collega Claude al tuo account." } },
    401,
    { "WWW-Authenticate": `Bearer ${parti.join(", ")}` },
  );
}

/** Token valido (firma, emittente, scadenza) → sessione con il client del cliente; altrimenti null. */
async function sessioneDa(token: string, origine: string): Promise<Sessione | null> {
  let claims;
  try {
    // Firma con le chiavi pubbliche (JWKS) e scadenza; un token malformato lancia invece di restituire l'errore.
    const { data, error } = await verificatore.auth.getClaims(token);
    if (error) return null;
    claims = data?.claims;
  } catch {
    return null;
  }
  if (!claims || claims.iss !== EMITTENTE || claims.role !== "authenticated" || !claims.sub) return null;

  const db = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: ruolo, error: erroreRuolo } = await db.from("user_roles").select("rol").eq("id", claims.sub).maybeSingle();
  if (erroreRuolo) throw erroreRuolo;
  const rol = ruolo?.rol;
  if (rol === "cliente") return { contesto: { db, utenteId: claims.sub, clienteFisso: claims.sub, sito: origine } };
  // Team (admin, staff, staff + finance): tutti i Workflow, il cliente si indica a ogni chiamata.
  if (rol && RUOLI_TEAM.includes(rol)) return { contesto: { db, utenteId: claims.sub, clienteFisso: null, sito: origine } };
  return { contesto: null, rifiuto: "Questo account non ha un ruolo valido per il Workflow." };
}

async function gestisciMcp(richiesta: Request, origine: string): Promise<Response> {
  if (richiesta.method !== "POST") {
    // Niente stream SSE né sessioni: il client lavora solo con POST.
    return json({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "Usa POST" } }, 405, { Allow: "POST, OPTIONS" });
  }
  const auth = richiesta.headers.get("Authorization") ?? "";
  const token = /^Bearer\s+(.+)$/i.exec(auth)?.[1]?.trim();
  if (!token) return nonAutorizzato(origine);

  const sessione = await sessioneDa(token, origine);
  if (!sessione) return nonAutorizzato(origine, "Token scaduto o non valido");

  let corpo: unknown;
  try {
    corpo = await richiesta.json();
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON non valido" } }, 400);
  }
  const risposta = await gestisciCorpo(corpo, sessione);
  return risposta === null ? new Response(null, { status: 202, headers: CORS }) : json(risposta);
}

export default {
  async fetch(richiesta: Request, env: Env): Promise<Response> {
    const url = new URL(richiesta.url);
    const origine = url.origin;

    if (url.pathname === "/mcp" || url.pathname.startsWith("/.well-known/oauth-protected-resource")) {
      if (richiesta.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
      if (url.pathname === "/mcp") {
        try {
          return await gestisciMcp(richiesta, origine);
        } catch (e) {
          console.error("mcp", e);
          return json({ jsonrpc: "2.0", id: null, error: { code: -32603, message: "Errore interno" } }, 500);
        }
      }
      return json(metadatiRisorsa(origine));
    }
    return env.ASSETS.fetch(richiesta);
  },
};
