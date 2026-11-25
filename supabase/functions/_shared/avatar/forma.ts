/**
 * La forma della fase Avatar (dal 25/11/2026, «A chi parli? I 3 dubbi
 * sull'avatar»): UNA mappa per cliente (`avatar_mappa`) e da una a tre schede,
 * una per partenza (`avatar_scheda`). Ogni riga di contenuto porta la sua
 * origine: «vera» (l'ha detta un cliente o lui), «riassunto» (detta, ma con
 * parole di Aura), «lettura» (ipotesi di Aura, da confermare).
 *
 * TypeScript puro, senza Deno: lo importano la Edge Function aura-avatar e il
 * frontend (alias `@avatar-forma/*`), così la forma vive in un posto solo.
 */

export const ORIGINI = ["vera", "riassunto", "lettura"] as const;
export type Origine = (typeof ORIGINI)[number];

/** Una riga: testo + origine. */
export interface Voce {
  t: string;
  o: Origine;
}
/** Una coppia: «lui pensa che → il problema vero», «obiezione → risposta»… */
export interface Coppia {
  a: string;
  b: string;
  o: Origine;
}
/** Una riga da spuntare (Da verificare). */
export interface Spunta {
  t: string;
  fatto: boolean;
}

export const PASSI = ["leggo", "analisi", "mappa", "schede", "fatto"] as const;
export type Passo = (typeof PASSI)[number];
export const TIPI = ["servizio", "prodotto"] as const;
export type Tipo = (typeof TIPI)[number];

export interface Fuori {
  chi: string;
  perche: string;
  o: Origine;
}
export interface Esempio {
  persona: string;
  frase: string;
  o: Origine;
}
export interface Partenza {
  situazione?: Voce;
  descrizione?: Voce;
  cosa_manca?: Voce;
}

/** I campi della mappa che Aura scrive (colonne di `avatar_mappa`). */
export interface CampiMappa {
  tipo?: Tipo;
  ponte?: Voce[];
  arrivo?: Voce;
  principale_perche?: Voce;
  proporzione?: Voce;
  fuori?: Fuori[];
  esempi?: Esempio[];
  da_verificare?: Spunta[];
  offerta_da_costruire?: boolean;
}

/** La scheda di un avatar (colonna `contenuto` di `avatar_scheda`). */
export interface ContenutoScheda {
  nome?: string;
  eta?: string;
  situazione?: Voce;
  ritratto?: { cosa_fa?: Voce; dove_oggi?: Voce; gia_provato?: Voce; come_decide?: Voce };
  cosa_manca?: Voce;
  dolori?: { dice?: Voce[]; sente?: Voce[]; fa_comprare?: Voce };
  non_vede?: Coppia[];
  desideri?: { dice?: Voce[]; veri?: Voce[]; scena?: Voce; prima?: Voce; dopo?: Voce };
  compra_davvero?: Voce;
  credenze?: Coppia[];
  momenti?: Voce[];
  obiezioni?: Coppia[];
  linguaggio?: { parole?: Voce[]; mestiere?: Coppia[]; tono?: Voce };
  dove_sta?: { guarda?: Voce[]; arriva?: Voce[]; cercato?: Voce[] };
  capito?: Coppia[];
  argomenti?: Coppia[];
  da_verificare?: Spunta[];
}

export type Sezione = keyof ContenutoScheda;

// ---------------------------------------------------------------------------
// Pulizia: da un JSON qualsiasi (la risposta di Aura) alla forma valida.
// ---------------------------------------------------------------------------
const MAX_TESTO = 600;
const MAX_LISTA = 12;

const pulisci = (v: unknown, max = MAX_TESTO): string | null => {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
};
const origine = (v: unknown): Origine => ((ORIGINI as readonly string[]).includes(v as string) ? (v as Origine) : "lettura");

/** «Le virgolette solo per le frasi vere»: alle righe non vere si tolgono quelle esterne. */
const senzaVirgolette = (t: string) => t.replace(/^[«"“„]+\s*/, "").replace(/\s*[»"”]+(\.?)$/, "$1").trim() || t;

export function voce(v: unknown): Voce | undefined {
  if (typeof v === "string") {
    const t = pulisci(v);
    return t ? { t: senzaVirgolette(t), o: "lettura" } : undefined;
  }
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const t = pulisci(o.t ?? o.testo);
  if (!t) return undefined;
  const or = origine(o.o ?? o.origine);
  return { t: or === "vera" ? t : senzaVirgolette(t), o: or };
}

function lista<T>(v: unknown, f: (x: unknown) => T | undefined, max = MAX_LISTA): T[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v.map(f).filter((x): x is T => x !== undefined).slice(0, max);
}
export const voci = (v: unknown, max = MAX_LISTA) => lista(v, voce, max);

/**
 * Una coppia. Aura a volte usa chiavi sue ({crede, al_posto}, {no, si}…) o una lista di due testi:
 * se mancano a e b si prendono i primi due testi nell'ordine in cui arrivano (prova del 25/11/2026:
 * credenze e «come farlo sentire capito» arrivavano così e finivano vuote).
 */
export function coppia(v: unknown): Coppia | undefined {
  if (Array.isArray(v)) {
    const [a, b] = v.map((x) => pulisci(x));
    return a && b ? { a, b, o: "lettura" } : undefined;
  }
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  let a = pulisci(o.a);
  let b = pulisci(o.b);
  if (!a || !b) {
    const testi = Object.entries(o)
      .filter(([k]) => k !== "o" && k !== "origine")
      .map(([, x]) => pulisci(x))
      .filter((x): x is string => !!x);
    [a, b] = [testi[0] ?? null, testi[1] ?? null];
  }
  if (!a || !b) return undefined;
  const or = origine(o.o ?? o.origine);
  return or === "vera" ? { a, b, o: or } : { a: senzaVirgolette(a), b: senzaVirgolette(b), o: or };
}
export const coppie = (v: unknown, max = MAX_LISTA) => lista(v, coppia, max);

