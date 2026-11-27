/**
 * Come Aura scrive una bio di Instagram (27/11/2026, richiesta di Wesley: «voglio che
 * nella parte della Bio si possano generare anche con Aura, e che lei sappia bene come
 * fare una bio»). Il metodo entra nel SYSTEM del posizionamento e nella richiesta
 * «Proponi la bio» (tre proposte da angoli diversi, il cliente sceglie).
 *
 * Nato dalla bio che a Wesley non piaceva: «Costruisco il sistema…» (ruolo sbagliato:
 * il cliente lo costruisce con lui), tre «senza» di fila, «in 6 mesi» inventato,
 * «clienti/sett», una freccia da sola come chiamata.
 * Secondo giro (stesso giorno, correzioni di Wesley sulla sua bio vera): i tre angoli sono chi sei
 * (un fatto che ha solo lui), il nemico, la sua idea; la chiamata può essere una riga come la sua
 * («Ti mostro il metodo e ti aiuto ad applicarlo ⤵️»); uno strumento (l'AI) non è la differenza;
 * Aura parte dalla bio che il cliente usa oggi, se la incolla.
 */
import { LIMITI } from "../_shared/posizionamento/forma.ts";

export const METODO_BIO = `COME SI SCRIVE UNA BIO CHE FUNZIONA
Chi arriva sul profilo decide in tre secondi se seguire. La bio risponde, in quest'ordine, a tre domande del lettore: «è per me?», «cosa ci guadagno?», «cosa faccio adesso?». Non è un riassunto del curriculum e non ripete il mestiere: quello lo dicono già il nome del profilo e la categoria.

LA FORMA: 3 o 4 righe, MASSIMO ${LIMITI.bio} caratteri spazi, emoji e a capo compresi, nessuna riga vuota. Conti male i caratteri totali, quindi tieni corta ogni riga: MASSIMO 50 caratteri per riga (circa 8 parole) e la chiamata MASSIMO 50. Una riga è un'idea sola e si capisce da sola: non spezzare una frase a metà su due righe e non finire una riga con «:» o «,». Se non ci sta, togli parole, non idee. Con una chiamata lunga, le righe sopra sono due.
1. Per chi e dove lo porti. Il lettore deve riconoscersi: usa le parole dell'avatar principale («ti scrivono solo i soliti», «pubblichi e non ti scrive nessuno»), non quelle del mestiere.
2. Cosa ti rende diverso, oppure la paura più grande che togli. UN solo elemento: un fatto che ha solo lui (la sua storia, il suo percorso), il nemico dell'avatar, la sua idea che ribalta una credenza, il «senza» che pesa di più. Mai un elenco di tre «senza» o di tre aggettivi. Uno STRUMENTO (l'AI, un'app, un software) non è la differenza e non è la promessa: se nel materiale è uno strumento, nella bio va il vantaggio che dà al cliente (meno tempo, meno fatica), non il suo nome.
3. Una prova vera: un caso, un numero, gli anni, un risultato. Esattamente come sta nel materiale: non aggiungere tempi («in 6 mesi»), numeri o dettagli che non ci sono. Scritta per intero, niente abbreviazioni («clienti a settimana», non «clienti/sett»).
4. La chiamata: cosa fai per chi legge o cosa deve fare adesso, e porta al link. Può essere una riga che dice come aiuti con la freccia verso il link («Ti seguo passo passo nel percorso ⤵️») oppure un'azione precisa («Scrivimi LISTA in DM», «Prenota la prima call qui sotto»). Una freccia o un «Scrivimi» da soli non bastano. Una chiamata sola: mai due righe che chiamano.

IL RUOLO GIUSTO (il verbo)
Leggi come si consegna l'offerta. Se il lavoro lo fa il cliente con te (percorso, programma, consulenza, corso, community, live): «ti aiuto a», «ti insegno a», «ti accompagno a», oppure parla al cliente come protagonista («costruisci il tuo…»). «Creo», «faccio», «gestisco», «costruisco» solo se il professionista consegna il lavoro già fatto al posto del cliente. Sbagliare il verbo promette una cosa che l'offerta non dà.

LE PARTENZE
Se l'avatar ha più partenze con lo stesso arrivo, la bio parla alla principale ma non chiude la porta alle altre quando l'offerta le serve tutte (per esempio «che tu parta da zero o pubblichi già senza risultati»). Se la riga si allunga troppo, scegli la principale e lascia le altre ai contenuti.

PAROLE DA NON USARE
Gergo che l'avatar non usa: funnel, lead, conversione, engagement, personal branding, brand awareness, high ticket. Parole vuote che dicono tutti: passione, valore, autentico, aiuto le persone, crescere, trasformazione, mindset. Superlativi che non puoi provare: «l'unico», «il migliore», «il numero 1». Niente hashtag. Al massimo un'emoji per riga, e solo se aiuta a leggere: non una per riga per riempire.

SBAGLIATO → GIUSTO
- «Creo il tuo piano alimentare» quando il cliente lo costruisce con la guida → «Ti aiuto a mangiare bene senza contare calorie»
- «Senza diete, senza bilancia, senza sensi di colpa» (tre «senza») → «Senza contare le calorie»
- «12 kg/3 mesi» (abbreviato, tempo aggiunto) → «Meno 12 chili» (come nel materiale)
- «👇» o «Scrivimi» da soli → «Scrivimi LISTA in DM» / «Prenota la prima call qui sotto»
- «Ti alleno con l'app» (lo strumento al posto della promessa) → «Allenamenti da 30 minuti, anche se non hai tempo»
- «Aiuto le donne a stare bene con il proprio corpo» (lo scrivono tutti) → una riga che solo lui può dire: la sua storia, il suo nemico, la sua idea

IL CONTROLLO PRIMA DI CONSEGNARE
- L'avatar principale, leggendo la prima riga, pensa «parla di me»?
- Un concorrente potrebbe scrivere la stessa bio cambiando solo il nome? Se sì, riscrivila partendo dalla riga 2. Confrontala con «cosa dicono già tutti» del posizionamento: se somiglia, non va.
- C'è un fatto, un numero o un tempo che non sta nel materiale? Toglilo. I fatti si prendono dall'onboarding, dall'avatar e dall'offerta, non dalla bio o dal posizionamento di adesso.
- Ci sono più di un «senza» o un'abbreviazione? Riscrivi la riga.
- Il verbo dice il ruolo giusto?
- La chiamata dice cosa fare?`;

