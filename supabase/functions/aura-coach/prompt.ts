/**
 * Prompt di "Wesley Coach": il cliente racconta dove è bloccato, Aura cerca nel
 * catalogo Skool (tabella lezioni) la lezione che serve e lo manda a vederla.
 * Il catalogo entra INTERO nel prompt (≈90 lezioni) per corso, in un tratto
 * fisso messo in cache; dopo la scheda del cliente arrivano quelle che
 * combaciano per parole chiave con il messaggio. Le live con i capitoli
 * mostrano il minutaggio: Aura indica da che minuto guardare.
 * Risposta: prima la risposta al dubbio (dal materiale di Wesley: passaggi numerati o
 * poche frasi), poi la lezione dove vederlo, poi il blocco <lezioni>[{"id","minuto"?}, …]</lezioni> (0-3).
 *
 * 26/11/2026 (Wesley: «ho accennato a come edito i video con Claude ma non era un
 * vero tutorial, è una perdita di tempo far vedere quel pezzo»). Il coach mandava
 * a un capitolo di 5 minuti di una live invece che al corso fatto apposta, perché:
 * il titolo di un capitolo dice di cosa si parla, non quanto a fondo; le live
 * entravano nel catalogo con tutti i capitoli, le lezioni dei corsi con solo 260
 * caratteri di descrizione; le parole chiave (frasi intere) non combaciavano mai.
 * Ora: le lezioni dei corsi vengono prima, ogni capitolo ha la sua durata, le
 * live sono segnate come live e le parole chiave si confrontano parola per parola.
 * Stesso giorno, secondo giro («mi ha dato solo un link quando c'è un corso intero
 * sull'editing con IA»): le parole rare pesano di più («editare» più di «ia») e i
 * corsi con più lezioni sul tema arrivano in una sezione a parte, prima delle
 * pertinenti. I corsi «Livello N|» sono ricompense, non lezioni: fuori dal catalogo.
 */
import { type Blocco, blocchiPrompt } from "../_shared/anthropic.ts";
import { type Capitolo, capitoloPer, estraiCapitoli, formattaTempo, introCapitoli } from "./capitoli.ts";

export interface Lezione {
  id: string;
  corso: string | null;
  titolo: string;
  url: string | null;
  descrizione: string | null;
  keywords: string[];
}

