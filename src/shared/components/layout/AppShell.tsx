import { useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Clapperboard, FileSignature, KanbanSquare, LayoutGrid, Plus, ShieldAlert, Tag, Tags, TrendingUp, UserCog, Users } from "lucide-react";
import { useAuth, esFinance, esTeam, etichettaRuolo } from "@/features/auth";
import { NuovoLeadRapido } from "@/features/pipeline";
import { Button } from "@/shared/components/ui/button";
import { MarmoLogo } from "@/shared/components/brand/MarmoLogo";
import { ContenutoPagina } from "@/shared/components/layout/ContenutoPagina";
import { MenuMobile } from "@/shared/components/layout/MenuMobile";
import { CardUtente, FinestraSeto, SidebarSeto, TitoloSezioneNav, VoceNavSeto, type VoceNavBase } from "@/shared/components/layout/SetoShell";
import { useRegistraSito } from "@/shared/hooks/useRegistraSito";

interface VoceNav extends VoceNavBase {
  soloFinance?: boolean;
  soloAdmin?: boolean;
}

const VOCI_PRINCIPALI: VoceNav[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/leads", label: "Leads", icon: KanbanSquare },
  { href: "/clienti", label: "Clienti", icon: Users },
  { href: "/finance", label: "Finance", icon: TrendingUp, soloFinance: true },
  { href: "/contratti", label: "Contratti", icon: FileSignature, soloFinance: true },
  { href: "/offerte", label: "Offerte", icon: Tag, soloAdmin: true },
  { href: "/lezioni", label: "Lezioni", icon: BookOpen, soloAdmin: true },
  { href: "/skool-video", label: "Skool Video", icon: Clapperboard, soloAdmin: true },
];

const VOCI_SECONDARIE: VoceNav[] = [
  { href: "/staff", label: "Staff", icon: UserCog, soloAdmin: true },
  { href: "/tag", label: "Tag", icon: Tags },
  { href: "/errori", label: "Errori", icon: ShieldAlert },
];

const TITOLI: Array<[string, string]> = [
  ["/dashboard", "Dashboard"],
  ["/leads", "Leads"],
  ["/clienti/nuovo", "Nuovo cliente"],
  ["/clienti", "Clienti"],
  ["/finance", "Finance"],
  ["/contratti/nuovo", "Nuovo invito"],
  ["/contratti", "Contratti"],
  ["/offerte", "Offerte"],
  ["/lezioni", "Lezioni"],
  ["/skool-video", "Skool Video"],
  ["/staff/nuovo", "Nuovo staff"],
  ["/staff", "Staff"],
  ["/tag", "Tag"],
  ["/errori", "Errori"],
];

function titoloPer(pathname: string): string {
  return TITOLI.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? "Gestionale";
}

function NavGestionale({ principali, secondarie }: { principali: VoceNav[]; secondarie: VoceNav[] }) {
  return (
    <nav aria-label="Principale" className="flex flex-1 flex-col gap-0.5 px-4 pt-2 pb-4 md:px-0 md:pt-0">
      <TitoloSezioneNav>Gestionale</TitoloSezioneNav>
      {principali.map((v) => (
        <VoceNavSeto key={v.href} voce={v} />
      ))}
      <TitoloSezioneNav className="mt-4">Sistema</TitoloSezioneNav>
      {secondarie.map((v) => (
        <VoceNavSeto key={v.href} voce={v} />
      ))}
    </nav>
  );
}

/**
 * Shell del gestionale (Seto): la finestra arrotondata sulla tela sfumata, sidebar 232px a sinistra
 * (marchio, voci a pillola, card utente in fondo), barra del titolo e contenuto che scorre da solo.
 * Sotto md la sidebar diventa il pannello ☰ (`MenuMobile`) e le azioni della topbar restano icone.
 */
export function AppShell() {
  const { utente, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const rol = utente?.rol ?? null;
  const puoFinance = esFinance(rol);
  const eAdmin = rol === "admin";
  // Il dominio da cui lavora il team serve ai link delle notifiche Telegram (vedi useRegistraSito).
  useRegistraSito(esTeam(rol));

  const filtra = (v: VoceNav) => (!v.soloFinance || puoFinance) && (!v.soloAdmin || eAdmin);
  const principali = VOCI_PRINCIPALI.filter(filtra);
  const secondarie = VOCI_SECONDARIE.filter(filtra);
  const cardUtente = <CardUtente nome={utente?.nombre || (rol ? etichettaRuolo(rol) : "Utente")} sotto={utente?.email} onEsci={() => void signOut()} />;

  return (
    <FinestraSeto
      sidebar={
        <SidebarSeto marchio={<MarmoLogo altezza={20} />} piede={cardUtente}>
          <NavGestionale principali={principali} secondarie={secondarie} />
        </SidebarSeto>
      }
      header={
        <>
          <div className="flex min-w-0 items-center gap-1">
            <MenuMobile testata={<MarmoLogo altezza={20} />} piede={cardUtente}>
              <NavGestionale principali={principali} secondarie={secondarie} />
            </MenuMobile>
            <h1 className="min-w-0 truncate text-[18px] leading-[26px] font-bold tracking-[-0.01em]">{titoloPer(pathname)}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            <NuovoLeadRapido />
            <Button size="sm" onClick={() => navigate("/clienti/nuovo")} aria-label="Nuovo cliente" title="Nuovo cliente">
              <Plus aria-hidden />
              <span className="hidden sm:inline">Nuovo cliente</span>
            </Button>
          </div>
        </>
      }
    >
      <ContenutoPagina />
    </FinestraSeto>
  );
}
