# Server MCP del Workflow («Collega Claude»)

Dal 13/11/2026 ogni cliente può collegare il **suo** Claude (piano a pagamento) al proprio Workflow,
e anche admin e staff possono collegare il loro e lavorare sui Workflow di tutti i clienti:
Claude legge, crea e aggiorna le schede dei video (titolo, fase, tipologia, giorno e ora, script,
descrizione, link Drive, riferimenti, note, programmazione TikTok/Instagram/YouTube). Non può eliminarle.

## Come è fatto

```
Claude ──POST /mcp (Bearer)──▶ Worker Cloudflare (worker/index.ts) ──token del cliente──▶ Supabase (RLS)
   │                                   │
   │ 401 + WWW-Authenticate            └─ /.well-known/oauth-protected-resource[/mcp] → server OAuth = Supabase Auth
   ▼
Supabase Auth OAuth 2.1 (registrazione dinamica, PKCE) ──▶ /oauth/consent (ConsensoPage) ──▶ Consenti/Rifiuta
```

- **Worker**: `worker/index.ts`. `wrangler.jsonc` ha `main` e `assets.run_worker_first` solo per `/mcp` e
  `/.well-known/oauth-protected-resource*`; tutto il resto lo servono gli assets come prima (SPA).
  Il build del plugin Cloudflare ora scrive `dist/client` (assets) e `dist/losauthority_x_nuvvora` (Worker).
  URL e anon key di Supabase arrivano dalle stesse `VITE_*` del frontend (scritte nel bundle del Worker).
- **Protocollo**: `worker/mcp/protocollo.ts`, MCP «streamable HTTP» senza sessioni né SSE: un POST, una risposta
  JSON (notifiche → 202). Versioni 2025-06-18, 2025-03-26, 2024-11-05. Nessuna libreria MCP.
- **Strumenti**: `worker/mcp/strumenti.ts` — `elenca_tipologie`, `elenca_contenuti`, `leggi_contenuto`,
  `crea_contenuto`, `aggiorna_contenuto` e, solo per il team, `elenca_clienti`. Gli account del team passano
  `cliente` (nome, email o id; con omonimi l'errore elenca i candidati) a elenca/crea/tipologie; leggi e aggiorna
  lavorano per id. Agli account cliente lo schema non mostra né `cliente` né `elenca_clienti`. Schemi Zod → JSON Schema (`z.toJSONSchema`), stesse regole del form
  (`STATO_CONTENUTO_KEYS`, `STATI_PROGRAMMAZIONE`, `MAX_RIFERIMENTI` importati da `features/contenuti`).
  Tipologia per nome o id; senza giorno niente ora; cambio di fase → in coda alla colonna come nell'app.
- **Accesso**: il token è un JWT di Supabase Auth (ES256) verificato con `auth.getClaims` (JWKS) + `iss`;
  il server lo usa così com'è, quindi vale la RLS di `contenuti`/`tipologie_contenuto`. Ruolo `cliente` → il suo
  Workflow (`clienteFisso`); ruoli del team (admin, staff, staff_fatture) → tutti, `creato_da` = chi è collegato.
  Le tipologie offerte sono sempre le predefinite più quelle del cliente scelto.
  Nota: i token OAuth di Supabase hanno gli stessi permessi di una sessione normale (niente scope personalizzati);
  li tiene solo il client MCP (Claude), che li usa solo verso `/mcp`.
- **Frontend**: `features/claude` — `/oauth/consent` (fuori dalle shell, `ProtectedRoute` che ora riporta anche la
  query dopo il login; testi diversi per il team) e «Collega Claude» in `/area/claude` (cliente) e `/claude` (team) (indirizzo da copiare, istruzioni per claude.ai e
  Claude Code, collegamenti attivi con «Scollega» via `auth.oauth.listGrants/revokeGrant`).

## Impostazioni di Supabase (dashboard)

Authentication → **OAuth Server**: abilitato, *Authorization Path* `/oauth/consent`, **Allow Dynamic OAuth Apps**
attivo. Authentication → URL Configuration: *Site URL* `https://upscales.wesleycaicedo.com` (la pagina di consenso
è Site URL + path). Le app registrate da Claude si vedono in Authentication → OAuth Apps.

## Provare

- Senza token: `curl -i -X POST https://upscales.wesleycaicedo.com/mcp` → 401 con `WWW-Authenticate: Bearer resource_metadata=…`.
- Metadati: `https://upscales.wesleycaicedo.com/.well-known/oauth-protected-resource/mcp`.
- Server OAuth: `https://tcvftvvbheacsjbadtfg.supabase.co/.well-known/oauth-authorization-server/auth/v1`.
- Claude Code: `claude mcp add --transport http workflow-wesley https://upscales.wesleycaicedo.com/mcp`, poi `/mcp`.
