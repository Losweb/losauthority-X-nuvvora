/**
 * Fase Avatar dal 25/11/2026: una mappa per cliente + da una a tre schede.
 * La forma delle righe ({t, o}, coppie, spunte) è la stessa della Edge
 * Function: viene da `@avatar-forma/forma` (supabase/functions/_shared/avatar).
 */
import type { Tables } from "@/integrations/supabase/types";
import type { CampiMappa, ContenutoScheda, Origine, Partenza, Passo } from "@avatar-forma/forma";

export type { CampiMappa, Coppia, ContenutoScheda, Origine, Partenza, Passo, Spunta, Voce } from "@avatar-forma/forma";
export { contaVere, MIN_VERE } from "@avatar-forma/forma";

/** La riga di avatar_mappa con le colonne jsonb già tipizzate. */
export type MappaAvatar = Omit<Tables<"avatar_mappa">, keyof CampiMappa | "passo"> & Required<Pick<CampiMappa, "ponte" | "fuori" | "esempi" | "da_verificare">> & CampiMappa & { passo: Passo };
export type SchedaAvatar = Omit<Tables<"avatar_scheda">, "partenza" | "contenuto"> & { partenza: Partenza; contenuto: ContenutoScheda };
export type MessaggioMappa = Tables<"avatar_mappa_messaggi">;

/** Il link alla lezione «A chi parli? I 3 dubbi sull'avatar» (null = non ancora su Skool: il link non si mostra). */
export const LINK_LEZIONE_AVATAR: string | null = null;

/** I passi che il cliente vede nella barra (il quinto, «fatto», li segna tutti). */
export const PASSI_BARRA: Array<{ passo: Passo; etichetta: string }> = [
  { passo: "leggo", etichetta: "Leggo" },
  { passo: "analisi", etichetta: "Analisi" },
  { passo: "mappa", etichetta: "Mappa" },
  { passo: "schede", etichetta: "Schede" },
];

/** I tre dubbi della lezione: il testo del bottone è anche il messaggio che parte verso Aura. */
export const DUBBI = [
  "Avatar vuol dire che vendo a una persona sola?",
  "Parlo a questo mestiere o a quell'altro?",
  "Quanti avatar devo fare?",
] as const;

export const ETICHETTA_ORIGINE: Record<Origine, string> = { vera: "vera", riassunto: "riassunto", lettura: "ipotesi" };

/** Frasi di stato mentre Aura scrive. */
export const FASI_MAPPA = [
  "Leggo quello che so già di te…",
  "Conto le persone nella tua descrizione…",
  "Disegno la mappa…",
  "Scrivo la scheda…",
  "Ancora un attimo…",
] as const;

// ---------------------------------------------------------------------------
// Le sezioni della scheda, nell'ordine del documento di Wesley
// ---------------------------------------------------------------------------
export type TipoParte = "testo" | "voce" | "voci" | "coppie" | "spunte";
export interface Parte {
  /** Dove sta il valore nel contenuto, con i punti: "dolori.dice". */
  percorso: string;
  tipo: TipoParte;
  etichetta?: string;
  /** Per le coppie: cosa sono a e b. */
  a?: string;
  b?: string;
}
export interface SezioneScheda {
  titolo: string;
  parti: Parte[];
}

