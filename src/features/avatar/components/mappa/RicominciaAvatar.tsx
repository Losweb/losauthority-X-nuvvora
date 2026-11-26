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
import { useRicominciaMappa } from "../../hooks/useMappaAvatar";

/** «Ricomincia da capo»: elimina mappa, schede e conversazione, dopo conferma. */
export function RicominciaAvatar({ clienteId, mappaId, aperto, onOpenChange }: { clienteId: string; mappaId: string; aperto: boolean; onOpenChange: (aperto: boolean) => void }) {
  const ricomincia = useRicominciaMappa(clienteId);
  const setAperto = onOpenChange;
  return (
    <>
      <AlertDialog open={aperto} onOpenChange={setAperto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ricominciare da capo?</AlertDialogTitle>
            <AlertDialogDescription>Si perdono la mappa, le schede e la conversazione con Aura. L'operazione non si può annullare.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={ricomincia.isPending} onClick={() => ricomincia.mutate(mappaId, { onSuccess: () => setAperto(false) })}>
              Ricomincia
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
