/**
 * Gli avatar del cliente per l'agente Offerta (dal 25/11/2026): la mappa della
 * fase Avatar (ponte, arrivo) e le schede delle partenze, la principale per
 * prima. Prima leggeva la tabella `avatar` del sistema vecchio.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface AvatarPerOfferta {
  nome: string | null;
  principale: boolean;
  testo: string;
}

export async function avatarDi(admin: SupabaseClient, clienteId: string): Promise<{ avatars: AvatarPerOfferta[]; mappa: string | null }> {
  const [{ data: mappa }, { data: schede }] = await Promise.all([
    admin.from("avatar_mappa").select("passo, stato, tipo, ponte, arrivo, fuori").eq("cliente_id", clienteId).maybeSingle(),
    admin.from("avatar_scheda").select("ordine, principale, partenza, contenuto").eq("cliente_id", clienteId).order("principale", { ascending: false }).order("ordine"),
  ]);
  const avatars = ((schede ?? []) as Array<{ ordine: number; principale: boolean; partenza: unknown; contenuto: Record<string, unknown> }>).map((s) => ({
    nome: typeof s.contenuto.nome === "string" ? s.contenuto.nome : null,
    principale: s.principale,
    testo: `## Avatar ${s.ordine}${s.principale ? " (principale)" : ""}\npartenza: ${JSON.stringify(s.partenza)}\nscheda: ${JSON.stringify(s.contenuto)}`,
  }));
  return { avatars, mappa: mappa ? JSON.stringify(mappa) : null };
}

/** In testo per il prompt. Ogni riga ha la sua origine: «vera» = detta da un cliente o da lui, «lettura» = ipotesi. */
export function renderAvatar(d: { avatars: AvatarPerOfferta[]; mappa: string | null }): string {
  if (!d.mappa && d.avatars.length === 0) return "(nessun avatar definito: metti a fuoco il minimo, chi / che problema / in che momento, prima di costruire)";
  const testa = d.mappa ? `## La mappa (ponte = cosa vende, arrivo = dove porta chi compra; righe {t, o} con o = vera/riassunto/lettura)\n${d.mappa}` : "";
  return [testa, ...d.avatars.map((a) => a.testo)].filter(Boolean).join("\n\n").slice(0, 20000);
}
