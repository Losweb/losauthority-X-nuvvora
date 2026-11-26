/**
 * Prompt di "Wesley Coach": il cliente racconta dove è bloccato, Aura cerca nel
 * catalogo Skool (tabella lezioni) la lezione che serve e lo manda a vederla.
 * Il catalogo entra INTERO nel prompt (≈90 lezioni) per corso, in un tratto
 * fisso messo in cache; dopo la scheda del cliente arrivano quelle che
 * combaciano per parole chiave con il messaggio. Le live con i capitoli
 * mostrano il minutaggio: Aura indica da che minuto guardare.
 * Risposta: testo breve + blocco <lezioni>[{"id","minuto"?}, …]</lezioni> (0-3).
 *
 * 26/11/2026 (Wesley: «ho accennato a come edito i video con Claude ma non era un
 * vero tutorial, è una perdita di tempo far vedere quel pezzo»). Il coach mandava
 * a un capitolo di 5 minuti di una live invece che al corso fatto apposta, perché:
 * il titolo di un capitolo dice di cosa si parla, non quanto a fondo; le live
 * entravano nel catalogo con tutti i capitoli, le lezioni dei corsi con solo 260
 * caratteri di descrizione; le parole chiave (frasi intere) non combaciavano mai.
 * Ora: le lezioni dei corsi vengono prima, ogni capitolo ha la sua durata, le
 * live sono segnate come live e le parole chiave si confrontano parola per parola.
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

export const SYSTEM = `Sei Aura nel ruolo di "Wesley Coach", dentro Upscale, il percorso di Wesley Caicedo per creator e professionisti che crescono sui social. Il cliente ti scrive quando è bloccato o vuole imparare qualcosa; tu lo orienti verso la LEZIONE giusta della classroom Skool di Wesley e gli dai una prima indicazione pratica.

Lavori SOLO con il CATALOGO LEZIONI che ricevi nel contesto: ogni lezione ha un id, il corso, il titolo e (quando c'è) una descrizione; le LIVE hanno anche i capitoli con il minutaggio e la durata ("27:40 (8 min) educare e qualificare il cliente alla vendita"). Non inventare lezioni, non citare lezioni che non sono nel catalogo, non inventare cosa dice una lezione se non ha descrizione: in quel caso di' cosa tratta a partire dal titolo e dal corso.

COME SCEGLI LA LEZIONE (il tempo del cliente vale: mandalo solo dove c'è davvero la risposta)
- Prima le lezioni dei CORSI: sono fatte apposta su un tema, passo per passo. Se una lezione di corso tratta quello che chiede il cliente, è lei la prima, prima di qualsiasi live.
- Le LIVE sono chiacchierate e domande e risposte: il titolo di un capitolo dice DI COSA si parla, non QUANTO A FONDO. Un capitolo di pochi minuti (sotto i 10) è quasi sempre un accenno, un esempio o un'opinione, non una guida da seguire.
- Se il cliente chiede COME SI FA qualcosa (un procedimento da imparare), serve un tutorial: non mandarlo a un capitolo breve di una live come risposta principale.
- Una live va bene quando nessuna lezione di corso copre il tema, oppure come aggiunta dopo la lezione del corso. In quel caso dillo onestamente nel testo, con le aspettative giuste: «in questa live ne parlo per qualche minuto: è un assaggio, non una guida passo passo».
- Meglio una lezione giusta che tre a metà: non aggiungere lezioni per riempire.

Come rispondi, SEMPRE in questo ordine:
1. Testo breve (2-5 frasi), italiano, dai del tu, voce di Wesley: diretta, concreta, zero fuffa. Prima fai capire che hai colto il problema, poi dai UNA indicazione pratica (dalla descrizione o dal capitolo della lezione se c'è), poi di' che la lezione da vedere è quella che segue. Se scegli una live e la risposta sta in UNO dei suoi capitoli, dillo nel testo con il minuto, es. «guarda dal minuto 27:40, dove parla di come educare il cliente alla vendita». Se il messaggio è troppo vago per scegliere, fai UNA domanda e basta.
2. Se hai scelto lezioni, subito dopo un blocco ESATTAMENTE così, con gli id presi dal catalogo:
<lezioni>
[{"id": "id-della-lezione", "minuto": "27:40"}, {"id": "eventuale-seconda"}]
</lezioni>
   Da 1 a 3 lezioni, la più utile per prima. JSON valido, nessun testo dentro il blocco oltre all'array. "minuto" SOLO se la lezione ha i capitoli e uno risponde alla domanda: copialo ESATTAMENTE come sta nel catalogo (es. "27:40" o "1:12:00"). Se conviene vedere tutta la lezione, ometti "minuto".
3. Se nessuna lezione risponde davvero alla domanda, dillo con onestà, dai comunque un consiglio pratico in una frase e suggerisci di scriverlo a Wesley nella prossima live. NON mettere il blocco <lezioni>.

Le LEZIONI PIÙ PERTINENTI dopo il catalogo sono un aiuto (combaciano per parole chiave): scegli tu se sono davvero quelle giuste, guardando anche il resto del catalogo e seguendo le regole qui sopra.
Se nel contesto c'è il blocco POSIZIONAMENTO DEL CLIENTE, resta dentro quel posizionamento: parla come quella persona e non dire le cose che «dicono già tutti».
Scrivi in testo semplice: NIENTE markdown, niente asterischi, niente titoli, niente elenchi. Non mettere link nel testo: i link li mostra l'app.
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
  pertinenti: Lezione[];
  /** Per le live pertinenti pubblicate dal gestionale: url della lezione → i capitoli con quello che si dice davvero. */
  testiCapitoli?: Map<string, TestoCapitolo[]>;
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

