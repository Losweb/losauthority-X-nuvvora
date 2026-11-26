import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, RotateCcw, WandSparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth";
import { useMappaAvatar } from "@/features/avatar";
import { PensieroAura } from "@/features/idee";
import { useOffertaCliente } from "@/features/offerta";
import { SchedaPosizionamento, useCambiaPosizionamento, useCreaPosizionamento, useEliminaPosizionamento, useModificaPosizionamento, usePosizionamento } from "@/features/posizionamento";
import { primoNome } from "@/features/scheda";
import { AuraSfera } from "@/shared/components/brand/AuraSfera";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { ErroreCaricamento, SkeletonBlocco } from "@/shared/components/layout/StatoCaricamento";
import { AltreAzioni } from "../components/AltreAzioni";
import { PassoDopo } from "../components/percorso/PassoDopo";

const FASI = ["Rileggo il tuo avatar e la tua offerta", "Scrivo la bio", "Scelgo le storie in evidenza", "Scrivo chi sei nel tuo mercato"] as const;

/** Il riquadro centrale degli stati senza scheda (prima l'offerta, crea, errore). */
function Riquadro({ titolo, testo, children }: { titolo: string; testo: string; children: ReactNode }) {
  return (
    <section className="grid w-full max-w-[680px] gap-5 rounded-2xl border bg-card/70 p-6 md:p-8">
      <div className="flex items-start gap-4">
        <AuraSfera dimensione={56} conNome={false} />
        <div className="grid gap-2">
          <h2 className="text-[22px] leading-tight font-bold">{titolo}</h2>
          <p className="text-[15px] leading-relaxed text-muted-foreground">{testo}</p>
        </div>
      </div>
      <div className="border-t pt-5">{children}</div>
    </section>
  );
}

/**
 * /area/cervello/posizionamento (26/11/2026, al posto di Concorrenti e Marca): in alto come si
 * vedrebbe il profilo Instagram, sotto chi sei nel tuo mercato. Lo scrive Aura in un colpo da
 * avatar e offerta; il cliente lo corregge con la matita o chiedendo ad Aura. Viene dopo l'offerta.
 */
