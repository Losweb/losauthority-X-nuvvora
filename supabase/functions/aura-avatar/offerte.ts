/**
 * Le offerte del cliente (Cervello → Offerta) in testo compatto per il prompt:
 * il ponte si fissa partendo da qui, con i nomi e i prezzi veri.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const CAMPI = [
  ["nome", "Nome"],
  ["tipo", "Cos'è"],
  ["prezzo", "Prezzo"],
  ["per_chi", "Per chi"],
  ["trasformazione", "Trasformazione"],
  ["snapshot", "In breve"],
  ["scala_gratis", "Gradino gratis"],
  ["scala_entrata", "Gradino d'entrata"],
  ["scala_cuore", "Offerta cuore"],
  ["scala_vetta", "Gradino alto"],
] as const;

export async function renderOfferte(admin: SupabaseClient, clienteId: string): Promise<string> {
  const { data } = await admin
    .from("offerta")
    .select(`stato, ${CAMPI.map(([k]) => k).join(", ")}`)
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false })
    .limit(4);
  const righe = (data ?? []) as unknown as Array<Record<string, string | null>>;
  if (righe.length === 0) return "(nessuna offerta costruita sul sito: cosa vende lo sai dall'onboarding o glielo chiedi)";
  return righe
    .sort((a, b) => Number(b.stato === "completo") - Number(a.stato === "completo"))
    .map((o, i) => {
      const voci = CAMPI.filter(([k]) => o[k]).map(([k, etichetta]) => `${etichetta}: ${o[k]}`);
      return `Offerta ${i + 1} (${o.stato === "completo" ? "completa" : "in costruzione"})\n${voci.join("\n")}`;
    })
    .join("\n\n");
}
