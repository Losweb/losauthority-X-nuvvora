import type { ReactNode } from "react";

interface PageHeaderProps {
  titolo: string;
  sottotitolo?: string;
  /** Occhiello sopra il titolo (es. "La tua area · Marco"). */
  occhiello?: string;
  azioni?: ReactNode;
}

/** Intestazione di pagina (Seto): occhiello, titolo display (28–32px, 700), sottotitolo in body-sm e azioni a destra. */
export function PageHeader({ titolo, sottotitolo, occhiello, azioni }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="grid min-w-0 gap-1.5">
        {occhiello ? <p className="eyebrow">{occhiello}</p> : null}
        <h2 className="text-[28px] leading-[1.15] break-words sm:text-[32px]">{titolo}</h2>
        {sottotitolo ? <p className="text-[14px] leading-5 text-muted-foreground">{sottotitolo}</p> : null}
      </div>
      {azioni ? <div className="flex flex-wrap items-center gap-2">{azioni}</div> : null}
    </div>
  );
}
