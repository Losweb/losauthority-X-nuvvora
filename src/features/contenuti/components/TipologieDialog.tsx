import { useState } from "react";
import { Lock } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { useAggiornaTipologia, useCreaTipologia, useEliminaTipologia } from "../hooks/useTipologie";
import { COLORE_TIPOLOGIA_NUOVA, MAX_TIPOLOGIE, type Tipologia } from "../types";
import { EtichettaTipologia } from "./EtichettaTipologia";
import { FormTipologia } from "./FormTipologia";

interface TipologieDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipologie: Tipologia[];
}

/**
 * Le tipologie dei contenuti: le predefinite (sola lettura, uguali per tutti) e quelle
 * dell'utente, che qui si aggiungono, si rinominano, cambiano colore o si eliminano.
 */
export function TipologieDialog({ open, onOpenChange, tipologie }: TipologieDialogProps) {
  const crea = useCreaTipologia();
  const aggiorna = useAggiornaTipologia();
  const elimina = useEliminaTipologia();
  const [daEliminare, setDaEliminare] = useState<Tipologia | null>(null);

  const predefinite = tipologie.filter((t) => t.predefinita);
  const proprie = tipologie.filter((t) => !t.predefinita);
  const piene = proprie.length >= MAX_TIPOLOGIE;

  function handleElimina() {
    if (!daEliminare) return;
    elimina.mutate(daEliminare.id, { onSuccess: () => setDaEliminare(null) });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tipologie dei contenuti</DialogTitle>
          <DialogDescription>
            Le quattro predefinite valgono per tutti e non si cambiano. Le tue le vedi solo tu: nome e colore come preferisci.
          </DialogDescription>
        </DialogHeader>

        <section aria-label="Tipologie predefinite" className="grid gap-1.5">
          <h3 className="eyebrow text-[12px]">Predefinite</h3>
          <ul className="grid gap-0.5">
            {predefinite.map((t) => (
              <li key={t.id} className="flex h-10 items-center gap-3 rounded-md px-2 text-sm">
                <span className="min-w-0 flex-1">
                  <EtichettaTipologia tipologia={t} />
                </span>
                <Lock className="size-3.5 text-muted-foreground" aria-hidden />
                <span className="sr-only">Predefinita, non modificabile</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Le tue tipologie" className="grid gap-2">
          <h3 className="eyebrow text-[12px]">
            Le tue · {proprie.length}/{MAX_TIPOLOGIE}
          </h3>
          {proprie.length === 0 ? <p className="text-xs text-muted-foreground">Nessuna ancora: aggiungine una qui sotto.</p> : null}
          {proprie.map((t) => (
            <FormTipologia
              key={t.id}
              modalita="modifica"
              valoriIniziali={{ nome: t.nome, colore: t.colore }}
              occupato={aggiorna.isPending || elimina.isPending}
              onInvia={(valori) => aggiorna.mutateAsync({ id: t.id, ...valori })}
              onElimina={() => setDaEliminare(t)}
            />
          ))}
          <FormTipologia
            modalita="nuova"
            valoriIniziali={{ nome: "", colore: COLORE_TIPOLOGIA_NUOVA }}
            occupato={crea.isPending}
            disabled={piene}
            onInvia={(valori) => crea.mutateAsync(valori)}
          />
          {piene ? <p className="text-xs text-muted-foreground">Hai raggiunto il massimo: elimina una tipologia per aggiungerne un'altra.</p> : null}
        </section>
      </DialogContent>

      <AlertDialog open={daEliminare !== null} onOpenChange={(aperto) => !aperto && setDaEliminare(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare «{daEliminare?.nome}»?</AlertDialogTitle>
            <AlertDialogDescription>I contenuti che la usano restano nel workflow, senza tipologia.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={elimina.isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleElimina} disabled={elimina.isPending}>
              {elimina.isPending ? "Elimino…" : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
