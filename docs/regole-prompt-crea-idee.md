# Regole per lavorare sul prompt di «Crea idee»

Queste istruzioni sono per Claude quando aiuta Wesley a migliorare le risposte di Aura nella pagina **Crea idee** dell'area cliente. Leggile tutte prima di fare qualsiasi cosa.

## Il tuo ruolo

Aiuti Wesley a scrivere meglio il **metodo** che Aura segue per proporre idee di contenuti. Lavori sul testo, non sul sistema. Il sistema (codice, database, deploy) lo gestisce Nuvvora, che applica le tue modifiche in modo versionato.

## Come funziona oggi il prompt di Aura

Ogni risposta di Aura in Crea idee nasce da quattro pezzi, in quest'ordine:

1. **System prompt** (codice, file `supabase/functions/aura-idee/prompt.ts`): chi è Aura, in che formato deve rispondere, i limiti. **Non si tocca.**
2. **Metodo di Wesley** (database, tabella `aura_conoscenza`, ambito `idee`): blocchi di testo che entrano interi nel prompt con il titolo «METODO DI WESLEY (usa SOLO questo)». **Questo è il tuo campo di lavoro.** Oggi sono tre blocchi:
   - ordine 1 · «Struttura di un video breve» (hook, sviluppo, chiusura)
   - ordine 2 · «Le quattro tipologie di contenuto» (virale, consolidazione, vendita, content series)
   - ordine 3 · «Regole per proporre idee»
3. **Dati del cliente** (automatici): scheda onboarding, analisi di Aura, kit brand, stile scelto con «/», idee già proposte, video che hanno funzionato meglio.
4. **Conversazione** (automatica): gli ultimi 12 messaggi della sessione e il nuovo messaggio.

Aura risponde con 2-4 frasi parlate e poi un blocco `<idee>` in JSON con al massimo tre proposte. Ogni proposta ha: `titolo`, `hook`, `script` (parlato, 100-160 parole), `tipologia` (uno dei quattro valori: `virale`, `consolidazione`, `vendita`, `content_series`). Il codice legge quel blocco e crea le card. Se il formato cambia, le card non compaiono.

## Problemi noti da risolvere (21/10/2026)

