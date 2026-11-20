import { useState } from "react";
import { Link } from "react-router-dom";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Plus, Sparkles, Trash2, X } from "lucide-react";
import { AuraSfera } from "@/shared/components/brand/AuraSfera";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Textarea } from "@/shared/components/ui/textarea";
import { useAggiornaStile, useEliminaStile, useRiscriviStile } from "../hooks/useStili";
import {
  modificaStileSchema,
  scriptStileSchema,
  scriptStileToPayload,
  type ModificaStileFormValues,
  type ScriptStileFormValues,
} from "../schema";
import { linkCreaIdee, MAX_SCRIPT_STILE, type Stile } from "../types";

interface StileSheetProps {
  clienteId: string;
  stile: Stile | null;
  onChiudi: () => void;
}

/**
 * La scheda di uno stile, in un popup centrato: «Come si fa» (nome e istruzioni di Aura,
 * ritoccabili) e «Script» (gli script da cui nasce: si aggiungono, tolgono o correggono e
 * Aura riscrive lo stile). In fondo elimina e «Usa in Crea idee».
 */
export function StileSheet({ clienteId, stile, onChiudi }: StileSheetProps) {
  return (
    <Dialog open={stile !== null} onOpenChange={(open) => !open && onChiudi()}>
      <DialogContent className="gap-0 p-0 sm:max-w-[780px]">
        {stile ? <DettaglioStile key={stile.id} clienteId={clienteId} stile={stile} onChiudi={onChiudi} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function DettaglioStile({ clienteId, stile, onChiudi }: { clienteId: string; stile: Stile; onChiudi: () => void }) {
  const elimina = useEliminaStile(clienteId);
  const [confermaElimina, setConfermaElimina] = useState(false);
  const inCorso = stile.stato === "in_corso";

  return (
    <>
      <DialogHeader className="border-b border-line px-5 pt-5 pb-4 pr-12 sm:px-6">
        <DialogTitle className="text-xl font-semibold">{stile.titolo}</DialogTitle>
        <DialogDescription>{stile.descrizione ?? "Come si costruisce un video in questo stile nel tuo nicho, secondo Aura."}</DialogDescription>
      </DialogHeader>

      {inCorso ? (
        <div className="flex items-center gap-3 border-b border-line bg-muted/40 px-5 py-3 text-sm sm:px-6">
          <AuraSfera dimensione={24} conNome={false} />
          Aura sta riscrivendo lo stile con i tuoi script. Ci mette circa mezzo minuto.
        </div>
      ) : null}

      <Tabs defaultValue="come" className="gap-0">
        <div className="px-5 pt-3 sm:px-6">
          <TabsList variant="line">
            <TabsTrigger value="come">Come si fa</TabsTrigger>
            <TabsTrigger value="script">Script ({stile.script_fonte.length})</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="come" className="p-5 sm:p-6">
          {/* Quando Aura riscrive lo stile le istruzioni cambiano: la chiave riparte il form con quelle nuove. */}
          <FormIstruzioni key={stile.istruzioni} clienteId={clienteId} stile={stile} disabilitato={inCorso} />
        </TabsContent>
        <TabsContent value="script" className="p-5 sm:p-6">
          <FormScript clienteId={clienteId} stile={stile} disabilitato={inCorso} />
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-muted/40 px-5 py-4 sm:px-6">
        <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={elimina.isPending || inCorso} onClick={() => setConfermaElimina(true)}>
          <Trash2 aria-hidden /> Elimina
        </Button>
        <Button nativeButton={false} disabled={inCorso} render={<Link to={linkCreaIdee(stile.id)} />}>
          Usa in Crea idee <ArrowRight aria-hidden />
        </Button>
      </div>

      <AlertDialog open={confermaElimina} onOpenChange={setConfermaElimina}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare lo stile?</AlertDialogTitle>
            <AlertDialogDescription>«{stile.titolo}» sparisce dal menu «/» di Crea idee. Le conversazioni già fatte restano.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={elimina.isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={elimina.isPending}
              onClick={() =>
                elimina.mutate(stile.id, {
                  onSuccess: () => {
                    setConfermaElimina(false);
                    onChiudi();
                  },
                })
              }
            >
              {elimina.isPending ? "Elimino…" : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Nome e istruzioni dello stile: il cliente le corregge con parole sue. */
function FormIstruzioni({ clienteId, stile, disabilitato }: { clienteId: string; stile: Stile; disabilitato: boolean }) {
  const aggiorna = useAggiornaStile(clienteId);
  const form = useForm<ModificaStileFormValues>({
    resolver: zodResolver(modificaStileSchema),
    defaultValues: { titolo: stile.titolo, istruzioni: stile.istruzioni },
  });

  function onSubmit(values: ModificaStileFormValues) {
    aggiorna.mutate({ id: stile.id, dati: values }, { onSuccess: () => form.reset(values) });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid min-w-0 gap-5 *:min-w-0" noValidate>
        <FormField
          control={form.control}
          name="titolo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input disabled={disabilitato} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="istruzioni"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Come si fa questo stile</FormLabel>
              <FormControl>
                <Textarea rows={16} disabled={disabilitato} className="field-sizing-fixed text-base leading-relaxed wrap-anywhere md:text-[13.5px]" {...field} />
              </FormControl>
              <p className="text-xs text-muted-foreground">Sono le istruzioni che Aura segue quando lo richiami con «/». Puoi correggerle con parole tue.</p>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.formState.isDirty ? (
          <div className="flex justify-end">
            <Button type="submit" variant="outline" disabled={aggiorna.isPending || disabilitato}>
              {aggiorna.isPending ? "Salvo…" : "Salva modifiche"}
            </Button>
          </div>
        ) : null}
      </form>
    </Form>
  );
}

/** Gli script da cui nasce lo stile: si aggiungono, tolgono o correggono e Aura riscrive le istruzioni. */
function FormScript({ clienteId, stile, disabilitato }: { clienteId: string; stile: Stile; disabilitato: boolean }) {
  const riscrivi = useRiscriviStile(clienteId);
  const form = useForm<ScriptStileFormValues>({
    resolver: zodResolver(scriptStileSchema),
    defaultValues: {
      script: stile.script_fonte.length > 0 ? stile.script_fonte.map((testo) => ({ testo })) : [{ testo: "" }],
      note: stile.note ?? "",
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "script" });
  const bloccato = disabilitato || riscrivi.isPending;

  function onSubmit(values: ScriptStileFormValues) {
    riscrivi.mutate({ id: stile.id, ...scriptStileToPayload(values) }, { onSuccess: (r) => form.reset({ script: r.stile.script_fonte.map((testo) => ({ testo })), note: r.stile.note ?? "" }) });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid min-w-0 gap-4 *:min-w-0" noValidate>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Aggiungi script nuovi, togli quelli che non c'entrano o correggili: quando premi «Riscrivi lo stile» Aura studia di nuovo tutti gli script e riscrive le istruzioni
          da capo (le correzioni fatte a mano in «Come si fa» si sostituiscono).
        </p>

        {fields.map((f, i) => (
          <FormField
            key={f.id}
            control={form.control}
            name={`script.${i}.testo`}
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-2">
                  <FormLabel className="eyebrow text-[12px]">Script {i + 1}</FormLabel>
                  {fields.length > 1 ? (
                    <Button type="button" size="icon-sm" variant="ghost" className="text-muted-foreground" disabled={bloccato} aria-label={`Togli lo script ${i + 1}`} title="Togli questo script" onClick={() => remove(i)}>
                      <X aria-hidden />
                    </Button>
                  ) : null}
                </div>
                <FormControl>
                  <Textarea rows={6} disabled={bloccato} placeholder="Il testo parlato di un video in questo stile…" className="field-sizing-fixed min-h-28 leading-relaxed wrap-anywhere" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <FormField control={form.control} name="script" render={() => <FormMessage />} />

        <div>
          <Button type="button" size="sm" variant="outline" disabled={bloccato || fields.length >= MAX_SCRIPT_STILE} onClick={() => append({ testo: "" })}>
            <Plus aria-hidden /> Aggiungi script
          </Button>
          {fields.length >= MAX_SCRIPT_STILE ? <span className="ml-2 text-xs text-muted-foreground">Massimo {MAX_SCRIPT_STILE} script.</span> : null}
        </div>

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cosa ti piace di questo stile</FormLabel>
              <FormControl>
                <Textarea rows={2} disabled={bloccato} placeholder="Facoltativo. Es. parte sempre da un errore di chi guarda, tono diretto…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={bloccato || !form.formState.isDirty}>
            <Sparkles aria-hidden /> {riscrivi.isPending ? "Aura riscrive…" : "Riscrivi lo stile"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
