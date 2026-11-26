/**
 * Il posizionamento del cliente come blocco di testo per i prompt di Aura (Idee, Stili,
 * Coach): dal 26/11/2026 prende il posto del kit brand. null se non c'è ancora.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { pulisciPosizionamento } from "./forma.ts";

export async function bloccoPosizionamento(admin: SupabaseClient, clienteId: string): Promise<string | null> {
  const { data } = await admin.from("posizionamento").select("contenuto, stato").eq("cliente_id", clienteId).maybeSingle();
  if (!data || (data as { stato: string }).stato !== "pronto") return null;
  const p = pulisciPosizionamento((data as { contenuto: unknown }).contenuto);
  const righe: string[] = [];
  if (p.chi_sei) righe.push(`Chi è: ${p.chi_sei}`);
  if (p.perche_tu?.length) righe.push(`Perché può dirlo: ${p.perche_tu.join(" · ")}`);
  if (p.cosa_dicono_tutti?.length) righe.push(`Cosa dicono già tutti (da evitare): ${p.cosa_dicono_tutti.join(" · ")}`);
  if (p.come_lo_dimostri?.length) righe.push(`Come lo dimostra nei contenuti: ${p.come_lo_dimostri.join(" · ")}`);
  if (p.profilo?.bio) righe.push(`Bio Instagram: ${p.profilo.bio.replace(/\n/g, " / ")}`);
  if (righe.length === 0) return null;
  return `=== POSIZIONAMENTO DEL CLIENTE ===\n${righe.join("\n")}`;
}
