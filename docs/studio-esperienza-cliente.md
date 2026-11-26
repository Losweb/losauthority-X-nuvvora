# Studio dell'esperienza del cliente — 26/11/2026

Fatto entrando nel sito in locale come il cliente di prova «Prova Avatar» (onboarding inviato, mappa Avatar chiusa, offerta in corso), su computer e a 375 px. Viste: Dashboard, Cervello, Avatar, Offerta, Stili, Crea idee, Workflow, Pubblicazioni, Clienti, Wesley Coach.

## Cosa ho trovato

1. **La prima pagina è vuota.** La Dashboard dice «Il piano d'azione arriva dopo la prima call» e basta. Un cliente appena entrato non sa cosa fare. Intanto Avatar e Offerta, che può fare da solo, non sono nominate.
2. **Il menu non segue il metodo.** Ordine del menu: Dashboard, Stili, Crea idee, Workflow, Pubblicazioni, Clienti, Wesley Coach, Collega Claude, e in fondo la card «Cervello». Ordine del metodo: frase dell'offerta → Avatar → scheda Offerta → contenuti → numeri → clienti. Le fondamenta sono l'ultima cosa che si vede.
3. **Il Cervello non ha ordine né stato.** Quattro card uguali (Avatar, Offerta, Competitors, Kit Brand). Avatar viene prima di Offerta, ma il metodo parte dalla frase dell'offerta. Nessuna card dice «fatto», «in corso», «inizia da qui».
4. **Ci sono due piani che non si parlano.** Il piano d'azione (tappe scritte dopo la call) e le fasi con Aura (frase, avatar, offerta). Il cliente non ha un posto solo dove vedere «dove sono».
5. **Alla fine di una fase non c'è il passo dopo.** Chiusa la mappa Avatar, niente porta alla scheda Offerta. (Dalla frase all'Avatar il rimando c'è, l'ho messo io.)
6. **Gli strumenti dei contenuti non usano le fondamenta.** `aura-idee` (Crea idee) non legge né la mappa Avatar né la frase dell'offerta. Il lavoro fatto su avatar e offerta non arriva agli script.
7. **Tutto è aperto dal primo giorno, con lo stesso peso.** Stili, Crea idee, Workflow funzionano anche senza avatar: il cliente può saltare le fondamenta senza accorgersene.
8. **Parole.** «Dashboard», «Workflow», «Competitors», «Kit Brand» in un percorso che chiede ad Aura di non usare inglese. La scheda del browser dice «Los Authority · Gestionale» anche al cliente.
9. **Difetto nella pagina Offerta nuova.** Nella scheda completa senza frase compare «La frase arriva alla fine della versione breve», che lì non è vero.
10. **Clienti si apre con un muro legale** (tre caselle) prima di spiegare a cosa serve.

Cosa funziona già bene: le pagine Avatar e Offerta (chat + mappa, passi, origini), Crea idee e Wesley Coach (domanda chiara, esempi pronti), il calendario.

## Proposte, in ordine di effetto

### A. «Il tuo percorso» al posto della Dashboard
Una mappa sola, in alto in ogni accesso, con le tappe in ordine e lo stato di ognuna:

1. Onboarding · 2. La tua frase · 3. Il tuo avatar · 4. La tua offerta · 5. I primi contenuti · 6. Pubblica e misura · 7. I clienti

