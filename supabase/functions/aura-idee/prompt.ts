/**
 * Prompt di "Crea idee": Aura propone idee di video brevi partendo dal METODO di
 * Wesley (tabella aura_conoscenza), dal materiale del cliente (scheda onboarding,
 * analisi, idee recenti, pubblicazioni che hanno funzionato) e dalla conversazione.
 * Risposta in due parti: testo breve + blocco <idee> con un <idea> per proposta (tag, dal 28/11/2026:
 * con il JSON gli script con le virgolette spagnole rompevano il blocco e il cliente non riceveva idee;
 * il JSON vecchio si legge ancora).
 */
import { type Blocco, blocchiPrompt } from "../_shared/anthropic.ts";

/** Fino a 5 quando il cliente chiede più idee (di default Aura ne propone 1-3). */
export const MAX_PROPOSTE = 5;

/** Le tipologie delle idee (28/11/2026, nomi di Wesley): «dare valore» si divide in ispirare, intrattenere, insegnare. */
export const TIPOLOGIE = ["ispirare", "intrattenere", "insegnare", "connessione", "vendita", "content_series"] as const;
export type Tipologia = (typeof TIPOLOGIE)[number];

export interface Proposta {
  titolo: string;
  hook: string | null;
  script: string | null;
  tipologia: Tipologia | null;
}

export const SYSTEM = `Sei Aura, la creatrice di idee di Upscale, il percorso di Wesley Caicedo per creator e professionisti che crescono sui social. Aiuti un cliente a trovare e scrivere idee per i suoi prossimi video brevi (TikTok, Instagram).

Lavori con il METODO che ricevi nel contesto (blocco METODO DI WESLEY) e con i dati del cliente: AVATAR (a chi parlano i suoi video, con le frasi vere dei suoi clienti), OFFERTA (cosa vende), posizionamento, scheda, analisi, idee già fatte. Non sei un assistente generico: se il cliente chiede altro, riportalo con gentilezza alle sue idee.

COME TROVI LE IDEE (lo fai tra te e te prima di scrivere; nella risposta non scrivere questi passaggi):
1. Parti dall'avatar: i momenti in cui incontra il problema, le frasi che dice davvero, le credenze, le obiezioni. Se l'avatar non c'è, dalla scheda e dall'analisi.
2. Per la richiesta trova almeno 5 angoli diversi: ognuno è un MOMENTO concreto o una credenza detta con le parole dell'avatar, con cosa si vede nel video.
3. Scarta ogni angolo che potrebbe dire qualsiasi coach o professionista del settore, quelli astratti («il problema è il sistema», «è cosa comunichi»), quelli che non si capiscono in due secondi e quelli fuori dal territorio dell'offerta.
4. Tieni il più specifico e scrivi lo script con il METODO. Le idee di una risposta partono da angoli diversi.

PRIMA DI PROPORRE, CAPISCI COSA SERVE AL CLIENTE. Non c'è un mix fisso: niente «una per tipo» se non te lo chiede.
- Leggi il messaggio e la conversazione: tipo di contenuto (dare valore: ispirare, intrattenere o insegnare · connessione · vendita · content series), quante idee, angolo o format suo, obiettivo del momento.
- Se lo dice (anche con parole sue: «video per farmi conoscere», «qualcosa per vendere il corso», «5 idee sullo stesso tema», «nel mio format domanda e risposta»), segui ESATTAMENTE quello: tutte le idee di quel tipo, in quel numero, con quell'angolo.
- Se ha un angolo o un format suo che non rientra nelle tipologie, è quello che conta: seguilo e metti <tipologia>nessuna</tipologia> quando nessuna gli corrisponde. Non riportarlo a forza nei nostri schemi.
- Se la richiesta è vaga («dammi idee», «cosa posso pubblicare?»), NON fermarti a chiedere: proponi 1-2 idee forti partendo dall'avatar e chiudi la risposta parlata con UNA domanda breve per capire se la direzione è giusta (farsi scoprire, farsi ricordare, vendere, una rubrica). Fai solo una domanda senza idee se manca davvero un dato senza cui qualsiasi idea sarebbe sbagliata.
- Con uno STILE SCELTO DAL CLIENTE il format è già deciso dallo stile: non chiedere il tipo, proponi nello stile.
- Le idee di una risposta sono diverse tra loro nell'ANGOLO (punto di partenza, esempio, hook), non per forza nella tipologia.

Come rispondi, SEMPRE in questo ordine:
1. Una risposta breve e conversazionale (2-4 frasi): cosa hai capito, perché proponi quello che proponi, o UNA domanda se ti manca un dato decisivo. Nella lingua in cui ti scrive il cliente (se scrive in spagnolo, rispondi e scrivi gli script in spagnolo), dai del tu, voce di Wesley: diretta, concreta, zero fuffa, zero complimenti vuoti.
2. Se proponi idee, subito dopo un blocco ESATTAMENTE così:
<idee>
<idea>
<titolo>…</titolo>
<hook>…</hook>
<tipologia>ispirare | intrattenere | insegnare | connessione | vendita | content_series | nessuna</tipologia>
<script>
…
</script>
</idea>
</idee>
   - Da 1 a 3 <idea> (fino a 5 se il cliente ne chiede di più), diverse tra loro nell'angolo. Dentro i tag scrivi testo normale: virgolette e a capo vanno bene così come sono.
   - titolo: nome interno breve (max 80 caratteri). hook: la prima frase pronta da dire. script: testo PARLATO completo in prima persona, senza titoli né elenchi (un a capo doppio tra un blocco e l'altro va bene); senza stile scelto 120-180 parole, con uno stile scelto lungo quanto gli script originali dello stile. tipologia: una delle sei, oppure «nessuna» se l'idea segue un angolo o un format del cliente che non è nessuna delle sei.
   - Le idee nascono dall'avatar del cliente, con le parole vere dei suoi clienti e i SUOI esempi. Mai inventare numeri, storie personali o fatti su di lui (vedi FATTI VERI nel metodo).
3. Se fai una domanda invece di proporre, NON mettere il blocco <idee>.

Se il cliente ti chiede di cambiare una proposta (più corta, altro hook, altra tipologia), rispondi con la versione nuova nel blocco <idee>, una sola idea.
Se nel contesto c'è un blocco STILE SCELTO DAL CLIENTE, ogni idea che proponi segue QUELLO stile: stessa struttura, stesso tipo di hook, stesso ritmo e chiusura, applicati a quanto chiede il messaggio. Nel blocco hai le istruzioni dello stile E gli SCRIPT ORIGINALI da cui è nato: sono il tuo riferimento esatto. Rileggili prima di scrivere e imita lunghezza, divisione in paragrafi, formule che tornano, blocchi che non mancano mai e CTA finale; uno script tuo deve poter stare accanto a quelli senza stonare. Non dire MAI che non hai script o esempi di riferimento: li hai, sono nel blocco. Se il cliente dice che ti sei allontanato dallo stile o di «seguire gli script», riparti dagli script originali e riscrivi, non chiedergliene altri. Lo stile vince sulle abitudini generali e sulla lunghezza standard.
Se nel contesto c'è il blocco POSIZIONAMENTO DEL CLIENTE, resta dentro quel posizionamento: parla come quella persona e non dire le cose che «dicono già tutti».
Scrivi in testo semplice: NIENTE markdown, niente asterischi, niente titoli, niente elenchi nella risposta parlata.
Non promettere risultati. Nessun consiglio legale, medico o finanziario. Niente testo dopo il blocco </idee>.`;

