-- 20261017000064_crm_documenti_v2.sql
-- Sezione «Clienti» (CRM del cliente): versione 2 dei tre documenti legali.
-- La versione 1 (migrazione 0036) conteneva BOZZE con punti «[Da completare.]»:
-- limitazioni di responsabilità, sospensione, foro, elenco dei fornitori,
-- sicurezza, informativa. Qui i testi completi, pubblicati con la funzione
-- prevista (private.crm_pubblica_versione), bozza = false.
--
-- Preavviso: la funzione pretende 30 giorni se qualcuno ha già accettato una
-- versione. Al 17/10/2026 le 5 accettazioni della v1 sono tutte account di
-- prova (team e demo), quindi il preavviso si azzera solo per questa
-- pubblicazione e si rimette a 30 subito dopo: i clienti nuovi vedono i testi
-- completi da subito nel benvenuto; gli account di prova li riaccettano.
--
-- Dati del Fornitore: supabase/functions/_shared/contratti/fornitore.ts.
-- I giorni citati nei testi (30 di preavviso, 30 per la cancellazione) sono
-- quelli di public.crm_impostazioni: se cambiano, va pubblicata una versione.

update public.crm_impostazioni set giorni_preavviso = 0 where id;

select private.crm_pubblica_versione(
  p_efficace_dal => now(),
  p_sintesi_modifiche => 'Testi definitivi: completate le clausole su responsabilità, sospensione dell''account, foro competente, fornitori, sicurezza e conservazione dei dati.',
  p_bozza => false,
  p_termini_titolo => 'Termini d''uso della sezione Clienti',
  p_termini_testo => $t$Versione 2 · in vigore dal 17 ottobre 2026

Fornitore: Wesley Josuè Caicedo Luque, via Alfredo Soffredini 65, 20126 Milano (MI), P.IVA 03705400129, email caicedodigital@gmail.com, PEC losamigosyt@pec.it (nel testo «Wesley Caicedo» o «noi»). Tu sei l'utente dell'area clienti di wesleycaicedo.com (nel testo «tu»).

1. A cosa serve la sezione Clienti
La sezione Clienti ti permette di segnare le persone che ti contattano, da dove arrivano, a che punto siete e quante ne chiudi. Fa parte dell'area clienti ed è disponibile per tutto il tempo in cui hai accesso all'area clienti.

2. Cosa puoi scrivere
Solo i dati che ti servono per seguire i tuoi contatti: nome, canale di provenienza, data di arrivo, stato, valore della vendita, telefono o email. Non scrivere dati sulla salute, sulla religione, sulle opinioni politiche o altri dati sensibili, né dati di persone che non ti hanno mai contattato (per esempio liste acquistate). Sei tu a garantire di avere il diritto di inserire quei dati e di aver informato i tuoi contatti su come li usi.

3. I dati dei tuoi contatti sono tuoi
Sei tu il titolare dei dati dei tuoi contatti: decidi tu cosa scrivere e perché, e sei tu che devi informare i tuoi contatti su come usi i loro dati. Wesley Caicedo li custodisce solo per far funzionare questa sezione, come responsabile del trattamento (vedi l'Accordo sul trattamento dei dati). Puoi esportarli in ogni momento con il pulsante «Esporta i miei contatti (CSV)» e cancellarli uno per uno dalla scheda del contatto.

4. Limitazioni di responsabilità
a) La sezione Clienti è uno strumento di supporto al percorso: non sostituisce la tua contabilità, i tuoi archivi né gli obblighi di legge che hai verso i tuoi contatti (informativa, registro dei trattamenti, risposta alle loro richieste).
b) Facciamo il possibile perché la sezione sia sempre disponibile, ma può essere interrotta o rallentata per manutenzione, aggiornamenti o cause fuori dal nostro controllo (fornitori, rete, forza maggiore). Non rispondiamo dei danni dovuti a queste interruzioni.
c) I numeri che vedi (contatti arrivati, chiusi, percentuale, valore) sono calcolati su quello che scrivi tu. Non rispondiamo delle decisioni commerciali che prendi sulla loro base.
d) Ti consigliamo di esportare periodicamente i tuoi contatti. Non rispondiamo della perdita di dati che non dipenda da nostro dolo o colpa grave.
e) In ogni caso, la nostra responsabilità per i danni collegati alla sezione Clienti è limitata ai casi di dolo o colpa grave (art. 1229 del Codice civile). Restano ferme le responsabilità che la legge non permette di limitare e, se usi la sezione come consumatore, le tutele del Codice del consumo (d.lgs. 206/2005).