- Un solo bottone grande: «Continua da qui» sulla tappa corrente.
- Sotto ogni tappa fatta, il risultato in una riga (la frase, il nome dell'avatar principale, il prezzo del cuore).
- Le tappe scritte da Wesley dopo la call entrano nella stessa mappa, sotto la tappa a cui appartengono.
- Gli stati esistono già nei dati (`offerta.breve_fatta_il`, `avatar_mappa.passo`, `offerta.completa_fatta_il`, stili, contenuti, Instagram collegato): non serve Aura.

### B. Menu in tre gruppi, nell'ordine del metodo
- **Fondamenta:** Offerta, Avatar, Concorrenti, Marca
- **Contenuti:** Idee, Stili, Calendario
- **Risultati:** Numeri, Clienti
- In fondo: Wesley Coach, Collega Claude.
Un puntino di stato accanto alle voci delle fondamenta.

### C. Il passo dopo, sempre
Una striscia alla fine di ogni fase: Avatar chiuso → «Ora la tua offerta completa»; offerta chiusa → «Ora il primo video per [avatar]».

### D. Gli strumenti leggono le fondamenta
- Crea idee riceve frase, avatar principale e la sezione «Su cosa parlare» della scheda: le prime proposte nascono da lì.
- Nel Calendario ogni video dice a quale partenza parla, e si vede la proporzione proposta nella mappa.
- Senza avatar, Idee/Stili/Calendario restano aperti ma con un avviso: «Rendono di più dopo l'avatar».

### E. Cervello con ordine e stato
Card numerate (1 Offerta: la frase, 2 Avatar, 3 Offerta completa, poi Concorrenti e Marca), ognuna con stato e riassunto.

### F. Piccole cose
Parole in italiano, titolo della scheda del browser, il difetto della frase, due righe sul perché prima delle caselle legali in Clienti.

## Ordine consigliato
Primo giro: A + B + C + F (solo interfaccia, nessun cambio ad Aura). Secondo giro: D (tocca `aura-idee` e il Calendario). E viene quasi gratis con A.

---

# Seconda parte — benvenuto e onboarding (giro da cliente nuovo)

Rifatto da zero con il cliente di prova: benvenuto → scheda → lettura di Aura → domande di chiarimento. Mi sono fermato prima di «Confermo» per non far partire l'avviso Telegram al team. Percorso provato: servizi, privati, clienti continui, pubblica ogni tanto = 38 domande, di cui 17 a testo lungo e obbligatorie.

## Cosa ho trovato

1. **Il video di benvenuto è ancora un segnaposto.** È la prima cosa che vede chi ha appena pagato.
2. **Le tre caselle legali arrivano al secondo schermo** e parlano della «sezione Clienti», che il cliente non ha ancora visto. Le stesse caselle esistono già dentro la pagina Clienti.
3. **Instagram viene chiesto due volte:** nel benvenuto e poi nella domanda C1 («Link ai tuoi profili»).
4. **Nessuna stima all'inizio.** «Sei domande veloci» è vero solo per il primo blocco: poi ne arrivano altre 32. Non c'è scritto quanto dura.
5. **Il nome viene richiesto** anche se il sito lo sa già (saluta «Ciao Prova» una schermata prima).
6. **Ogni blocco è un modulo lungo**, con tante caselle di testo obbligatorie una sotto l'altra. È il punto in cui si sente di più il «questionario».
7. **La lettura di Aura dura circa 80 secondi**, poi arrivano fino a 3 domande in più, poi un'altra lettura. Le domande di Aura sono buone e precise.
8. **Una domanda è ambigua e Aura ha dovuto richiederla:** «Quanti clienti al mese riusciresti a seguire» (A8). Va riscritta.
9. **Dopo l'invio si atterra sulla Dashboard vuota** (vedi prima parte).

## Le domande: quali servono

Criterio: una domanda resta nell'onboarding se serve PRIMA della prima call o per scrivere la frase dell'offerta. Il resto lo può chiedere Aura nel momento in cui serve, come già fa nelle fasi Avatar e Offerta.

| Domande | Giudizio | Perché |
| --- | --- | --- |
| 0.2-0.6 cosa fai, tipo, a chi vendi, clienti, social | Restano | Decidono il percorso e le usano tutti gli agenti |
| 0.1 nome | Precompilata | Il sito lo sa già |
| A2 cosa vendi e a quanto, A5 fatturato, A9 prove | Restano | Base di offerta e fotografia |
| B1 canali, B2 cliente migliore, B5 messaggi, B6 obiezioni | Restano | Sono il cuore dell'avatar: le frasi vere vengono da qui |
| B3 chi compra, B4 anti-cliente | Restano | Un tocco la prima, breve la seconda |
| C5 dove si blocca, C8 contenuti migliori, C2 agio in camera | Restano | Servono a Wesley per la call |
| F1 obiettivo, F4 perché ora, F5 disponibilità call | Restano | Servono a Wesley per la call |
| A1 «racconta il tuo lavoro in 2 minuti» | Facoltativa | Ripete 0.2 e A2; oggi è obbligatoria e lunga |
| A6 ultimo cliente chiuso + quanti comprano su 10, A7 quanto restano | Dopo, nella fase Offerta | Servono per prezzo e gradini, non prima |
| A8 capacità | Dopo, riscritta | Ambigua; e alla fase Offerta servono le ore, che oggi non si chiedono |
| C1 link profili | Via | Doppione del passo Instagram |
| C6 «perché i social non ti portano risultati», C7 frequenza | Facoltative | Opinione la prima; la seconda si legge da Instagram |
| D1 ore sui social, D2 attività pesanti, D3 non delegabile | Dopo o via | Nessuno strumento le usa per nome; D3 non serve a niente oggi |
| E1 strumenti IA, E2 abbonamenti, E3 dispositivo | Una domanda sola | Servono solo a capire il livello: «Usi già l'IA? Mai / ogni tanto / sempre» |
| F2 cosa vuoi saper fare, F3 cosa evitare | Facoltative | Utili ma non bloccanti |
| F6 come hai conosciuto Wesley, F7 perché Wesley | Facoltative | Servono a Wesley, non al percorso del cliente; oggi obbligatorie |

Risultato sul percorso provato: da 38 domande a circa 20, e da 17 testi lunghi obbligatori a 7.

Attenzione: le domande sono il documento di Wesley del 02/10 e alimentano la «fotografia» che Wesley legge prima della call (fase economica, urgenza, livello IA). Tagliare vuol dire avere una fotografia un po' più magra alla prima call: è una scelta di Wesley, non tecnica.

## Proposte per l'onboarding

- **G. Onboarding in due tempi.** Subito l'essenziale (circa 20 domande, 10 minuti dichiarati all'inizio). Il resto lo chiede Aura dentro la fase che lo usa.
- **H. Benvenuto più corto.** Video vero; caselle legali spostate al primo accesso alla pagina Clienti; Instagram chiesto una volta sola.
- **I. Una promessa all'inizio e una alla fine.** All'inizio: «10 minuti, 20 domande, puoi fermarti». Alla fine: non la pagina vuota ma «Il tuo percorso» con la tappa 1 spuntata.
- **J. Meno modulo.** Dove si può, tocchi al posto di testo (già fatto bene in molte domande); le facoltative chiuse dietro «Aggiungi se vuoi».
