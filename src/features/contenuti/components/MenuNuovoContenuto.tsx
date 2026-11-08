import type { ReactElement, ReactNode } from "react";
import { format, isValid, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { FileText, Video } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { ETICHETTA_STATO_CONTENUTO, type StatoContenuto } from "../types";
import { PuntoStato } from "./PuntoStato";

interface MenuNuovoContenutoProps {
  /** Giorno "YYYY-MM-DD" in cui nasce il contenuto. */
  data: string;
  onNuovo: (data: string, stato: StatoContenuto) => void;
  /** L'elemento che apre il menu (un Button); `children` è il suo contenuto. */
  trigger: ReactElement;
  children?: ReactNode;
  disabled?: boolean;
  /** Aperto da fuori (clic sul giorno del calendario); senza, il menu si gestisce da solo. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Obbligatorio con `open` controllato: è l'id del trigger a cui Base UI àncora il popup.
   * Senza, un menu aperto da fuori compare in alto a sinistra della pagina.
   */
  triggerId?: string;
  align?: "start" | "end";
}

const VOCI: ReadonlyArray<{ stato: StatoContenuto; titolo: string; Icona: typeof FileText }> = [
  { stato: "fase_script", titolo: "Nuovo script", Icona: FileText },
  { stato: "da_registrare", titolo: "Nuovo video", Icona: Video },
];

/**
 * «Nuovo script» o «Nuovo video» in un giorno: è la stessa idea di video del
 * Workflow, che parte da una fase diversa (Fase script / Da registrare).
 */
export function MenuNuovoContenuto({ data, onNuovo, trigger, children, disabled, open, onOpenChange, triggerId, align = "start" }: MenuNuovoContenutoProps) {
  const giorno = parseISO(data);
  const etichetta = isValid(giorno) ? format(giorno, "EEEE d MMMM", { locale: it }) : "Scegli un giorno";

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange} triggerId={triggerId}>
      <DropdownMenuTrigger id={triggerId} render={trigger} disabled={disabled}>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-auto min-w-60">
        {/* La GroupLabel di Base UI vive solo dentro un Group: senza, il menu va in errore all'apertura. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="capitalize">{etichetta}</DropdownMenuLabel>
          {VOCI.map(({ stato, titolo, Icona }) => (
            <DropdownMenuItem key={stato} className="items-start gap-2.5 py-2" onClick={() => onNuovo(data, stato)}>
              <Icona className="mt-0.5" aria-hidden />
              <span className="grid gap-0.5">
                <span className="font-medium">{titolo}</span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <PuntoStato stato={stato} />
                  Parte da «{ETICHETTA_STATO_CONTENUTO[stato]}»
                </span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
