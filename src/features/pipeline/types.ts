import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Lead = Tables<"lead">;
export type LeadInsert = TablesInsert<"lead">;
export type LeadUpdate = TablesUpdate<"lead">;
/** Una riga della vista `lead_team`: il gestionale legge i lead da qui. Le colonne arrivano nullable (è una vista) e `valore` è null per chi non vede gli importi (staff). */
export type RigaLeadTeam = Tables<"lead_team">;

/** Dalla vista al `Lead` usato in tutto il gestionale: il valore vale 0 quando non lo si può vedere. */
export function leadDaVista(r: RigaLeadTeam): Lead {
  return {
    id: r.id ?? "",
    nome: r.nome ?? "",
    contatto: r.contatto,
    fonte: r.fonte,
    stage: r.stage ?? "nuovo",
    valore: Number(r.valore) || 0,
    note: r.note,
    prossima_azione: r.prossima_azione,
    prossima_azione_il: r.prossima_azione_il,
    cliente_id: r.cliente_id,
    created_at: r.created_at ?? "",
    updated_at: r.updated_at ?? "",
  };
}

/** Stage della pipeline, nell'ordine dell'imbuto (stesso CHECK della tabella). */
export const LEAD_STAGE_KEYS = ["nuovo", "contattato", "call_fissata", "proposta", "cliente", "perso"] as const;
export type LeadStage = (typeof LEAD_STAGE_KEYS)[number];

export const LEAD_STAGES: ReadonlyArray<{ key: LeadStage; label: string }> = [
  { key: "nuovo", label: "Nuovo" },
  { key: "contattato", label: "Contattato" },
  { key: "call_fissata", label: "Call fissata" },
  { key: "proposta", label: "Proposta" },
  { key: "cliente", label: "Cliente" },
  { key: "perso", label: "Perso" },
];

/** Fonti ammesse (stesso CHECK della tabella). */
export const LEAD_FONTI = ["Instagram", "TikTok", "Referral", "Landing", "WhatsApp", "Email", "Evento", "Altro"] as const;
export type LeadFonte = (typeof LEAD_FONTI)[number];

/** Stage "chiusi": non contano nel valore pipeline né nei lead aperti. */
const STAGE_CHIUSI: ReadonlyArray<string> = ["cliente", "perso"];

export function stageLabel(stage: string): string {
  return LEAD_STAGES.find((s) => s.key === stage)?.label ?? stage;
}

export function eStageAperto(stage: string): boolean {
  return !STAGE_CHIUSI.includes(stage);
}

export function eLeadStage(valore: string): valore is LeadStage {
  return (LEAD_STAGE_KEYS as ReadonlyArray<string>).includes(valore);
}
