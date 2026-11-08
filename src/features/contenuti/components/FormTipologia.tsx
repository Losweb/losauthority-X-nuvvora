import type { FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { tipologiaSchema, type TipologiaFormValues } from "../schema";

interface FormTipologiaProps {
  /** nuova: campo vuoto e «Aggiungi»; modifica: i valori della riga e «Salva» attivo solo se è cambiato qualcosa. */
  modalita: "nuova" | "modifica";
  valoriIniziali: TipologiaFormValues;
  occupato?: boolean;
  disabled?: boolean;
  /** Risolve quando la base ha salvato (mutateAsync): il form si rimette a posto da solo. */
  onInvia: (valori: TipologiaFormValues) => Promise<unknown>;
  onElimina?: () => void;
}

/** Una riga: selettore del colore, nome, conferma e (in modifica) elimina. */
export function FormTipologia({ modalita, valoriIniziali, occupato = false, disabled = false, onInvia, onElimina }: FormTipologiaProps) {
  const form = useForm<TipologiaFormValues>({
    resolver: zodResolver(tipologiaSchema),
    defaultValues: valoriIniziali,
  });
  const nuova = modalita === "nuova";
  const etichetta = nuova ? "Aggiungi la tipologia" : "Salva la tipologia";

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    // Il popup sta sopra il form del contenuto: senza stopPropagation l'invio arriverebbe anche a lui (React risale i portal).
    e.stopPropagation();
    void form.handleSubmit(async (valori) => {
      try {
        await onInvia(valori);
        form.reset(nuova ? valoriIniziali : valori);
      } catch {
        // L'errore lo racconta già il toast della mutation.
      }
    })(e);
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="flex items-start gap-2" noValidate>
        <FormField
          control={form.control}
          name="colore"
          render={({ field }) => (
            <FormItem className="shrink-0">
              <FormLabel className="sr-only">Colore</FormLabel>
              <FormControl>
                <input
                  type="color"
                  value={field.value}
                  disabled={disabled}
                  aria-label={nuova ? "Colore della nuova tipologia" : `Colore di ${valoriIniziali.nome}`}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  className="block size-10 cursor-pointer rounded-full border border-line bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem className="min-w-0 flex-1">
              <FormLabel className="sr-only">Nome</FormLabel>
              <FormControl>
                <Input placeholder={nuova ? "Nuova tipologia, es. Dietro le quinte" : "Nome"} maxLength={40} disabled={disabled} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          size="icon"
          variant={nuova ? "default" : "outline"}
          disabled={disabled || occupato || (!nuova && !form.formState.isDirty)}
          aria-label={etichetta}
          title={etichetta}
        >
          {nuova ? <Plus aria-hidden /> : <Check aria-hidden />}
        </Button>
        {onElimina ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={occupato}
            aria-label={`Elimina ${valoriIniziali.nome}`}
            title="Elimina"
            onClick={onElimina}
          >
            <Trash2 aria-hidden />
          </Button>
        ) : null}
      </form>
    </Form>
  );
}
