#!/usr/bin/env node
// Travasa i file dei bucket del progetto v1 (zmisvqovyxlviqsenmyq) nei bucket del v2 (tcvftvvbheacsjbadtfg)
// con gli stessi path: invoices → fatture, receipts → ricevute, f24 → f24, contracts → contratti.
// Usa la Storage REST API con fetch (niente supabase-js: su Node 20 richiede WebSocket).
// Serve scripts/.env.migrate con OLD_/NEW_ SUPABASE_URL e SERVICE_ROLE_KEY (mai nel repo).
//   node scripts/travasa-storage-v1.mjs           → scarica in dati-v1/storage/file/ e carica
//   node scripts/travasa-storage-v1.mjs --solo-scarica
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RADICE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FILE_ENV = resolve(RADICE, "scripts", ".env.migrate");
const ELENCO = resolve(RADICE, "dati-v1", "storage", "objects.json");
const CARTELLA = resolve(RADICE, "dati-v1", "storage", "file");
const BUCKET = { invoices: "fatture", receipts: "ricevute", f24: "f24", contracts: "contratti" };
// Solo i contratti presenti nel v2 (l'altro della v1 non è stato importato).
const CONTRATTI_V2 = new Set(["d08e42e4-f8a7-4b64-bf32-9a48f086ec6c"]);
const soloScarica = process.argv.includes("--solo-scarica");

if (existsSync(FILE_ENV)) {
  for (const riga of readFileSync(FILE_ENV, "utf8").split("\n")) {
    const t = riga.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (/^(".*"|'.*')$/.test(v)) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
const OLD_URL = process.env.OLD_SUPABASE_URL, OLD_KEY = process.env.OLD_SERVICE_ROLE_KEY;
const NEW_URL = process.env.NEW_SUPABASE_URL, NEW_KEY = process.env.NEW_SERVICE_ROLE_KEY;
if (!OLD_URL?.includes("zmisvqovyxlviqsenmyq") || !OLD_KEY) { console.error("OLD_SUPABASE_URL/OLD_SERVICE_ROLE_KEY mancanti o progetto sbagliato"); process.exit(2); }
if (!NEW_URL?.includes("tcvftvvbheacsjbadtfg") || !NEW_KEY) { console.error("NEW_SUPABASE_URL/NEW_SERVICE_ROLE_KEY mancanti o progetto sbagliato"); process.exit(2); }

const intestazioni = (k) => ({ apikey: k, Authorization: `Bearer ${k}` });
const oggetti = JSON.parse(readFileSync(ELENCO, "utf8"));
let scaricati = 0, caricati = 0, saltati = 0, errori = 0;

for (const o of oggetti) {
  const locale = resolve(CARTELLA, o.bucket_id, o.name);
  const mime = o.metadata?.mimetype ?? "application/octet-stream";
  if (!existsSync(locale)) {
    const r = await fetch(`${OLD_URL}/storage/v1/object/${o.bucket_id}/${o.name}`, { headers: intestazioni(OLD_KEY) });
    if (!r.ok) { console.error(`ERRORE download ${o.bucket_id}/${o.name}: ${r.status} ${(await r.text()).slice(0, 200)}`); errori++; continue; }
    mkdirSync(dirname(locale), { recursive: true });
    writeFileSync(locale, Buffer.from(await r.arrayBuffer()));
    console.log(`scaricato ${o.bucket_id}/${o.name}`);
  }
  scaricati++;
  if (soloScarica) continue;

  const dest = BUCKET[o.bucket_id];
  if (!dest) { console.log(`saltato (bucket sconosciuto) ${o.bucket_id}/${o.name}`); saltati++; continue; }
  if (o.bucket_id === "contracts" && !CONTRATTI_V2.has(o.name.split("/")[0])) { console.log(`saltato (contratto non importato) ${o.name}`); saltati++; continue; }

  const corpo = readFileSync(locale);
  const r = await fetch(`${NEW_URL}/storage/v1/object/${dest}/${o.name}`, {
    method: "POST",
    headers: { ...intestazioni(NEW_KEY), "Content-Type": mime, "x-upsert": "true", "Cache-Control": "max-age=3600" },
    body: corpo,
  });
  if (!r.ok) { console.error(`ERRORE upload ${dest}/${o.name}: ${r.status} ${(await r.text()).slice(0, 200)}`); errori++; continue; }
  caricati++;
  console.log(`caricato ${dest}/${o.name} (${corpo.length} byte)`);
}
console.log(`\nscaricati ${scaricati}/${oggetti.length} · caricati ${caricati} · saltati ${saltati} · errori ${errori}`);
process.exit(errori ? 1 : 0);