- Aura propone **sempre tre tipologie diverse** anche quando il cliente chiede una cosa precisa (es. «video parlati in camera sui dolori»). Causa: il metodo dice «diverse tra loro (angolo o tipologia)» e nessuna regola dice che la richiesta del cliente fissa la tipologia. Il metodo deve dire chiaramente: la richiesta comanda; se il cliente chiede una tipologia o un formato, tutte le idee lo seguono e cambia solo l'angolo.
- Aura **rifiuta i caroselli** e tutto ciò che non è video parlato. Il system prompt oggi parla solo di video brevi: per i caroselli serve una modifica di codice (campo «formato»), che fa Nuvvora. Tu puoi già scrivere il blocco del metodo «Struttura di un carosello» (copertina = hook, 5-8 slide, ultima slide = chiusura), così è pronto quando il codice lo supporta.
- Aura non vede nel dialogo le idee che ha già proposto nella stessa sessione (riceve solo gli ultimi 15 titoli di tutto l'account): tende a ripetere gli stessi angoli. È una modifica di codice, non di metodo: segnalala, non provare a risolverla con il testo.
- Aura non rispetta il numero di idee chiesto («altre», «una sola», «cinque»). Il metodo può dire: proponi il numero che il cliente chiede, fino a tre; se non lo dice, da una a tre.

## Cosa puoi fare

- Leggere e riscrivere il testo dei blocchi del metodo (ambito `idee`).
- Proporre blocchi nuovi (es. «Struttura di un carosello», «Come scegliere l'angolo», «Hook che funzionano per Wesley»). Ogni blocco ha un `titolo`, un `ordine` e un `contenuto` in testo semplice.
- Leggere i dati reali per capire cosa riceve Aura: scheda onboarding, avatar, offerte, idee già proposte, sessioni di Crea idee. Solo in lettura.
- Provare un prompt nuovo in chat: incolla il system prompt (così com'è), il metodo riscritto e un esempio di dati cliente, poi simula le richieste che oggi vanno male (una tipologia precisa, caroselli, «altre tre», «più corto»). Giudica le risposte con i criteri di Wesley.
- Consegnare il risultato come **testo**: un file markdown con i blocchi finali (titolo, ordine, contenuto) e due righe su cosa è cambiato e perché. Nuvvora lo mette in una migrazione e lo applica.

## Cosa NON devi fare

- **Nessuna scrittura sul database di produzione.** Niente `insert`, `update`, `delete`, `alter`, `drop`, niente `apply_migration`, niente `execute_sql` che modifichi dati. Se il tuo MCP Supabase permette di scrivere, chiedi a Wesley di configurarlo in sola lettura prima di continuare (vedi sotto).
- **Niente deploy** di Edge Functions e nessuna modifica ai secrets.
- **Niente codice**: non toccare `supabase/functions/`, `src/`, `supabase/migrations/`, `vite.config.ts` e nessun altro file del repository. Niente `git commit` e niente `git push`: un push su `main` pubblica il sito in automatico e apre un popup di aggiornamento a tutti gli utenti collegati.
- **Non cambiare il contratto di risposta**: i tag `<idee>` e `</idee>`, i nomi dei campi (`titolo`, `hook`, `script`, `tipologia`), i quattro valori della tipologia, il massimo di tre idee, lo script parlato senza titoli ed elenchi. Il metodo può dire COME scegliere e COME scrivere, non in che formato rispondere.
- **Non inventare campi nuovi** (es. `formato`, `piattaforma`, `durata`): servono modifiche di codice e di tabelle. Scrivi nel documento finale cosa servirebbe e Nuvvora lo valuta.
- Non toccare gli altri ambiti di `aura_conoscenza` (`avatar`, `offerta`, `generale`): sono metodi di altre pagine, ognuno con il suo contratto.
- Non eliminare né rinominare i blocchi esistenti: se uno va in pensione, scrivi «disattivare» accanto al titolo e Nuvvora lo mette `attivo = false`.
- Non leggere e non copiare file `.env`, chiavi, password o dati personali dei clienti nei documenti che produci. Per gli esempi usa l'account «Wesley ME» o dati inventati.

## Vincoli di scrittura del metodo

- Testo semplice, italiano, voce di Wesley: diretto, concreto, zero fuffa. Niente markdown pesante: titoli con `##` e righe con `-` vanno bene, niente tabelle.
- Il metodo intero entra in ogni chiamata (con prompt caching, quindi il costo di un testo lungo è basso): resta comunque sotto le 2.500 parole in totale, Aura segue meglio poche regole chiare che molte.
- Ogni regola deve essere verificabile leggendo la risposta di Aura («tutte le idee seguono la tipologia chiesta», «lo script apre con il problema dello spettatore»). Evita «sii creativo» e simili.
- Quando una regola del metodo contraddice il system prompt, vince il system prompt: non scrivere regole che vanno contro il formato.

## Configurare il MCP Supabase in sola lettura

Prima di collegare Claude al progetto, Wesley imposta il server MCP in sola lettura:

- MCP remoto: nell'indirizzo del server aggiungere `read_only=true`, es. `https://mcp.supabase.com/mcp?project_ref=tcvftvvbheacsjbadtfg&read_only=true`
- MCP locale (`npx @supabase/mcp-server-supabase`): aggiungere il flag `--read-only`

In sola lettura `execute_sql` esegue solo `select`; `apply_migration`, `deploy_edge_function` e le scritture vengono rifiutate.

## Come consegnare

Un file markdown con:

1. I blocchi finali del metodo, ognuno con `titolo`, `ordine`, `contenuto`.
2. Per ogni blocco cambiato: cosa cambia e quale problema risolve.
3. Le richieste che hai usato per provare e come ha risposto Aura (basta un riassunto).
4. Un elenco «serve codice» con quello che non si risolve col testo (caroselli, memoria delle idee della sessione, ecc.).

Nuvvora applica i blocchi con una migrazione, ridistribuisce la funzione se serve e aggiorna la documentazione.
