import { Link, NavLink } from "react-router-dom";
import { BarChart3, Brain, GraduationCap, LayoutGrid, Palette, Route, Users, WandSparkles } from "lucide-react";
import { TornaAlGestionale, useAuth } from "@/features/auth";
import { Button } from "@/shared/components/ui/button";
import { MarmoLogo } from "@/shared/components/brand/MarmoLogo";
import { ContenutoPagina } from "@/shared/components/layout/ContenutoPagina";
import { MenuMobile } from "@/shared/components/layout/MenuMobile";
import { CardUtente, FinestraSeto, SidebarSeto, VoceNavSeto, type VoceNavBase } from "@/shared/components/layout/SetoShell";
import { cn } from "@/lib/utils";

/** Sezioni del percorso; il "Cervello del tuo branding" è a parte, con una voce in evidenza. */
const VOCI_PERCORSO: VoceNavBase[] = [
  { href: "/area/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/area/stili", label: "Stili", icon: Palette },
  { href: "/area/crea-idee", label: "Crea idee", icon: WandSparkles },
  { href: "/area/workflow", label: "Workflow", icon: Route },
  { href: "/area/pubblicazioni", label: "Pubblicazioni", icon: BarChart3 },
  { href: "/area/clienti", label: "Clienti", icon: Users },
  { href: "/area/coach", label: "Wesley Coach", icon: GraduationCap },
];

const HREF_CERVELLO = "/area/cervello";

/** La voce "Cervello del tuo branding": più importante delle altre, quindi una card (Seto action card) con il cervello su disco `action`; attiva anche nelle sottopagine. */
function VoceCervello() {
  return (
    <NavLink
      to={HREF_CERVELLO}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-lg border px-3 py-3 transition-[border-color,background-color,box-shadow] duration-300",
          isActive ? "border-line bg-surface-hover" : "border-line bg-card shadow-xs hover:bg-surface",
        )
      }
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform duration-300 group-hover:scale-105">
        <Brain className="size-[18px]" strokeWidth={2} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="eyebrow block">Il tuo branding</span>
        <span className="block text-[15px] leading-tight font-bold tracking-[-0.01em] text-foreground">Cervello del tuo branding</span>
      </span>
    </NavLink>
  );
}

function NavPercorso() {
  return (
    <nav aria-label="Il tuo percorso" className="flex flex-1 flex-col gap-0.5 px-4 pt-2 pb-4 md:px-0 md:pt-0">
      {VOCI_PERCORSO.map((v) => (
        <VoceNavSeto key={v.href} voce={v} />
      ))}
      <div className="pt-5">
        <VoceCervello />
      </div>
    </nav>
  );
}

const logoArea = (
  <Link to="/area/dashboard" aria-label="La tua area" className="text-foreground">
    <MarmoLogo altezza={20} />
  </Link>
);

interface ClientShellProps {
  /** true nello spazio cliente (dopo l'onboarding): sidebar a sinistra con le sezioni. */
  conNav?: boolean;
}

/**
 * Shell dell'area cliente (Seto). Durante l'onboarding: solo marchio + «Esci» e colonna centrale
 * da 820px. Con `conNav`: sidebar a sinistra (Dashboard, Stili, Crea idee, Workflow, Pubblicazioni,
 * Clienti, Wesley Coach) e, in evidenza, la card "Cervello del tuo branding"; in fondo la card utente
 * con «Esci». Sotto md la sidebar diventa il pannello ☰ (`MenuMobile`).
 */
export function ClientShell({ conNav = false }: ClientShellProps) {
  const { utente, signOut } = useAuth();
  const cardUtente = (
    <CardUtente nome={utente?.nombre || "Cliente"} sotto={utente?.email} onEsci={() => void signOut()} azioni={<TornaAlGestionale />} />
  );

  if (!conNav) {
    return (
      <FinestraSeto
        classeMain="mx-auto w-full max-w-[820px] sm:px-6 sm:pt-8 sm:pb-16"
        header={
          <>
            <Link to="/area" aria-label="La tua area" className="text-foreground">
              <MarmoLogo altezza={20} />
            </Link>
            <span className="flex items-center gap-1">
              <TornaAlGestionale variante="testata" />
              <Button size="sm" variant="ghost" onClick={() => void signOut()}>
                Esci
              </Button>
            </span>
          </>
        }
      >
        <ContenutoPagina />
      </FinestraSeto>
    );
  }

  return (
    <FinestraSeto
      classeMain="md:pt-2"
      sidebar={
        <SidebarSeto marchio={logoArea} piede={cardUtente}>
          <NavPercorso />
        </SidebarSeto>
      }
      header={
        <>
          <div className="flex min-w-0 items-center gap-1 md:hidden">
            <MenuMobile testata={logoArea} piede={cardUtente}>
              <NavPercorso />
            </MenuMobile>
            {logoArea}
          </div>
          <span className="hidden md:block" />
        </>
      }
    >
      <div className="mx-auto w-full max-w-[1280px]">
        <ContenutoPagina />
      </div>
    </FinestraSeto>
  );
}