5. Sospensione dell'account
a) Possiamo sospendere il tuo accesso alla sezione Clienti, dopo averti avvisato via email, se: usi la sezione in modo contrario a questi Termini o alla legge (per esempio inserisci dati sensibili o dati di persone che non ti hanno mai contattato); l'uso che ne fai mette a rischio la sicurezza o il funzionamento del servizio per gli altri utenti; non rispetti il contratto del percorso. Nei casi urgenti (sicurezza, richiesta di un'autorità) possiamo sospendere subito e avvisarti dopo.
b) Durante la sospensione i tuoi contatti restano salvati e intatti e puoi sempre esportarli: la sospensione tocca solo la possibilità di usare la sezione.
c) Se il motivo della sospensione non si risolve entro 30 giorni dall'avviso possiamo chiudere l'accesso alla sezione. In quel caso i dati dei tuoi contatti vengono cancellati con i tempi dell'Accordo sul trattamento dei dati (punto 6), dopo averti dato la possibilità di esportarli.
d) L'accesso alla sezione finisce comunque quando finisce il tuo accesso all'area clienti.

6. Modifiche ai Termini
Quando i documenti cambiano te lo diciamo nella sezione almeno 30 giorni prima, indicando cosa cambia e da quando. Dalla data indicata la sezione ti chiede di accettarli di nuovo; nel frattempo i tuoi contatti restano salvati e puoi sempre esportarli. Se non accetti la versione nuova puoi continuare a esportare e cancellare i tuoi contatti, ma non a usare il resto della sezione.

7. Legge applicabile e foro competente
Questi Termini sono regolati dalla legge italiana. Per ogni controversia è competente in via esclusiva il Foro di Milano. Se usi la sezione come consumatore, cioè per scopi estranei alla tua attività professionale, è competente il giudice del luogo in cui hai la residenza o il domicilio e restano ferme le tutele del Codice del consumo.

8. Contatti
Per domande su questi Termini o sulla sezione Clienti scrivi a caicedodigital@gmail.com.$t$,
  p_accordo_titolo => 'Accordo sul trattamento dei dati (art. 28 GDPR)',
  p_accordo_testo => $t$Versione 2 · in vigore dal 17 ottobre 2026

Tra te, utente dell'area clienti di wesleycaicedo.com («Titolare»), e Wesley Josuè Caicedo Luque, via Alfredo Soffredini 65, 20126 Milano (MI), P.IVA 03705400129, email caicedodigital@gmail.com, PEC losamigosyt@pec.it («Responsabile»).

Oggetto: i dati personali dei tuoi contatti che inserisci nella sezione Clienti (nome, canale di provenienza, data di arrivo, stato, valore della vendita, telefono, email). Interessati: le persone che ti contattano (potenziali clienti e clienti). Natura del trattamento: conservazione, visualizzazione, modifica, esportazione e cancellazione su tua istruzione. Finalità: permetterti di seguire i tuoi contatti e contare i risultati. Durata: per tutto il tempo in cui hai accesso alla sezione Clienti.

