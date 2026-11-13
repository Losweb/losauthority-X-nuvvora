import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { SheetFooter } from "@/shared/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Form } from "@/shared/components/ui/form";
import { useEliminaContenuto, useSalvaContenuto } from "../hooks/useContenuti";
import { contenutoSchema, contenutoToForm, formToContenuto, type ContenutoFormValues } from "../schema";
import type { Contenuto, ContenutoPredefiniti, Tipologia } from "../types";
import { CampoPiattaforme } from "./CampoPiattaforme";
import { CampoRiferimenti } from "./CampoRiferimenti";
import { CampiDate, CampiFase, CampiTesti, CampoDrive, CampoNote, CampoTitolo } from "./CampiContenuto";
import { TipologieDialog } from "./TipologieDialog";

interface ContenutoFormProps {
  clienteId: string;
  /** null → nuova idea. */
  contenuto: Contenuto | null;
  /** Giorno e fase già scelti quando l'idea nasce dal calendario. */
  predefiniti?: ContenutoPredefiniti;
  /** Le tipologie che l'utente vede (predefinite + proprie). */
  tipologie: Tipologia[];
  onChiudi: () => void;
}

/** Il form del contenuto: campi, salva/annulla sempre in vista in fondo, elimina con conferma, popup delle tipologie. */
export function ContenutoForm({ clienteId, contenuto, predefiniti, tipologie, onChiudi }: ContenutoFormProps) {
  const salva = useSalvaContenuto(clienteId);
  const elimina = useEliminaContenuto(clienteId);
  const [confermaElimina, setConfermaElimina] = useState(false);
  const [gestisciTipologie, setGestisciTipologie] = useState(false);

  const form = useForm<ContenutoFormValues>({
    resolver: zodResolver(contenutoSchema),
    defaultValues: contenutoToForm(contenuto, predefiniti),
  });
  const statoScelto = form.watch("stato");

  function onSubmit(values: ContenutoFormValues) {
    salva.mutate({ id: contenuto?.id, dati: formToContenuto(values) }, { onSuccess: onChiudi });
  }

  function handleElimina() {
    if (!contenuto) return;
    elimina.mutate(contenuto.id, {
      onSuccess: () => {
        setConfermaElimina(false);
        onChiudi();
      },
    });
  }

  const occupato = salva.isPending || elimina.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid min-w-0 gap-5 px-6 pt-6 *:min-w-0" noValidate>
        <CampoTitolo control={form.control} />
        <CampiFase control={form.control} tipologie={tipologie} onGestisciTipologie={() => setGestisciTipologie(true)} />
        <CampiDate control={form.control} statoScelto={statoScelto} />
        <CampoPiattaforme control={form.control} />
        <CampiTesti control={form.control} />
        <CampoRiferimenti control={form.control} />
        <CampoDrive control={form.control} />
        <CampoNote control={form.control} />

        {/* Il pannello è alto: i bottoni restano fissi in fondo mentre il form scorre. */}
        <SheetFooter className="sticky bottom-0 -mx-6 mt-1 flex-row items-center justify-between border-t border-line bg-popover px-6 py-4">
          {contenuto ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={occupato}
              onClick={() => setConfermaElimina(true)}
            >
              <Trash2 aria-hidden />
              Elimina
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={onChiudi} disabled={occupato}>
              Annulla
            </Button>
            <Button type="submit" disabled={occupato}>
              {salva.isPending ? "Salvo…" : "Salva"}
            </Button>
          </div>
        </SheetFooter>
      </form>

      <TipologieDialog open={gestisciTipologie} onOpenChange={setGestisciTipologie} tipologie={tipologie} />

      <AlertDialog open={confermaElimina} onOpenChange={setConfermaElimina}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il contenuto?</AlertDialogTitle>
            <AlertDialogDescription>"{contenuto?.titolo}" sparirà dal workflow. L'operazione non si può annullare.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={elimina.isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleElimina} disabled={elimina.isPending}>
              {elimina.isPending ? "Elimino…" : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