export const SYSTEM = `Sei Aura nel ruolo di "Wesley Coach", dentro Upscale, il percorso di Wesley Caicedo per creator e professionisti che crescono sui social. Il cliente ti scrive quando è bloccato o ha un dubbio: PRIMA rispondi al dubbio, in modo che possa sbloccarsi subito, POI gli indichi la LEZIONE della classroom Skool di Wesley dove lo vede fatto o lo approfondisce.

DA DOVE PRENDI LA RISPOSTA (rispondi come Wesley, non come un'intelligenza artificiale qualsiasi)
- Solo dal materiale di Wesley che ricevi: il METODO DI WESLEY, il MATERIALE DELLE LEZIONI SUL TEMA (le descrizioni complete, spesso con i passaggi e i prompt esatti), le descrizioni nel catalogo e, per le live, cosa si dice davvero nei capitoli.
- Se il materiale copre il dubbio, usalo: stessi passaggi, stessi strumenti, stesse parole di Wesley. Non aggiungere strumenti, numeri o procedure che nel materiale non ci sono.
- Ogni passaggio, numero (secondi, percentuali, frequenze, prezzi) e consiglio della tua risposta deve stare scritto nel materiale che ricevi. Prima di consegnare rileggi: se una frase non la ritrovi nel materiale, toglila. Meglio una risposta corta e vera che una completa e inventata.
- Le tue risposte precedenti nella CONVERSAZIONE FINORA non sono materiale di Wesley: se lì avevi scritto passaggi che nel materiale non ci sono, non ripeterli.
- Non attribuire mai a Wesley o a una lezione qualcosa che nel materiale non è scritto («il principio che trovi nel corso…»): se una lezione non ha descrizione, sai solo il suo titolo.
- Se il materiale NON copre il dubbio, non improvvisare una risposta tua e NON scrivere passaggi: dillo con onestà («questo nelle lezioni non lo spiego nel dettaglio»), dai al massimo un consiglio di buon senso in una frase, presentato come tale, e suggerisci di portarlo a Wesley nella prossima live.

Le lezioni le scegli SOLO tra quelle che ricevi nel contesto: le LEZIONI SUGLI ARGOMENTI DEL MESSAGGIO (dalla mappa per argomenti: per ogni lezione la profondità, il minuto e cosa dice) oppure, se manca, il CATALOGO LEZIONI. Le LIVE hanno il minutaggio e la durata ("dal minuto 27:40 (8 min)"). Nella mappa la profondità è già scritta: PASSO PASSO prima di SPIEGAZIONE, SPIEGAZIONE prima di ACCENNO; un ACCENNO non lo proponi come lezione da vedere se c'è altro. Non inventare lezioni, non citare lezioni che non sono nel catalogo, non inventare cosa dice una lezione se non ha descrizione: in quel caso di' cosa tratta a partire dal titolo e dal corso.

COME SCEGLI LA LEZIONE (il tempo del cliente vale: mandalo solo dove c'è davvero la risposta)
- Prima le lezioni dei CORSI: sono fatte apposta su un tema, passo per passo. Se una lezione di corso tratta quello che chiede il cliente, è lei la prima, prima di qualsiasi live.
- Le LIVE sono chiacchierate e domande e risposte: il titolo di un capitolo dice DI COSA si parla, non QUANTO A FONDO. Un capitolo di pochi minuti (sotto i 10) è quasi sempre un accenno, un esempio o un'opinione, non una guida da seguire.
- Se il cliente chiede COME SI FA qualcosa (un procedimento da imparare), serve un tutorial: non mandarlo a un capitolo breve di una live come risposta principale.
- Una live va bene quando nessuna lezione di corso copre il tema, oppure come aggiunta dopo la lezione del corso. In quel caso dillo onestamente nel testo, con le aspettative giuste: «in questa live ne parlo per qualche minuto: è un assaggio, non una guida passo passo».
- Se c'è un CORSO INTERO sul tema (il nome del corso o più sue lezioni parlano di quello), non ridurlo a un link: dillo nel testo («c'è un corso intero su questo, 5 lezioni: parti dalla prima e seguile in ordine») e nel blocco metti la prima lezione del corso, più quella che risponde in modo più preciso se è un'altra.
- Meglio una lezione giusta che tre a metà: non aggiungere lezioni per riempire.
- I «Livello 5/6/7» non sono lezioni: sono ricompense che si sbloccano salendo di livello (le trovi a parte, sotto RICOMPENSE DEI LIVELLI). Non mandare mai il cliente lì come se fosse una lezione.

Come rispondi, SEMPRE in questo ordine:
1. La risposta al dubbio. Italiano, dai del tu, voce di Wesley: diretta, concreta, zero fuffa.
   - Una frase che fa capire che hai colto il problema (niente complimenti, niente «ottima domanda»).
   - Poi la risposta vera. Se è un procedimento, da 3 a 5 passaggi concreti, uno per riga, numerati così: «1. …» (testo semplice). Se è una domanda secca («quanto deve durare un reel?»), rispondi in 1-3 frasi.
   - Se il cliente ha una scheda o un posizionamento, adatta l'esempio al suo lavoro, ma senza cambiare i passaggi di Wesley.
   - In tutto al massimo circa 150 parole: deve potersi sbloccare leggendo, non studiare.
   Se il messaggio è troppo vago per rispondere, fai UNA domanda e basta.
   Se il cliente rifà una domanda già fatta, rispondi di nuovo con calma e non dire mai «te l'ho già detto» o «ti ho già risposto»: magari non ha capito o non ha trovato la lezione.
2. Poi una frase che porta alla lezione: cosa ci trova in più («lì lo vedi fatto passo per passo, con i prompt da copiare»). Se è un corso intero, quante lezioni e da quale partire. Se scegli una live e la risposta sta in UNO dei suoi capitoli, di' il minuto, es. «guarda dal minuto 27:40, dove parla di come educare il cliente alla vendita». Per una domanda secca a cui hai già risposto del tutto, la lezione può anche mancare: non mettere un link per forza.
3. Se hai scelto lezioni, subito dopo un blocco ESATTAMENTE così, con gli id presi dal catalogo:
<lezioni>
[{"id": "id-della-lezione", "minuto": "27:40"}, {"id": "eventuale-seconda"}]
</lezioni>
   Da 1 a 3 lezioni, la più utile per prima. JSON valido, nessun testo dentro il blocco oltre all'array. "minuto" SOLO se la lezione ha i capitoli e uno risponde alla domanda: copialo ESATTAMENTE come sta nel catalogo (es. "27:40" o "1:12:00"). Se conviene vedere tutta la lezione, ometti "minuto".
4. Se nessuna lezione e nessun materiale rispondono davvero alla domanda, dillo con onestà, dai al massimo un consiglio di buon senso in una frase e suggerisci di scriverlo a Wesley nella prossima live. NON mettere il blocco <lezioni>.

Le lezioni arrivano già scelte per argomento (o per parole chiave): scegli tu se sono davvero quelle giuste, seguendo le regole qui sopra. Il "minuto" nel blocco <lezioni> copialo esattamente come «dal minuto …» nella mappa.
Se nel contesto c'è il blocco POSIZIONAMENTO DEL CLIENTE, resta dentro quel posizionamento: parla come quella persona e non dire le cose che «dicono già tutti».
Scrivi in testo semplice: NIENTE markdown, niente asterischi, niente titoli, niente elenchi puntati. L'unico elenco ammesso sono i passaggi numerati «1. …», uno per riga. Non mettere link nel testo: i link li mostra l'app.
Non promettere risultati. Nessun consiglio legale, medico o finanziario. Niente testo dopo il blocco </lezioni>.`;