export const SEZIONI_SCHEDA: SezioneScheda[] = [
  { titolo: "Situazione", parti: [{ percorso: "situazione", tipo: "voce" }] },
  {
    titolo: "Ritratto",
    parti: [
      { percorso: "nome", tipo: "testo", etichetta: "Nome di lavoro" },
      { percorso: "eta", tipo: "testo", etichetta: "Età" },
      { percorso: "ritratto.cosa_fa", tipo: "voce", etichetta: "Cosa fa" },
      { percorso: "ritratto.dove_oggi", tipo: "voce", etichetta: "Dov'è oggi" },
      { percorso: "ritratto.gia_provato", tipo: "voce", etichetta: "Cosa ha già provato" },
      { percorso: "ritratto.come_decide", tipo: "voce", etichetta: "Come decide" },
    ],
  },
  { titolo: "Cosa gli manca", parti: [{ percorso: "cosa_manca", tipo: "voce" }] },
  {
    titolo: "Dolori",
    parti: [
      { percorso: "dolori.dice", tipo: "voci", etichetta: "Quello che dice" },
      { percorso: "dolori.sente", tipo: "voci", etichetta: "Quello che sente e non dice" },
      { percorso: "dolori.fa_comprare", tipo: "voce", etichetta: "Il dolore che lo fa comprare" },
    ],
  },
  { titolo: "Cosa non vede", parti: [{ percorso: "non_vede", tipo: "coppie", a: "Lui pensa che il problema sia", b: "Il problema vero" }] },
  {
    titolo: "Desideri",
    parti: [
      { percorso: "desideri.dice", tipo: "voci", etichetta: "Quelli che dice" },
      { percorso: "desideri.veri", tipo: "voci", etichetta: "Quelli veri" },
      { percorso: "desideri.scena", tipo: "voce", etichetta: "La scena che sogna" },
      { percorso: "desideri.prima", tipo: "voce", etichetta: "Prima" },
      { percorso: "desideri.dopo", tipo: "voce", etichetta: "Dopo" },
    ],
  },
  { titolo: "Cosa compra davvero", parti: [{ percorso: "compra_davvero", tipo: "voce" }] },
  { titolo: "Credenze false", parti: [{ percorso: "credenze", tipo: "coppie", a: "Crede che", b: "Cosa mettere al posto" }] },
  { titolo: "Momenti che lo fanno decidere", parti: [{ percorso: "momenti", tipo: "voci" }] },
  { titolo: "Obiezioni", parti: [{ percorso: "obiezioni", tipo: "coppie", a: "Obiezione", b: "Direzione della risposta" }] },
  {
    titolo: "Linguaggio",
    parti: [
      { percorso: "linguaggio.parole", tipo: "voci", etichetta: "Le sue parole" },
      { percorso: "linguaggio.mestiere", tipo: "coppie", etichetta: "Le parole del mestiere, tradotte", a: "Parola del mestiere", b: "Come la dice lui" },
      { percorso: "linguaggio.tono", tipo: "voce", etichetta: "Il tono" },
    ],
  },
  {
    titolo: "Dove sta",
    parti: [
      { percorso: "dove_sta.guarda", tipo: "voci", etichetta: "Dove guarda" },
      { percorso: "dove_sta.arriva", tipo: "voci", etichetta: "Come arriva" },
      { percorso: "dove_sta.cercato", tipo: "voci", etichetta: "Dove ha già cercato soluzioni" },
    ],
  },
  { titolo: "Come farlo sentire capito", parti: [{ percorso: "capito", tipo: "coppie", a: "Così no", b: "Così sì" }] },
  { titolo: "Su cosa parlare", parti: [{ percorso: "argomenti", tipo: "coppie", a: "Argomento", b: "Idea di video" }] },
  { titolo: "Da verificare", parti: [{ percorso: "da_verificare", tipo: "spunte" }] },
];

/**
 * Quello che si vede subito della scheda (26/11/2026, «solo il necessario»): chi è, cosa gli manca,
 * cosa dice, cosa vuole, le sue parole, le obiezioni. Tutto il resto del documento di Wesley sta
 * in «Tutta la scheda», piegato. Nome, età e situazione vanno nell'intestazione.
 */
export const SEZIONI_ESSENZIALI: SezioneScheda[] = [
  {
    titolo: "Chi è",
    parti: [
      { percorso: "ritratto.cosa_fa", tipo: "voce" },
      { percorso: "ritratto.dove_oggi", tipo: "voce" },
    ],
  },
  { titolo: "Cosa gli manca", parti: [{ percorso: "cosa_manca", tipo: "voce" }] },
  { titolo: "Cosa dice", parti: [{ percorso: "dolori.dice", tipo: "voci" }] },
  { titolo: "Cosa vuole davvero", parti: [{ percorso: "desideri.veri", tipo: "voci" }] },
  { titolo: "Le sue parole", parti: [{ percorso: "linguaggio.parole", tipo: "voci" }] },
  { titolo: "Obiezioni", parti: [{ percorso: "obiezioni", tipo: "coppie", a: "Obiezione", b: "Direzione della risposta" }] },
];
const IN_TESTA = new Set(["nome", "eta", "situazione"]);
const ESSENZIALI = new Set(SEZIONI_ESSENZIALI.flatMap((s) => s.parti.map((p) => p.percorso)));
/** Le sezioni del documento senza le parti già in testa o tra le essenziali. */
export const SEZIONI_RESTO: SezioneScheda[] = SEZIONI_SCHEDA.map((s) => ({
  ...s,
  parti: s.parti.filter((p) => !IN_TESTA.has(p.percorso) && !ESSENZIALI.has(p.percorso)),
})).filter((s) => s.parti.length > 0);

/** Il valore a un percorso con i punti ("dolori.dice.2"). */
export function valoreA(radice: unknown, percorso: string): unknown {
  return percorso.split(".").reduce<unknown>((v, k) => (v && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined), radice);
}

/** Il nome da mostrare per una scheda: il nome di lavoro, altrimenti la situazione della partenza. */
export function titoloScheda(s: SchedaAvatar): string {
  return s.contenuto.nome ?? s.partenza.situazione?.t ?? `Avatar ${s.ordine}`;
}

/** La scheda ha almeno una sezione scritta? */
export const schedaIniziata = (s: SchedaAvatar) => Object.keys(s.contenuto).some((k) => k !== "da_verificare");