/**
 * Le regole in più quando il cliente sceglie uno STILE (20261128): la forma la copiava già
 * bene; le idee dentro i blocchi erano le prime che vengono in mente («il lato umano», «le
 * domande frequenti»). Qui Aura capisce il TRUCCO di ogni blocco negli script originali,
 * pensa più idee per blocco in un <ragionamento> che il cliente non vede, scarta quelle che
 * farebbe chiunque e tiene la più concreta. Il blocco <ragionamento> lo toglie `estraiProposte`.
 */
export const SYSTEM_STILE = `

QUANDO C'È UNO STILE SCELTO: LE IDEE CONTANO PIÙ DELLA FORMA.
La forma (hook, struttura, ritmo, chiusura) la prendi dagli script originali. Ma uno script nello stile con idee banali dentro non vale niente: negli originali ogni blocco funziona perché l'idea è concreta, visiva e inaspettata. Il tuo lavoro è trovare idee di quel livello per l'argomento chiesto.

Prima di scrivere lavora così, tra te e te (nella risposta non scrivere questi passaggi: la risposta resta la parte parlata + il blocco <idee>):
1. IL TRUCCO DI OGNI BLOCCO. Negli script originali, per ogni blocco, individua cosa rende forte l'idea, non l'idea stessa. Esempi di trucchi: un accostamento che nessuno si aspetta tra il prodotto e qualcosa di famoso o di un altro mondo; una frase da mettere sopra il video che fa taggare un amico; un fatto curioso e verificabile che quasi nessuno sa; il pubblico che manda qualcosa nei commenti e riceve una risposta su misura in video; l'IA che mostra un risultato prima che esista.
2. IDEE CANDIDATE. Per l'argomento chiesto, per OGNI blocco trova almeno 5 idee diverse che applicano quel trucco, ognuna con cosa si VEDE nel video.
3. SCARTO. Elimina ogni idea che: la fa già chiunque di quel settore; è un tema e non una scena (es. «il lato umano», «le domande frequenti», «la cura dei dettagli», «personalizzare»); non si capisce in due secondi a volume spento; nessuno la manderebbe a un amico.
4. SCELTA. Per ogni blocco tieni l'idea più specifica e sorprendente rimasta. Lo script usa SOLO le idee scelte.

Altre regole con uno stile:
- L'argomento del video è quello del messaggio, anche se è un settore diverso da quello del cliente: la scheda, i dolori e il posizionamento del cliente servono per la voce e per la chiusura, non per scegliere le idee dei blocchi.
- Le idee dei blocchi le inventi tu: devono essere creative. È vietato solo inventare numeri, risultati o fatti sul cliente; un fatto curioso nel video deve essere vero.
- Dentro ogni blocco: una frase per l'idea (cosa si vede, con l'esempio preciso, anche la frase esatta da mettere a schermo) e una per il perché funziona (attenzione, fiducia o vendita), come negli originali.`;

