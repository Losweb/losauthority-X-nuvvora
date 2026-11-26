/**
 * La forma della fase Offerta (dal 26/11/2026, «Istruzioni per Aura — la fase
 * Offerta»): una offerta per cliente (riga `offerta`), due strade (versione
 * breve → una frase; scheda completa → sette fasi). Il contenuto nuovo vive in
 * `offerta.scheda` (jsonb), con l'origine di ogni riga: «vera» (l'ha detta il
 * cliente o un suo cliente) o «ipotesi» (l'ha pensata Aura).
 *
 * TypeScript puro: lo importano aura-offerta e il frontend (alias `@offerta-forma/*`).
 */

export type Origine = "vera" | "ipotesi";
export interface Voce {
  t: string;
  o: Origine;
}
export type Strada = "breve" | "completa";
export type Leva = "dove" | "quando" | "come" | "per_chi" | "cosa_togli";
export type Esito = "si" | "quasi" | "no";

export const LEVE: Leva[] = ["dove", "quando", "come", "per_chi", "cosa_togli"];
export const TEST = ["una_frase", "persona_precisa", "risultato_tempo", "dieci_volte", "consegnabile", "diversa"] as const;
export type Test = (typeof TEST)[number];
export const CRITERI = ["dolore", "soldi", "raggiunge", "cresce", "credibilita"] as const;
export type Criterio = (typeof CRITERI)[number];
export const LEVE_VALORE = ["risultato", "probabilita", "tempo", "fatica"] as const;
export type LevaValore = (typeof LEVE_VALORE)[number];

export interface Versione {
  leva: Leva;
  testo: string;
  vuole: boolean;
  puo: boolean;
  mestiere: boolean;
  o: Origine;
}
export interface Freno {
  freno: string;
  momento: "prima" | "durante" | "dopo";
  soluzione: string;
  consegna: string;
  posto: "dentro" | "bonus" | "fuori";
  o: Origine;
}
export interface Gradino {
  livello: "entrata" | "cuore" | "premium";
  nome: string;
  prezzo: string;
  contiene: string;
  ragionamento: string;
  o: Origine;
}
export interface Coppia {
  a: string;
  b: string;
  o: Origine;
}

export interface SchedaOfferta {
  arrivo?: Voce;
  centro?: Voce;
  come_fanno_tutti?: Voce;
  versioni?: Versione[];
  leva?: Leva | "nessuna";
  da_riprovare?: string;
  test?: Array<{ test: Test; esito: Esito; nota: string }>;
  mercato?: Array<{ criterio: Criterio; esito: Esito; perche: string }>;
  gradino_massimo?: Voce;
  dipende_da_te?: Voce[];
  dipende_dal_cliente?: Voce[];
  promessa?: { sicura?: string; tagliente?: string; colpo_di_scena?: string; scelta?: "sicura" | "tagliente" | "colpo_di_scena"; casi?: Voce };
  valore?: Array<{ leva: LevaValore; voto: number; mossa: string; o: Origine }>;
  freni?: Freno[];
  gradini?: Gradino[];
  ore?: Voce;
  margine?: Voce;
  bonus?: Array<{ bonus: string; freno: string; o: Origine }>;
  garanzia?: Voce;
  scarsita?: Voce;
  presentazione?: { nomi?: string[]; bio?: string; video?: string; chat?: string; obiezioni?: Coppia[] };
  da_confermare?: string[];
}
export type SezioneOfferta = keyof SchedaOfferta;

export interface Fermo {
  cosa: string;
  perche: string;
  ripartire: string;
}

// ---------------------------------------------------------------------------
// Pulizia della risposta di Aura
// ---------------------------------------------------------------------------
const MAX = 700;
const testo = (v: unknown, max = MAX): string | null => {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
};
const origine = (v: unknown): Origine => (v === "vera" ? "vera" : "ipotesi");
const tra = <T extends string>(v: unknown, ammessi: readonly T[]): T | null => ((ammessi as readonly string[]).includes(v as string) ? (v as T) : null);
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const lista = <T>(v: unknown, f: (x: Record<string, unknown>) => T | null, max = 12): T[] | undefined =>
  Array.isArray(v) ? v.map((x) => (obj(x) ? f(obj(x) as Record<string, unknown>) : null)).filter((x): x is T => x !== null).slice(0, max) : undefined;
const esito = (v: unknown): Esito => tra(v, ["si", "quasi", "no"] as const) ?? (v === true || v === "ok" ? "si" : v === false ? "no" : "quasi");

export function voce(v: unknown): Voce | undefined {
  if (typeof v === "string") {
    const t = testo(v);
    return t ? { t, o: "ipotesi" } : undefined;
  }
  const o = obj(v);
  const t = o ? testo(o.t ?? o.testo) : null;
  return o && t ? { t, o: origine(o.o) } : undefined;
}
const voci = (v: unknown, max = 8): Voce[] | undefined => (Array.isArray(v) ? v.map(voce).filter((x): x is Voce => !!x).slice(0, max) : undefined);
const parole = (v: unknown, max = 6): string[] | undefined => (Array.isArray(v) ? v.map((x) => testo(x, 300)).filter((x): x is string => !!x).slice(0, max) : undefined);

