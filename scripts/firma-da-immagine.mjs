// Ricava la firma del Fornitore da un'immagine PNG (tratto nero su fondo bianco o trasparente)
// nella forma che usano i contratti: { w, h, pieno: true, tratti } dove ogni tratto è un CONTORNO
// chiuso [x0,y0,x1,y1,…] da riempire con la regola pari-dispari (FirmaSvg e pdf.ts).
//
// Uso: node scripts/firma-da-immagine.mjs <firma.png> <firma.json> [--larghezza 1200]
// Poi il JSON va in contratti_impostazioni.firma (vedi docs/modulo-contratos-handoff.es.md).
// Nessuna dipendenza: PNG decodificato con node:zlib (8 bit, non interlacciato).
import { readFileSync, writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const [sorgente, destinazione, ...resto] = process.argv.slice(2);
if (!sorgente || !destinazione) {
  console.error("Uso: node scripts/firma-da-immagine.mjs <firma.png> <firma.json> [--larghezza N]");
  process.exit(1);
}
const larghezzaFinale = resto[0] === "--larghezza" ? Number(resto[1]) : 0;

/** Decodifica un PNG 8 bit non interlacciato: ritorna {w,h,canali,pixel}. */
function leggiPng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("Non è un PNG");
  let i = 8;
  let w = 0, h = 0, bit = 0, tipo = 0, interlace = 0;
  const idat = [];
  while (i < buf.length) {
    const len = buf.readUInt32BE(i);
    const nome = buf.toString("latin1", i + 4, i + 8);
    const dati = buf.subarray(i + 8, i + 8 + len);
    if (nome === "IHDR") {
      w = dati.readUInt32BE(0); h = dati.readUInt32BE(4); bit = dati[8]; tipo = dati[9]; interlace = dati[12];
    } else if (nome === "IDAT") idat.push(dati);
    i += 12 + len;
  }
  if (bit !== 8 || interlace !== 0) throw new Error(`PNG non supportato (bit ${bit}, interlace ${interlace})`);
  const canali = { 0: 1, 2: 3, 4: 2, 6: 4 }[tipo];
  if (!canali) throw new Error(`Tipo colore ${tipo} non supportato`);
  const grezzo = inflateSync(Buffer.concat(idat));
  const riga = w * canali;
  const pixel = Buffer.alloc(w * h * canali);
  for (let y = 0; y < h; y++) {
    const filtro = grezzo[y * (riga + 1)];
    const src = y * (riga + 1) + 1;
    const dst = y * riga;
    for (let x = 0; x < riga; x++) {
      const a = x >= canali ? pixel[dst + x - canali] : 0;
      const b = y > 0 ? pixel[dst - riga + x] : 0;
      const c = x >= canali && y > 0 ? pixel[dst - riga + x - canali] : 0;
      let v = grezzo[src + x];
      if (filtro === 1) v += a;
      else if (filtro === 2) v += b;
      else if (filtro === 3) v += (a + b) >> 1;
      else if (filtro === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      pixel[dst + x] = v & 255;
    }
  }
  return { w, h, canali, pixel };
}

/** true dove c'è inchiostro: scuro e non trasparente. */
function maschera({ w, h, canali, pixel }) {
  const m = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    const o = p * canali;
    const alpha = canali === 4 ? pixel[o + 3] : canali === 2 ? pixel[o + 1] : 255;
    const lum = canali >= 3 ? (pixel[o] * 299 + pixel[o + 1] * 587 + pixel[o + 2] * 114) / 1000 : pixel[o];
    m[p] = alpha > 127 && lum < 140 ? 1 : 0;
  }
  return m;
}

const img = leggiPng(readFileSync(sorgente));
const m = maschera(img);
const { w: W, h: H } = img;
const pieno = (x, y) => x >= 0 && y >= 0 && x < W && y < H && m[y * W + x] === 1;

// Bordi orientati (interno a destra, coordinate con y verso il basso): ogni lato di un pixel pieno
// che confina con il vuoto. Chiave del vertice: y * (W+1) + x.
const K = W + 1;
const uscenti = new Map(); // vertice → [vertice successivo, …]
function bordo(ax, ay, bx, by) {
  const a = ay * K + ax;
  const lista = uscenti.get(a);
  if (lista) lista.push(by * K + bx);
  else uscenti.set(a, [by * K + bx]);
}
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (!pieno(x, y)) continue;
    if (!pieno(x, y - 1)) bordo(x, y, x + 1, y); // sopra →
    if (!pieno(x + 1, y)) bordo(x + 1, y, x + 1, y + 1); // destra ↓
    if (!pieno(x, y + 1)) bordo(x + 1, y + 1, x, y + 1); // sotto ←
    if (!pieno(x - 1, y)) bordo(x, y + 1, x, y); // sinistra ↑
  }
}

