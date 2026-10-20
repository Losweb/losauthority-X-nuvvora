import { useState } from "react";
import { ArrowLeftRight, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { AzioneCardUtente } from "@/shared/components/layout/SetoShell";
import { messaggioErrore } from "@/shared/utils/invocaEdge";
import { entraNellAccountPersonale, sessioneGestionaleSalvata, tornaAlGestionale } from "../accountPersonale";
import { useAccountPersonale } from "../hooks/useAccountPersonale";
import { useAuth } from "../hooks/useAuth";
import { esTeam } from "../types";

/** Gestionale, card utente: «Passa a Wesley ME». Solo il team, solo se l'account personale esiste. */
export function PassaAccountPersonale() {
  const { utente } = useAuth();
  const personale = useAccountPersonale(esTeam(utente?.rol ?? null));
  const [inCorso, setInCorso] = useState(false);
  if (!personale.data) return null;
  const nome = personale.data.nome;

  async function passa() {
    setInCorso(true);
    try {
      await entraNellAccountPersonale(utente?.nombre || utente?.email || "");
      // Ricarica completa: nell'area cliente non resta in memoria niente del gestionale.
      window.location.assign("/area");
    } catch (e) {
      setInCorso(false);
      toast.error(`Non sono riuscito ad aprire ${nome}`, { description: messaggioErrore(e) });
    }
  }

  return (
    <AzioneCardUtente icona={ArrowLeftRight} onClick={() => void passa()} disabled={inCorso}>
      {inCorso ? `Apro ${nome}…` : `Passa a ${nome}`}
    </AzioneCardUtente>
  );
}

/**
 * Area cliente aperta dal gestionale: «Torna al gestionale». Compare solo se questo browser ha
 * messo da parte la sessione del team (chi entra con la password dell'account non la vede).
 */
export function TornaAlGestionale({ variante = "card" }: { variante?: "card" | "testata" }) {
  const [salvata] = useState(() => sessioneGestionaleSalvata());
  const [inCorso, setInCorso] = useState(false);
  if (!salvata) return null;
  const titolo = salvata.nome ? `Torna al gestionale come ${salvata.nome}` : "Torna al gestionale";

  async function torna() {
    setInCorso(true);
    try {
      if ((await tornaAlGestionale()) === "ok") {
        window.location.assign("/dashboard");
        return;
      }
      toast.error("La sessione del gestionale è scaduta", { description: "Accedi di nuovo con la tua email e la tua password." });
    } catch (e) {
      toast.error("Non sono riuscito a tornare al gestionale", { description: messaggioErrore(e) });
    }
    setInCorso(false);
  }

  if (variante === "testata") {
    return (
      <Button size="sm" variant="ghost" onClick={() => void torna()} disabled={inCorso} title={titolo}>
        <Undo2 aria-hidden /> Torna al gestionale
      </Button>
    );
  }
  return (
    <AzioneCardUtente icona={Undo2} onClick={() => void torna()} disabled={inCorso} titolo={titolo}>
      {inCorso ? "Torno al gestionale…" : "Torna al gestionale"}
    </AzioneCardUtente>
  );
}