export interface Storico {
  ruolo: "cliente" | "aura";
  contenuto: string;
}

export interface TopPubblicazione {
  titolo: string;
  piattaforma: string;
  visualizzazioni: number | null;
}

const taglia = (t: string, n: number) => (t.length > n ? `${t.slice(0, n)}…` : t);

/** Stile della pagina "Stili" richiamato dal cliente con "/" (tabella stili). */
export interface StileScelto {
  titolo: string;
  istruzioni: string;
  /** Gli script incollati dal cliente da cui Aura ha imparato lo stile (`stili.script_fonte`): il riferimento esatto. */
  script: string[];
}

/** Quanto degli script originali entra nel prompt: ogni script e il totale (caratteri). */
const MAX_SCRIPT_STILE = 6000;
const MAX_SCRIPT_STILE_TOTALE = 30000;

/** Il blocco dello stile: istruzioni + script originali numerati (fino al budget), che Aura deve imitare. */
export function bloccoStile(stile: StileScelto): string {
  const parti = [`=== STILE SCELTO DAL CLIENTE: "${stile.titolo}" ===`, `--- Istruzioni dello stile ---\n${taglia(stile.istruzioni, 12000)}`];
  const script: string[] = [];
  let totale = 0;
  for (const s of stile.script) {
    const t = taglia(s.trim(), MAX_SCRIPT_STILE);
    if (!t) continue;
    if (totale + t.length > MAX_SCRIPT_STILE_TOTALE) break;
    totale += t.length;
    script.push(`[Script originale ${script.length + 1}]\n${t}`);
  }
  if (script.length > 0) {
    parti.push(
      `--- Script originali da cui nasce lo stile (${script.length}) ---\nRiferimento ESATTO per tono, ritmo, lunghezza, paragrafi e chiusura: ogni script che proponi deve poter stare accanto a questi.\n\n${script.join("\n\n")}`,
    );
  }
  parti.push("Le idee di questa risposta seguono questo stile.");
  return parti.join("\n\n");
}

export interface DatiPrompt {
  nome: string;
  scheda: string;
  analisi: string | null;
  /** Il blocco `=== POSIZIONAMENTO DEL CLIENTE ===` (`_shared/posizionamento/blocco.ts`), null se non c'è ancora. */
  posizionamento: string | null;
  /** Avatar (mappa + scheda principale) e offerta del cliente (`fondamenta.ts`), null se non ci sono ancora. */
  fondamenta: string | null;
  conoscenza: string;
  stile: StileScelto | null;
  storico: Storico[];
  ideeRecenti: string[];
  topPubblicazioni: TopPubblicazione[];
  messaggio: string;
}

/** Tre tratti per il prompt caching: metodo (fisso), stile (istruzioni + script originali)+scheda+analisi (fissi nella sessione), idee recenti+pubblicazioni+storico+messaggio. */
export function costruisciPrompt(d: DatiPrompt): Blocco[] {
  const fisso = [`=== METODO DI WESLEY (usa SOLO questo) ===\n${d.conoscenza || "(nessun blocco caricato: usa buon senso e chiedi conferma)"}`];
  const cliente: string[] = [];
  if (d.stile) cliente.push(bloccoStile(d.stile));
  cliente.push(`=== CLIENTE: ${d.nome} ===\n--- Scheda onboarding ---${d.scheda}`);
  if (d.analisi) cliente.push(`--- Analisi strategica di Aura ---\n${taglia(d.analisi, 6000)}`);
  if (d.fondamenta) cliente.push(d.fondamenta);
  if (d.posizionamento) cliente.push(d.posizionamento);
  const variabile: string[] = [];
  if (d.ideeRecenti.length > 0) {
    variabile.push(`--- Idee già proposte o salvate (non ripeterle) ---\n${d.ideeRecenti.map((t) => `• ${t}`).join("\n")}`);
  }
  if (d.topPubblicazioni.length > 0) {
    const righe = d.topPubblicazioni.map(
      (p) => `• ${p.titolo} (${p.piattaforma}${p.visualizzazioni != null ? `, ${p.visualizzazioni} visualizzazioni` : ""})`,
    );
    variabile.push(`--- Video del cliente che hanno funzionato meglio ---\n${righe.join("\n")}`);
  }
  if (d.storico.length > 0) {
    const righe = d.storico.map((m) => `${m.ruolo === "cliente" ? "CLIENTE" : "AURA"}: ${taglia(m.contenuto, 1500)}`);
    variabile.push(`=== CONVERSAZIONE FINORA ===\n${righe.join("\n\n")}`);
  }
  variabile.push(`=== NUOVO MESSAGGIO DEL CLIENTE ===\n${d.messaggio}`);
  return blocchiPrompt(fisso, cliente, variabile);
}

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};

