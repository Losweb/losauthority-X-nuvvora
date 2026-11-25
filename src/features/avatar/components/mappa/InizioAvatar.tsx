import { PlayCircle } from "lucide-react";
import { PensieroAura } from "@/features/idee";
import { AuraSfera } from "@/shared/components/brand/AuraSfera";
import { Button } from "@/shared/components/ui/button";
import { FASI_MAPPA, LINK_LEZIONE_AVATAR } from "../../mappa";
import { DubbiAvatar } from "./PassiAvatar";

interface InizioAvatarProps {
  nome: string;
  occupato: boolean;
  onInizia: (dubbio?: string) => void;
}

/** Prima di iniziare: cosa succede, il link alla lezione, i tre dubbi e «Iniziamo». */
export function InizioAvatar({ nome, occupato, onInizia }: InizioAvatarProps) {
  return (
    <section className="mx-auto grid w-full max-w-[680px] gap-6 rounded-2xl border bg-card/70 p-6 md:p-8">
      <div className="flex items-start gap-4">
        <AuraSfera dimensione={56} conNome={false} />
        <div className="grid gap-2">
          <h2 className="text-[22px] leading-tight font-bold">{nome ? `${nome}, a chi parlano i tuoi contenuti?` : "A chi parlano i tuoi contenuti?"}</h2>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            Lo scopriamo insieme in cinque o sei scambi. Io leggo quello che so già di te, faccio l'analisi e ti propongo una mappa: cosa vendi, dove porti chi compra e chi parte da dove. Tu
            correggi. Alla fine hai la mappa e una scheda per ogni avatar.
          </p>
        </div>
      </div>

      {LINK_LEZIONE_AVATAR ? (
        <a href={LINK_LEZIONE_AVATAR} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 text-[14px] font-medium underline underline-offset-4">
          <PlayCircle className="size-4" aria-hidden /> Non hai ancora visto la lezione «A chi parli?» Guardala qui
        </a>
      ) : null}

      {occupato ? (
        <PensieroAura fasi={FASI_MAPPA} />
      ) : (
        <>
          <div className="grid gap-2.5">
            <p className="text-[14px] font-medium">Hai uno di questi dubbi? Toccalo e ti rispondo subito.</p>
            <DubbiAvatar onDubbio={onInizia} />
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t pt-5">
            <Button size="lg" onClick={() => onInizia()}>
              Nessun dubbio: iniziamo
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
