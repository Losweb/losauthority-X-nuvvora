import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addMonths, format, parseISO } from "date-fns";
import { MODELLI_CONTRATTO } from "@contratti/modelli.ts";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { useAggiornaCliente } from "../hooks/useAggiornaCliente";
import { datiClienteSchema, normalizzaSocial, type DatiClienteValues } from "../schema";
import type { ClienteDettaglio } from "../types";
import { GIORNI_PROMEMORIA_FINE } from "./FinePercorso";

/** Durata del programma in vendita (oggi solo UPSCALE): serve al tasto «Inizio + N mesi». */
const PROGRAMMA = MODELLI_CONTRATTO.upscale;

/** ISO → valore per <input type="datetime-local"> nell'ora del browser. */
function perDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  try {
    return format(parseISO(iso), "yyyy-MM-dd'T'HH:mm");
  } catch {
    return "";
  }
}

/** Contatti, date e note del cliente. */
export function FormDatiCliente({ cliente }: { cliente: ClienteDettaglio }) {
  const aggiorna = useAggiornaCliente(cliente.id, "Dati salvati");
  const defaults: DatiClienteValues = {
    telefono: cliente.telefono ?? "",
    instagram: cliente.instagram ?? "",
    tiktok: cliente.tiktok ?? "",
    data_inizio: cliente.data_inizio ?? "",
    data_fine: cliente.data_fine ?? "",
    prossima_call: perDatetimeLocal(cliente.prossima_call),
    note: cliente.note ?? "",
  };
  const form = useForm<DatiClienteValues>({ resolver: zodResolver(datiClienteSchema), defaultValues: defaults });
  const inizio = useWatch({ control: form.control, name: "data_inizio" });

  function fineDaDurata() {
    if (!inizio) return;
    form.setValue("data_fine", format(addMonths(parseISO(inizio), PROGRAMMA.durataMesi), "yyyy-MM-dd"), { shouldDirty: true, shouldValidate: true });
  }

  function onSubmit(v: DatiClienteValues) {
    const callCambiata = v.prossima_call !== defaults.prossima_call;
    aggiorna.mutate({
      telefono: v.telefono || null,
      instagram: normalizzaSocial(v.instagram, "instagram"),
      tiktok: normalizzaSocial(v.tiktok, "tiktok"),
      data_inizio: v.data_inizio || null,
      data_fine: v.data_fine || null,
      note: v.note || null,
      // Segnata "manuale": la sync col calendario non la sovrascrive.
      ...(callCambiata
        ? {
            prossima_call: v.prossima_call ? new Date(v.prossima_call).toISOString() : null,
            prossima_call_source: v.prossima_call ? "manuale" : null,
          }
        : {}),
    });
  }

  const campo = (name: keyof DatiClienteValues, label: string, type = "text", placeholder = "") => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={type} placeholder={placeholder} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dati cliente</CardTitle>
        <CardDescription>Contatti, date e note — solo per il team.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
            {campo("telefono", "Telefono", "tel", "+39 333 1234567")}
            {campo("instagram", "Instagram (link o @handle)", "text", "@nome")}
            {campo("tiktok", "TikTok (link o @handle)", "text", "@nome")}
            {campo("data_inizio", "Inizio percorso", "date")}
            <FormField
              control={form.control}
              name="data_fine"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fine percorso</FormLabel>
                  <div className="flex flex-wrap items-center gap-2">
                    <FormControl>
                      <Input type="date" className="w-auto" {...field} />
                    </FormControl>
                    {inizio ? (
                      <Button type="button" variant="outline" size="sm" onClick={fineDaDurata}>
                        Inizio + {PROGRAMMA.durataMesi} mesi ({PROGRAMMA.programma})
                      </Button>
                    ) : null}
                  </div>
                  <FormDescription>
                    Con un contratto attivo si compila da sola con la sua scadenza. {GIORNI_PROMEMORIA_FINE} giorni prima arriva un messaggio Telegram al team.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="prossima_call"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prossima call</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormDescription>
                    {cliente.prossima_call_source === "calendar"
                      ? "Arriva dal calendario: se la cambi qui diventa manuale e il calendario non la tocca più."
                      : "Se la imposti qui, il calendario non la sovrascrive."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <Button type="submit" size="sm" disabled={aggiorna.isPending}>
                {aggiorna.isPending ? "Salvo…" : "Salva"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
