import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth";
import { primoNome, useStatoScheda } from "@/features/scheda";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { SkeletonBlocco } from "@/shared/components/layout/StatoCaricamento";
import { CardScheda } from "../components/CardScheda";

/**
 * Ingresso dell'area cliente: al primo accesso manda al benvenuto (/area/benvenuto);
 * finché la scheda onboarding non è inviata mostra solo quella. Dopo l'invio il
 * cliente entra nel suo spazio (/area/dashboard).
 */
export default function AreaPage() {
  const { utente } = useAuth();
  const stato = useStatoScheda(utente?.id);
  if (!utente) return null;
  if (stato.isLoading) return <SkeletonBlocco altezza="h-40" />;
  if (stato.data?.stato === "inviato") return <Navigate to="/area/dashboard" replace />;
  // Primo accesso: prima il benvenuto (video, requisiti, Instagram), poi la scheda.
  if (stato.data && !stato.data.benvenutoIl) return <Navigate to="/area/benvenuto" replace />;

  const nome = primoNome(utente.nombre);

  return (
    <div className="grid gap-7">
      <PageHeader
        occhiello={`La tua area${nome ? ` · ${nome}` : ""}`}
        titolo="La tua scheda"
        sottotitolo="Compila la scheda di onboarding: è la base su cui Wesley e il suo team costruiranno il tuo percorso. Appena inviata, si apre il tuo spazio di lavoro."
      />
      <CardScheda clienteId={utente.id} />
    </div>
  );
}