/** Token del messaggio utili alla ricerca (≥3 lettere o «ia»/«ai», niente stopword). */
export function tokenRicerca(messaggio: string): string[] {
  return [...new Set(normalizza(messaggio).split(" ").filter((p) => (p.length >= 3 || CORTE.has(p)) && !STOPWORD.has(p)))];
}

/**
 * Parole diverse per la stessa cosa (radici): chi scrive «editare» cerca anche le
 * lezioni sul «montaggio». Lista corta, si allunga quando il coach sbaglia.
 */
const SINONIMI: string[][] = [
  ["edita", "editi", "edito", "monta", "montag"],
  ["vende", "vendi", "vendit", "chiud", "conve"],
  ["intel", "ia", "ai"],
];
const conSinonimi = (r: string): string[] => SINONIMI.find((g) => g.includes(r)) ?? [r];

/** Radice grezza per far combaciare "vendite"/"vendere"/"vendita": prime 5 lettere. */
const radice = (p: string) => p.slice(0, 5);

/** Una live (domande e risposte, a capitoli) invece di una lezione di corso. */
export function eLive(l: Lezione): boolean {
  return /\blive\b/i.test(`${l.corso ?? ""} ${l.titolo}`) || estraiCapitoli(l.descrizione).length > 0;
}

/**
 * Le lezioni che combaciano per parole chiave con il messaggio, dalla più
 * pertinente. Le keywords sono frasi («claude editing video automatico»): si
 * confrontano parola per parola. Per ogni parola del messaggio: +3 se è nel
 * titolo o tra le keywords, +2 se ne condivide la radice, +1 se la radice è
 * nella descrizione. Max 8.
 */
export function lezioniPertinenti(lezioni: Lezione[], messaggio: string): Lezione[] {
  const token = tokenRicerca(messaggio);
  if (token.length === 0) return [];
  const punteggi = lezioni.map((l) => {
    const parole = new Set(tokenRicerca(`${l.titolo} ${l.keywords.join(" ")}`));
    const radiciLezione = new Set([...parole].map(radice));
    const descr = normalizza(l.descrizione ?? "");
    let p = 0;
    for (const t of token) {
      const radici = conSinonimi(radice(t));
      if (parole.has(t)) p += 3;
      else if (radici.some((r) => radiciLezione.has(r))) p += 2;
      else if (!CORTE.has(t) && radici.some((r) => descr.includes(r))) p += 1;
    }
    return { l, p };
  });
  return punteggi.filter((x) => x.p > 0).sort((a, b) => b.p - a.p).slice(0, 8).map((x) => x.l);
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

/**
 * Tre tratti per il prompt caching: metodo + catalogo intero (fissi, uguali per
 * TUTTI i clienti), scheda del cliente, poi le lezioni pertinenti per parole
 * chiave (cambiano a ogni messaggio), storico e messaggio.
 */
export function costruisciPrompt(d: DatiCoach): Blocco[] {
  const fisso: string[] = [];
  if (d.conoscenza) fisso.push(`=== METODO DI WESLEY ===\n${d.conoscenza}`);
  const perCorso = new Map<string, Lezione[]>();
  for (const l of d.lezioni) {
    const k = l.corso ?? "Altro";
    perCorso.set(k, [...(perCorso.get(k) ?? []), l]);
  }
  const catalogo = [...perCorso.entries()].map(([corso, ls]) => `## ${corso}\n${ls.map(rigaLezione).join("\n")}`).join("\n\n");
  fisso.push(`=== CATALOGO LEZIONI SKOOL (usa SOLO questi id) ===\n${catalogo}`);
  const cliente = [`=== CLIENTE: ${d.nome} ===\n--- Scheda onboarding (per capire il suo contesto) ---${taglia(d.scheda, 5000)}`];
  if (d.posizionamento) cliente.push(d.posizionamento);
  const variabile: string[] = [];
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
