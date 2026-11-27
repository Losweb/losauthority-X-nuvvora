/**
 * Wesley Coach sulla mappa per argomenti (27/11/2026, decisione di Wesley: «un database
 * per argomenti»). Prima il coach riceveva tutto il catalogo (107 lezioni, ~21.000 token
 * a domanda, cache quasi mai utile perché le domande arrivano a ore di distanza). Ora:
 * 1. un modello piccolo legge solo l'elenco degli argomenti e sceglie quelli della domanda;
 * 2. la mappa (`lezioni_argomenti`) dà le lezioni, il minuto e la profondità;
 * 3. il coach riceve solo quelle lezioni, con il materiale per rispondere al dubbio.
 * Le parole chiave di prima restano come rete: entrano le 3 lezioni più pertinenti.
 */
import { type Argomento, ETICHETTA_PROFONDITA, elencoArgomenti, PESO_PROFONDITA, type VoceArgomento } from "../_shared/argomenti.ts";
import { formattaTempo } from "./capitoli.ts";
import { eLive, type Lezione, type Storico } from "./prompt.ts";

/** Il modello piccolo per scegliere gli argomenti: la scelta è facile, non serve il modello grande. */
export const MODELLO_SCEGLI = "claude-haiku-5-5";

export const SYSTEM_SCEGLI = `Scegli gli argomenti di una domanda. Ricevi l'ELENCO DEGLI ARGOMENTI della classroom di Wesley Caicedo (social, contenuti, vendita, IA per professionisti) e il messaggio di un cliente (con le ultime battute della conversazione, se ci sono).
Rispondi SOLO con il blocco qui sotto, i NUMERI degli argomenti dall'elenco, il più pertinente per primo, da 0 a 3:
<argomenti>[12, 4]</argomenti>
Scegli quelli di cui il cliente ha davvero bisogno per sbloccarsi, anche se usa parole diverse («montare» = editing, «agganciare» = gancio). Se il messaggio è un saluto o non chiede niente, rispondi <argomenti>[]</argomenti>.`;

export function promptScegli(argomenti: Argomento[], storico: Storico[], messaggio: string): string {
  const ultimi = storico.slice(-2).map((m) => `${m.ruolo === "cliente" ? "CLIENTE" : "COACH"}: ${m.contenuto.slice(0, 300)}`).join("\n");
  return [
    `=== ELENCO DEGLI ARGOMENTI ===\n${elencoArgomenti(argomenti)}`,
    ultimi ? `=== ULTIME BATTUTE ===\n${ultimi}` : "",
    `=== MESSAGGIO DEL CLIENTE ===\n${messaggio}`,
  ].filter(Boolean).join("\n\n");
}

/** I numeri scelti → gli argomenti (max 3, senza doppioni, solo numeri dell'elenco). */
export function estraiScelti(testo: string | null, argomenti: Argomento[]): Argomento[] {
  const m = testo?.match(/<argomenti>\s*(\[[\s\S]*?\])\s*<\/argomenti>/) ?? testo?.match(/(\[[\d\s,]*\])/);
  if (!m) return [];
  try {
    const numeri = JSON.parse(m[1]) as unknown[];
    const visti = new Set<number>();
    const out: Argomento[] = [];
    for (const n of numeri) {
      if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > argomenti.length || visti.has(n)) continue;
      visti.add(n);
      out.push(argomenti[n - 1]);
      if (out.length === 3) break;
    }
    return out;
  } catch {
    return [];
  }
}

export interface Candidata {
  lezione: Lezione;
  voci: Array<VoceArgomento & { argomento: string }>;
  punti: number;
}

/**
 * Le lezioni sugli argomenti scelti, dalla più utile: conta la profondità migliore
 * (passo passo > spiegazione > accenno), poi l'ordine degli argomenti, poi i corsi
 * prima delle live a parità. Si aggiungono le pertinenti per parole chiave non già dentro. Max 6.
 */
export function candidate(scelti: Argomento[], voci: VoceArgomento[], lezioni: Map<string, Lezione>, pertinenti: Lezione[]): Candidata[] {
  const ordine = new Map(scelti.map((a, i) => [a.id, i]));
  const nomi = new Map(scelti.map((a) => [a.id, a.nome]));
  const perLezione = new Map<string, Candidata>();
  for (const v of voci) {
    const l = lezioni.get(v.lezione_id);
    if (!l) continue;
    const punti = PESO_PROFONDITA[v.profondita] * 10 - (ordine.get(v.argomento_id) ?? 3) * 3 + (eLive(l) ? 0 : 2);
    const c = perLezione.get(l.id) ?? { lezione: l, voci: [], punti: 0 };
    c.voci.push({ ...v, argomento: nomi.get(v.argomento_id) ?? "" });
    c.punti = Math.max(c.punti, punti);
    perLezione.set(l.id, c);
  }
  const dallaMappa = [...perLezione.values()].sort((a, b) => b.punti - a.punti).slice(0, 6);
  // Rete di sicurezza: le parole chiave di prima, solo per ciò che la mappa non ha già portato.
  const extra = pertinenti.filter((l) => !perLezione.has(l.id)).slice(0, dallaMappa.length ? 2 : 4).map((l) => ({ lezione: l, voci: [], punti: 0 }));
  return [...dallaMappa, ...extra];
}