/** Segue i bordi finché il contorno si chiude; nei punti di sella preferisce svoltare a destra. */
function contorni() {
  const out = [];
  for (const [inizio, lista] of uscenti) {
    while (lista.length > 0) {
      const punti = [];
      let v = inizio;
      let prec = null;
      do {
        punti.push(v % K, Math.floor(v / K));
        const l = uscenti.get(v);
        if (!l || l.length === 0) break;
        let scelto = 0;
        if (l.length > 1 && prec !== null) {
          // direzione in arrivo
          const dx = (v % K) - (prec % K), dy = Math.floor(v / K) - Math.floor(prec / K);
          let meglio = -2;
          l.forEach((n, i) => {
            const ex = (n % K) - (v % K), ey = Math.floor(n / K) - Math.floor(v / K);
            const giro = dx * ey - dy * ex; // >0 = destra (y verso il basso)
            const punteggio = giro > 0 ? 1 : giro === 0 ? 0 : -1;
            if (punteggio > meglio) { meglio = punteggio; scelto = i; }
          });
        }
        const prossimo = l.splice(scelto, 1)[0];
        prec = v;
        v = prossimo;
      } while (v !== inizio);
      if (punti.length >= 6) out.push(punti);
    }
  }
  return out;
}

/** Ramer-Douglas-Peucker su un contorno chiuso (si spezza nel punto più lontano dal primo). */
function semplifica(p, tol) {
  const n = p.length / 2;
  let lontano = 0, dmax = -1;
  for (let i = 1; i < n; i++) {
    const d = Math.hypot(p[i * 2] - p[0], p[i * 2 + 1] - p[1]);
    if (d > dmax) { dmax = d; lontano = i; }
  }
  const tieni = new Uint8Array(n);
  tieni[0] = 1; tieni[lontano] = 1;
  const pila = [[0, lontano], [lontano, n - 1]];
  tieni[n - 1] = 1;
  while (pila.length) {
    const [a, b] = pila.pop();
    const ax = p[a * 2], ay = p[a * 2 + 1], dx = p[b * 2] - ax, dy = p[b * 2 + 1] - ay;
    const lungo = Math.hypot(dx, dy);
    let max = 0, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = lungo ? Math.abs(dy * (p[i * 2] - ax) - dx * (p[i * 2 + 1] - ay)) / lungo : Math.hypot(p[i * 2] - ax, p[i * 2 + 1] - ay);
      if (d > max) { max = d; idx = i; }
    }
    if (idx > 0 && max > tol) { tieni[idx] = 1; pila.push([a, idx], [idx, b]); }
  }
  const out = [];
  for (let i = 0; i < n; i++) if (tieni[i]) out.push(p[i * 2], p[i * 2 + 1]);
  return out;
}

function area(p) {
  let a = 0;
  for (let i = 0, n = p.length / 2; i < n; i++) {
    const j = (i + 1) % n;
    a += p[i * 2] * p[j * 2 + 1] - p[j * 2] * p[i * 2 + 1];
  }
  return Math.abs(a) / 2;
}

let tratti = contorni().map((c) => semplifica(c, 1.1)).filter((c) => c.length >= 6 && area(c) >= 12);

// Ritaglio sul riquadro dell'inchiostro, con un margine, e scala facoltativa.
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const t of tratti) for (let i = 0; i < t.length; i += 2) {
  minX = Math.min(minX, t[i]); maxX = Math.max(maxX, t[i]); minY = Math.min(minY, t[i + 1]); maxY = Math.max(maxY, t[i + 1]);
}
const margine = 6;
const scala = larghezzaFinale > 0 ? larghezzaFinale / (maxX - minX + margine * 2) : 1;
const w = Math.round((maxX - minX + margine * 2) * scala);
const h = Math.round((maxY - minY + margine * 2) * scala);
tratti = tratti.map((t) => t.map((v, i) => Math.round(((i % 2 === 0 ? v - minX : v - minY) + margine) * scala * 10) / 10));

const punti = tratti.reduce((s, t) => s + t.length / 2, 0);
if (tratti.length > 400 || punti > 30000) {
  console.error(`Troppi contorni/punti (${tratti.length} / ${punti}): alza la tolleranza o riduci l'immagine.`);
  process.exit(1);
}
writeFileSync(destinazione, JSON.stringify({ w, h, pieno: true, tratti }));
console.log(`Firma: ${w}x${h}, ${tratti.length} contorni, ${punti} punti → ${destinazione}`);
