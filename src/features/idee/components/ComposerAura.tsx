import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp, Palette, X } from "lucide-react";
import { Aura, useAuraStatus } from "@/shared/components/aura";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import type { Stile } from "../types";
import { MenuStili } from "./MenuStili";

interface ComposerAuraProps {
  inAttesa: boolean;
  onInvia: (testo: string) => void;
  /** Testo da inserire dall'esterno (spunti). */
  suggerito?: string;
  onSuggeritoUsato?: () => void;
  /** Stili pronti del cliente: si richiamano scrivendo "/". */
  stili?: Stile[];
  stileScelto?: Stile | null;
  onStileChange?: (stile: Stile | null) => void;
  /** Testo guida del campo quando è vuoto (default: quello di Crea idee). */
  placeholder?: string;
  /** Questa è l'Aura viva della schermata (una sola per pagina). Falso quando c'è il volto grande della schermata vuota. */
  auraViva?: boolean;
  className?: string;
}

const PLACEHOLDER_IDEE = "Racconta l'idea, incolla un link di riferimento…";

/**
 * Il contenitore del composer nelle pagine chat (Crea idee, Wesley Coach). Da md la pagina ha altezza
 * fissa e il composer sta in fondo da solo; sul telefono scorre la pagina e il composer resta incollato
 * al fondo dello schermo, con lo sfondo che sfuma sopra i messaggi che gli passano dietro.
 */
export const BARRA_COMPOSER =
  "sticky bottom-0 z-10 shrink-0 bg-linear-to-t from-background from-70% to-transparent pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:z-auto md:bg-none md:pb-0";

/** La X delle chip: sul touch l'area di tocco arriva a 36px senza cambiare l'altezza della chip. */
const X_CHIP =
  "rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground pointer-coarse:-my-[11px] pointer-coarse:-mr-1 pointer-coarse:p-[11px]";

const MAX = 4000;
/** Quanto Aura «parla» quando la risposta è arrivata (compare tutta insieme). */
const PARLA_MS = 1600;

/** "/" all'inizio, senza a capo → il testo dopo la barra è la ricerca tra gli stili. */
function queryComando(testo: string): string | null {
  if (!testo.startsWith("/") || testo.includes("\n")) return null;
  return testo.slice(1).trim().toLowerCase();
}

/**
 * Il composer di Seto con il volto di Aura (AURA_MANUALE): Aura ascolta mentre si scrive (un'onda a
 * ogni tasto), fa un cenno e «pensa» all'invio, pulsa quando la risposta arriva e torna a riposo.
 * Invio manda, Shift+Invio a capo, "/" richiama uno stile.
 */
export function ComposerAura({
  inAttesa,
  onInvia,
  suggerito,
  onSuggeritoUsato,
  stili = [],
  stileScelto = null,
  onStileChange,
  placeholder = PLACEHOLDER_IDEE,
  auraViva = true,
  className,
}: ComposerAuraProps) {
  const [testo, setTesto] = useState("");
  const [attiva, setAttiva] = useState(0);
  const aura = useAuraStatus();
  const { sent, speaking, done } = aura;
  const attesaPrecedente = useRef(inAttesa);

  // Lo stato di Aura segue quello che succede davvero: inizio dell'attesa → cenno + pensa; fine → parla, poi riposo.
  useEffect(() => {
    if (inAttesa === attesaPrecedente.current) return;
    attesaPrecedente.current = inAttesa;
    if (inAttesa) {
      sent();
      return;
    }
    speaking();
    const timer = window.setTimeout(done, PARLA_MS);
    return () => window.clearTimeout(timer);
  }, [inAttesa, sent, speaking, done]);

  if (suggerito && testo !== suggerito) {
    setTesto(suggerito);
    onSuggeritoUsato?.();
  }

  const query = onStileChange ? queryComando(testo) : null;
  const pronti = stili.filter((s) => s.stato === "pronta");
  const voci = query === null ? [] : pronti.filter((s) => `${s.titolo} ${s.descrizione ?? ""}`.toLowerCase().includes(query));
  const menuAperto = query !== null;
  const indiceAttivo = Math.min(attiva, Math.max(voci.length - 1, 0));
  const testoGuida = inAttesa
    ? "Aura sta pensando…"
    : stileScelto
      ? `Di cosa parla il video in stile «${stileScelto.titolo}»?`
      : onStileChange
          ? `${placeholder.replace(/…$/, "")}, scrivi / per usare un tuo stile…`
          : placeholder;

  function scegli(s: Stile) {
    onStileChange?.(s);
    setTesto("");
    setAttiva(0);
  }

  function invia() {
    const t = testo.trim();
    if (t.length < 3 || inAttesa || menuAperto) return;
    onInvia(t);
    setTesto("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (menuAperto) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAttiva((i) => Math.min(i + 1, Math.max(voci.length - 1, 0)));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setAttiva((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (voci[indiceAttivo]) scegli(voci[indiceAttivo]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setTesto("");
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      invia();
    }
  }

  return (
    <div className={cn("relative grid gap-3 rounded-xl border border-line bg-surface-input p-4 shadow-xs", className)}>
      {menuAperto ? (
        <MenuStili voci={voci} query={query ?? ""} attiva={indiceAttivo} onScegli={scegli} onPassaSopra={setAttiva} nessunoStile={pronti.length === 0} />
      ) : null}

      <div className="flex items-start gap-3">
        <Aura ref={aura.ref} state={aura.status} live={auraViva} size={40} count={64} reduced={false} label="Aura" className="mt-0.5 shrink-0" />
        <label className="sr-only" htmlFor="composer-aura">
          Scrivi ad Aura
        </label>
        <textarea
          id="composer-aura"
          value={testo}
          maxLength={MAX}
          disabled={inAttesa}
          onChange={(e) => {
            setTesto(e.target.value);
            setAttiva(0);
            if (!queryComando(e.target.value)) aura.typing();
          }}
          onFocus={() => {
            if (!inAttesa) aura.focus();
          }}
          onKeyDown={onKeyDown}
          rows={2}
          role={menuAperto ? "combobox" : undefined}
          aria-expanded={menuAperto || undefined}
          aria-controls={menuAperto ? "menu-stili" : undefined}
          placeholder={testoGuida}
          className="field-sizing-content max-h-40 min-h-10 min-w-0 flex-1 resize-none bg-transparent py-2 text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60 md:text-sm"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {stileScelto ? (
          <span className="inline-flex h-10 max-w-full items-center gap-2 rounded-full border border-line bg-card py-0 pr-1.5 pl-3 text-sm font-medium text-foreground">
            <Palette className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">
              <span className="text-muted-foreground">Stile · </span>
              {stileScelto.titolo}
            </span>
            <button type="button" aria-label="Togli lo stile" disabled={inAttesa} onClick={() => onStileChange?.(null)} className={X_CHIP}>
              <X className="size-3.5" aria-hidden />
            </button>
          </span>
        ) : null}
        {/* Scorciatoie da tastiera: sul telefono touch non servono. */}
        <p className="text-[12px] leading-4 font-medium text-muted-foreground max-md:pointer-coarse:hidden">
          Invio per mandare · Shift+Invio per andare a capo{onStileChange ? " · / per usare un tuo stile" : ""}
        </p>
        <div className="ml-auto flex items-center gap-2">
          <Button size="icon" aria-label="Invia ad Aura" disabled={inAttesa || menuAperto || testo.trim().length < 3} onClick={invia}>
            <ArrowUp aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