1. Ruoli
Tu (l'utente) sei il titolare del trattamento dei dati dei tuoi contatti. Con questo Accordo nomini Wesley Caicedo responsabile del trattamento ai sensi dell'art. 28 del Regolamento (UE) 2016/679.

2. Cosa fa il responsabile
Custodisce i dati dei tuoi contatti solo per far funzionare la sezione Clienti e solo secondo le tue istruzioni documentate, che sono l'uso della sezione secondo i Termini d'uso. Non li usa per scopi suoi, non li comunica ad altri e non li manda a servizi di intelligenza artificiale. Se ritiene che una tua istruzione violi la legge te lo dice. Le persone che lavorano con lui (lo staff) sono autorizzate per iscritto, tenute alla riservatezza e istruite sull'uso dei dati.

3. Dove stanno i dati
Nel database del servizio, ospitato nell'Unione Europea (Supabase, regione eu-central-1, Francoforte), insieme alle sue copie di sicurezza. I dati dei tuoi contatti non vengono trasferiti fuori dall'Unione Europea.

4. Altri fornitori (sub-responsabili)
Fornitori autorizzati alla data di questa versione:
- Supabase, Inc.: database, autenticazione e copie di sicurezza dell'area clienti. Dati nella regione eu-central-1 (Francoforte, Germania), Unione Europea.
- Cloudflare, Inc.: distribuzione dei file dell'applicazione (le pagine che vedi nel browser). Non riceve né conserva i dati dei tuoi contatti, che viaggiano direttamente tra il tuo browser e il database; lo citiamo per completezza.
Nessun altro fornitore e nessun servizio di intelligenza artificiale riceve i dati dei tuoi contatti. Con ogni sub-responsabile il Responsabile ha un contratto con obblighi equivalenti a questo Accordo e resta responsabile verso di te del loro operato. Prima di aggiungere o cambiare un sub-responsabile te lo diciamo nella sezione con un preavviso di 30 giorni, così puoi opporti: se ti opponi per motivi fondati e non troviamo una soluzione, puoi esportare i tuoi contatti e smettere di usare la sezione prima che il cambiamento entri in vigore.

5. Accesso per assistenza
Il Responsabile e le persone da lui autorizzate (il suo staff) aprono i dati dei tuoi contatti solo se serve per assistenza, in sola lettura e scrivendo il motivo; ogni accesso viene registrato (chi, quando, perché, quanti contatti). Il registro si può solo aggiungere, non modificare né cancellare, e ti viene mostrato su richiesta.

6. Esportazione e cancellazione
Puoi esportare i tuoi contatti in ogni momento, in formato CSV, e cancellarli uno per uno. La cancellazione di un contatto è definitiva. Quando il tuo accesso alla sezione finisce (chiusura dell'account, fine del percorso, chiusura dopo sospensione) il Responsabile cancella i dati dei tuoi contatti entro 30 giorni, salvo che la legge ne imponga la conservazione; prima della chiusura hai la possibilità di esportarli. Le copie di sicurezza vengono sovrascritte con il normale ciclo dei backup del fornitore.

7. Sicurezza
Il Responsabile applica misure tecniche e organizzative adeguate al rischio (art. 32 del Regolamento), tra cui: cifratura dei dati in transito (TLS) e a riposo; separazione dei dati per utente applicata direttamente dal database, così ogni utente legge e scrive solo i propri contatti; accesso del personale con credenziali personali, limitato al necessario e registrato; copie di sicurezza automatiche; aggiornamento regolare dei componenti; raccolta del minimo necessario (nessun campo di note libere). Se viene a conoscenza di una violazione dei dati personali che riguarda i tuoi contatti, il Responsabile ti avvisa senza ingiustificato ritardo, e comunque entro 48 ore, con le informazioni che ha (cosa è successo, quali dati, cosa ha fatto per rimediare), così puoi valutare la notifica al Garante e agli interessati (artt. 33 e 34 del Regolamento).

8. Assistenza al Titolare
Il Responsabile ti aiuta, per quanto possibile e tenuto conto della natura del trattamento, a rispondere alle richieste dei tuoi contatti (accesso, rettifica, cancellazione, limitazione, portabilità, opposizione): gli strumenti della sezione (modifica, cancellazione, esportazione) ti permettono di farlo da solo; se un tuo contatto scrive direttamente al Responsabile, lui te lo inoltra senza rispondere nel merito. Ti aiuta anche, se serve, nelle valutazioni d'impatto e nelle consultazioni con il Garante relative alla sezione Clienti.

9. Verifiche
Su richiesta il Responsabile ti mette a disposizione le informazioni necessarie a dimostrare il rispetto di questo Accordo (questo documento, l'elenco aggiornato dei fornitori, la descrizione delle misure di sicurezza, il registro degli accessi per assistenza ai tuoi contatti) e consente verifiche, anche tramite un revisore da te incaricato e tenuto alla riservatezza, con un preavviso ragionevole, durante l'orario di lavoro e senza compromettere la sicurezza degli altri utenti.

10. Durata e modifiche
Questo Accordo vale per tutto il tempo in cui hai accesso alla sezione Clienti e per il tempo necessario alla cancellazione dei dati (punto 6). Le modifiche seguono la regola dei Termini d'uso: avviso nella sezione con almeno 30 giorni di preavviso e nuova accettazione. Il testo di ogni versione resta salvato e ti viene mostrato con la data della tua accettazione.$t$,
  p_informativa_titolo => 'Informativa privacy',
  p_informativa_testo => $t$Versione 2 · in vigore dal 17 ottobre 2026

Informativa ai sensi dell'art. 13 del Regolamento (UE) 2016/679. Riguarda i TUOI dati di utente nella sezione Clienti dell'area clienti di wesleycaicedo.com. Per i dati dei tuoi contatti sei tu il titolare (vedi l'Accordo sul trattamento dei dati); per gli altri dati del percorso vale l'informativa generale pubblicata su wesleycaicedo.com/informativa-privacy.

1. Chi tratta i dati
Titolare del trattamento è Wesley Josuè Caicedo Luque, con sede in via Alfredo Soffredini 65, 20126 Milano (MI), P.IVA 03705400129, email caicedodigital@gmail.com, PEC losamigosyt@pec.it.

2. Quali dati
- Il tuo identificativo di utente e la tua email.
- Per ogni accettazione dei documenti della sezione: quale versione e quali documenti hai accettato, data e ora, e il testo esatto delle caselle che hai visto.
- Il registro degli accessi del team ai tuoi contatti per assistenza (chi del team, quando, perché, quanti contatti): riguarda chi accede, ma è collegato al tuo account.
Non calcoliamo né conserviamo statistiche su di te a partire dai tuoi contatti: i numeri che vedi nella sezione (arrivati, chiusi, percentuale, valore) si calcolano nel tuo browser e li vedi solo tu.

3. Perché e su quale base giuridica
a) Per far funzionare la sezione e riconoscerti come proprietario dei tuoi contatti: esecuzione del contratto (art. 6, par. 1, lett. b).
b) Per conservare la prova di cosa hai accettato e quando: l'art. 28 del Regolamento richiede che l'accordo tra titolare e responsabile sia in forma scritta, anche elettronica (obbligo di legge, art. 6, par. 1, lett. c), e abbiamo un legittimo interesse a poter dimostrare il contratto in caso di contestazione (art. 6, par. 1, lett. f).
c) Per registrare gli accessi del team ai tuoi contatti: legittimo interesse alla sicurezza del servizio e alla tutela dei tuoi contatti (art. 6, par. 1, lett. f).
Questi dati sono necessari: senza l'accettazione la sezione Clienti non si apre. Il resto dell'area clienti funziona lo stesso.

4. A chi arrivano
Ai collaboratori autorizzati dal Titolare (lo staff) e ai fornitori che agiscono come responsabili del trattamento: Supabase, Inc. (database e autenticazione, regione eu-central-1, Francoforte) e Cloudflare, Inc. (distribuzione dei file dell'applicazione: come ogni fornitore di hosting vede l'indirizzo IP e i dati tecnici della connessione, non i contenuti della sezione). Nessun servizio di intelligenza artificiale riceve questi dati. Non li comunichiamo ad altri, salvo obbligo di legge o richiesta di un'autorità.

5. Trasferimenti fuori dall'Unione Europea
I dati della sezione restano nell'Unione Europea. Cloudflare ha sede negli Stati Uniti e tratta solo dati tecnici di connessione: il trasferimento si fonda sulla decisione di adeguatezza della Commissione europea sul Data Privacy Framework (decisione di esecuzione (UE) 2023/1795) e, in subordine, sulle clausole contrattuali tipo della Commissione (decisione di esecuzione (UE) 2021/914). Puoi chiederne copia scrivendo a caicedodigital@gmail.com.

6. Per quanto tempo
Il registro delle accettazioni e il registro degli accessi per assistenza si conservano per 10 anni dalla chiusura del tuo account (prova del contratto e del modo in cui sono stati trattati i tuoi contatti, art. 2946 del Codice civile), anche se nel frattempo cancelli l'account. Identificativo ed email restano finché il tuo account esiste; alla chiusura dell'account restano solo nel registro delle accettazioni. In caso di contestazione i dati utili sono conservati fino alla sua definizione.

7. I tuoi diritti
In ogni momento puoi chiedere l'accesso ai tuoi dati, la rettifica, la cancellazione, la limitazione del trattamento e la portabilità scrivendo a caicedodigital@gmail.com. Puoi opporti ai trattamenti fondati sul legittimo interesse (punti 3.b e 3.c): valuteremo la richiesta tenendo conto che i registri servono come prova e per legge non possono essere modificati. Puoi proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).

8. Decisioni automatizzate
Non prendiamo decisioni basate solo su trattamenti automatizzati che producano effetti giuridici su di te.$t$,
  p_casella_1 => 'Ho letto e accetto i Termini d''uso della sezione Clienti e l''Accordo sul trattamento dei dati (art. 28 GDPR), con cui nomino Wesley Caicedo responsabile del trattamento dei dati dei miei contatti.',
  p_casella_2 => 'Ai sensi degli artt. 1341 e 1342 del Codice civile approvo specificamente le seguenti clausole dei Termini d''uso: 4 (Limitazioni di responsabilità), 5 (Sospensione dell''account) e 7 (Legge applicabile e foro competente).',
  p_casella_3 => 'Ho preso visione dell''Informativa privacy.'
);

update public.crm_impostazioni set giorni_preavviso = 30 where id;
