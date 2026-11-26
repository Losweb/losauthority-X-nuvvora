/**
 * La forma del Posizionamento (26/11/2026). TypeScript puro: lo importano
 * aura-posizionamento e il frontend (alias `@posizionamento-forma/*`).
 *
 * In alto il profilo Instagram come si vedrebbe; sotto le quattro parti del
 * posizionamento dell'HUB di Wesley: chi sei (una frase che nessun concorrente
 * potrebbe dire), perché puoi dirlo tu (i fatti), cosa dicono già tutti (i
 * territori occupati, quindi da evitare), come lo dimostri nei contenuti.
 */

export interface Evidenza {
  /** Il titolo sotto il cerchio delle storie in evidenza (max 15 caratteri: Instagram lo taglia). */
  titolo: string;
  /** Cosa ci va dentro. */
  contiene: string;
}

export interface PostFissato {
  /** Il titolo in copertina. */
  titolo: string;
  /** Perché va fissato in cima. */
  perche: string;
}

export interface Profilo {
  /** Il nome in grassetto (Instagram: max 64). Di solito nome + mestiere. */
  nome: string;
  /** Il nome utente senza @ (max 30). */
  utente: string;
  /** La categoria sotto il nome («Psicologo», «Studio legale»). */
  categoria: string;
  /** La bio, anche su più righe (Instagram: max 150 caratteri). */
  bio: string;
  /** Il testo del link in bio (la chiamata all'azione). */
  link: string;
  evidenza: Evidenza[];
  post: PostFissato[];
}

export interface Posizionamento {
  profilo?: Profilo;
  chi_sei?: string;
  perche_tu?: string[];
  cosa_dicono_tutti?: string[];
  come_lo_dimostri?: string[];
}

export const LIMITI = { nome: 64, utente: 30, categoria: 40, bio: 150, link: 60, titoloEvidenza: 15 } as const;

const testo = (v: unknown, max = 400): string | null => {
  if (typeof v !== "string") return null;
  const t = v.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return t ? t.slice(0, max) : null;
};
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const righe = (v: unknown, max = 5, lung = 300): string[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const r = v.map((x) => testo(x, lung)).filter((x): x is string => !!x).slice(0, max);
  return r.length ? r : undefined;
};

/** Pulisce quello che arriva da Aura o da una correzione: tiene solo i campi noti, taglia le lunghezze. */
export function pulisciPosizionamento(v: unknown): Posizionamento {
  const o = obj(v);
  const p: Posizionamento = {};
  if (!o) return p;
  const pr = obj(o.profilo);
  if (pr) {
    const utente = (testo(pr.utente, 60) ?? "").replace(/^@+/, "").replace(/\s+/g, "").toLowerCase().slice(0, LIMITI.utente);
    p.profilo = {
      nome: testo(pr.nome, LIMITI.nome) ?? "",
      utente,
      categoria: testo(pr.categoria, LIMITI.categoria) ?? "",
      bio: testo(pr.bio, LIMITI.bio + 20) ?? "",
      link: testo(pr.link, LIMITI.link) ?? "",
      evidenza: (Array.isArray(pr.evidenza) ? pr.evidenza : [])
        .map((x) => obj(x))
        .filter((x): x is Record<string, unknown> => !!x)
        .map((x) => ({ titolo: testo(x.titolo, LIMITI.titoloEvidenza + 5) ?? "", contiene: testo(x.contiene, 250) ?? "" }))
        .filter((x) => x.titolo)
        .slice(0, 5),
      post: (Array.isArray(pr.post) ? pr.post : [])
        .map((x) => obj(x))
        .filter((x): x is Record<string, unknown> => !!x)
        .map((x) => ({ titolo: testo(x.titolo, 100) ?? "", perche: testo(x.perche, 250) ?? "" }))
        .filter((x) => x.titolo)
        .slice(0, 3),
    };
  }
  const chi = testo(o.chi_sei, 300);
  if (chi) p.chi_sei = chi;
  for (const k of ["perche_tu", "cosa_dicono_tutti", "come_lo_dimostri"] as const) {
    const r = righe(o[k]);
    if (r) p[k] = r;
  }
  return p;
}
