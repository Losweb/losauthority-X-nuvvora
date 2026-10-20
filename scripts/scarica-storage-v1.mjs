#!/usr/bin/env node
// Scarica i file dei bucket del progetto v1 (zmisvqovyxlviqsenmyq) nella cartella dati-v1/storage/file/.
// Serve la service role key del progetto VECCHIO in scripts/.env.migrate (OLD_SUPABASE_URL, OLD_SERVICE_ROLE_KEY).
// L'elenco dei file è dati-v1/storage/objects.json (esportato con il MCP il 17/10/2026).
//   node scripts/scarica-storage-v1.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const RADICE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FILE_ENV = resolve(RADICE, "scripts", ".env.migrate");
const ELENCO = resolve(RADICE, "dati-v1", "storage", "objects.json");
const DESTINAZIONE = resolve(RADICE, "dati-v1", "storage", "file");

if (existsSync(FILE_ENV)) {
  for (const riga of readFileSync(FILE_ENV, "utf8").split("\n")) {
    const t = riga.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const chiave = t.slice(0, i).trim();
    let valore = t.slice(i + 1).trim();
    if (/^(".*"|'.*')$/.test(valore)) valore = valore.slice(1, -1);
    if (!process.env[chiave]) process.env[chiave] = valore;
  }
}
const url = process.env.OLD_SUPABASE_URL;
const chiave = process.env.OLD_SERVICE_ROLE_KEY;
if (!url || !chiave) {
  console.error("Mancano OLD_SUPABASE_URL / OLD_SERVICE_ROLE_KEY in scripts/.env.migrate (vedi scripts/.env.migrate.example).");
  process.exit(2);
}
if (!url.includes("zmisvqovyxlviqsenmyq")) {
  console.error(`OLD_SUPABASE_URL non è il progetto v1 (zmisvqovyxlviqsenmyq): ${url}`);
  process.exit(2);
}
const client = createClient(url, chiave, { auth: { autoRefreshToken: false, persistSession: false } });
const oggetti = JSON.parse(readFileSync(ELENCO, "utf8"));
let ok = 0;
for (const o of oggetti) {
  const dest = resolve(DESTINAZIONE, o.bucket_id, o.name);
  if (existsSync(dest)) {
    ok++;
    continue;
  }
  const { data, error } = await client.storage.from(o.bucket_id).download(o.name);
  if (error) {
    console.error(`ERRORE ${o.bucket_id}/${o.name}: ${error.message}`);
    continue;
  }
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, Buffer.from(await data.arrayBuffer()));
  ok++;
  console.log(`ok ${o.bucket_id}/${o.name}`);
}
console.log(`\n${ok}/${oggetti.length} file in ${DESTINAZIONE}`);
