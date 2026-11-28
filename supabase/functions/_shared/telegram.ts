const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") ?? "";

export const telegramConfigurato = () => TOKEN.length > 0 && CHAT_ID.length > 0;

/** Messaggio a Wesley (chat principale). Best-effort, non lancia mai. */
export async function notifyTelegram(text: string): Promise<void> {
  await sendTelegram(CHAT_ID, text);
}

/** Messaggio a una chat specifica. Best-effort, timeout 4s, non lancia mai. */
export async function sendTelegram(chatId: string | undefined, text: string): Promise<void> {
  await inviaTelegram(chatId, text);
}

/** Come `notifyTelegram`, ma dice se Telegram ha accettato il messaggio (per chi deve riprovare). */
export function notifyTelegramConEsito(text: string): Promise<boolean> {
  return inviaTelegram(CHAT_ID, text);
}

async function inviaTelegram(chatId: string | undefined, text: string): Promise<boolean> {
  if (!TOKEN || !chatId) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 3500), disable_web_page_preview: true }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false; /* best-effort */
  }
}
