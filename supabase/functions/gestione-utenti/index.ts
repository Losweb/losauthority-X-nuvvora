/**
 * gestione-utenti — Admin API auth per clienti e staff.
 * Azioni: crea_cliente, crea_staff, aggiorna_ruolo, reset_password, elimina_utente,
 * accedi_account_personale («Passa a Wesley ME» dal gestionale, 20/10/2026).
 * Contratto: docs/edge-functions.md.
 */
import { errore, gestisciErrore, HttpError, json, leggiBody, preflight } from "../_shared/http.ts";
import { adminClient, type Chiamante, richiediTeam, type Rol } from "../_shared/supabase.ts";
import { logError } from "../_shared/log.ts";
import { registraAttivita } from "../_shared/attivita.ts";

type Body = {
  azione?: unknown;
  email?: unknown;
  nombre?: unknown;
  password?: unknown;
  telefono?: unknown;
  /** Label dei tag (colonna clienti.tags). */
  tags?: unknown;
  rol?: unknown;
  user_id?: unknown;
}

interface Ruolo {
  id: string;
  rol: Rol;
  nombre: string | null;
  email: string | null;
}

const etichettaRuolo = (rol: string): string => (rol === "staff_fatture" ? "Staff + Finance" : rol === "staff" ? "Staff" : rol === "admin" ? "Admin" : "Cliente");
const nomeDi = (r: Ruolo): string => r.nombre?.trim() || r.email || r.id;

const RUOLI_STAFF: ReadonlyArray<Rol> = ["staff", "staff_fatture"];
const MSG_EMAIL_ESISTENTE = "Esiste già un utente con questa email.";

/** `Los-` + 12 caratteri senza quelli ambigui (0/O, 1/l/I). */
function generaPassword(): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const byte = new Uint8Array(12);
  crypto.getRandomValues(byte);
  let s = "";
  for (const b of byte) s += alfabeto[b % alfabeto.length];
  return `Los-${s}`;
}

const testo = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function emailValida(v: unknown): string {
  const email = testo(v).toLowerCase();
  if (!email.includes("@")) throw new HttpError(400, "Inserisci un'email valida.");
  return email;
}

function passwordValida(v: unknown): { password: string; generata: boolean } {
  const fornita = testo(v);
  if (!fornita) return { password: generaPassword(), generata: true };
  if (fornita.length < 8) throw new HttpError(400, "La password deve avere almeno 8 caratteri.");
  return { password: fornita, generata: false };
}

function richiediAdmin(c: Chiamante): void {
  if (c.rol !== "admin") throw new HttpError(403, "Solo l'admin può fare questa operazione.");
}

function messaggioCreateUser(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already") || m.includes("exist") || m.includes("registered")) return MSG_EMAIL_ESISTENTE;
  return "Non sono riuscito a creare l'utente. Riprova.";
}

async function creaUtenteAuth(email: string, password: string, nombre: string, scope: string): Promise<string> {
  const { data, error } = await adminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  });
  if (error || !data.user) {
    const msg = messaggioCreateUser(error?.message ?? "");
    if (msg !== MSG_EMAIL_ESISTENTE) await logError(scope, error ?? "createUser senza utente", { email });
    throw new HttpError(msg === MSG_EMAIL_ESISTENTE ? 409 : 500, msg);
  }
  return data.user.id;
}

async function ruoloDi(userId: string): Promise<Ruolo | null> {
  const { data } = await adminClient().from("user_roles").select("id, rol, nombre, email").eq("id", userId).maybeSingle();
  return (data as Ruolo | null) ?? null;
}

async function creaCliente(body: Body, c: Chiamante): Promise<Response> {
  const email = emailValida(body.email);
  const nombre = testo(body.nombre);
  if (!nombre) throw new HttpError(400, "Inserisci il nome del cliente.");
  const { password } = passwordValida(body.password);
  const telefono = testo(body.telefono);
  const tags = Array.isArray(body.tags)
    ? [...new Set(body.tags.filter((t): t is string => typeof t === "string").map((t) => t.trim()).filter((t) => t.length > 0 && t.length <= 60))]
    : [];

  const id = await creaUtenteAuth(email, password, nombre, "gestione-utenti:crea_cliente");
  const admin = adminClient();
  const patch: Record<string, unknown> = {};
  if (telefono) patch.telefono = telefono;
  if (tags.length > 0) patch.tags = tags;
  if (Object.keys(patch).length > 0) {
    const { error } = await admin.from("clienti").update(patch).eq("id", id);
    if (error) await logError("gestione-utenti:crea_cliente:dati", error, { id, tag: tags.length }, { silent: true });
  }
  await registraAttivita(admin, c, { azione: "cliente_creato", descrizione: `ha creato il cliente «${nombre}»`, entita: "cliente", entita_id: id, cliente_id: id });
  return json({ ok: true, id, password });
}

