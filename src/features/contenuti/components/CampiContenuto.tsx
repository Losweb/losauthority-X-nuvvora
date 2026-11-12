import { useEffect, useMemo } from "react";
import { useFormContext, useWatch, type Control } from "react-hook-form";
import { Settings2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import type { ContenutoFormValues } from "../schema";
import { ETICHETTA_STATO_CONTENUTO, STATO_CONTENUTO_KEYS, type Tipologia } from "../types";
import { PuntoTipologia } from "./EtichettaTipologia";

const STATO_ITEMS: Record<string, string> = { ...ETICHETTA_STATO_CONTENUTO };

interface CampoProps {
  control: Control<ContenutoFormValues>;
}

export function CampoTitolo({ control }: CampoProps) {
  return (
    <FormField
      control={control}
      name="titolo"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Idea del video *</FormLabel>
          <FormControl>
            <Input placeholder="Es. 3 errori che fai quando pubblichi un reel" autoFocus {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface CampiFaseProps extends CampoProps {
  /** Le tipologie che l'utente vede (predefinite + proprie): le voci del select. */
  tipologie: Tipologia[];
  /** Apre il popup per aggiungere o modificare le proprie. */
  onGestisciTipologie: () => void;
}

/** Stato (fase della pipeline) e tipologia (dalla tabella, con il suo colore), affiancati. */
export function CampiFase({ control, tipologie, onGestisciTipologie }: CampiFaseProps) {
  // Stabile tra un render e l'altro: il Select di Base UI rilegge `items` quando cambia identità.
  const tipologiaItems = useMemo<Record<string, string>>(
    () => ({ "": "—", ...Object.fromEntries(tipologie.map((t) => [t.id, t.nome])) }),
    [tipologie],
  );
  const { setValue } = useFormContext<ContenutoFormValues>();
  const tipologiaScelta = useWatch({ control, name: "tipologia_id" });
  useEffect(() => {
    // La tipologia scelta non esiste più (eliminata mentre il form era aperto): il campo torna vuoto,
    // come ha già fatto la base per i contenuti che la usavano (FK on delete set null).
    if (tipologiaScelta && tipologie.length > 0 && !tipologie.some((t) => t.id === tipologiaScelta)) {
      setValue("tipologia_id", "", { shouldDirty: true });
    }
  }, [tipologiaScelta, tipologie, setValue]);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={control}
        name="stato"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Stato</FormLabel>
            <Select value={field.value} items={STATO_ITEMS} onValueChange={(v) => field.onChange(v ?? "fase_script")}>
              <FormControl>
                <SelectTrigger className="w-full" onBlur={field.onBlur}>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {STATO_CONTENUTO_KEYS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {ETICHETTA_STATO_CONTENUTO[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="tipologia_id"
        render={({ field }) => (
          <FormItem>
            <div className="flex h-5 items-center justify-between gap-2">
              <FormLabel>Tipologia</FormLabel>
              <Button type="button" size="xs" variant="ghost" className="-mr-2 text-muted-foreground hover:text-foreground" onClick={onGestisciTipologie}>
                <Settings2 aria-hidden /> Gestisci
              </Button>
            </div>
            <Select value={field.value} items={tipologiaItems} onValueChange={(v) => field.onChange(v ?? "")}>
              <FormControl>
                <SelectTrigger className="w-full" onBlur={field.onBlur}>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                {tipologie.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <PuntoTipologia colore={t.colore} />
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

/** Giorno e ora previsti e, solo se pubblicato, la data reale. L'ora si sceglie solo con il giorno. */
export function CampiDate({ control, statoScelto }: CampoProps & { statoScelto: string }) {
  const giorno = useWatch({ control, name: "pubblicazione_prevista" });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-3">
        <FormField
          control={control}
          name="pubblicazione_prevista"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Da pubblicare il</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="ora_prevista"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alle ore</FormLabel>
              <FormControl>
                <Input
                  type="time"
                  step={60}
                  disabled={!giorno}
                  title={giorno ? undefined : "Scegli prima il giorno"}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      {statoScelto === "pubblicato" ? (
        <FormField
          control={control}
          name="pubblicato_il"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pubblicato il</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
    </div>
  );
}

/** Lo script (testo del video) e, sotto, la descrizione: tutto il resto che non è script. */
export function CampiTesti({ control }: CampoProps) {
  return (
    <>
      <FormField
        control={control}
        name="script"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Script</FormLabel>
            <FormControl>
              <Textarea
                rows={14}
                placeholder="Il testo completo del video: hook, sviluppo, chiusura…"
                className="field-sizing-fixed font-mono text-[13px] wrap-anywhere"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="descrizione"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descrizione</FormLabel>
            <FormControl>
              <Textarea
                rows={6}
                placeholder="Di cosa parla il video, il contesto, cosa far vedere, la didascalia…"
                className="field-sizing-fixed wrap-anywhere"
                {...field}
              />
            </FormControl>
            <FormDescription>Testo libero, separato dallo script: quello che serve sapere sul video oltre a ciò che dici.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

export function CampoDrive({ control }: CampoProps) {
  return (
    <FormField
      control={control}
      name="drive_url"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Cartella Drive</FormLabel>
          <FormControl>
            <Input inputMode="url" placeholder="https://drive.google.com/…" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function CampoNote({ control }: CampoProps) {
  return (
    <FormField
      control={control}
      name="note"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Note</FormLabel>
          <FormControl>
            <Textarea rows={3} placeholder="Appunti veloci per te o per il team…" className="field-sizing-fixed wrap-anywhere" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
