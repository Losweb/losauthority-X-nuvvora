export { AuthProvider, useAuth } from "./hooks/useAuth";
export { ProtectedRoute, homePerRuolo } from "./components/ProtectedRoute";
export { PassaAccountPersonale, TornaAlGestionale } from "./components/CambioAccount";
export { useAccountPersonale, CHIAVE_ACCOUNT_PERSONALE, type AccountPersonale } from "./hooks/useAccountPersonale";
export { esTeam, esFinance, etichettaRuolo, RUOLI_TEAM, RUOLI_FINANCE } from "./types";
export type { Rol, UtenteCorrente } from "./types";
