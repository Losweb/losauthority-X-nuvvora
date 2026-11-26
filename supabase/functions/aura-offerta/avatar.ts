/**
 * La fase Avatar vista dall'Offerta: la mappa (ponte, arrivo, partenze) e le
 * schede, la principale per prima. Decide anche la STRADA: l'avatar conta come
 * approvato quando Aura ha chiuso la mappa (passo «fatto») con almeno una scheda
 * (decisione di Wesley del 26/11/2026). Se la mappa è cambiata dopo l'ultima
 * lettura dell'Offerta, lo si dice ad Aura (e la pagina lo mostra).
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface AvatarPerOfferta {
  nome: string | null;
  principale: boolean;
  testo: string;
}

export interface FaseAvatar {
  approvata: boolean;
  /** La mappa è stata aggiornata dopo l'ultima volta che Aura l'ha letta qui. */
  cambiata: boolean;
  avatars: AvatarPerOfferta[];
  mappa: string | null;
}

export async function avatarDi(admin: SupabaseClient, clienteId: string, lettoIl: string | null = null): Promise<FaseAvatar> {
  const [{ data: mappa }, { data: schede }] = await Promise.all([
    admin.from("avatar_mappa").select("passo, stato, tipo, ponte, arrivo, fuori, esempi, principale_perche, updated_at").eq("cliente_id", clienteId).maybeSingle(),
    admin.from("avatar_scheda").select("ordine, principale, partenza, contenuto, updated_at").eq("cliente_id", clienteId).order("principale", { ascending: false }).order("ordine"),
  ]);
  const righe = (schede ?? []) as Array<{ ordine: number; principale: boolean; partenza: unknown; contenuto: Record<string, unknown>; updated_at: string }>;
  const avatars = righe.map((s) => ({
    nome: typeof s.contenuto.nome === "string" ? s.contenuto.nome : null,
    principale: s.principale,
    testo: `## Avatar ${s.ordine}${s.principale ? " (principale)" : ""}\npartenza: ${JSON.stringify(s.partenza)}\nscheda: ${JSON.stringify(s.contenuto)}`,
  }));
  const m = mappa as (Record<string, unknown> & { passo: string; updated_at: string }) | null;
  const ultima = [m?.updated_at, ...righe.map((r) => r.updated_at)].filter(Boolean).sort().at(-1) ?? null;
  return {
    approvata: !!m && m.passo === "fatto" && righe.length > 0,
    cambiata: !!lettoIl && !!ultima && ultima > lettoIl,
    avatars,
    mappa: m ? JSON.stringify({ ...m, updated_at: undefined }) : null,
  };
}

/** In testo per il prompt. Ogni riga ha la sua origine: «vera» = detta da un cliente o dalla persona, «lettura» = ipotesi. */
export function renderAvatar(d: FaseAvatar): string {
  if (!d.mappa && d.avatars.length === 0) return "(la fase Avatar non è ancora iniziata)";
  const stato = d.approvata ? "Mappa CHIUSA da Aura (avatar approvato)." : "Mappa NON ancora chiusa (avatar non approvato).";
  const cambio = d.cambiata ? "\nATTENZIONE: la mappa Avatar è cambiata dopo l'ultima volta che l'hai letta qui: rivedi il «per chi» della frase con la partenza principale e dillo." : "";
  const testa = d.mappa ? `## La mappa (ponte = cosa vende, arrivo = dove porta chi compra; righe {t, o})\n${d.mappa}` : "";
  return [`${stato}${cambio}`, testa, ...d.avatars.map((a) => a.testo)].filter(Boolean).join("\n\n").slice(0, 20000);
}
