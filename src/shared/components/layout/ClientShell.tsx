import { Link, NavLink, useNavigate } from "react-router-dom";
import { CalendarDays, Compass, GraduationCap, Layers, Plug, Route, Tag, UserRound, Users, WandSparkles } from "lucide-react";
import { TornaAlGestionale, useAuth } from "@/features/auth";
import { Button } from "@/shared/components/ui/button";
import { MarmoLogo } from "@/shared/components/brand/MarmoLogo";
import { BottoneTemaCompatto } from "@/shared/components/layout/InterruttoreTema";
import { ContenutoPagina } from "@/shared/components/layout/ContenutoPagina";
import { MenuMobile } from "@/shared/components/layout/MenuMobile";
import { useSidebarCompattaAttiva } from "@/shared/hooks/useSidebarCompatta";
import { cn } from "@/lib/utils";
import { AzioneCardUtente, CardUtente, FinestraSeto, SidebarSeto, TitoloSezioneNav, VoceNavSeto, type VoceNavBase } from "@/shared/components/layout/SetoShell";

/**
 * Il menu segue il metodo (26/11/2026, studio dell'esperienza cliente): prima il percorso, poi le
 * fondamenta nell'ordine in cui si fanno, i contenuti, la gestione dei clienti. Wesley Coach non è
 * una voce come le altre: è un tasto a parte, in fondo, ben visibile (richiesta di Wesley, 26/11/2026).
 * La pagina Numeri è tolta (26/11/2026).
 */
const VOCE_PERCORSO: VoceNavBase = { href: "/area/dashboard", label: "Il tuo percorso", icon: Route };
const GRUPPI: Array<{ titolo: string; voci: VoceNavBase[] }> = [
  {
    titolo: "Fondamenta",
    voci: [
      { href: "/area/cervello/avatar", label: "Avatar", icon: UserRound },
      { href: "/area/cervello/offerta", label: "Offerta", icon: Tag },
      { href: "/area/cervello/posizionamento", label: "Posizionamento", icon: Compass },
    ],
  },
  {
    titolo: "Contenuti",
    voci: [
      { href: "/area/crea-idee", label: "Idee", icon: WandSparkles },
      { href: "/area/stili", label: "Stili", icon: Layers },
      { href: "/area/workflow", label: "Calendario", icon: CalendarDays },
    ],
  },
  {
    titolo: "Gestione",
    voci: [{ href: "/area/clienti", label: "Clienti", icon: Users }],
  },
];
/**
 * Wesley Coach: il tasto a cui il cliente arriva quando è bloccato. Pieno e con una riga sotto, così
 * si distingue dalle pagine di lavoro; nella sidebar compatta resta un tondo pieno con l'icona.
 */
function TastoCoach() {
  const compatta = useSidebarCompattaAttiva();
  if (compatta) {
    return (
      <NavLink
        to="/area/coach"
        title="Wesley Coach"
        aria-label="Wesley Coach"
        className="mx-auto mt-auto grid size-10 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
      >
        <GraduationCap className="size-[18px]" aria-hidden />
      </NavLink>
    );
  }
  return (
    <NavLink
      to="/area/coach"
      className={({ isActive }) =>
        cn(
          "mt-auto flex items-center gap-3 rounded-xl bg-primary px-3 py-2.5 text-primary-foreground transition-opacity hover:opacity-90",
          isActive && "ring-2 ring-primary/30 ring-offset-2 ring-offset-sidebar",
        )
      }
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-foreground/15">
        <GraduationCap className="size-[18px]" aria-hidden />
      </span>
      <span className="grid min-w-0 leading-tight">
        <span className="truncate text-sm font-semibold">Wesley Coach</span>
        <span className="truncate text-[12px] opacity-80">Bloccato? Chiedi qui</span>
      </span>
    </NavLink>
  );
}

function NavPercorso() {
  return (
    <nav aria-label="Il tuo percorso" className="flex flex-1 flex-col gap-0.5 px-4 pt-2 pb-4 md:px-0 md:pt-0">
      <VoceNavSeto voce={VOCE_PERCORSO} />
      {GRUPPI.map((g) => (
        <div key={g.titolo} className="mt-3 flex flex-col gap-0.5">
          <TitoloSezioneNav className="text-[12px] font-semibold text-muted-foreground">{g.titolo}</TitoloSezioneNav>
          {g.voci.map((v) => (
            <VoceNavSeto key={v.href} voce={v} />
          ))}
        </div>
      ))}
      <div className="mt-6 flex flex-1 flex-col">
        <TastoCoach />
      </div>
    </nav>
  );
}

const logoArea = (
  <Link to="/area/dashboard" aria-label="La tua area" className="text-foreground">
    <MarmoLogo altezza={20} />
  </Link>
);
const logoAreaCompatto = (
  <Link to="/area/dashboard" aria-label="La tua area" className="text-foreground">
    <MarmoLogo altezza={24} soloMonogramma />
  </Link>
);

interface ClientShellProps {
  /** true nello spazio cliente (dopo l'onboarding): sidebar a sinistra con le sezioni. */
  conNav?: boolean;
}

/**
 * Shell dell'area cliente (Seto). Durante l'onboarding: solo marchio + «Esci» e colonna centrale
 * da 820px. Con `conNav`: sidebar a sinistra con «Il tuo percorso» e i tre gruppi (Fondamenta,
 * Contenuti, Gestione), in fondo il tasto Wesley Coach e la card utente con «Esci». Sotto md la sidebar diventa il pannello ☰ (`MenuMobile`).
 */
export function ClientShell({ conNav = false }: ClientShellProps) {
  const { utente, signOut } = useAuth();
  const navigate = useNavigate();
  // «Collega Claude» è un'impostazione: sta nel menu dell'account, non tra le pagine di lavoro.
  const cardUtente = (
    <CardUtente
      nome={utente?.nombre || "Cliente"}
      sotto={utente?.email}
      onEsci={() => void signOut()}
      azioni={
        <>
          <TornaAlGestionale />
          <AzioneCardUtente icona={Plug} variante="ghost" onClick={() => navigate("/area/claude")}>
            Collega Claude
          </AzioneCardUtente>
        </>
      }
    />
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
              <BottoneTemaCompatto />
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
        <SidebarSeto marchio={logoArea} marchioCompatto={logoAreaCompatto} piede={cardUtente}>
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
