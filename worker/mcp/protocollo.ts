import { definizioniStrumenti, eseguiStrumento, type Contesto } from "./strumenti";

/**
 * MCP su HTTP «streamable», nella forma più semplice ammessa dalla specifica: senza sessioni
 * e senza stream SSE. Ogni POST porta un messaggio JSON-RPC e riceve la risposta in JSON;
 * le notifiche ricevono 202. Niente librerie: il protocollo che serve qui sono quattro metodi.
 */

export const VERSIONI_PROTOCOLLO = ["2025-06-18", "2025-03-26", "2024-11-05"] as const;

export const INFO_SERVER = { name: "wesleycaicedo-workflow", title: "Workflow · Wesley Caicedo", version: "1.0.0" };

const ISTRUZIONI = [
  "Questo server gestisce il Workflow dei video del cliente su upscales.wesleycaicedo.com: una scheda per ogni video.",
  "Fasi, in ordine: fase_script → da_registrare → da_editare → pronto_upload → pubblicato.",
  "Una scheda ha: titolo, fase, tipologia (vedi elenca_tipologie), giorno e ora previsti di pubblicazione (ora italiana),",
  "script, descrizione (didascalia, hashtag, contesto), link Drive, riferimenti, note e lo stato di programmazione",
  "su TikTok, Instagram e YouTube (da_programmare | programmato).",
  "Prima di creare una scheda nuova, cerca con elenca_contenuti se esiste già (stesso titolo o stessa data) e aggiorna quella.",
  "Le schede non si possono eliminare da qui: se serve, il cliente lo fa dal sito.",
].join(" ");

const ISTRUZIONI_TEAM =
  " Sei collegato con un account del team (admin o staff): vedi i Workflow di tutti i clienti. " +
  "Per elencare, creare e leggere le tipologie indica sempre il cliente nel campo `cliente` (nome, email o id): " +
  "se non è chiaro quale, usa elenca_clienti e chiedi conferma all'utente prima di scrivere.";

type IdJsonRpc = string | number | null;

interface Messaggio {
  jsonrpc?: string;
  id?: IdJsonRpc;
  method?: string;
  params?: Record<string, unknown>;
}

export type Risposta = { jsonrpc: "2.0"; id: IdJsonRpc } & ({ result: unknown } | { error: { code: number; message: string } });

/** Il contesto arriva solo dopo l'autenticazione; `rifiuto` è il motivo per cui gli strumenti non sono usabili. */
export interface Sessione {
  contesto: Contesto | null;
  rifiuto?: string;
}

function eTeam(sessione: Sessione): boolean {
  return sessione.contesto !== null && sessione.contesto.clienteFisso === null;
}

function errore(id: IdJsonRpc, code: number, message: string): Risposta {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

/** Gestisce un messaggio; null per le notifiche (nessuna risposta). */
export async function gestisciMessaggio(m: Messaggio, sessione: Sessione): Promise<Risposta | null> {
  if (!m || typeof m !== "object" || m.jsonrpc !== "2.0" || typeof m.method !== "string") {
    return errore(m?.id ?? null, -32600, "Richiesta JSON-RPC non valida");
  }
  const notifica = m.id === undefined;
  if (notifica) return null;
  const id = m.id ?? null;

  switch (m.method) {
    case "initialize": {
      const richiesta = typeof m.params?.protocolVersion === "string" ? m.params.protocolVersion : "";
      const versione = (VERSIONI_PROTOCOLLO as readonly string[]).includes(richiesta) ? richiesta : VERSIONI_PROTOCOLLO[0];
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: versione,
          capabilities: { tools: { listChanged: false } },
          serverInfo: INFO_SERVER,
          instructions: eTeam(sessione) ? ISTRUZIONI + ISTRUZIONI_TEAM : ISTRUZIONI,
        },
      };
    }
    case "ping":
      return { jsonrpc: "2.0", id, result: {} };
    case "tools/list":
      return { jsonrpc: "2.0", id, result: { tools: definizioniStrumenti(eTeam(sessione)) } };
    case "tools/call": {
      const nome = typeof m.params?.name === "string" ? m.params.name : "";
      if (!sessione.contesto) {
        return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: sessione.rifiuto ?? "Accesso non consentito." }], isError: true } };
      }
      try {
        const esito = await eseguiStrumento(nome, m.params?.arguments, sessione.contesto);
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: esito.testo }],
            ...(esito.dati && !esito.errore ? { structuredContent: esito.dati } : {}),
            isError: !!esito.errore,
          },
        };
      } catch (e) {
        console.error("mcp tools/call", nome, e);
        return {
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: "Errore del Workflow, riprova tra poco." }], isError: true },
        };
      }
    }
    // Il server non offre risorse né prompt: liste vuote invece di un errore, per i client che le chiedono comunque.
    case "resources/list":
      return { jsonrpc: "2.0", id, result: { resources: [] } };
    case "resources/templates/list":
      return { jsonrpc: "2.0", id, result: { resourceTemplates: [] } };
    case "prompts/list":
      return { jsonrpc: "2.0", id, result: { prompts: [] } };
    default:
      return errore(id, -32601, `Metodo non supportato: ${m.method}`);
  }
}

/** Corpo di un POST: un messaggio o (versioni vecchie del protocollo) un elenco. */
export async function gestisciCorpo(corpo: unknown, sessione: Sessione): Promise<Risposta | Risposta[] | null> {
  if (Array.isArray(corpo)) {
    if (corpo.length === 0) return errore(null, -32600, "Elenco vuoto");
    const risposte = (await Promise.all(corpo.map((m) => gestisciMessaggio(m as Messaggio, sessione)))).filter(
      (r): r is Risposta => r !== null,
    );
    return risposte.length ? risposte : null;
  }
  return gestisciMessaggio(corpo as Messaggio, sessione);
}