const taglia = (t: string, n: number) => (t.length > n ? `${t.slice(0, n)}…` : t);

/**
 * Il blocco per il coach: gli argomenti scelti, poi per ogni lezione candidata le voci
 * della mappa (profondità, minuto, cosa dice) e, per le lezioni di corso più utili, la
 * descrizione intera (spesso sono già i passaggi e i prompt) da cui prendere la risposta.
 * Se tre lezioni dello stesso corso parlano del tema, lo si dice: è un corso intero.
 */
export function bloccoMappa(scelti: Argomento[], cand: Candidata[]): string {
  const parti: string[] = [];
  parti.push(
    scelti.length
      ? `=== ARGOMENTI DEL MESSAGGIO ===\n${scelti.map((a) => `- ${a.nome}${a.descrizione ? ` — ${a.descrizione}` : ""}`).join("\n")}`
      : "=== ARGOMENTI DEL MESSAGGIO ===\nNessuno dall'elenco: le lezioni qui sotto vengono solo dalle parole chiave, controlla che c'entrino davvero.",
  );
  const perCorso = new Map<string, number>();
  for (const c of cand) if (c.voci.length && c.lezione.corso && !eLive(c.lezione)) perCorso.set(c.lezione.corso, (perCorso.get(c.lezione.corso) ?? 0) + 1);
  const corsi = [...perCorso.entries()].filter(([, n]) => n >= 2);
  if (corsi.length) parti.push(`=== CORSI INTERI SUL TEMA ===\n${corsi.map(([c, n]) => `- «${c}»: ${n} lezioni su questo argomento. È un corso fatto apposta: dillo nel testo e parti dalla sua prima lezione tra quelle qui sotto.`).join("\n")}`);

  let materiale = 0;
  const righe = cand.map((c, i) => {
    const l = c.lezione;
    const tipo = eLive(l) ? "LIVE" : "CORSO";
    const testa = `[${l.id}] ${tipo} · ${l.corso ?? "—"} › ${l.titolo}`;
    const voci = c.voci
      .sort((a, b) => (a.inizio_sec ?? 0) - (b.inizio_sec ?? 0))
      .map((v) => {
        const quando = v.inizio_sec !== null ? ` · dal minuto ${formattaTempo(v.inizio_sec)}${v.durata_min ? ` (${v.durata_min} min)` : ""}` : "";
        return `  - ${v.argomento} · ${ETICHETTA_PROFONDITA[v.profondita]}${quando}: ${v.riassunto}`;
      });
    // Il materiale intero solo per le prime lezioni di corso: è da lì che il coach prende i passaggi.
    let testo = "";
    if (tipo === "CORSO" && i < 4 && l.descrizione?.trim() && materiale < 9000) {
      const d = taglia(l.descrizione.replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim(), 3000);
      materiale += d.length;
      testo = `\n  Materiale della lezione (scritto da Wesley):\n  ${d.replace(/\n/g, "\n  ")}`;
    } else if (!c.voci.length && l.descrizione?.trim()) {
      testo = `\n  ${taglia(l.descrizione.replace(/\s+/g, " ").trim(), 500)}`;
    }
    return `${testa}${voci.length ? `\n${voci.join("\n")}` : ""}${testo}`;
  });
  parti.push(
    cand.length
      ? `=== LEZIONI SUGLI ARGOMENTI DEL MESSAGGIO (scegli SOLO tra queste; la prima è la più utile secondo la mappa) ===\n${righe.join("\n\n")}`
      : "=== LEZIONI SUGLI ARGOMENTI DEL MESSAGGIO ===\nNessuna: su questo tema Wesley non ha una lezione. Dillo con onestà in una frase («su questo nelle lezioni non c'è niente di preciso»). NON dare regole, numeri, durate, frequenze o procedure tue, nemmeno «di solito»: quello che diresti tu non è il metodo di Wesley. Al massimo una frase di buon senso, detta come tale, e suggerisci di portare la domanda a Wesley nella prossima live. Niente blocco <lezioni>.",
  );
  return parti.join("\n\n");
}
