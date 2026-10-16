import { useEffect } from "react";
import { ArrowLeft, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { codiceAvatar, type Avatar } from "../types";
import { DossierAvatar } from "./DossierAvatar";
import { scorriInCima } from "@/shared/utils/scroll";

interface DossierPaginaProps {
  avatar: Avatar;
  numero: number;
  onChiudi: () => void;
}

/**
 * Il dossier «girato»: prende il posto di chat e carta nell'area dei contenuti
 * (barra laterale e barra in alto restano), con le sezioni su più colonne.
 * Si chiude con «Torna alla carta», la X o Esc.
 */
export function DossierPagina({ avatar, numero, onChiudi }: DossierPaginaProps) {
  useEffect(() => {
    scorriInCima();
    const suTasto = (e: KeyboardEvent) => {
      if (e.key === "Escape") onChiudi();
    };
    window.addEventListener("keydown", suTasto);
    return () => window.removeEventListener("keydown", suTasto);
  }, [onChiudi]);

  return (
    <section aria-label={`Dossier di ${avatar.nome ?? "avatar in compilazione"}`} className="marmo-carta-gira grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Dossier · Cliente ideale · N. {codiceAvatar(numero)}</p>
          <h2 className="truncate text-[22px] leading-tight">{avatar.nome ?? "Avatar in compilazione"}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={onChiudi} className="hidden sm:inline-flex">
            <ArrowLeft aria-hidden /> Torna alla carta
          </Button>
          <button
            type="button"
            onClick={onChiudi}
            aria-label="Chiudi il dossier"
            className="grid size-9 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>
      <DossierAvatar avatar={avatar} numero={numero} onGira={onChiudi} ampio />
    </section>
  );
}
