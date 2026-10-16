import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth";
import { useDocumentiCrm, useStatoCrm, versione as versioneCrm } from "@/features/crm";
import { useInstagramCliente } from "@/features/pubblicazioni";
import { primoNome, useSegnaBenvenuto, useStatoScheda } from "@/features/scheda";
import { ErroreCaricamento, SkeletonBlocco } from "@/shared/components/layout/StatoCaricamento";
import { CorniceBenvenuto } from "../components/benvenuto/CorniceBenvenuto";
import { FineBenvenuto } from "../components/benvenuto/FineBenvenuto";
import { PassoInstagram } from "../components/benvenuto/PassoInstagram";
import { PassoRequisiti } from "../components/benvenuto/PassoRequisiti";
import { PassoVideo } from "../components/benvenuto/PassoVideo";

type Passo = "video" | "requisiti" | "instagram" | "fine";

/** Quanto dura l'uscita di un passo prima che entri il successivo (= animazione marmo-benvenuto-esce). */
const USCITA_MS = 420;

/**
 * /area/benvenuto → il primo accesso del cliente, fuori dalle shell: video,
 * requisiti da accettare, profilo Instagram, poi l'onboarding. Si vede una volta
 * sola (`data_onboarding.benvenuto_il`); i passi già risolti si saltano.
 */
export default function BenvenutoPage() {
  const { utente } = useAuth();
  const clienteId = utente?.id ?? "";
  const scheda = useStatoScheda(utente?.id);
  const statoCrm = useStatoCrm(utente?.id);
  const documenti = useDocumentiCrm(!!utente);
  const instagram = useInstagramCliente(utente?.id);
  const segna = useSegnaBenvenuto(clienteId);
  const [indice, setIndice] = useState(0);
  const [uscita, setUscita] = useState(false);
  const timer = useRef<number | null>(null);

  const caricamento = scheda.isLoading || statoCrm.isLoading || documenti.isLoading || instagram.isLoading;
  const errore = scheda.isError || statoCrm.isError || documenti.isError || instagram.isError;

  // La versione in vigore dei documenti (null se non ancora pubblicata: il passo si salta e lo chiederà la sezione Clienti).
  const versione = documenti.data ? versioneCrm(documenti.data, statoCrm.data?.versioneCorrente ?? null) : null;

  // I passi si decidono una volta sola, a caricamento finito: quello che il cliente
  // risolve strada facendo (accetta, collega) non deve far sparire il passo sotto i piedi.
  const [passi, setPassi] = useState<Passo[]>([]);
  if (!caricamento && !errore && passi.length === 0) {
    // Stato derivato dal primo caricamento (pattern «adjust state while rendering»).
    const lista: Passo[] = ["video"];
    if (versione && !statoCrm.data?.attivo) lista.push("requisiti");
    if (!instagram.data?.instagram) lista.push("instagram");
    lista.push("fine");
    setPassi(lista);
  }

  const passo = passi[indice] ?? null;

  useEffect(() => {
    if (passo === "fine" && segna.isIdle) segna.mutate();
  }, [passo, segna]);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  function avanti() {
    if (uscita) return;
    setUscita(true);
    timer.current = window.setTimeout(() => {
      setIndice((i) => Math.min(i + 1, passi.length - 1));
      setUscita(false);
    }, USCITA_MS);
  }

  if (!utente) return null;
  // Benvenuto già fatto (o scheda già inviata): si torna all'ingresso normale.
  if (scheda.data && (scheda.data.stato === "inviato" || scheda.data.benvenutoIl) && !segna.isSuccess) return <Navigate to="/area" replace />;

  const nome = primoNome(utente.nombre);
  const totale = Math.max(passi.length - 1, 1);

  return (
    <CorniceBenvenuto passo={Math.min(indice, totale - 1)} totale={totale} uscita={uscita}>
      {caricamento ? <SkeletonBlocco altezza="h-64" /> : null}
      {errore ? <ErroreCaricamento /> : null}
      {passo === "video" ? <PassoVideo nome={nome} onAvanti={avanti} /> : null}
      {passo === "requisiti" && versione && documenti.data ? (
        <PassoRequisiti clienteId={clienteId} versione={versione} documenti={documenti.data} onAvanti={avanti} />
      ) : null}
      {passo === "instagram" ? <PassoInstagram clienteId={clienteId} onAvanti={avanti} /> : null}
      {passo === "fine" ? <FineBenvenuto pronto={segna.isSuccess} /> : null}
    </CorniceBenvenuto>
  );
}
