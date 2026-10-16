/** Query key del dominio clienti: ["clienti", "<entità>", id?]. */
export const chiaviClienti = {
  tutti: ["clienti"] as const,
  lista: ["clienti", "lista"] as const,
  /** I lead in stage «cliente» senza contratto pagato (pagina Clienti, blocco «In attesa di contratto»). */
  inAttesa: ["clienti", "in-attesa"] as const,
  cliente: (id: string) => ["clienti", "cliente", id] as const,
  hub: (id: string) => ["clienti", "hub", id] as const,
  analisi: (id: string) => ["clienti", "analisi", id] as const,
  onboarding: (id: string) => ["clienti", "onboarding", id] as const,
  lettura: (id: string) => ["clienti", "lettura", id] as const,
  compiti: (id: string) => ["clienti", "compiti", id] as const,
};
