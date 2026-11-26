# Regole di design per l'area cliente — studio del 26/11/2026

Da dove vengono: il manuale Seto (sezioni 0 e 7) e il manuale di Aura del progetto; nove pagine lette per intero (Nielsen Norman Group su moduli, percorsi a passi, pagine vuote, indicatori di attesa, tempi di risposta, menu, rivelazione progressiva; WCAG 2.2 su contrasto e dimensione dei bersagli); le skill di critica, testi e accessibilità. Non lette: le linee guida di Apple e Google (le pagine non si sono aperte) e il caso Duolingo (pagina sparita).

Misure fatte sul sito in locale a 375 px: dimensione dei bottoni (misurata nel browser) e contrasto (calcolato dai colori del design system; la misura automatica nel browser non era affidabile).

## Le regole, e dove il sito è oggi

Legenda: ✅ rispettata · ⚠️ a metà · ❌ no.

### Percorso e passi
| # | Regola | Fonte | Oggi |
| --- | --- | --- | --- |
| 1 | Mostra tutti i passi, con quello corrente in evidenza, e di' quanti sono | NN/g, percorsi a passi | ✅ onboarding, Avatar, Offerta · ❌ il percorso intero (non esiste una mappa delle fasi) |
| 2 | Ordine obbligato: non si salta avanti | NN/g, percorsi a passi | ⚠️ dentro le fasi sì; tra le fasi no (Idee, Stili, Calendario aperti senza avatar) |
| 3 | I bottoni dicono dove portano, non «Continua» | NN/g, percorsi a passi | ❌ onboarding («Continua»), ✅ ultimo passo («Fai leggere ad Aura») |
| 4 | Si può uscire a metà e riprendere | NN/g, percorsi a passi | ✅ ovunque |
| 5 | Massimo due livelli di «mostra altro» | NN/g, rivelazione progressiva | ✅ |

### Moduli
| # | Regola | Fonte | Oggi |
| --- | --- | --- | --- |
| 6 | Togli i campi che si possono dedurre o chiedere dopo | NN/g, moduli | ✅ dopo il taglio del 26/11 |
| 7 | Facoltativi: al massimo uno o due, e marcati | NN/g, moduli | ⚠️ sono marcati e piegati, ma sono 10 su un percorso |
| 8 | Una colonna, etichetta sopra il campo | NN/g, moduli | ✅ |
| 9 | Evita il testo d'esempio dentro il campo | NN/g, moduli | ❌ una decina di campi dell'onboarding hanno l'esempio dentro il campo |
| 10 | Errori: visibili, non solo col colore, e senza perdere quello che è scritto | NN/g, moduli | non verificato |

### Attese
| # | Regola | Fonte | Oggi |
| --- | --- | --- | --- |
| 11 | Ogni tocco ha una risposta immediata | NN/g, indicatori | ✅ |
| 12 | Da 2 a 10 secondi: animazione + una frase che dice cosa succede | NN/g, indicatori | ✅ (Aura + frasi) |
| 13 | Oltre 10 secondi: una stima del tempo o i passi, e la possibilità di fermare | NN/g, indicatori e tempi | ❌ chat di Avatar e Offerta (20-75 s): nessuna stima, nessuno stop · ⚠️ lettura onboarding: «circa un minuto», nessuno stop |
| 14 | Le attese lunghe stanno bene solo nei punti di pausa naturali | NN/g, tempi | ⚠️ in chat l'attesa arriva a ogni messaggio |

### Pagine vuote e passo dopo
| # | Regola | Fonte | Oggi |
| --- | --- | --- | --- |
| 15 | Mai un riquadro vuoto: di' cosa comparirà e dai un bottone per iniziare | NN/g, pagine vuote | ❌ Dashboard («arriva dopo la call», nessun bottone) · ✅ Stili, Idee, Coach, Avatar, Offerta |
| 16 | Alla fine di una fase, porta alla successiva | skill di critica, usabilità | ⚠️ frase → Avatar sì; Avatar → Offerta no; Offerta → contenuti no |

### Menu
| # | Regola | Fonte | Oggi |
| --- | --- | --- | --- |
| 17 | Menu a sinistra, sempre visibile su computer, con la voce corrente evidenziata | NN/g, menu | ✅ |
| 18 | Etichette chiare e familiari, niente gergo, parola chiave all'inizio | NN/g, menu; manuale Seto | ❌ «Dashboard», «Workflow», «Competitors», «Kit Brand», «Cervello del tuo branding» |
| 19 | Le voci più usate più vicine; raggruppa il resto | NN/g, menu | ❌ 9 voci in fila nello stesso peso, fondamenta in fondo |