export default function PosizionamentoPage() {
  const { utente } = useAuth();
  const nome = primoNome(utente?.nombre);
  const pos = usePosizionamento(utente?.id);
  const offerta = useOffertaCliente(utente?.id);
  const avatar = useMappaAvatar(utente?.id);
  const crea = useCreaPosizionamento();
  const cambia = useCambiaPosizionamento();
  const modifica = useModificaPosizionamento();
  const elimina = useEliminaPosizionamento();
  const [richiestaAperta, setRichiestaAperta] = useState(false);
  const [richiesta, setRichiesta] = useState("");
  const [ricomincia, setRicomincia] = useState(false);
  if (!utente) return null;

  const intestazione = (azioni?: ReactNode, conSottotitolo = true) => (
    <>
      <Link to="/area/dashboard" className="inline-flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground pointer-coarse:-my-2 pointer-coarse:min-h-9 pointer-coarse:py-2">
        <ArrowLeft className="size-3.5" aria-hidden /> Il tuo percorso
      </Link>
      <PageHeader titolo="Posizionamento" sottotitolo={conSottotitolo ? "Chi sei nel tuo mercato e come si vede dal tuo profilo Instagram. Lo scrive Aura dal tuo avatar e dalla tua offerta: tu correggi." : undefined} azioni={azioni} />
    </>
  );

  if (pos.isLoading || offerta.isLoading || avatar.isLoading) return <div className="grid gap-7">{intestazione()}<SkeletonBlocco altezza="h-96" /></div>;
  if (pos.isError) return <div className="grid gap-7">{intestazione()}<ErroreCaricamento /></div>;

  const riga = pos.data;
  const avatarPronto = avatar.data?.mappa.passo === "fatto" && (avatar.data?.schede.length ?? 0) > 0;
  const offertaPronta = !!offerta.data?.completa_fatta_il;
  const auraScrive = crea.isPending || cambia.isPending || riga?.stato === "in_corso";

  // Prima avatar e offerta: il posizionamento parte da lì.
  if (!riga && !offertaPronta) {
    return (
      <div className="grid gap-7">
        {intestazione()}
        <Riquadro
          titolo={avatarPronto ? "Prima la tua offerta" : "Prima il tuo avatar"}
          testo={`Il posizionamento dice chi sei per ${avatarPronto ? "chi compra la tua offerta" : "una persona precisa"}: Aura lo scrive partendo dal tuo avatar e dalla tua offerta. ${avatarPronto ? "Chiudi l'offerta" : "Fai prima l'avatar, poi l'offerta"}, poi torna qui.`}
        >
          <Link to={avatarPronto ? "/area/cervello/offerta" : "/area/cervello/avatar"} className={buttonVariants({ size: "lg" })}>
            {avatarPronto ? "Vai all'offerta" : "Vai all'avatar"} <ArrowRight aria-hidden />
          </Link>
        </Riquadro>
      </div>
    );
  }

  // Aura sta scrivendo (la prima volta o dopo una richiesta).
  if (auraScrive && !(riga?.stato === "pronto" && riga.contenuto.profilo)) {
    return (
      <div className="grid gap-7">
        {intestazione()}
        <Riquadro titolo="Aura sta scrivendo il tuo posizionamento" testo="Rilegge avatar e offerta e scrive il profilo e chi sei nel tuo mercato.">
          <PensieroAura fasi={FASI} stima="Può volerci un minuto." intervalloMs={12000} />
        </Riquadro>
      </div>
    );
  }

  if (!riga || riga.stato === "errore" || !riga.contenuto.profilo) {
    return (
      <div className="grid gap-7">
        {intestazione()}
        <Riquadro
          titolo={riga?.stato === "errore" ? "Aura non è riuscita a scriverlo" : nome ? `${nome}, come ti presenti?` : "Come ti presenti?"}
          testo={riga?.stato === "errore" ? "Riprova: di solito al secondo giro va." : "Aura legge il tuo avatar e la tua offerta e scrive come si vede il tuo profilo Instagram (nome, bio, link, storie in evidenza, post da fissare) e chi sei nel tuo mercato."}
        >
          <Button size="lg" onClick={() => crea.mutate()}>
            {riga?.stato === "errore" ? "Riprova" : "Crea il posizionamento"}
          </Button>
        </Riquadro>
      </div>
    );
  }

  function invia(e: FormEvent) {
    e.preventDefault();
    const t = richiesta.trim();
    if (t.length < 3) return;
    cambia.mutate(t, {
      onSuccess: () => {
        setRichiesta("");
        setRichiestaAperta(false);
      },
    });
  }

  const azioni = (
    <>
      <Button disabled={auraScrive} onClick={() => setRichiestaAperta((v) => !v)}>
        <WandSparkles aria-hidden /> Cambia con Aura
      </Button>
      <AltreAzioni voci={[{ etichetta: "Rifai da capo", icona: RotateCcw, onClick: () => setRicomincia(true), distruttiva: true, disabilitata: auraScrive }]} />
    </>
  );

  return (
    <div className="grid gap-6">
      {intestazione(azioni, false)}

      {richiestaAperta || cambia.isPending ? (
        <section aria-label="Chiedi ad Aura di cambiare" className="relative grid max-w-[860px] gap-3 rounded-2xl border bg-card/70 p-4 md:p-5">
          {cambia.isPending ? (
            <PensieroAura fasi={["Rileggo la tua richiesta", "Riscrivo il posizionamento"]} stima="Può volerci un minuto." intervalloMs={15000} />
          ) : (
            <form onSubmit={invia} className="grid gap-3">
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Chiudi" className="absolute top-2 right-2 text-muted-foreground" onClick={() => setRichiestaAperta(false)}>
                <X aria-hidden />
              </Button>
              <label htmlFor="richiesta-posizionamento" className="pr-8 text-[15px] font-semibold">
                Cosa vuoi cambiare?
              </label>
              <Textarea
                id="richiesta-posizionamento"
                autoFocus
                rows={3}
                maxLength={1500}
                value={richiesta}
                onChange={(e) => setRichiesta(e.target.value)}
                placeholder="Es. la bio più corta, togli le emoji, nel nome metti «psicologa del lavoro»"
              />
              <Button type="submit" className="justify-self-start" disabled={richiesta.trim().length < 3}>
                Chiedi ad Aura
              </Button>
            </form>
          )}
        </section>
      ) : null}

      <SchedaPosizionamento p={riga.contenuto} onModifica={(m) => modifica.mutate(m)} occupato={modifica.isPending || auraScrive} />

      <div className="max-w-[860px]">
        <PassoDopo testo="Prossimo passo: le idee per i primi video" href="/area/crea-idee" />
      </div>

      <AlertDialog open={ricomincia} onOpenChange={setRicomincia}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rifare il posizionamento da capo?</AlertDialogTitle>
            <AlertDialogDescription>Si perde quello che c'è adesso, comprese le tue correzioni. Poi Aura lo riscrive da avatar e offerta.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={elimina.isPending}
              onClick={() => elimina.mutate(riga.id, { onSuccess: () => { setRicomincia(false); crea.mutate(); } })}
            >
              Rifai da capo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
