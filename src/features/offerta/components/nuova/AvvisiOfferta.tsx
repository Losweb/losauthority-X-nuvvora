import { useState } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
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
import { useRicominciaOfferta } from "../../hooks/useOffertaCliente";
import { haOffertaDiPrima, type OffertaNuova } from "../../nuova";
import type { Offerta } from "../../types";
import { StrutturaOfferta } from "../StrutturaOfferta";

/** Dopo la frase (versione breve) si va alla fase Avatar; la mappa cambiata va riletta qui. */
export function AvvisiOfferta({ o, avatarAggiornatoIl }: { o: OffertaNuova; avatarAggiornatoIl: string | null }) {
  const avatarCambiato = !!avatarAggiornatoIl && !!o.avatar_letto_il && avatarAggiornatoIl > o.avatar_letto_il && !!o.frase;
  return (
    <>
      {avatarCambiato ? (
        <div className="flex gap-2.5 rounded-lg border border-status-expiring/40 bg-status-expiring-soft p-3 text-[14px] text-status-expiring">
          <RefreshCw className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>Il tuo avatar è cambiato dopo l'ultima volta che ne abbiamo parlato qui. Scrivi ad Aura «rivediamo il per chi» e sistema la frase con la partenza principale.</p>
        </div>
      ) : null}
    </>
  );
}

/** L'offerta scritta prima con il metodo vecchio, piegata: Aura la usa come «l'offerta che porti». */
export function OffertaDiPrima({ o: nuova }: { o: OffertaNuova }) {
  const [aperta, setAperta] = useState(false);
  // Legge solo le colonne di prima: la riga è la stessa.
  const o = nuova as unknown as Offerta;
  if (!haOffertaDiPrima(o)) return null;
  return (
    <section className="grid gap-3 border-t pt-4">
      <Button variant="ghost" className="w-fit" aria-expanded={aperta} onClick={() => setAperta((v) => !v)}>
        <ChevronDown aria-hidden className={aperta ? "rotate-180 transition-transform" : "transition-transform"} />
        L'offerta di prima{o.nome ? `: ${o.nome}` : ""}
      </Button>
      {aperta ? (
        <div className="grid gap-2">
          {o.trasformazione ? <p className="text-[15px]">«{o.trasformazione}»</p> : null}
          {o.prezzo ? <p className="text-[14px] text-muted-foreground">Prezzo: {o.prezzo}</p> : null}
          <StrutturaOfferta offerta={o} />
        </div>
      ) : null}
    </section>
  );
}

/** «Ricomincia»: elimina l'offerta e la conversazione, dopo conferma. */
export function RicominciaOfferta({ offertaId, aperto, onOpenChange }: { offertaId: string; aperto: boolean; onOpenChange: (aperto: boolean) => void }) {
  const ricomincia = useRicominciaOfferta();
  const setAperto = onOpenChange;
  return (
    <>
      <AlertDialog open={aperto} onOpenChange={setAperto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ricominciare l'offerta da capo?</AlertDialogTitle>
            <AlertDialogDescription>
              Si perdono la frase, la scheda, l'offerta di prima e la conversazione con Aura. I lead del CRM collegati a questa offerta restano, senza offerta. L'operazione non si può annullare.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={ricomincia.isPending} onClick={() => ricomincia.mutate(offertaId, { onSuccess: () => setAperto(false) })}>
              Ricomincia
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