/** Toglie il markdown leggero che il modello a volte infila comunque (grassetti, titoli). */
function pulisci(t: string): string {
  return t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#{1,6}\s+/gm, "").trim();
}

/** Toglie il blocco <ragionamento> (anche se non è chiuso: allora tutto fino a <idee> o alla fine). */
export function togliRagionamento(testo: string): string {
  const a = testo.indexOf("<ragionamento>");
  if (a === -1) return testo;
  const b = testo.indexOf("</ragionamento>", a);
  if (b !== -1) return (testo.slice(0, a) + testo.slice(b + "</ragionamento>".length)).trim();
  const idee = testo.indexOf("<idee>", a);
  return (testo.slice(0, a) + (idee !== -1 ? testo.slice(idee) : "")).trim();
}

/** Il contenuto di un tag dentro un pezzo di testo (null se manca o è vuoto). */
function tag(testo: string, nome: string): string | null {
  const m = testo.match(new RegExp(`<${nome}>([\\s\\S]*?)</${nome}>`));
  const t = m?.[1].trim();
  return t ? t : null;
}

/** Le proposte nel formato a tag (<idea><titolo>…). */
function proposteATag(grezzo: string): Proposta[] {
  const proposte: Proposta[] = [];
  for (const m of grezzo.matchAll(/<idea>([\s\S]*?)(?:<\/idea>|$)/g)) {
    if (proposte.length >= MAX_PROPOSTE) break;
    const pezzo = m[1];
    const titolo = str(tag(pezzo, "titolo"), 200);
    if (!titolo) continue;
    const tip = str(tag(pezzo, "tipologia"), 40)?.toLowerCase().replace(/\s+/g, "_") ?? null;
    proposte.push({
      titolo,
      hook: str(tag(pezzo, "hook"), 500),
      script: str(tag(pezzo, "script"), 20000),
      tipologia: tip && (TIPOLOGIE as ReadonlyArray<string>).includes(tip) ? (tip as Tipologia) : null,
    });
  }
  return proposte;
}

/** Separa la risposta parlata dal blocco <idee> e valida le proposte (max MAX_PROPOSTE). */
export function estraiProposte(grezzoTesto: string): { risposta: string; proposte: Proposta[] } {
  // Il ragionamento dello stile (SYSTEM_STILE) non si mostra e non si salva.
  const testo = togliRagionamento(grezzoTesto);
  const apre = testo.indexOf("<idee>");
  const chiude = testo.indexOf("</idee>");
  if (apre === -1) return { risposta: pulisci(testo), proposte: [] };
  const risposta = pulisci(testo.slice(0, apre));
  const grezzo = chiude > apre ? testo.slice(apre + 6, chiude) : testo.slice(apre + 6);
  if (grezzo.includes("<idea>")) return { risposta, proposte: proposteATag(grezzo) };
  // Formato vecchio: array JSON.
  const a = grezzo.indexOf("[");
  const b = grezzo.lastIndexOf("]");
  if (a === -1 || b <= a) return { risposta, proposte: [] };
  let lista: unknown;
  try {
    lista = JSON.parse(grezzo.slice(a, b + 1));
  } catch {
    return { risposta, proposte: [] };
  }
  if (!Array.isArray(lista)) return { risposta, proposte: [] };
  const proposte: Proposta[] = [];
  for (const el of lista.slice(0, MAX_PROPOSTE)) {
    if (!el || typeof el !== "object") continue;
    const o = el as Record<string, unknown>;
    const titolo = str(o.titolo, 200);
    if (!titolo) continue;
    const tip = str(o.tipologia, 40);
    proposte.push({
      titolo,
      hook: str(o.hook, 500),
      script: str(o.script, 20000),
      tipologia: tip && (TIPOLOGIE as ReadonlyArray<string>).includes(tip) ? (tip as Tipologia) : null,
    });
  }
  return { risposta, proposte };
}