/** Le sezioni arrivate in questo turno, pulite (una sezione arriva sempre intera e sostituisce quella di prima). */
export function pulisciScheda(v: unknown): SchedaOfferta {
  const o = obj(v);
  const s: SchedaOfferta = {};
  if (!o) return s;
  for (const k of ["arrivo", "centro", "come_fanno_tutti", "gradino_massimo", "ore", "margine", "garanzia", "scarsita"] as const) {
    const x = voce(o[k]);
    if (x) s[k] = x;
  }
  for (const k of ["dipende_da_te", "dipende_dal_cliente"] as const) {
    const x = voci(o[k]);
    if (x) s[k] = x;
  }
  const leva = tra(o.leva, [...LEVE, "nessuna"] as const);
  if (leva) s.leva = leva;
  const riprovare = testo(o.da_riprovare);
  if (riprovare) s.da_riprovare = riprovare;
  s.versioni = lista(o.versioni, (x) => {
    const l = tra(x.leva, LEVE);
    const t = testo(x.testo);
    return l && t ? { leva: l, testo: t, vuole: x.vuole === true, puo: x.puo === true, mestiere: x.mestiere === true, o: origine(x.o) } : null;
  }, 5);
  s.test = lista(o.test, (x) => {
    const t = tra(x.test, TEST);
    return t ? { test: t, esito: esito(x.esito), nota: testo(x.nota, 300) ?? "" } : null;
  }, 6);
  s.mercato = lista(o.mercato, (x) => {
    const c = tra(x.criterio, CRITERI);
    return c ? { criterio: c, esito: esito(x.esito), perche: testo(x.perche, 300) ?? "" } : null;
  }, 5);
  const p = obj(o.promessa);
  if (p) {
    const pr: NonNullable<SchedaOfferta["promessa"]> = {};
    for (const k of ["sicura", "tagliente", "colpo_di_scena"] as const) {
      const x = testo(p[k], 400);
      if (x) pr[k] = x;
    }
    const scelta = tra(p.scelta, ["sicura", "tagliente", "colpo_di_scena"] as const);
    if (scelta) pr.scelta = scelta;
    const casi = voce(p.casi);
    if (casi) pr.casi = casi;
    if (Object.keys(pr).length > 0) s.promessa = pr;
  }
  s.valore = lista(o.valore, (x) => {
    const l = tra(x.leva, LEVE_VALORE);
    const mossa = testo(x.mossa, 400);
    const voto = Math.min(5, Math.max(1, Math.round(Number(x.voto) || 3)));
    return l && mossa ? { leva: l, voto, mossa, o: origine(x.o) } : null;
  }, 4);
  s.freni = lista(o.freni, (x) => {
    const freno = testo(x.freno, 300);
    const soluzione = testo(x.soluzione, 300);
    if (!freno || !soluzione) return null;
    return {
      freno,
      momento: tra(x.momento, ["prima", "durante", "dopo"] as const) ?? "prima",
      soluzione,
      consegna: testo(x.consegna, 300) ?? "",
      posto: tra(x.posto, ["dentro", "bonus", "fuori"] as const) ?? "dentro",
      o: origine(x.o),
    };
  }, 12);
  s.gradini = lista(o.gradini, (x) => {
    const livello = tra(x.livello, ["entrata", "cuore", "premium"] as const);
    const prezzo = testo(x.prezzo, 120);
    return livello && prezzo
      ? { livello, nome: testo(x.nome, 120) ?? "", prezzo, contiene: testo(x.contiene, 500) ?? "", ragionamento: testo(x.ragionamento, 600) ?? "", o: origine(x.o) }
      : null;
  }, 3);
  s.bonus = lista(o.bonus, (x) => {
    const b = testo(x.bonus, 300);
    return b ? { bonus: b, freno: testo(x.freno, 300) ?? "", o: origine(x.o) } : null;
  }, 3);
  const pres = obj(o.presentazione);
  if (pres) {
    const pp: NonNullable<SchedaOfferta["presentazione"]> = {};
    const nomi = parole(pres.nomi, 3);
    if (nomi) pp.nomi = nomi;
    for (const k of ["bio", "video", "chat"] as const) {
      const x = testo(pres[k], 400);
      if (x) pp[k] = x;
    }
    const ob = lista(pres.obiezioni, (x) => {
      const a = testo(x.a ?? x.obiezione, 300);
      const b = testo(x.b ?? x.risposta, 400);
      return a && b ? { a, b, o: origine(x.o) } : null;
    }, 3);
    if (ob) pp.obiezioni = ob;
    if (Object.keys(pp).length > 0) s.presentazione = pp;
  }
  const dc = parole(o.da_confermare, 12);
  if (dc) s.da_confermare = dc;
  for (const k of Object.keys(s) as SezioneOfferta[]) if (s[k] === undefined) delete s[k];
  return s;
}

export function pulisciFermo(v: unknown): Fermo | null {
  const o = obj(v);
  if (!o) return null;
  const cosa = testo(o.cosa, 400);
  return cosa ? { cosa, perche: testo(o.perche, 400) ?? "", ripartire: testo(o.ripartire, 400) ?? "" } : null;
}

/** I passi della barra: versione breve (6) e scheda completa (fasi 0-7). */
export const PASSI_BREVE = ["Dal lavoro all'arrivo", "Una cosa al centro", "Cosa puoi promettere", "Servizio o prodotto", "La frase", "Diversa dal mercato"];
export const FASI_COMPLETA = ["Legge", "Il mercato regge?", "Arrivo e promessa", "Il valore", "Dai freni ai pezzi", "Prezzo e gradini", "Bonus e garanzia", "Nome e frasi"];
