import type { Tables } from "@/integrations/supabase/types";

/** Membro del team (admin, staff, staff_fatture) letto da user_roles. */
export type MembroStaff = Pick<Tables<"user_roles">, "id" | "nombre" | "email" | "rol" | "created_at">;

/** Ruoli assegnabili dalla UI: l'admin non si crea né si cambia da qui. */
export type RuoloStaff = "staff" | "staff_fatture";

export const RUOLI_STAFF: ReadonlyArray<{ valore: RuoloStaff; etichetta: string; descrizione: string }> = [
  {
    valore: "staff",
    etichetta: "Staff",
    descrizione: "Lead, clienti, onboarding, call e tutto Skool (Lezioni, Skool Video). Nessun importo: niente Finance, Contratti né valore dei lead.",
  },
  {
    valore: "staff_fatture",
    etichetta: "Staff + Finance",
    descrizione: "Come Staff, in più vede Finance, Contratti e gli importi (fatture, valore dei lead).",
  },
];

/** Credenziali mostrate UNA sola volta dopo la creazione. */
export interface CredenzialiStaff {
  nombre: string;
  email: string;
  password: string;
}
