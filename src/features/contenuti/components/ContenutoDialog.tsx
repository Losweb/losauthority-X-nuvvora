import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
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
 * Pannello laterale per creare/modificare/eliminare un'idea di video.
 * Occupa metà schermo da md (almeno 36rem) e tutta la larghezza sul telefono:
 * le classi `data-[side=right]:…` servono a vincere quelle base dello Sheet
 * (`w-[min(90vw,24rem)]`, `sm:max-w-sm`), più specifiche di un semplice `w-full`.
 */
export function ContenutoDialog({ clienteId, open, onOpenChange, contenuto, predefiniti, tipologie }: ContenutoDialogProps) {
  const { titolo, testo } = intestazione(contenuto, predefiniti);
  const chiaveForm = contenuto?.id ?? `nuovo-${predefiniti?.pubblicazione_prevista ?? ""}-${predefiniti?.stato ?? ""}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 overflow-x-hidden overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-none data-[side=right]:md:w-[max(50vw,36rem)]">
        <SheetHeader className="border-b px-6 py-[18px] pr-14">
          <SheetTitle className="font-display text-xl font-semibold">{titolo}</SheetTitle>
          <SheetDescription>{testo}</SheetDescription>
        </SheetHeader>
        <ContenutoForm key={chiaveForm} clienteId={clienteId} contenuto={contenuto} predefiniti={predefiniti} tipologie={tipologie} onChiudi={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
