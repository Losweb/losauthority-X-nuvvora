import type { ReactNode } from "react";
import { MarmoLogo } from "@/shared/components/brand/MarmoLogo";

/** Cornice delle pagine pubbliche (contratto del cliente, informativa privacy): la finestra Seto con solo il marchio in alto, niente navigazione. */
export function ShellPubblica({ children }: { children: ReactNode }) {
  return (
    <div className="st-canvas">
      <div className="st-window flex flex-col">
        <header className="flex h-(--header-h) shrink-0 items-center justify-center px-5">
          <MarmoLogo altezza={20} />
        </header>
        <main data-scroll-principale className="mx-auto w-full max-w-[760px] min-h-0 flex-1 px-4 pt-4 pb-20 md:overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

/** Un avviso a tutta pagina (link non valido, invito ritirato). */
export function AvvisoPubblico({ titolo, testo }: { titolo: string; testo: string }) {
  return (
    <div className="grid gap-2 rounded-lg border border-line bg-card p-6 shadow-xs">
      <h1 className="text-[28px] leading-tight">{titolo}</h1>
      <p className="text-[15px] leading-relaxed text-muted-foreground">{testo}</p>
    </div>
  );
}