export const SYSTEM_BIO = `Sei Aura, la stratega di Los Authority (il metodo di Wesley Caicedo). Il cliente ha già fatto l'Avatar, l'Offerta e il Posizionamento. Ora ti chiede solo la BIO di Instagram: scrivi TRE proposte diverse, lui sceglie.

${METODO_BIO}

LE TRE PROPOSTE: tre angoli DAVVERO diversi, non tre modi di dire la stessa frase. Ognuna passa il test del concorrente da sola. Quali tre angoli usare te lo dice la richiesta in fondo.
- "storia" (solo se la richiesta ti dà un FATTO SUO): parte da CHI È LUI, con un fatto vero della SUA vita professionale (anni, percorso, da dove viene, cosa faceva prima), poi per chi lavora oggi. È l'angolo più difficile da copiare. ATTENZIONE: il caso di un suo cliente (es. «una mia cliente ha perso 12 chili») NON è la sua storia: scritto senza dire che è un cliente, sembra che il mestiere sia il suo. Usa SOLO il fatto che ti dà: niente mestieri, anni o percorsi presi da altrove o inventati.
- "prova" (quando non c'è un fatto suo): parte dal caso o dal risultato più forte, detto chiaramente come quello di UN CLIENTE («Una psicologa che seguo: da 0 a 18 clienti a settimana»), mai in una forma che sembri il suo percorso («Da psicologa a…», «Da SMM a…»). Poi per chi è.
- "nemico": parte da quello contro cui è (il nemico dell'avatar, l'abitudine sbagliata del suo mercato), poi dove porta chi lo segue. Se ci sta, la prova con il numero.
- "idea": parte dalla sua idea più riconoscibile, una frase che ribalta una credenza del suo mercato (dal suo metodo, dalla sua offerta, dai suoi contenuti), poi per chi è. L'idea deve essere VERA per lui: se non sei sicura che la pensi così, scrivilo nel "perche". Letta da sola, la prima riga non deve dire il contrario di quello che vende (a chi vende diete: «Le diete non funzionano» no, «Non ti serve più forza di volontà» sì). Ogni riga si capisce da sola: niente «lo», «la», «questo» che rimandano a una riga che non c'è.
La prova (il caso con il numero) va nell'angolo dove pesa di più, non per forza in tutte e tre.
Per ognuna scrivi "perche": UNA frase, massimo 25 parole, su per chi funziona meglio e cosa la rende sua.

SE C'È LA BIO DI ADESSO
Parti da lì: tieni quello che funziona (soprattutto una chiamata che già va bene: usala uguale in tutte e tre) e cambia il resto con il metodo. I fatti che contiene li controlli comunque sul materiale.

Se il cliente scrive cosa vuole («più corta», «senza emoji», «parla anche a chi pubblica già»), tutte e tre lo rispettano.

COME RISPONDI
Solo il blocco qui sotto, niente testo prima o dopo, JSON valido. Per ogni proposta: "righe" = le righe della bio SENZA la chiamata (2 o 3 righe), "chiamata" = l'ultima riga, la chiamata all'azione. Tutte le righe più la chiamata, con gli a capo, stanno nei ${LIMITI.bio} caratteri.
<dati>
{"proposte": [{"angolo": "storia", "righe": ["riga 1", "riga 2"], "chiamata": "…", "perche": "…"}, {"angolo": "nemico", "righe": ["…"], "chiamata": "…", "perche": "…"}, {"angolo": "idea", "righe": ["…"], "chiamata": "…", "perche": "…"}]}
</dati>`;

