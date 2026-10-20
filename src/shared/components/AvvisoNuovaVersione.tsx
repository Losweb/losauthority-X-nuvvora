import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useNuovaVersione } from "@/shared/hooks/useNuovaVersione";
import { aggiornaAllUltimaVersione } from "@/shared/utils/versione";

/**
 * Popup a tutta pagina «C'è una nuova versione» (20/10/2026). Montato in App fuori dall'ErrorBoundary,
 * così compare anche sopra una pagina rotta da un pezzo di codice del deploy precedente.
 */
export function AvvisoNuovaVersione() {
  const nuova = useNuovaVersione();
  if (!nuova) return null;
  return <PopupNuovaVersione versione={nuova.versione} />;
}

/**
 * Non si chiude: niente X, Esc e clic fuori non fanno nulla, e tutto il resto della pagina (app,
 * menu e dialog aperti) diventa inerte, quindi non si clicca né ci si arriva col Tab. L'unica
 * strada è «Aggiorna ora».
 */
function PopupNuovaVersione({ versione }: { versione: string | null }) {
  const nodo = useRef<HTMLDivElement>(null);
  const [inCorso, setInCorso] = useState(false);

  useEffect(() => {
    const popup = nodo.current;
    const resi = Array.from(document.body.children).filter((el) => el !== popup && !el.hasAttribute("inert"));
    resi.forEach((el) => el.setAttribute("inert", ""));
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      resi.forEach((el) => el.removeAttribute("inert"));
      document.body.style.overflow = overflow;
    };
  }, []);

  return createPortal(
    <div
      ref={nodo}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="nuova-versione-titolo"
      aria-describedby="nuova-versione-testo"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
      // Un clic sul fondo o sul testo non toglie il fuoco al bottone (Invio aggiorna sempre).
      onMouseDown={(e) => {
        if (!(e.target as HTMLElement).closest("button")) e.preventDefault();
      }}
    >
      <div className="w-full max-w-[440px] rounded-xl border border-line bg-card p-8 text-center shadow-xl max-sm:p-6">
        <span className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-surface-hover text-foreground">
          <RefreshCw className="size-5" aria-hidden />
        </span>
        <p className="eyebrow">Aggiornamento</p>
        <h2 id="nuova-versione-titolo" className="mt-1.5 text-[22px] leading-7 font-bold tracking-[-0.02em]">
          C'è una nuova versione
        </h2>
        <p id="nuova-versione-testo" className="mt-2 text-[15px] leading-6 text-muted-foreground">
          Abbiamo appena pubblicato delle novità. Aggiorna per continuare con l'ultima versione: ci vuole un attimo e resti collegato.
        </p>
        <Button
          size="lg"
          className="mt-6 w-full"
          autoFocus
          disabled={inCorso}
          onClick={() => {
            setInCorso(true);
            void aggiornaAllUltimaVersione(versione);
          }}
        >
          <RefreshCw className={inCorso ? "animate-spin" : undefined} aria-hidden />
          {inCorso ? "Aggiorno…" : "Aggiorna ora"}
        </Button>
      </div>
    </div>,
    document.body,
  );
}
