import { useState } from "react";
import { RotateCcw } from "lucide-react";
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
import { Button } from "@/shared/components/ui/button";
import { useRicominciaMappa } from "../../hooks/useMappaAvatar";

/** «Ricomincia da capo»: elimina mappa, schede e conversazione, dopo conferma. */
export function RicominciaAvatar({ clienteId, mappaId, disabilitato }: { clienteId: string; mappaId: string; disabilitato?: boolean }) {
  const [aperto, setAperto] = useState(false);
  const ricomincia = useRicominciaMappa(clienteId);
  return (
    <>
      <Button variant="ghost" size="sm" className="text-muted-foreground" disabled={disabilitato} onClick={() => setAperto(true)}>
        <RotateCcw aria-hidden /> Ricomincia
      </Button>
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
