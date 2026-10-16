import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { LogOut, type LucideIcon } from "lucide-react";
import { Monogramma } from "@/shared/components/brand/Monogramma";
import { cn } from "@/lib/utils";

/*
 * I pezzi della finestra Seto condivisi dai due shell (gestionale e area cliente).
 * Le classi `st-canvas` / `st-window` (index.css) fanno la tela sfumata, la finestra arrotondata
 * con l'ombra e il velo pesca; da md la finestra è alta quanto lo schermo e scorre SOLO il <main>
 * (`data-scroll-principale`), sul telefono scorre la pagina come sempre.
 */

export interface VoceNavBase {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Numero nel badge a destra (es. notifiche). */
  badge?: number;
}

/** Riga di navigazione di Seto (`st-nav`): 40px, raggio md; attiva = pillola chiara con ombra e testo nero. */
export function VoceNavSeto({ voce, className }: { voce: VoceNavBase; className?: string }) {
  const Icon = voce.icon;
  return (
    <NavLink
      to={voce.href}
      className={({ isActive }) =>
        cn(
          "flex h-10 w-full shrink-0 items-center gap-3 rounded-md px-3 text-sm leading-5 font-medium transition-colors",
          isActive ? "bg-surface-active font-semibold text-foreground shadow-sm [&_svg]:text-foreground" : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
          className,
        )
      }
    >
      <Icon className="size-[18px] shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{voce.label}</span>
      {voce.badge != null ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[12px] leading-4 font-medium text-primary-foreground">
          {voce.badge > 99 ? "99+" : voce.badge}
        </span>
      ) : null}
    </NavLink>
  );
}

/** Titolo di una sezione della sidebar (`st-section-toggle`, senza chevron): 14/700. */
export function TitoloSezioneNav({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("flex h-9 items-center px-3 text-sm leading-5 font-bold text-foreground", className)}>{children}</p>;
}

interface CardUtenteProps {
  nome: string;
  /** Riga piccola sotto il nome (email o ruolo). */
  sotto?: string;
  onEsci: () => void;
}

/** La card utente smerigliata in fondo alla sidebar (`st-usercard`), con il bottone «glass» per uscire. */
export function CardUtente({ nome, sotto, onEsci }: CardUtenteProps) {
  return (
    <div className="rounded-lg bg-card-glass p-3 text-foreground shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <Monogramma nome={nome} tono="peach" online className="ring-2 ring-card-glass" />
        <span className="min-w-0">
          <span className="block truncate text-sm leading-5 font-semibold">{nome}</span>
          {sotto ? <span className="block truncate text-[12px] leading-4 font-medium opacity-90">{sotto}</span> : null}
        </span>
      </div>
      <button
        type="button"
        onClick={onEsci}
        className="flex h-10 w-full items-center gap-2 rounded-full bg-card-glass-button pr-4 pl-1 text-sm font-semibold text-foreground transition-[filter] hover:brightness-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <LogOut className="size-4" aria-hidden />
        </span>
        Esci
      </button>
    </div>
  );
}

interface SidebarSetoProps {
  marchio: ReactNode;
  children: ReactNode;
  piede?: ReactNode;
}

/** La colonna sinistra (`st-sidebar`): marchio, voci, spazio, card utente. Solo da md (sotto c'è il pannello ☰). */
export function SidebarSeto({ marchio, children, piede }: SidebarSetoProps) {
  return (
    <aside className="hidden min-h-0 flex-col gap-2 overflow-y-auto bg-sidebar px-4 pt-6 pb-4 md:flex">
      <div className="mb-4 flex h-8 shrink-0 items-center px-3 text-foreground">{marchio}</div>
      {children}
      <div className="flex-1" />
      {piede}
    </aside>
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

/** La tela e la finestra: griglia sidebar + colonna (barra in alto + main che scorre). */
export function FinestraSeto({ sidebar, header, classeMain, children }: FinestraSetoProps) {
  return (
    <div className="st-canvas">
      <div className={cn("st-window flex flex-col", sidebar && "md:grid md:grid-cols-[var(--sidebar-w)_minmax(0,1fr)]")}>
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
