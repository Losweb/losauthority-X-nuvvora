import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { LogOut, PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react";
import { Monogramma } from "@/shared/components/brand/Monogramma";
import { Button } from "@/shared/components/ui/button";
import { SidebarCompattaContext, useSidebarCompatta, useSidebarCompattaAttiva } from "@/shared/hooks/useSidebarCompatta";
import { cn } from "@/lib/utils";

/*
 * I pezzi della finestra Seto condivisi dai due shell (gestionale e area cliente).
 * Le classi `st-canvas` / `st-window` (index.css) fanno la tela sfumata, la finestra arrotondata
 * con l'ombra e il velo pesca; da md la finestra è alta quanto lo schermo e scorre SOLO il <main>
 * (`data-scroll-principale`), sul telefono scorre la pagina come sempre.
 *
 * La sidebar si può ridurre a una colonna di sole icone («Nascondi la barra»): le voci, i titoli
 * di sezione e il piede utente leggono `SidebarCompattaContext` e si disegnano di conseguenza.
 * Fuori dalla sidebar (menu ☰) il contesto vale false, quindi lì restano come sempre
 * (contesto e hook in `shared/hooks/useSidebarCompatta.ts`).
 */

export interface VoceNavBase {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Numero nel badge a destra (es. notifiche). */
  badge?: number;
}

/**
 * Riga di navigazione di Seto (`st-nav`): 40px, raggio md. Sulla sidebar bianca: attiva = grigio hover
 * con testo nero, hover = grigio della finestra. Compatta: solo l'icona (40×40), il nome nel `title`.
 */
export function VoceNavSeto({ voce, className }: { voce: VoceNavBase; className?: string }) {
  const compatta = useSidebarCompattaAttiva();
  const Icon = voce.icon;
  const badge = voce.badge != null ? (voce.badge > 99 ? "99+" : String(voce.badge)) : null;
  return (
    <NavLink
      to={voce.href}
      title={compatta ? voce.label : undefined}
      aria-label={compatta ? voce.label : undefined}
      className={({ isActive }) =>
        cn(
          "relative flex h-10 shrink-0 items-center rounded-md text-sm leading-5 font-medium transition-colors",
          compatta ? "mx-auto w-10 justify-center" : "w-full gap-3 px-3",
          isActive ? "bg-surface-hover font-semibold text-foreground [&_svg]:text-foreground" : "text-muted-foreground hover:bg-surface hover:text-foreground",
          className,
        )
      }
    >
      <Icon className="size-[18px] shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
      {compatta ? null : <span className="min-w-0 flex-1 truncate">{voce.label}</span>}
      {badge !== null ? (
        <span
          className={cn(
            "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[12px] leading-4 font-medium text-primary-foreground",
            compatta && "absolute -top-1 -right-1 h-4 min-w-4 px-1 leading-none",
          )}
        >
          {badge}
        </span>
      ) : null}
    </NavLink>
  );
}

/** Titolo di una sezione della sidebar (`st-section-toggle`, senza chevron): 14/700. Compatta: una linea sottile. */
export function TitoloSezioneNav({ children, className }: { children: ReactNode; className?: string }) {
  const compatta = useSidebarCompattaAttiva();
  if (compatta) return <div role="separator" className={cn("my-2 border-t border-line", className)} />;
  return <p className={cn("flex h-9 items-center px-3 text-sm leading-5 font-bold text-foreground", className)}>{children}</p>;
}

interface AzioneCardUtenteProps {
  icona: LucideIcon;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  titolo?: string;
  /** outline: pillola con bordo (cambio account); ghost: senza bordo («Esci»). */
  variante?: "outline" | "ghost";
}

/**
 * Bottone del piede utente: pillola a tutta larghezza, icona e testo a sinistra; un testo lungo si
 * tronca invece di uscire. Nella sidebar compatta diventa un bottone rotondo con la sola icona.
 */
export function AzioneCardUtente({ icona: Icona, children, onClick, disabled = false, titolo, variante = "outline" }: AzioneCardUtenteProps) {
  const compatta = useSidebarCompattaAttiva();
  if (compatta) {
    const etichetta = titolo ?? (typeof children === "string" ? children : undefined);
    return (
      <Button type="button" size="icon" variant={variante} onClick={onClick} disabled={disabled} title={etichetta} aria-label={etichetta}>
        <Icona aria-hidden />
      </Button>
    );
  }
  return (
    <Button type="button" variant={variante} onClick={onClick} disabled={disabled} title={titolo} className="w-full min-w-0 justify-start px-4">
      <Icona aria-hidden />
      <span className="min-w-0 truncate">{children}</span>
    </Button>
  );
}

interface CardUtenteProps {
  nome: string;
  /** Riga piccola sotto il nome (email o ruolo). */
  sotto?: string;
  onEsci: () => void;
  /** Azioni sopra «Esci» (es. «Passa a Wesley ME» / «Torna al gestionale»): se non hanno niente da mostrare restituiscono null. */
  azioni?: ReactNode;
}

/**
 * Chi è collegato, le azioni dell'account e «Esci». Va dentro `PiedeUtente`, che gli dà il fondo
 * bianco e la linea sopra (sidebar e menu ☰). Compatta: avatar e bottoni rotondi in colonna.
 */
export function CardUtente({ nome, sotto, onEsci, azioni }: CardUtenteProps) {
  const compatta = useSidebarCompattaAttiva();
  if (compatta) {
    return (
      <div className="flex flex-col items-center gap-2 text-foreground">
        <span title={sotto ? `${nome} · ${sotto}` : nome} className="mb-1">
          <Monogramma nome={nome} tono="peach" online />
        </span>
        {azioni}
        <AzioneCardUtente icona={LogOut} variante="ghost" onClick={onEsci} titolo="Esci">
          Esci
        </AzioneCardUtente>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-3 text-foreground">
      <div className="flex min-w-0 items-center gap-3 px-1">
        <Monogramma nome={nome} tono="peach" online />
        <span className="min-w-0">
          <span className="block truncate text-sm leading-5 font-semibold">{nome}</span>
          {sotto ? <span className="block truncate text-[12px] leading-4 font-medium text-muted-foreground">{sotto}</span> : null}
        </span>
      </div>
      {/* Colonna flex e non grid: in una griglia il testo lungo allargherebbe la colonna oltre il bordo. */}
      <div className="flex min-w-0 flex-col gap-1.5">
        {azioni}
        <AzioneCardUtente icona={LogOut} variante="ghost" onClick={onEsci}>
          Esci
        </AzioneCardUtente>
      </div>
    </div>
  );
}

/** Il piede dell'utente: fondo bianco a tutta larghezza e una linea sopra che lo separa dalle voci. */
export function PiedeUtente({ children, className }: { children: ReactNode; className?: string }) {
  const compatta = useSidebarCompattaAttiva();
  return <div className={cn("shrink-0 border-t border-line bg-card pt-4 pb-4", compatta ? "px-2" : "px-4", className)}>{children}</div>;
}

interface SidebarSetoProps {
  marchio: ReactNode;
  /** Il marchio quando la sidebar è compatta (di solito il solo quadratino «W»); senza, si usa `marchio`. */
  marchioCompatto?: ReactNode;
  children: ReactNode;
  piede?: ReactNode;
}

/**
 * La colonna sinistra (`st-sidebar`): marchio e voci scorrono, il piede utente resta fermo in fondo.
 * Solo da md (sotto c'è il pannello ☰). Il bottone accanto al marchio la riduce a sole icone
 * (`--sidebar-w-compatta`) e la riapre; la scelta si ricorda nel browser.
 */
export function SidebarSeto({ marchio, marchioCompatto, children, piede }: SidebarSetoProps) {
  const [compatta, cambia] = useSidebarCompatta();
  const IconaBarra = compatta ? PanelLeftOpen : PanelLeftClose;
  const etichetta = compatta ? "Mostra la barra" : "Nascondi la barra";
  return (
    <SidebarCompattaContext.Provider value={compatta}>
      <aside
        data-compatta={compatta ? "" : undefined}
        className={cn(
          "hidden min-h-0 flex-col border-r border-line bg-sidebar transition-[width] duration-200 ease-in-out md:flex",
          compatta ? "w-(--sidebar-w-compatta)" : "w-(--sidebar-w)",
        )}
      >
        <div className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto pt-6 pb-4", compatta ? "px-3" : "px-4")}>
          <div className={cn("mb-4 flex shrink-0 text-foreground", compatta ? "flex-col items-center gap-2" : "h-8 items-center justify-between pl-3 pr-1")}>
            <span className="flex h-8 items-center">{compatta ? (marchioCompatto ?? marchio) : marchio}</span>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={cambia}
              aria-label={etichetta}
              title={etichetta}
              className="text-muted-foreground hover:text-foreground"
            >
              <IconaBarra aria-hidden />
            </Button>
          </div>
          {children}
        </div>
        {piede ? <PiedeUtente>{piede}</PiedeUtente> : null}
      </aside>
    </SidebarCompattaContext.Provider>
  );
}

interface FinestraSetoProps {
  sidebar?: ReactNode;
  /** Contenuto della barra in alto (titolo, ☰, azioni). */
  header: ReactNode;
  /** Classi del <main> (larghezza massima, padding). */
  classeMain?: string;
  children: ReactNode;
}

/** La tela e la finestra: griglia sidebar + colonna (barra in alto + main che scorre). La colonna della sidebar è larga quanto la sidebar (piena o compatta). */
export function FinestraSeto({ sidebar, header, classeMain, children }: FinestraSetoProps) {
  return (
    <div className="st-canvas">
      <div className={cn("st-window flex flex-col", sidebar && "md:grid md:grid-cols-[auto_minmax(0,1fr)]")}>
        {sidebar}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-(--header-h) shrink-0 items-center justify-between gap-2 bg-background/85 px-4 backdrop-blur-md md:static md:gap-3 md:bg-transparent md:px-8 md:backdrop-blur-none">
            {header}
          </header>
          <main data-scroll-principale className={cn("min-w-0 flex-1 px-4 pt-4 pb-16 md:overflow-y-auto md:px-8 md:pt-3 md:pb-10", classeMain)}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
