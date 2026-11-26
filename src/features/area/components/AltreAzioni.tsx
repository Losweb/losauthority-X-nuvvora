import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";

export interface VoceAzione {
  etichetta: string;
  icona: LucideIcon;
  onClick: () => void;
  /** Le azioni che cancellano (Ricomincia) vanno in fondo, separate e in rosso. */
  distruttiva?: boolean;
  disabilitata?: boolean;
}

/**
 * Le azioni di rado (26/11/2026, pulizia UX di Avatar e Offerta): Scarica PDF, la lezione, Ricomincia
 * stanno in un menu «⋯» accanto all'azione principale, invece di tre bottoni sparsi nella pagina.
 */
export function AltreAzioni({ voci }: { voci: VoceAzione[] }) {
  const normali = voci.filter((v) => !v.distruttiva);
  const distruttive = voci.filter((v) => v.distruttiva);
  if (voci.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="Altre azioni" />}>
        <MoreHorizontal aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-52">
        {normali.length ? (
          <DropdownMenuGroup>
            {normali.map((v) => (
              <DropdownMenuItem key={v.etichetta} disabled={v.disabilitata} onClick={v.onClick} className="gap-2 py-2">
                <v.icona aria-hidden /> {v.etichetta}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ) : null}
        {normali.length && distruttive.length ? <DropdownMenuSeparator /> : null}
        {distruttive.length ? (
          <DropdownMenuGroup>
            {distruttive.map((v) => (
              <DropdownMenuItem key={v.etichetta} variant="destructive" disabled={v.disabilitata} onClick={v.onClick} className="gap-2 py-2">
                <v.icona aria-hidden /> {v.etichetta}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