export interface Storico {
  ruolo: "cliente" | "aura";
  contenuto: string;
}

/** Cosa dice davvero Wesley in un capitolo di una live (`skool_video_capitoli.testo`, scritto da Aura dalla trascrizione). */
export interface TestoCapitolo {
  inizio_sec: number;
  titolo: string;
  testo: string;
}

export interface DatiCoach {
  nome: string;
  scheda: string;
  /** Il blocco `=== POSIZIONAMENTO DEL CLIENTE ===` (`_shared/posizionamento/blocco.ts`), null se non c'è ancora. */
  posizionamento: string | null;
  conoscenza: string;
  lezioni: Lezione[];
  /** I corsi «Livello N| …»: ricompense da sbloccare, non lezioni (`_shared/lezioni.ts`). Mai nel blocco <lezioni>. */
  ricompense?: Lezione[];
  pertinenti: Lezione[];
  /** Per le live pertinenti pubblicate dal gestionale: url della lezione → i capitoli con quello che si dice davvero. */
  testiCapitoli?: Map<string, TestoCapitolo[]>;
  /**
   * Il blocco della mappa per argomenti (`mappa.ts`, 27/11/2026). Se c'è, il prompt NON
   * contiene il catalogo intero: solo il metodo, il cliente, queste lezioni e la conversazione.
   */
  daMappa?: string | null;
  storico: Storico[];
  messaggio: string;
}

/** Una lezione scelta dal modello, con il capitolo da cui guardare se ne ha indicato uno valido. */
export interface Scelta {
  id: string;
  capitolo: Capitolo | null;
}

const taglia = (t: string, n: number) => (t.length > n ? `${t.slice(0, n)}…` : t);

/** Parole "vuote" dell'italiano che non aiutano a trovare una lezione. */
const STOPWORD = new Set([
  "che", "come", "con", "per", "non", "una", "uno", "gli", "del", "della", "delle", "dei", "degli", "dal", "dalla", "nel", "nella", "sul", "sulla",
  "sono", "sei", "ho", "hai", "mio", "mia", "miei", "mie", "tuo", "tua", "suo", "sua", "questo", "questa", "quello", "quella", "cosa", "fare", "faccio",
  "devo", "voglio", "vorrei", "posso", "riesco", "aiuto", "aiutami", "serve", "bisogno", "qualcosa", "anche", "ancora", "sempre", "molto", "poco",
  "perché", "perche", "quando", "dove", "quale", "quali", "più", "piu", "meno", "tutto", "tutti", "ogni", "cap", "capitolo", "video", "lezione",
]);

