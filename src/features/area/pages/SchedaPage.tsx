import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth";
import { SchedaFlow, useStatoScheda } from "@/features/scheda";
import { SkeletonBlocco } from "@/shared/components/layout/StatoCaricamento";
import { TransizioneOnboarding } from "../components/TransizioneOnboarding";

/**
 * /area/onboarding → compilazione (o rilettura) della scheda onboarding.
 * Chi non ha ancora fatto il benvenuto ci passa prima. All'invio parte la
 * transizione animata che porta allo spazio cliente.
 */
export default function SchedaPage() {
  const { utente } = useAuth();
  const stato = useStatoScheda(utente?.id);
  const [inviata, setInviata] = useState(false);
  if (stato.isLoading) return <SkeletonBlocco altezza="h-40" />;
  if (stato.data && stato.data.stato !== "inviato" && !stato.data.benvenutoIl) return <Navigate to="/area/benvenuto" replace />;
  return (
    <>
      <SchedaFlow onInviata={() => setInviata(true)} />
      {inviata ? <TransizioneOnboarding /> : null}
    </>
  );
}
