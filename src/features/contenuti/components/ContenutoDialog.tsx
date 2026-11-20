import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { formatDateShort } from "@/shared/utils/formatDate";
import type { Contenuto, ContenutoPredefiniti, Tipologia } from "../types";
import { ContenutoForm } from "./ContenutoForm";

interface ContenutoDialogProps {
  clienteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null → nuova idea. */
  contenuto: Contenuto | null;
  /** Giorno e fase già scelti quando l'idea nasce dal calendario. */
  predefiniti?: ContenutoPredefiniti;
  /** Le tipologie che l'utente vede (predefinite + proprie), per il select del form. */
  tipologie: Tipologia[];
}

const TITOLO_NUOVO: Partial<Record<string, string>> = {
  fase_script: "Nuovo script",
  da_registrare: "Nuovo video",
};

function intestazione(contenuto: Contenuto | null, predefiniti?: ContenutoPredefiniti): { titolo: string; testo: string } {
  if (contenuto) return { titolo: "Modifica contenuto", testo: "Aggiorna fase, date, script e materiali del video." };
  const titolo = (predefiniti?.stato && TITOLO_NUOVO[predefiniti.stato]) || "Nuova idea";
  const testo = predefiniti?.pubblicazione_prevista
    ? `Da pubblicare il ${formatDateShort(predefiniti.pubblicazione_prevista)}. Giorno e fase si possono cambiare qui sotto.`
    : "Un'idea di video da portare fino alla pubblicazione.";
  return { titolo, testo };
}

/**
 * Popup centrato per creare/modificare/eliminare un'idea di video (richiesta dell'utente,
 * 20/11/2026: al centro dello schermo, non più pannello a destra). Largo fino a 820px,
 * scorre dentro con il pie' Salva/Annulla sempre visibile; sul telefono sale dal fondo.
 */
export function ContenutoDialog({ clienteId, open, onOpenChange, contenuto, predefiniti, tipologie }: ContenutoDialogProps) {
  const { titolo, testo } = intestazione(contenuto, predefiniti);
  const chiaveForm = contenuto?.id ?? `nuovo-${predefiniti?.pubblicazione_prevista ?? ""}-${predefiniti?.stato ?? ""}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-x-hidden p-0 pb-0 sm:max-w-[820px] sm:pb-0">
        <DialogHeader className="border-b border-line px-6 py-[18px] pr-14">
          <DialogTitle className="text-xl font-semibold">{titolo}</DialogTitle>
          <DialogDescription>{testo}</DialogDescription>
        </DialogHeader>
        <ContenutoForm key={chiaveForm} clienteId={clienteId} contenuto={contenuto} predefiniti={predefiniti} tipologie={tipologie} onChiudi={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
