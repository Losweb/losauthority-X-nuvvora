/**
 * I quattro ruoli del sistema (stesso CHECK di `user_roles.rol`):
 * - admin: tutto.
 * - staff: la vista dell'admin, ridotta. Lead e clienti SENZA importi (niente valore dei lead,
 *   niente Fatture), niente Finance / Contratti / Offerte / Staff; tutto Skool (Lezioni, Skool Video).
 * - staff_fatture: staff + Finance e importi.
 * - cliente: solo la propria area.
 */
export type Rol = "admin" | "staff" | "staff_fatture" | "cliente";

/** Ruoli che accedono al gestionale (e quindi a Lezioni e Skool Video). */
export const RUOLI_TEAM: Rol[] = ["admin", "staff", "staff_fatture"];
/** Ruoli che vedono i soldi (Finance, Contratti, importi delle fatture, valore dei lead). */
export const RUOLI_FINANCE: Rol[] = ["admin", "staff_fatture"];

export function esTeam(rol: Rol | null): boolean {
  return rol !== null && RUOLI_TEAM.includes(rol);
}
export function esFinance(rol: Rol | null): boolean {
  return rol !== null && RUOLI_FINANCE.includes(rol);
}

export function etichettaRuolo(rol: string): string {
  if (rol === "admin") return "Admin";
  if (rol === "staff") return "Staff";
  if (rol === "staff_fatture") return "Staff + Finance";
  return "Cliente";
}

export interface UtenteCorrente {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  /** true per l'account cliente del team («Wesley ME», clienti.account_personale): lo usano più persone insieme. */
  accountPersonale: boolean;
}