### Testi
| # | Regola | Fonte | Oggi |
| --- | --- | --- | --- |
| 20 | Bottoni: verbo all'inizio, specifici | skill testi; manuale Seto | ⚠️ |
| 21 | Stesse parole per le stesse cose | skill testi | ❌ «scheda» vuol dire tre cose (onboarding, avatar, offerta); «Cervello» / «branding» / «fondamenta»; «vera/lettura» nell'Avatar e «vera/ipotesi» nell'Offerta |
| 22 | Niente emoji | manuale Seto | ✅ dopo il 26/11 (restano ✅ ⚠️ ❌ nelle tabelle di Aura, volute dal documento dell'Offerta) |

### Aspetto (manuale Seto)
| # | Regola | Oggi |
| --- | --- | --- |
| 23 | Un solo riempimento forte (nero) per zona | ⚠️ pagina Offerta: bottone PDF chiaro va bene, ma frase nera + bottone invio nero nella stessa vista; Avatar: «arrivo» nero + invio nero |
| 24 | Nessun testo sotto 12 px | ✅ misurato: zero |
| 25 | Quello che si tocca è una pillola, quello che contiene è morbido | ✅ |
| 26 | Una sola Aura viva per schermata | ✅ |

### Accessibilità (WCAG 2.2 AA)
| # | Regola | Misura | Oggi |
| --- | --- | --- | --- |
| 27 | Testo normale: contrasto almeno 4,5:1 | principale 17:1 · secondario 5,9:1 · grigio su fondo 4,7:1 · grigio su card 5,0:1 | ✅ |
| 28 | Idem, sul velo pesca in basso | grigio 4,2:1 | ❌ di poco, nelle note in fondo alle pagine |
| 29 | Idem, testi grigi schiariti (al 60-70%) | 2,3-2,8:1 | ❌ 24 punti nel codice, tra cui le righe vuote della mappa Avatar e il Cervello |
| 30 | Etichette vera / lettura / Fermo | 7,5 · 5,8 · 6,9:1 | ✅ |
| 31 | Elementi non di testo: almeno 3:1 | bordo dei campi 1,2:1 · tratto del passo futuro 1,1:1 · tratto corrente 2,9:1 | ❌ i campi si distinguono solo per l'ombra leggera; è una scelta del manuale Seto |
| 32 | Bersagli almeno 24×24 px | nessuno sotto, su 7 pagine | ✅ |
| 33 | Azioni principali 44×44 px (consigliato) | bottoni dei dubbi e del calendario 36 px, «La tua area» 24 px | ⚠️ |

## Le dieci cose da fare, in ordine di effetto

1. Pagina «Il tuo percorso» al posto della Dashboard vuota (regole 1, 15, 16).
2. Menu in tre gruppi con parole italiane (18, 19).
3. Il passo dopo alla fine di Avatar e Offerta (16).
4. Attese lunghe in chat: stima («di solito 30-60 secondi») e fasi nominate; tasto per fermare (13).
5. Un vocabolario solo: decidere «scheda», «fondamenta», «vera/ipotesi» e usarli ovunque (21).
6. Testi grigi schiariti: riportarli al grigio pieno (29).
7. Bottoni dell'onboarding che dicono dove portano: «Avanti: i tuoi clienti» (3).
8. Esempi sotto il campo invece che dentro (9).
9. Bottoni dei dubbi e voci toccabili a 44 px sul telefono (33).
10. Strumenti dei contenuti con un avviso finché manca l'avatar (2).

Da decidere con Wesley, perché toccano il manuale Seto: il bordo dei campi più visibile (31) e i due riquadri neri nella stessa vista (23).

## Stato al 26/11/2026

Fatte in locale (non ancora pubblicate): 1, 2, 3, 4, 6, 7, 8, 9, 10.

- 4: sotto la frase di stato c'è «Può volerci fino a un minuto» (non «30-60 secondi»: le risposte brevi arrivano in pochi secondi); le frasi cambiano ogni 9 secondi; il tasto stop ferma Aura. Lo stop è un comando esplicito alla funzione: la risposta fermata viene scartata e non cambia mappa né offerta.
- 5: fatto a metà. «Scheda» ora vuol dire solo la scheda di un avatar o dell'offerta; l'onboarding si chiama «onboarding». Wesley ha scelto «ipotesi» per tutte e due le fasi (26/11/2026).
- 10: l'avviso sta su Idee (a studio vuoto), Stili e Calendario; sparisce da solo quando la mappa Avatar è chiusa.

