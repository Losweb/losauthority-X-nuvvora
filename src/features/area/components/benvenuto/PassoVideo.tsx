import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface PassoVideoProps {
  nome: string;
  onAvanti: () => void;
}

/**
 * Primo passo: il video di benvenuto di Wesley. Per ora una carta segnaposto
 * con la forma del video (16:9) e il tasto play; il video vero si incastra qui.
 */
export function PassoVideo({ nome, onAvanti }: PassoVideoProps) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2 text-center">
        <p className="eyebrow">Benvenuto{nome ? ` · ${nome}` : ""}</p>
        <h1 className="text-[clamp(28px,4vw,38px)] leading-tight">Prima di tutto, guarda questo.</h1>
      </div>
      <div
        role="img"
        aria-label="Video di benvenuto (in arrivo)"
        className="relative aspect-video w-full overflow-hidden rounded-2xl bg-foreground text-background shadow-lg"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.14),transparent_55%)]" aria-hidden />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <span className="grid size-16 place-items-center rounded-full border border-background/40 bg-background/10 backdrop-blur-sm">
            <Play className="ml-1 size-7" strokeWidth={1.5} aria-hidden />
          </span>
          <p className="eyebrow text-background/70">Video di benvenuto</p>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 px-5 py-4 text-xs text-background/60">
          <span className="h-1 flex-1 rounded-full bg-background/20">
            <span className="block h-full w-0 rounded-full bg-background/70" />
          </span>
          <span className="figure tabular-nums">0:00</span>
        </div>
      </div>
      <p className="text-center text-sm text-muted-foreground">Due minuti con Wesley: cosa succede da qui in avanti e cosa ti chiederemo.</p>
      <div className="flex justify-center">
        <Button size="lg" onClick={onAvanti}>
          Continua <ArrowRight aria-hidden />
        </Button>
      </div>
    </div>
  );
}
