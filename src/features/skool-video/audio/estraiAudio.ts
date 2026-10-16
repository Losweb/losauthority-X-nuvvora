/**
 * Estrae l'audio di un video NEL BROWSER con ffmpeg.wasm (un solo thread: niente
 * cabeceras COOP/COEP) e lo taglia in blocchi da 10 minuti, mono 16 kHz 32 kbps
 * (~2,5 MB l'uno). Il video non lascia mai il Mac: nel bucket vanno solo i blocchi
 * audio, che OpenAI accetta (limite 25 MB per richiesta).
 * Il file si monta con WORKERFS: ffmpeg lo legge a pezzi, senza copiarlo in
 * memoria (un video da 3 GB non ci starebbe).
 * Il motore (~31 MB) si scarica dal CDN la prima volta e resta in cache.
 */
import { FFFSType, FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { BLOCCO_SEC, MAX_DURATA_SEC } from "../types";

const CORE_BASE = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";
const CARTELLA_INPUT = "/in";

export interface BloccoEstratto {
  indice: number;
  inizioSec: number;
  durataSec: number;
  file: Blob;
}

export interface AudioEstratto {
  durataSec: number;
  blocchi: BloccoEstratto[];
}

export type AvanzamentoAudio = { fase: "motore" } | { fase: "estrazione"; percento: number };

let istanza: FFmpeg | null = null;
let caricamento: Promise<FFmpeg> | null = null;

async function motore(): Promise<FFmpeg> {
  if (istanza?.loaded) return istanza;
  if (caricamento) return caricamento;
  caricamento = (async () => {
    const ff = new FFmpeg();
    await ff.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    istanza = ff;
    return ff;
  })();
  try {
    return await caricamento;
  } finally {
    caricamento = null;
  }
}

/** «Duration: 01:23:45.67» dai log di ffmpeg → secondi. */
function durataDaLog(messaggio: string): number | null {
  const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(messaggio);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

function estensione(nome: string): string {
  const punto = nome.lastIndexOf(".");
  const ext = punto >= 0 ? nome.slice(punto + 1).toLowerCase() : "";
  return /^[a-z0-9]{1,5}$/.test(ext) ? ext : "mp4";
}

export class ErroreAudio extends Error {}

/**
 * Video (o audio) → blocchi mp3. Lancia `ErroreAudio` con un messaggio per
 * l'utente se il file non si legge o dura più del massimo.
 */
export async function estraiAudio(file: File, onAvanzamento: (a: AvanzamentoAudio) => void): Promise<AudioEstratto> {
  onAvanzamento({ fase: "motore" });
  const ff = await motore();
  // Nome sicuro per il file system virtuale (il nome vero può avere spazi e accenti).
  const nomeInput = `video.${estensione(file.name)}`;
  const percorso = `${CARTELLA_INPUT}/${nomeInput}`;
  let durata: number | null = null;
  const suLog = ({ message }: { message: string }) => {
    if (durata === null) durata = durataDaLog(message);
  };
  const suProgresso = ({ progress, time }: { progress: number; time: number }) => {
    // `time` è in microsecondi; con la durata nota è più preciso di `progress`.
    const percento = durata ? Math.min(99, Math.round((time / 1_000_000 / durata) * 100)) : Math.min(99, Math.round(progress * 100));
    onAvanzamento({ fase: "estrazione", percento: Math.max(0, percento) });
  };
  ff.on("log", suLog);
  ff.on("progress", suProgresso);
  try {
    await ff.createDir(CARTELLA_INPUT).catch(() => undefined);
    await ff.mount(FFFSType.WORKERFS, { files: [new File([file], nomeInput, { type: file.type })] }, CARTELLA_INPUT);
    onAvanzamento({ fase: "estrazione", percento: 0 });
    // Prima una sonda veloce: solo per leggere la durata (ffmpeg senza output esce con errore, è normale).
    await ff.exec(["-i", percorso, "-f", "null", "-t", "0.1", "-"]);
    if (durata === null) throw new ErroreAudio("Non riesco a leggere questo file: è un video (o un audio) valido?");
    if (durata > MAX_DURATA_SEC) throw new ErroreAudio(`Il video dura più di ${MAX_DURATA_SEC / 3600} ore: taglialo prima di caricarlo.`);
    const codice = await ff.exec([
      "-i", percorso,
      "-vn", "-ac", "1", "-ar", "16000", "-b:a", "32k",
      "-f", "segment", "-segment_time", String(BLOCCO_SEC), "-reset_timestamps", "1",
      "/blocco_%03d.mp3",
    ]);
    if (codice !== 0) throw new ErroreAudio("L'estrazione dell'audio non è riuscita: il file potrebbe essere danneggiato o in un formato non supportato.");

    const nomi = (await ff.listDir("/"))
      .map((e) => e.name)
      .filter((n) => /^blocco_\d{3}\.mp3$/.test(n))
      .sort();
    if (nomi.length === 0) throw new ErroreAudio("Nessuna traccia audio trovata nel file.");
    const blocchi: BloccoEstratto[] = [];
    for (const [i, nome] of nomi.entries()) {
      const dati = await ff.readFile(nome);
      // Copia in un ArrayBuffer «normale»: il Blob non accetta memoria condivisa del worker.
      const byte = typeof dati === "string" ? new TextEncoder().encode(dati) : dati;
      const copia = new Uint8Array(new ArrayBuffer(byte.byteLength));
      copia.set(byte);
      await ff.deleteFile(nome).catch(() => undefined);
      const inizioSec = i * BLOCCO_SEC;
      const durataSec = Math.max(1, Math.min(BLOCCO_SEC, Math.round(durata - inizioSec)));
      blocchi.push({ indice: i, inizioSec, durataSec, file: new Blob([copia], { type: "audio/mpeg" }) });
    }
    onAvanzamento({ fase: "estrazione", percento: 100 });
    return { durataSec: Math.round(durata), blocchi };
  } finally {
    ff.off("log", suLog);
    ff.off("progress", suProgresso);
    await ff.unmount(CARTELLA_INPUT).catch(() => undefined);
  }
}
