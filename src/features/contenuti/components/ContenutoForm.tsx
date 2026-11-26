import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
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

type StatoSalvataggio = "salvato" | "in_corso" | "da_correggere" | "errore";

const ATTESA_MS = 800;

/**
 * Il form del contenuto. Dal 26/11/2026 (Wesley: «quando esco voglio che tutte le modifiche si salvino
 * in automatico, se mi si chiude per sbaglio non perdo le info») si salva da solo: poco dopo ogni
 * modifica e comunque quando la scheda si chiude (anche per sbaglio, con Esc o cliccando fuori).
 * Niente più Salva/Annulla. Una nuova idea nasce al primo salvataggio con il titolo scritto.
 */
export function ContenutoForm({ clienteId, contenuto, predefiniti, tipologie, onChiudi }: ContenutoFormProps) {
  const salva = useSalvaContenuto(clienteId);
  const elimina = useEliminaContenuto(clienteId);
  const [confermaElimina, setConfermaElimina] = useState(false);
  const [gestisciTipologie, setGestisciTipologie] = useState(false);
  const [statoSalvataggio, setStatoSalvataggio] = useState<StatoSalvataggio>("salvato");

  const form = useForm<ContenutoFormValues>({
    resolver: zodResolver(contenutoSchema),
    defaultValues: contenutoToForm(contenuto, predefiniti),
  });
  const statoScelto = form.watch("stato");

  // L'id (nasce al primo salvataggio di una nuova idea), l'ultimo dato salvato e la coda: un
  // salvataggio alla volta, così una nuova idea non viene creata due volte.
  const idRef = useRef(contenuto?.id);
  const [idSalvato, setIdSalvato] = useState(contenuto?.id);
  const ultimoSalvato = useRef(JSON.stringify(formToContenuto(contenutoToForm(contenuto, predefiniti))));
  const coda = useRef<Promise<void>>(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const salvaRef = useRef(salva.mutateAsync);
  salvaRef.current = salva.mutateAsync;

  const salvaOraRef = useRef(() => {});
  const eliminato = useRef(false);
  salvaOraRef.current = () => {
    coda.current = coda.current.then(async () => {
      if (eliminato.current) return;
      const esito = contenutoSchema.safeParse(form.getValues());
      if (!esito.success) {
        // Una nuova idea senza titolo non si crea; per il resto si mostrano i campi da correggere.
        if (idRef.current || form.getValues("titolo").trim()) {
          setStatoSalvataggio("da_correggere");
          void form.trigger();
        }
        return;
      }
      const dati = formToContenuto(esito.data);
      const firma = JSON.stringify(dati);
      if (firma === ultimoSalvato.current) {
        setStatoSalvataggio("salvato");
        return;
      }
      setStatoSalvataggio("in_corso");
      try {
        const id = await salvaRef.current({ id: idRef.current, dati, silenzioso: true });
        idRef.current = id;
        setIdSalvato(id);
        ultimoSalvato.current = firma;
        setStatoSalvataggio("salvato");
      } catch {
        setStatoSalvataggio("errore");
      }
    });
  };

  useEffect(() => {
    const sub = form.watch(() => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => salvaOraRef.current(), ATTESA_MS);
    });
    return () => {
      sub.unsubscribe();
      // La scheda si chiude (anche per sbaglio): si salva subito quello che manca.
      if (timer.current) clearTimeout(timer.current);
      salvaOraRef.current();
    };
  }, [form]);

  function onSubmit() {
    if (timer.current) clearTimeout(timer.current);
    salvaOraRef.current();
  }

  function handleElimina() {
    const id = idRef.current;
    if (!id) return;
    if (timer.current) clearTimeout(timer.current);
    eliminato.current = true;
    elimina.mutate(id, {
      onSuccess: () => {
        setConfermaElimina(false);
        onChiudi();
      },
      onError: () => {
        eliminato.current = false;
      },
    });
  }

  const occupato = elimina.isPending;
  const TESTO_STATO: Record<StatoSalvataggio, string> = {
    salvato: idSalvato ? "Salvato" : "Si salva da solo appena scrivi l'idea",
    in_corso: "Salvo…",
    da_correggere: "Non salvato: correggi i campi in rosso",
    errore: "Non salvato: controlla la connessione",
  };

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
        <div className="sticky bottom-0 -mx-6 mt-1 flex flex-row items-center justify-between gap-2 border-t border-line bg-popover px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {idSalvato ? (
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
          <div className="flex items-center gap-3 sm:justify-end">
            <span
              role="status"
              className={`inline-flex items-center gap-1.5 text-[13px] ${statoSalvataggio === "da_correggere" || statoSalvataggio === "errore" ? "text-destructive" : "text-muted-foreground"}`}
            >
              {statoSalvataggio === "salvato" && idSalvato ? <Check className="size-3.5" aria-hidden /> : null}
              {TESTO_STATO[statoSalvataggio]}
            </span>
            <Button type="button" variant="outline" onClick={onChiudi} disabled={occupato}>
              Chiudi
            </Button>
          </div>
        </div>
      </form>

      <TipologieDialog open={gestisciTipologie} onOpenChange={setGestisciTipologie} tipologie={tipologie} />

      <AlertDialog open={confermaElimina} onOpenChange={setConfermaElimina}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il contenuto?</AlertDialogTitle>
            <AlertDialogDescription>"{form.getValues("titolo")}" sparirà dal workflow. L'operazione non si può annullare.</AlertDialogDescription>
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
