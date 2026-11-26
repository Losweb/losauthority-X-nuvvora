import { Link } from "react-router-dom";
import { BarChart3, CalendarDays, GraduationCap, Layers, Palette, Plug, Route, Swords, Tag, UserRound, Users, WandSparkles } from "lucide-react";
import { TornaAlGestionale, useAuth } from "@/features/auth";
import { Button } from "@/shared/components/ui/button";
import { MarmoLogo } from "@/shared/components/brand/MarmoLogo";
import { BottoneTemaCompatto } from "@/shared/components/layout/InterruttoreTema";
import { ContenutoPagina } from "@/shared/components/layout/ContenutoPagina";
import { MenuMobile } from "@/shared/components/layout/MenuMobile";
import { CardUtente, FinestraSeto, SidebarSeto, TitoloSezioneNav, VoceNavSeto, type VoceNavBase } from "@/shared/components/layout/SetoShell";

/**
 * Il menu segue il metodo (26/11/2026, studio dell'esperienza cliente): prima il percorso, poi le
 * fondamenta nell'ordine in cui si fanno, i contenuti, i risultati; in fondo gli aiuti.
 */
const VOCE_PERCORSO: VoceNavBase = { href: "/area/dashboard", label: "Il tuo percorso", icon: Route };
const GRUPPI: Array<{ titolo: string; voci: VoceNavBase[] }> = [
  {
    titolo: "Fondamenta",
    voci: [
      { href: "/area/cervello/offerta", label: "Offerta", icon: Tag },
      { href: "/area/cervello/avatar", label: "Avatar", icon: UserRound },
      { href: "/area/cervello/concorrenti", label: "Concorrenti", icon: Swords },
      { href: "/area/cervello/kit-brand", label: "Marca", icon: Palette },
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
    titolo: "Risultati",
    voci: [
      { href: "/area/pubblicazioni", label: "Numeri", icon: BarChart3 },
      { href: "/area/clienti", label: "Clienti", icon: Users },
    ],
  },
];
const VOCI_AIUTO: VoceNavBase[] = [
  { href: "/area/coach", label: "Wesley Coach", icon: GraduationCap },
  { href: "/area/claude", label: "Collega Claude", icon: Plug },
];

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
      <div className="mt-3 flex flex-col gap-0.5 border-t border-line pt-3">
        {VOCI_AIUTO.map((v) => (
          <VoceNavSeto key={v.href} voce={v} />
        ))}
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
 * Contenuti, Risultati), in fondo gli aiuti e la card utente con «Esci». Sotto md la sidebar diventa il pannello ☰ (`MenuMobile`).
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