async function creaStaff(body: Body, c: Chiamante): Promise<Response> {
  richiediAdmin(c);
  const email = emailValida(body.email);
  const nombre = testo(body.nombre);
  if (!nombre) throw new HttpError(400, "Inserisci il nome del collaboratore.");
  const rol = body.rol === "staff_fatture" ? "staff_fatture" : "staff";
  const { password } = passwordValida(body.password);

  const id = await creaUtenteAuth(email, password, nombre, "gestione-utenti:crea_staff");
  const admin = adminClient();
  // Il trigger lo crea come cliente: lo promuoviamo e togliamo la riga clienti.
  const { error: errRuolo } = await admin.from("user_roles").update({ rol }).eq("id", id);
  if (errRuolo) {
    await logError("gestione-utenti:crea_staff:ruolo", errRuolo, { id, rol });
    throw new HttpError(500, "Utente creato ma non sono riuscito ad assegnare il ruolo. Riprova dalla lista staff.");
  }
  const { error: errClienti } = await admin.from("clienti").delete().eq("id", id);
  if (errClienti) await logError("gestione-utenti:crea_staff:clienti", errClienti, { id }, { silent: true });
  await registraAttivita(admin, c, { azione: "staff_creato", descrizione: `ha aggiunto «${nombre}» al team come ${etichettaRuolo(rol)}`, entita: "utente", entita_id: id });
  return json({ ok: true, id, password });
}

async function aggiornaRuolo(body: Body, c: Chiamante): Promise<Response> {
  richiediAdmin(c);
  const userId = testo(body.user_id);
  const rol = testo(body.rol);
  if (!userId) throw new HttpError(400, "Utente non valido.");
  if (!RUOLI_STAFF.includes(rol as Rol)) throw new HttpError(400, "Ruolo non valido.");
  if (userId === c.id) throw new HttpError(403, "Non puoi cambiare il tuo ruolo.");

  const target = await ruoloDi(userId);
  if (!target) throw new HttpError(404, "Utente non trovato.");
  if (target.rol === "admin") throw new HttpError(403, "Il ruolo di un admin non si cambia da qui.");
  if (target.rol === "cliente") throw new HttpError(400, "Da qui si gestisce solo il team.");

  if (target.rol !== rol) {
    const { error } = await adminClient().from("user_roles").update({ rol }).eq("id", userId);
    if (error) {
      await logError("gestione-utenti:aggiorna_ruolo", error, { userId, rol });
      throw new HttpError(500, "Non sono riuscito ad aggiornare il ruolo. Riprova.");
    }
    await registraAttivita(adminClient(), c, { azione: "staff_ruolo", descrizione: `ha cambiato il ruolo di «${nomeDi(target)}» in ${etichettaRuolo(rol)}`, entita: "utente", entita_id: userId });
  }
  return json({ ok: true, id: userId });
}

async function resetPassword(body: Body, c: Chiamante): Promise<Response> {
  const userId = testo(body.user_id);
  if (!userId) throw new HttpError(400, "Utente non valido.");
  const target = await ruoloDi(userId);
  if (!target) throw new HttpError(404, "Utente non trovato.");
  if (target.rol !== "cliente" && c.rol !== "admin") {
    throw new HttpError(403, "Solo l'admin può resettare la password di un membro del team.");
  }
  const { password } = passwordValida(body.password);
  const { error } = await adminClient().auth.admin.updateUserById(userId, { password });
  if (error) {
    await logError("gestione-utenti:reset_password", error, { userId });
    throw new HttpError(500, "Non sono riuscito a reimpostare la password. Riprova.");
  }
  await registraAttivita(adminClient(), c, {
    azione: "password_reimpostata",
    descrizione: `ha reimpostato la password di «${nomeDi(target)}»`,
    entita: "utente",
    entita_id: userId,
    cliente_id: target.rol === "cliente" ? userId : null,
  });
  return json({ ok: true, id: userId, password });
}

