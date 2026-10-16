import { ArrowDown, ArrowRight } from "lucide-react";
import type { Avatar } from "../types";

/** C'è almeno un pezzo della mappa da mostrare? */
export function haMappa(a: Avatar): boolean {
  return [a.cosa_manca, a.ponte, a.arrivo, a.nemico].some((v) => !!v?.trim());
}

function Tappa({ titolo, testo, forte = false }: { titolo: string; testo: string | null; forte?: boolean }) {
  return (
    <div className={forte ? "grid gap-1.5 rounded-lg bg-foreground px-4 py-3.5 text-background" : "grid gap-1.5 rounded-lg border bg-card px-4 py-3.5"}>
      <p className={`eyebrow font-sans text-[12px] ${forte ? "text-background/70" : ""}`}>{titolo}</p>
      {testo ? <p className="text-[14px] leading-snug">{testo}</p> : <p className={forte ? "text-background/50" : "text-muted-foreground/60"}>—</p>}
    </div>
  );
}

/**
 * La mappa della skill LosAvatar, letta dall'alto verso il basso: da dove parte
 * l'avatar, cosa gli manca (la freccia), il ponte (cosa vende il cliente e con
 * quale passo lo porta dall'altra parte), lo stesso arrivo in evidenza. Sotto,
 * il nemico: l'idea contro cui parlano i contenuti.
 */
export function MappaAvatar({ avatar, ampio = false }: { avatar: Avatar; ampio?: boolean }) {
  const partenza = [avatar.situazione, avatar.momento].filter((v): v is string => !!v?.trim()).join(" · ") || null;
  const Freccia = ampio ? ArrowRight : ArrowDown;
  return (
    <section aria-label="La mappa" className="grid gap-3">
      <h4 className="eyebrow font-sans text-[12px]">La mappa · partenze diverse, lo stesso arrivo</h4>
      <div className={ampio ? "grid items-stretch gap-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]" : "grid gap-2"}>
        <Tappa titolo="Da dove parte" testo={partenza} />
        <Freccia className="size-4 justify-self-center self-center text-muted-foreground" aria-hidden />
        <Tappa titolo="Cosa gli manca" testo={avatar.cosa_manca} />
        <Freccia className="size-4 justify-self-center self-center text-muted-foreground" aria-hidden />
        <Tappa titolo="Il ponte · cosa vendi" testo={avatar.ponte} />
        <Freccia className="size-4 justify-self-center self-center text-muted-foreground" aria-hidden />
        <Tappa titolo="Lo stesso arrivo" testo={avatar.arrivo} forte />
      </div>
      {avatar.nemico ? (
        <p className="text-[13px] leading-snug text-muted-foreground">
          <span className="font-medium text-foreground">Il nemico (un'idea, mai una persona): </span>
          {avatar.nemico}
        </p>
      ) : null}
    </section>
  );
}