export function spunta(v: unknown): Spunta | undefined {
  if (typeof v === "string") {
    const t = pulisci(v);
    return t ? { t, fatto: false } : undefined;
  }
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const t = pulisci(o.t);
  return t ? { t, fatto: o.fatto === true } : undefined;
}
export const spunte = (v: unknown) => lista(v, spunta);

/** Un oggetto di sole Voce o liste di Voce (ritratto, dolori, desideri…): le chiavi ammesse e il loro tipo. */
function gruppo(v: unknown, forma: Record<string, "voce" | "voci" | "coppie">): Record<string, unknown> | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const o = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, tipo] of Object.entries(forma)) {
    const x = tipo === "voce" ? voce(o[k]) : tipo === "voci" ? voci(o[k]) : coppie(o[k]);
    if (x !== undefined) out[k] = x;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

const FORMA_GRUPPI = {
  ritratto: { cosa_fa: "voce", dove_oggi: "voce", gia_provato: "voce", come_decide: "voce" },
  dolori: { dice: "voci", sente: "voci", fa_comprare: "voce" },
  desideri: { dice: "voci", veri: "voci", scena: "voce", prima: "voce", dopo: "voce" },
  linguaggio: { parole: "voci", mestiere: "coppie", tono: "voce" },
  dove_sta: { guarda: "voci", arriva: "voci", cercato: "voci" },
} as const;

/** Le sezioni della scheda arrivate in questo turno, pulite (una sezione arriva sempre intera). */
export function pulisciScheda(v: unknown): ContenutoScheda {
  const out: Record<string, unknown> = {};
  if (!v || typeof v !== "object") return out;
  const o = v as Record<string, unknown>;
  const nome = pulisci(o.nome, 60);
  if (nome) out.nome = nome;
  const eta = pulisci(o.eta, 40);
  if (eta) out.eta = eta;
  for (const k of ["situazione", "cosa_manca", "compra_davvero"] as const) {
    const x = voce(o[k]);
    if (x) out[k] = x;
  }
  for (const k of ["non_vede", "credenze", "obiezioni", "capito"] as const) {
    const x = coppie(o[k]);
    if (x) out[k] = x;
  }
  const argomenti = coppie(o.argomenti, 10);
  if (argomenti) out.argomenti = argomenti;
  const momenti = voci(o.momenti);
  if (momenti) out.momenti = momenti;
  const dv = spunte(o.da_verificare);
  if (dv) out.da_verificare = dv;
  for (const [k, forma] of Object.entries(FORMA_GRUPPI)) {
    const g = gruppo(o[k], forma);
    if (g) out[k] = g;
  }
  return out as ContenutoScheda;
}

export function pulisciPartenza(v: unknown): Partenza {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const out: Partenza = {};
  for (const k of ["situazione", "descrizione", "cosa_manca"] as const) {
    const x = voce(o[k]);
    if (x) out[k] = x;
  }
  return out;
}

export function pulisciMappa(v: unknown): CampiMappa {
  const out: CampiMappa = {};
  if (!v || typeof v !== "object") return out;
  const o = v as Record<string, unknown>;
  if ((TIPI as readonly string[]).includes(o.tipo as string)) out.tipo = o.tipo as Tipo;
  const ponte = voci(o.ponte, 3);
  if (ponte) out.ponte = ponte;
  for (const k of ["arrivo", "principale_perche", "proporzione"] as const) {
    const x = voce(o[k]);
    if (x) out[k] = x;
  }
  const fuori = lista(o.fuori, (x): Fuori | undefined => {
    if (!x || typeof x !== "object") return undefined;
    const r = x as Record<string, unknown>;
    const chi = pulisci(r.chi);
    return chi ? { chi, perche: pulisci(r.perche) ?? "", o: origine(r.o) } : undefined;
  }, 6);
  if (fuori) out.fuori = fuori;
  const esempi = lista(o.esempi, (x): Esempio | undefined => {
    if (!x || typeof x !== "object") return undefined;
    const r = x as Record<string, unknown>;
    const persona = pulisci(r.persona, 200);
    const f = pulisci(r.frase, 300);
    // Le virgolette le mette la pagina (solo alle frasi vere): qui il testo arriva sempre senza.
    const frase = f ? senzaVirgolette(f) : null;
    return persona && frase ? { persona, frase, o: origine(r.o) } : undefined;
  }, 4);
  if (esempi) out.esempi = esempi;
  const dv = spunte(o.da_verificare);
  if (dv) out.da_verificare = dv;
  if (typeof o.offerta_da_costruire === "boolean") out.offerta_da_costruire = o.offerta_da_costruire;
  return out;
}

// ---------------------------------------------------------------------------
// Conteggi
// ---------------------------------------------------------------------------
/** Tutte le origini di un valore qualsiasi (Voce, Coppia, liste, gruppi), per contare le frasi vere. */
export function origini(v: unknown): Origine[] {
  if (Array.isArray(v)) return v.flatMap(origini);
  if (!v || typeof v !== "object") return [];
  const o = v as Record<string, unknown>;
  if (typeof o.o === "string" && (typeof o.t === "string" || typeof o.a === "string" || typeof o.frase === "string" || typeof o.chi === "string")) {
    return [origine(o.o)];
  }
  return Object.values(o).flatMap(origini);
}

/** Sotto questa soglia di frasi vere la scheda mostra «questa scheda è in gran parte costruita». */
export const MIN_VERE = 3;
export const contaVere = (contenuto: unknown) => origini(contenuto).filter((o) => o === "vera").length;