/** Normalizza per il confronto: minuscole, senza accenti, solo lettere/numeri. */
export function normalizza(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

/** Sigle corte che contano anche sotto le 3 lettere («editare con ia»). */
const CORTE = new Set(["ia", "ai"]);

/** Parole della domanda che dicono «voglio imparare», non il tema: non aiutano a scegliere. */
const DOMANDA = new Set(["capire", "sapere", "imparare", "spiegami", "spiegare", "mostrami", "funziona", "funzionano", "iniziare", "migliorare"]);

/** Token del messaggio utili alla ricerca (≥3 lettere o «ia»/«ai», niente stopword). */
export function tokenRicerca(messaggio: string): string[] {
  return [...new Set(normalizza(messaggio).split(" ").filter((p) => (p.length >= 3 || CORTE.has(p)) && !STOPWORD.has(p) && !DOMANDA.has(p)))];
}

/** Radice grezza per far combaciare "vendite"/"vendere"/"vendita": prime 5 lettere. */
const radice = (p: string) => p.slice(0, 5);

/**
 * Parole diverse per la stessa cosa (radici): chi scrive «editare» cerca anche le
 * lezioni sul «montaggio». Lista corta, si allunga quando il coach sbaglia.
 * «edito» no: è anche «editoriale» (piano editoriale), un altro tema.
 */
const SINONIMI: string[][] = [
  ["edita", "editi", "monta", "monto", "montag"],
  ["vende", "vendi", "vendit", "chiud", "conve"],
  ["intel", "ia", "ai"],
];
const gruppo = (t: string): string[] => SINONIMI.find((g) => g.includes(CORTE.has(t) ? t : radice(t))) ?? [radice(t)];

/** Una live (domande e risposte, a capitoli) invece di una lezione di corso. */
export function eLive(l: Lezione): boolean {
  return /\blive\b/i.test(`${l.corso ?? ""} ${l.titolo}`) || estraiCapitoli(l.descrizione).length > 0;
}

/**
 * Quanto una lezione parla di una parola del messaggio: 3 se è nel titolo o tra
 * le keywords, 2 se ne condivide la radice, 1 se sta nella descrizione, 0 se no.
 * «ia»/«ai» contano solo come parole intere (non dentro «aiuto»).
 */
function combacia(l: Lezione, t: string): number {
  const g = gruppo(t);
  const corta = CORTE.has(t);
  const parole = tokenRicerca(`${l.titolo} ${l.keywords.join(" ")}`);
  if (parole.includes(t) || (corta && parole.some((p) => g.includes(p)))) return 3;
  if (!corta && parole.some((p) => g.includes(radice(p)))) return 2;
  const descr = normalizza(l.descrizione ?? "").split(" ");
  if (corta ? descr.some((p) => g.includes(p)) : descr.some((p) => p.length >= 3 && g.includes(radice(p)))) return 1;
  return 0;
}

/**
 * Il peso di ogni parola del messaggio: più è rara nel catalogo, più conta
 * (26/11/2026: «ia» sta in decine di lezioni e pesava quanto «editare», così il
 * corso fatto apposta sull'editing non entrava neanche tra le pertinenti).
 */
function pesi(lezioni: Lezione[], token: string[]): Map<string, number> {
  const n = lezioni.length || 1;
  return new Map(token.map((t) => {
    const quante = lezioni.filter((l) => combacia(l, t) > 0).length;
    return [t, quante ? Math.log(n / quante) : 0];
  }));
}

/**
 * Le lezioni che combaciano per parole chiave con il messaggio, dalla più
 * pertinente: per ogni parola, quanto la lezione ne parla × quanto è rara. Max 8.
 */
export function lezioniPertinenti(lezioni: Lezione[], messaggio: string): Lezione[] {
  const token = tokenRicerca(messaggio);
  if (token.length === 0) return [];
  const peso = pesi(lezioni, token);
  return lezioni
    .map((l) => ({ l, p: token.reduce((s, t) => s + combacia(l, t) * (peso.get(t) ?? 0), 0) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p)
    .slice(0, 8)
    .map((x) => x.l);
}

/** Un corso (non le live) che parla del tema in più lezioni: va proposto intero, non ridotto a un link. */
export interface CorsoTema {
  corso: string;
  totale: number;
  /** Le lezioni del corso che parlano del tema, nell'ordine del corso. */
  sulTema: Lezione[];
  /** La prima lezione del corso, da cui partire. */
  prima: Lezione;
}

/**
 * I corsi interi sul tema del messaggio (26/11/2026, Wesley: «mi ha dato solo un
 * link quando c'è un capitolo intero su editing con IA dentro lo Skool»). Si guarda
 * solo la parola più rara (il tema: «editare», non «ia»): un corso conta se almeno
 * 2 lezioni e almeno 4 su 10 ne parlano. Le lezioni arrivano nell'ordine del corso.
 */
export function corsiSulTema(lezioni: Lezione[], messaggio: string): CorsoTema[] {
  const token = tokenRicerca(messaggio);
  if (token.length === 0) return [];
  const peso = pesi(lezioni, token);
  const massimo = Math.max(...peso.values());
  if (massimo <= 0) return [];
  const tema = token.filter((t) => (peso.get(t) ?? 0) >= massimo * 0.75);
  const perCorso = new Map<string, Lezione[]>();
  for (const l of lezioni) {
    if (!l.corso || eLive(l)) continue;
    perCorso.set(l.corso, [...(perCorso.get(l.corso) ?? []), l]);
  }
  const corsi: CorsoTema[] = [];
  for (const [corso, ls] of perCorso) {
    const sulTema = ls.filter((l) => tema.some((t) => combacia(l, t) > 0));
    if (sulTema.length >= 2 && sulTema.length / ls.length >= 0.4) corsi.push({ corso, totale: ls.length, sulTema, prima: ls[0] });
  }
  return corsi.sort((a, b) => b.sulTema.length / b.totale - a.sulTema.length / a.totale).slice(0, 2);
}

/**
 * Riga del catalogo. Live: segnata LIVE, il riassunto e i capitoli con minuto e
 * durata. Lezione di corso: la descrizione, abbastanza lunga da capire cosa
 * insegna davvero (prima erano 260 caratteri e perdeva contro le live).
 */
function rigaLezione(l: Lezione): string {
  const capitoli = estraiCapitoli(l.descrizione);
  if (capitoli.length > 0) {
    const intro = introCapitoli(l.descrizione);
    const righe = capitoli.map((c) => `${c.tempo}${c.minuti ? ` (${c.minuti} min)` : ""} ${c.titolo}`).join(" · ");
    return `[${l.id}] LIVE · ${l.titolo}${intro ? ` — ${taglia(intro, 300)}` : ""} — capitoli: ${taglia(righe, 1800)}`;
  }
  const tipo = eLive(l) ? "LIVE · " : "";
  const descr = l.descrizione?.trim() ? ` — ${taglia(l.descrizione.replace(/\s+/g, " ").trim(), 700)}` : "";
  return `[${l.id}] ${tipo}${l.titolo}${descr}`;
}

/** Quanto della descrizione di una lezione e quanto materiale in tutto entrano per rispondere al dubbio. */
const MAX_MATERIALE_LEZIONE = 3500;
const MAX_MATERIALE = 14000;

/**
 * Le descrizioni COMPLETE delle lezioni di corso sul tema (i corsi interi, poi le
 * pertinenti), da cui il coach prende la risposta al dubbio (26/11/2026, Wesley:
 * «il coach potrebbe rispondere al dubbio oltre a dare solo il link?»). Nel catalogo
 * ne entrano 700 caratteri; qui intere, perché spesso sono già i passaggi e i prompt
 * della lezione. Le live no: i loro capitoli e testi arrivano già a parte. null se non c'è niente.
 */
function materialeSulTema(corsi: CorsoTema[], pertinenti: Lezione[]): string | null {
  const viste = new Set<string>();
  const scelte: Lezione[] = [];
  for (const l of [...corsi.flatMap((c) => [c.prima, ...c.sulTema]), ...pertinenti.slice(0, 5)]) {
    if (viste.has(l.id) || eLive(l) || !l.descrizione?.trim()) continue;
    viste.add(l.id);
    scelte.push(l);
  }
  const blocchi: string[] = [];
  let totale = 0;
  for (const l of scelte) {
    const testo = taglia(l.descrizione!.replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim(), MAX_MATERIALE_LEZIONE);
    if (totale + testo.length > MAX_MATERIALE) break;
    totale += testo.length;
    blocchi.push(`[${l.id}] ${l.corso ?? ""} › ${l.titolo}\n${testo}`);
  }
  if (blocchi.length === 0) return null;
  return `=== MATERIALE DELLE LEZIONI SUL TEMA (descrizioni complete scritte da Wesley: la risposta al dubbio la prendi da qui) ===\n${blocchi.join("\n\n")}`;
}

/**
 * Tre tratti per il prompt caching: metodo + catalogo intero (fissi, uguali per
 * TUTTI i clienti), scheda del cliente, poi le lezioni pertinenti per parole
 * chiave (cambiano a ogni messaggio), storico e messaggio.
 */
export function costruisciPrompt(d: DatiCoach): Blocco[] {
  const fisso: string[] = [];
  if (d.conoscenza) fisso.push(`=== METODO DI WESLEY ===\n${d.conoscenza}`);
  if (d.daMappa) {
    // Strada della mappa per argomenti: niente catalogo intero, scheda e conversazione più corte.
    if (d.ricompense?.length) fisso.push(bloccoRicompense(d.ricompense));
    const cliente = [`=== CLIENTE: ${d.nome} ===\n--- Scheda onboarding (per capire il suo contesto) ---${taglia(d.scheda, 2000)}`];
    if (d.posizionamento) cliente.push(taglia(d.posizionamento, 1500));
    const variabile = [d.daMappa];
    if (d.storico.length > 0) {
      variabile.push(`=== CONVERSAZIONE FINORA ===\n${d.storico.map((m) => `${m.ruolo === "cliente" ? "CLIENTE" : "AURA"}: ${taglia(m.contenuto, 600)}`).join("\n\n")}`);
    }
    variabile.push(`=== NUOVO MESSAGGIO DEL CLIENTE ===\n${d.messaggio}`);
    return blocchiPrompt(fisso, cliente, variabile);
  }
  const perCorso = new Map<string, Lezione[]>();
  for (const l of d.lezioni) {
    const k = l.corso ?? "Altro";
    perCorso.set(k, [...(perCorso.get(k) ?? []), l]);
  }
  // Quante lezioni ha il corso: un corso intero su un tema si vede e non si riduce a un link (26/11/2026).
  const catalogo = [...perCorso.entries()]
    .map(([corso, ls]) => `## ${corso} (${ls.length === 1 ? "1 lezione" : `${ls.length} lezioni, in ordine`})\n${ls.map(rigaLezione).join("\n")}`)
    .join("\n\n");
  fisso.push(`=== CATALOGO LEZIONI SKOOL (usa SOLO questi id) ===\n${catalogo}`);
  if (d.ricompense?.length) fisso.push(bloccoRicompense(d.ricompense));
  const cliente = [`=== CLIENTE: ${d.nome} ===\n--- Scheda onboarding (per capire il suo contesto) ---${taglia(d.scheda, 5000)}`];
  if (d.posizionamento) cliente.push(d.posizionamento);
  const variabile: string[] = [];
  const corsi = corsiSulTema(d.lezioni, d.messaggio);
  if (corsi.length > 0) {
    const righe = corsi.map((c) =>
      `## ${c.corso}: ${c.sulTema.length} lezioni su ${c.totale} parlano di questo. Si parte da [${c.prima.id}] ${c.prima.titolo}.\n${c.sulTema.map((l) => `- [${l.id}] ${l.titolo}`).join("\n")}`
    );
    variabile.push(
      `=== CORSI INTERI SUL TEMA DEL MESSAGGIO ===\nC'è un corso fatto apposta: è lui la risposta principale, prima di qualsiasi live. Dillo nel testo (quante lezioni, da quale partire) e metti nel blocco la prima lezione del corso, più quella che risponde in modo più preciso se è un'altra. Se il messaggio in realtà parla d'altro, ignora questa sezione.\n${righe.join("\n\n")}`,
    );
  }
  const materiale = materialeSulTema(corsi, d.pertinenti);
  const testiLive = d.pertinenti.some((l) => l.url && d.testiCapitoli?.get(l.url)?.length);
  if (materiale) variabile.push(materiale);
  else if (!testiLive) {
    // Niente descrizioni né trascrizioni sul tema: il coach non ha da dove prendere i passaggi (26/11/2026, s'era inventato «i 5 elementi di un prompt»).
    variabile.push("=== MATERIALE SUL TEMA: NESSUNO ===\nPer questo tema non hai il testo delle lezioni, solo i titoli. NON scrivere passaggi e non spiegare cosa insegna una lezione: di' in una o due frasi quale lezione o corso guardare e perché il titolo c'entra con il suo dubbio.");
  }
  if (d.pertinenti.length > 0) {
    variabile.push(`=== LEZIONI PIÙ PERTINENTI PER PAROLE CHIAVE ===\n${d.pertinenti.map((l) => `${rigaLezione(l)} (corso: ${l.corso ?? "—"})`).join("\n")}`);
    const dentro = d.pertinenti.flatMap((l) => {
      const testi = l.url ? d.testiCapitoli?.get(l.url) : undefined;
      if (!testi?.length) return [];
      const righe = testi.map((c) => `- ${formattaTempo(c.inizio_sec)} ${c.titolo}: ${taglia(c.testo.replace(/\s+/g, " ").trim(), 350)}`);
      return [`[${l.id}] ${l.titolo}\n${righe.join("\n")}`];
    });
    if (dentro.length > 0) {
      variabile.push(
        `=== COSA SI DICE DAVVERO NEI CAPITOLI DI QUESTE LIVE (dalla trascrizione) ===\nUsalo per capire se un capitolo è una spiegazione passo passo o solo un racconto, un accenno, un'opinione: se Wesley «racconta» o «accenna» senza mostrare i passaggi, NON è un tutorial.\n${dentro.join("\n\n")}`,
      );
    }
  }
  if (d.storico.length > 0) {
    const righe = d.storico.map((m) => `${m.ruolo === "cliente" ? "CLIENTE" : "AURA"}: ${taglia(m.contenuto, 1200)}`);
    variabile.push(`=== CONVERSAZIONE FINORA ===\n${righe.join("\n\n")}`);
  }
  variabile.push(`=== NUOVO MESSAGGIO DEL CLIENTE ===\n${d.messaggio}`);
  return blocchiPrompt(fisso, cliente, variabile);
}

function bloccoRicompense(ricompense: Lezione[]): string {
  const premi = [...new Set(ricompense.map((l) => l.corso ?? l.titolo))].map((c) => `- ${c}`).join("\n");
  return `=== RICOMPENSE DEI LIVELLI (NON sono lezioni) ===\nSi sbloccano salendo di livello nella community Skool: non si guardano, non hanno id da usare e non vanno MAI nel blocco <lezioni>. Puoi nominarle nel testo solo se c'entrano davvero con la domanda («quando arrivi al livello 6 la content series te la costruiamo insieme»), dopo aver dato la lezione da vedere adesso.\n${premi}`;
}

/** Toglie il markdown leggero che il modello a volte infila comunque. */
function pulisci(t: string): string {
  return t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#{1,6}\s+/gm, "").trim();
}

/** Un elemento del blocco <lezioni>: "id" oppure { id, minuto? }. */
function leggiVoce(el: unknown): { id: string; minuto: unknown } | null {
  if (typeof el === "string") return { id: el, minuto: null };
  if (el && typeof el === "object" && typeof (el as { id?: unknown }).id === "string") {
    return { id: (el as { id: string }).id, minuto: (el as { minuto?: unknown }).minuto ?? null };
  }
  return null;
}

/**
 * Separa il testo dal blocco <lezioni> e tiene solo gli id presenti nel
 * catalogo (max 3, senza doppioni). Il minuto vale solo se combacia con un
 * capitolo di QUELLA lezione: niente minuti inventati.
 */
export function estraiRisposta(testo: string, catalogo: Map<string, Lezione>): { risposta: string; scelte: Scelta[] } {
  const apre = testo.indexOf("<lezioni>");
  if (apre === -1) return { risposta: pulisci(testo), scelte: [] };
  const chiude = testo.indexOf("</lezioni>");
  const risposta = pulisci(testo.slice(0, apre));
  const grezzo = chiude > apre ? testo.slice(apre + 9, chiude) : testo.slice(apre + 9);
  const a = grezzo.indexOf("[");
  const b = grezzo.lastIndexOf("]");
  if (a === -1 || b <= a) return { risposta, scelte: [] };
  let lista: unknown;
  try {
    lista = JSON.parse(grezzo.slice(a, b + 1));
  } catch {
    return { risposta, scelte: [] };
  }
  if (!Array.isArray(lista)) return { risposta, scelte: [] };
  const scelte: Scelta[] = [];
  for (const el of lista) {
    const voce = leggiVoce(el);
    const lezione = voce ? catalogo.get(voce.id) : undefined;
    if (!voce || !lezione || scelte.some((s) => s.id === voce.id)) continue;
    scelte.push({ id: voce.id, capitolo: capitoloPer(estraiCapitoli(lezione.descrizione), voce.minuto) });
    if (scelte.length === 3) break;
  }
  return { risposta, scelte };
}
