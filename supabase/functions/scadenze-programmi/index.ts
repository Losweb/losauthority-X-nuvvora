/**
 * scadenze-programmi — promemoria Telegram al team UN MESE (30 giorni) PRIMA della fine
 * del programma di un cliente (`clienti.data_fine`), così Wesley lo contatta (richiesta
 * di Wesley, 28/11/2026). Una volta sola per data di fine: la RPC
 * `scadenze_programmi_da_avvisare` prende e segna i clienti in un colpo solo
 * (`clienti.scadenza_avvisata`); se il messaggio non parte li rimette in coda per il
 * giorno dopo. Prende tutti quelli che finiscono entro 30 giorni e non sono ancora stati
 * avvisati: se il cron salta un giorno o la data viene scritta tardi, il promemoria
 * arriva lo stesso. Lanciato da pg_cron alle 07:10 UTC (CRON_SECRET) o a mano dal team.
 * Risposta { ok, avvisati, giorni }. Nessun messaggio se non c'è nessuno.
 */
import { gestisciErrore, HttpError, json, preflight } from "../_shared/http.ts";
import { adminClient, richiediCronOTeam } from "../_shared/supabase.ts";
import { notifyTelegramConEsito } from "../_shared/telegram.ts";
import { logError } from "../_shared/log.ts";
import { rigaLink, sitoGestionale } from "../_shared/sito.ts";

const GIORNI_PRIMA = 30;

interface InScadenza {
  id: string;
  nome: string | null;
  email: string | null;
  data_inizio: string | null;
  data_fine: string;
  programma: string | null;
}

/** Data "YYYY-MM-DD" di oggi in ora italiana (le scadenze sono date a muro). */
function oggiRoma(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
}

function giorniTra(da: string, a: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${da}T00:00:00Z`)) / 86_400_000);
}

function dataIt(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function quando(giorni: number): string {
  if (giorni <= 0) return "oggi";
  if (giorni === 1) return "domani";
  return `tra ${giorni} giorni`;
}

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    await richiediCronOTeam(req);
    const admin = adminClient();

    const { data, error } = await admin.rpc("scadenze_programmi_da_avvisare", { p_giorni: GIORNI_PRIMA });
    if (error) {
      await logError("scadenze-programmi:lettura", error, {});
      throw new HttpError(500, "Non sono riuscito a leggere i programmi in scadenza.");
    }
    const clienti = (data ?? []) as InScadenza[];
    if (clienti.length === 0) return json({ ok: true, avvisati: 0, giorni: GIORNI_PRIMA });

    const oggi = oggiRoma();
    const sito = await sitoGestionale(admin);
    const righe = clienti.map((c) => {
      const nome = c.nome || c.email || "Cliente";
      const programma = c.programma ? ` (${c.programma})` : "";
      const inizio = c.data_inizio ? `\n  iniziato il ${dataIt(c.data_inizio)}` : "";
      return `• ${nome}${programma} — finisce il ${dataIt(c.data_fine)}, ${quando(giorniTra(oggi, c.data_fine))}${inizio}${rigaLink(sito, `/clienti/${c.id}`, "\n  👉 ")}`;
    });
    const titolo = clienti.length === 1 ? "📅 Un programma finisce tra un mese" : `📅 ${clienti.length} programmi finiscono entro un mese`;
    const testo = `${titolo}\n\n${righe.join("\n\n")}\n\nÈ il momento di sentire il cliente per il rinnovo.`;

    const inviato = await notifyTelegramConEsito(testo);
    if (!inviato) {
      // Rimessi in coda: domani il cron ci riprova.
      const ids = clienti.map((c) => c.id);
      const { error: errReset } = await admin.from("clienti").update({ scadenza_avvisata: null }).in("id", ids);
      await logError("scadenze-programmi:telegram", new Error("Telegram non ha accettato il messaggio"), { ids, errReset: errReset?.message ?? null });
      throw new HttpError(502, "Il messaggio Telegram non è partito: riprovo domani.");
    }
    return json({ ok: true, avvisati: clienti.length, giorni: GIORNI_PRIMA });
  } catch (err) {
    return gestisciErrore(err);
  }
});
