import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";

/** Il tema attivo: chiaro di serie, scuro se il cliente l'ha acceso (lo ricorda next-themes nel browser). */
function useTemaScuro() {
  // App solo client (niente SSR): next-themes legge il tema salvato già al primo render.
  const { resolvedTheme, setTheme } = useTheme();
  const scuro = resolvedTheme === "dark";
  return { scuro, cambia: (v: boolean) => setTheme(v ? "dark" : "light") };
}

/**
 * Riga «Tema scuro» con l'interruttore, per il piede utente (sidebar e menu ☰).
 * `compatta`: nella sidebar a sole icone diventa un bottone rotondo con luna/sole.
 */
export function InterruttoreTema({ compatta = false }: { compatta?: boolean }) {
  const { scuro, cambia } = useTemaScuro();
  const etichetta = scuro ? "Passa al tema chiaro" : "Passa al tema scuro";

  if (compatta) return <BottoneTema scuro={scuro} etichetta={etichetta} onClick={() => cambia(!scuro)} />;

  return (
    <label className="flex h-10 w-full min-w-0 cursor-pointer items-center gap-2 rounded-full px-4 text-sm leading-5 font-semibold text-foreground transition-colors hover:bg-surface-hover pointer-coarse:h-11">
      <Moon className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">Tema scuro</span>
      <Switch checked={scuro} onCheckedChange={cambia} aria-label="Tema scuro" />
    </label>
  );
}

/** Solo l'icona (luna sul chiaro, sole sullo scuro): per le testate senza sidebar. */
export function BottoneTemaCompatto() {
  const { scuro, cambia } = useTemaScuro();
  return <BottoneTema scuro={scuro} etichetta={scuro ? "Passa al tema chiaro" : "Passa al tema scuro"} onClick={() => cambia(!scuro)} variante="ghost" />;
}

function BottoneTema({ scuro, etichetta, onClick, variante = "outline" }: { scuro: boolean; etichetta: string; onClick: () => void; variante?: "outline" | "ghost" }) {
  return (
    <Button type="button" size="icon" variant={variante} onClick={onClick} title={etichetta} aria-label={etichetta}>
      {scuro ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </Button>
  );
}