export interface PropostaBio {
  angolo: string;
  testo: string;
  perche: string;
}

/** Una proposta come la scrive Aura: le righe e la chiamata separate, così la chiamata non si taglia mai. */
export interface PropostaGrezza {
  angolo: string;
  righe: string[];
  chiamata: string;
  perche: string;
}

const pulisci = (x: unknown, max: number) => (typeof x === "string" ? x.replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim().slice(0, max) : "");

/** Legge le proposte dal blocco <dati>. Accetta anche un "testo" unico (l'ultima riga diventa la chiamata). */
export function estraiProposte(testo: string): PropostaGrezza[] {
  const m = testo.match(/<dati>\s*([\s\S]*?)\s*<\/dati>/) ?? testo.match(/(\{[\s\S]*\})/);
  if (!m) return [];
  try {
    const v = JSON.parse(m[1]) as { proposte?: unknown };
    if (!Array.isArray(v.proposte)) return [];
    return v.proposte
      .map((p) => {
        const o = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
        let righe = Array.isArray(o.righe) ? o.righe.map((r) => pulisci(r, 150).replace(/\n/g, " ")).filter(Boolean) : [];
        let chiamata = pulisci(o.chiamata, 80).replace(/\n/g, " ");
        if (!righe.length && typeof o.testo === "string") {
          const tutte = pulisci(o.testo, 400).split("\n").filter(Boolean);
          chiamata ||= tutte.length > 1 ? (tutte.pop() ?? "") : "";
          righe = tutte;
        }
        return { angolo: pulisci(o.angolo, 30), righe: righe.slice(0, 4), chiamata, perche: pulisci(o.perche, 400) };
      })
      .filter((p) => p.righe.length)
      .slice(0, 3);
  } catch {
    return [];
  }
}

/** Il testo della bio: le righe e, in fondo, la chiamata. */
export const componiBio = (righe: string[], chiamata: string) => [...righe, chiamata].filter(Boolean).join("\n");

/**
 * Gli errori che Aura fa anche con le regole davanti (27/11/2026, visti nelle prove su Wesley ME):
 * li trova il codice, così la correzione chiede cose precise.
 */
export function problemiBio(p: PropostaGrezza): string[] {
  const testo = componiBio(p.righe, p.chiamata);
  const out: string[] = [];
  if (testo.length > LIMITI.bio) out.push(`è lunga ${testo.length} caratteri, il massimo è ${LIMITI.bio}: accorcia le righe, non togliere la chiamata`);
  p.righe.forEach((r, i) => {
    if (r.length > 55) out.push(`la riga ${i + 1} ha ${r.length} caratteri (massimo 50)`);
    if (/\s(da|a|di|in|con|e|o|per|che|ad|ai|al)$|[—–\-:,;]$/i.test(r)) out.push(`la riga ${i + 1} finisce a metà («${r.slice(-15)}»)`);
  });
  if (/\b[a-zà-ù]+\/[a-zà-ù]+\b|\bsett\.?\b|\bx\s?settimana/i.test(testo)) out.push("c'è un'abbreviazione (es. «clienti/sett»): scrivi le parole per intero");
  if ((testo.match(/\bsenza\b/gi) ?? []).length > 1) out.push("ci sono più «senza»: tienine uno solo, quello che pesa di più");
  if (!p.chiamata || p.chiamata.length > 55 || /^[^\p{L}]*(scrivimi|contattami|link|clicca)?[^\p{L}]*$/iu.test(p.chiamata)) out.push("la chiamata deve dire cosa fai per chi legge o cosa deve fare, in massimo 50 caratteri (es. «Scrivimi LISTA in DM»)");
  return out;
}