/** Pulizia best-effort dei file del cliente nei bucket con cartella = id. */
async function rimuoviFileCliente(id: string): Promise<void> {
  const admin = adminClient();
  for (const bucket of ["fatture", "materiali"]) {
    try {
      const { data: files } = await admin.storage.from(bucket).list(id);
      if (files && files.length > 0) {
        await admin.storage.from(bucket).remove(files.map((f) => `${id}/${f.name}`));
      }
    } catch {
      /* storage opzionale */
    }
  }
}

async function eliminaUtente(body: Body, c: Chiamante): Promise<Response> {
  richiediAdmin(c);
  const userId = testo(body.user_id);
  if (!userId) throw new HttpError(400, "Utente non valido.");
  if (userId === c.id) throw new HttpError(403, "Non puoi eliminare il tuo account.");
  const target = await ruoloDi(userId);
  if (!target) throw new HttpError(404, "Utente non trovato.");
  if (target.rol === "admin") throw new HttpError(403, "Un admin non si elimina da qui.");
  // «Wesley ME» contiene il brand di Wesley: per eliminarlo prima si toglie il flag dal database.
  if ((await accountPersonale())?.id === userId) throw new HttpError(403, "L'account personale del team non si elimina da qui.");

  if (target.rol === "cliente") await rimuoviFileCliente(userId);
  const { error } = await adminClient().auth.admin.deleteUser(userId);
  if (error) {
    await logError("gestione-utenti:elimina_utente", error, { userId, rol: target.rol });
    throw new HttpError(500, "Non sono riuscito a eliminare l'utente. Riprova.");
  }
  // La riga clienti non c'è più (cascata): niente cliente_id.
  await registraAttivita(adminClient(), c, { azione: "utente_eliminato", descrizione: `ha eliminato ${target.rol === "cliente" ? "il cliente" : "l'utente"} «${nomeDi(target)}»`, entita: "utente", entita_id: userId });
  return json({ ok: true, id: userId });
}

/** L'account cliente del team («Wesley ME»): la riga clienti con account_personale (migrazione 68). */
async function accountPersonale(): Promise<Ruolo | null> {
  const { data, error } = await adminClient().from("clienti").select("id").eq("account_personale", true).limit(1).maybeSingle();
  if (error || !data) return null;
  return await ruoloDi((data as { id: string }).id);
}

/**
 * «Passa a Wesley ME»: un accesso di un solo uso all'account personale, senza password e senza
 * email (generateLink non spedisce nulla). Il browser lo scambia con una sessione (verifyOtp)
 * dopo aver messo da parte quella del team, che gli serve per «Torna al gestionale».
 * Arriva qui solo il team (richiediTeam) e il bersaglio è sempre e solo l'account col flag,
 * che dal browser nessuno può spostare (trigger clienti_account_personale_protetto).
 */
async function accediAccountPersonale(c: Chiamante): Promise<Response> {
  const target = await accountPersonale();
  if (!target) throw new HttpError(404, "Nessun account personale configurato.");
  if (target.rol !== "cliente" || !target.email) throw new HttpError(409, "L'account personale non è un account cliente.");
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: target.email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    await logError("gestione-utenti:account_personale", error ?? "generateLink senza token", { id: target.id });
    throw new HttpError(500, "Non sono riuscito ad aprire l'account personale. Riprova.");
  }
  await registraAttivita(admin, c, {
    azione: "account_personale",
    descrizione: `ha aperto l'account personale «${nomeDi(target)}»`,
    entita: "utente",
    entita_id: target.id,
    cliente_id: target.id,
  });
  return json({ ok: true, token_hash: tokenHash, tipo: data.properties.verification_type ?? "magiclink", nome: nomeDi(target) });
}

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const c = await richiediTeam(req);
    const body = await leggiBody<Body>(req);
    switch (body.azione) {
      case "crea_cliente":
        return await creaCliente(body, c);
      case "crea_staff":
        return await creaStaff(body, c);
      case "aggiorna_ruolo":
        return await aggiornaRuolo(body, c);
      case "reset_password":
        return await resetPassword(body, c);
      case "elimina_utente":
        return await eliminaUtente(body, c);
      case "accedi_account_personale":
        return await accediAccountPersonale(c);
      default:
        return errore("Azione non riconosciuta.", 400);
    }
  } catch (err) {
    return gestisciErrore(err);
  }
});
