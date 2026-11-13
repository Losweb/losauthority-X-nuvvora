import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Plug, Unplug } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { ErroreCaricamento, SkeletonRighe } from "@/shared/components/layout/StatoCaricamento";
import { Button } from "@/shared/components/ui/button";
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
import { formatDate } from "@/shared/utils/formatDate";
import { logDev } from "@/shared/utils/errors";
import { useCollegamenti, useScollega } from "../hooks/useCollegamentoClaude";
import { esTeam, useAuth } from "@/features/auth";
import { COSA_NON_PUO_FARE, COSA_NON_PUO_FARE_TEAM, COSA_PUO_FARE, COSA_PUO_FARE_TEAM, indirizzoMcp } from "../testi";

const ESEMPI_TEAM = [
  "Quali video ha Mario Rossi in «Pronti per l'upload»?",
  "Nel Workflow di Mario Rossi crea la scheda «3 errori nei reel», da pubblicare giovedì alle 18:30, con questo link Drive: …",
  "Segna come programmati su TikTok e Instagram tutti i video di Mario Rossi di questa settimana.",
];

const ESEMPI = [
  "Crea una scheda per il video «3 errori nei reel», da pubblicare giovedì alle 18:30, tipologia Valore, con questo link Drive: …",
  "Quali video ho in «Da editare»? Mettili in ordine di data.",
  "Ho finito il montaggio di «Offerta di Natale»: aggiungi il link Drive, scrivi la didascalia nella descrizione e spostala in «Pronti per l'upload».",
  "Segna «Come trovo clienti» come programmato su TikTok e Instagram.",
];

/** Un testo da copiare (indirizzo, comando) con il suo bottone. */
function DaCopiare({ testo }: { testo: string }) {
  const [copiato, setCopiato] = useState(false);
  async function copia() {
    try {
      await navigator.clipboard.writeText(testo);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 1500);
    } catch (error) {
      logDev(error);
      toast.error("Copia non riuscita", { description: "Seleziona il testo e copialo a mano." });
    }
  }
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border border-input bg-background py-1.5 pr-1.5 pl-3">
      <code className="min-w-0 flex-1 truncate font-mono text-[13px]" title={testo}>
        {testo}
      </code>
      <Button type="button" size="sm" variant="outline" onClick={() => void copia()} aria-label={copiato ? "Copiato" : `Copia ${testo}`}>
        {copiato ? <Check aria-hidden /> : <Copy aria-hidden />}
        {copiato ? "Copiato" : "Copia"}
      </Button>
    </div>
  );
}

function Passo({ numero, children }: { numero: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-[14px] leading-relaxed">
      <span className="figure mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{numero}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

function Riquadro({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-lg border bg-card p-5 shadow-xs">
      <h3 className="font-sans text-base font-semibold">{titolo}</h3>
      {children}
    </section>
  );
}

/** Le app collegate all'account (in pratica Claude), con «Scollega». */
function Collegamenti() {
  const collegamenti = useCollegamenti();
  const scollega = useScollega();
  const [daScollegare, setDaScollegare] = useState<{ id: string; nome: string } | null>(null);

  if (collegamenti.isLoading) return <SkeletonRighe righe={2} />;
  if (collegamenti.isError) return <ErroreCaricamento messaggio="Non è stato possibile leggere i collegamenti." />;
  const lista = collegamenti.data ?? [];
  if (lista.length === 0) return <p className="text-sm text-muted-foreground">Nessun collegamento attivo.</p>;

  return (
    <>
      <ul className="grid gap-2">
        {lista.map((g) => (
          <li key={g.client.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <Plug className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{g.client.name || "Applicazione"}</p>
                <p className="text-xs text-muted-foreground">Collegato il {formatDate(g.granted_at)}</p>
              </div>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => setDaScollegare({ id: g.client.id, nome: g.client.name || "questa applicazione" })}>
              <Unplug aria-hidden /> Scollega
            </Button>
          </li>
        ))}
      </ul>
      <AlertDialog open={daScollegare !== null} onOpenChange={(open) => !open && setDaScollegare(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Scollegare {daScollegare?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              Non potrà più leggere né modificare il Workflow. Per usarlo di nuovo dovrai ricollegarlo da Claude.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={scollega.isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={scollega.isPending}
              onClick={() => daScollegare && scollega.mutate(daScollegare.id, { onSuccess: () => setDaScollegare(null) })}
            >
              {scollega.isPending ? "Scollego…" : "Scollega"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * /area/claude (cliente) e /claude (team) → come collegare il proprio Claude (a pagamento) al Workflow
 * tramite il server MCP. Il cliente lavora sul suo Workflow, il team su quello del cliente che indica.
 */
export default function CollegaClaudePage() {
  const indirizzo = indirizzoMcp();
  const { utente } = useAuth();
  const team = esTeam(utente?.rol ?? null);
  const puo = team ? COSA_PUO_FARE_TEAM : COSA_PUO_FARE;
  const nonPuo = team ? COSA_NON_PUO_FARE_TEAM : COSA_NON_PUO_FARE;
  const esempi = team ? ESEMPI_TEAM : ESEMPI;
  return (
    <div className="grid max-w-3xl gap-5">
      <PageHeader
        titolo="Collega Claude"
        sottotitolo={
          team
            ? "Collega il tuo Claude ai Workflow dei clienti: potrà creare e aggiornare le schede dei video, dicendogli ogni volta per quale cliente."
            : "Collega il tuo Claude al Workflow: potrà creare e aggiornare le schede dei tuoi video al posto tuo."
        }
      />

      <Riquadro titolo={team ? "L'indirizzo dei Workflow" : "L'indirizzo del tuo Workflow"}>
        <DaCopiare testo={indirizzo} />
        <p className="text-[13px] leading-snug text-muted-foreground">
          Serve un piano a pagamento di Claude (Pro, Max, Team o Enterprise). L'accesso passa dal tuo account: nessuna password da dare a Claude.
          Con un piano Team o Enterprise di solito il connettore lo aggiunge prima l'amministratore dell'organizzazione, poi ognuno fa «Connetti».
        </p>
      </Riquadro>

      <Riquadro titolo="Su claude.ai o nell'app Claude">
        <ol className="grid gap-3">
          <Passo numero={1}>
            Apri <span className="font-medium">Impostazioni → Connettori</span> e scegli <span className="font-medium">Aggiungi connettore personalizzato</span>.
          </Passo>
          <Passo numero={2}>
            Come nome scrivi <span className="font-medium">Workflow Wesley Caicedo</span> e incolla l'indirizzo qui sopra. Poi <span className="font-medium">Aggiungi</span>.
          </Passo>
          <Passo numero={3}>
            Premi <span className="font-medium">Connetti</span>: si apre questo sito, entri con il tuo account e premi <span className="font-medium">Consenti</span>.
          </Passo>
          <Passo numero={4}>In una chat attiva il connettore dal menu degli strumenti e chiedi a Claude quello che ti serve.</Passo>
        </ol>
      </Riquadro>

      <Riquadro titolo="Con Claude Code">
        <ol className="grid gap-3">
          <Passo numero={1}>
            Nel terminale:
            <div className="mt-2">
              <DaCopiare testo={`claude mcp add --transport http workflow-wesley ${indirizzo}`} />
            </div>
          </Passo>
          <Passo numero={2}>
            Dentro Claude Code scrivi <code className="font-mono text-[13px]">/mcp</code>, scegli <span className="font-medium">workflow-wesley</span> e
            completa l'accesso dal browser con <span className="font-medium">Consenti</span>.
          </Passo>
        </ol>
        <p className="text-[13px] leading-snug text-muted-foreground">
          È la strada giusta se Claude ti monta anche i video sul computer: li carica su Drive e poi compila la scheda con il link.
        </p>
      </Riquadro>

      <Riquadro titolo="Cosa può fare">
        <div className="grid gap-4 sm:grid-cols-2">
          <ul className="grid content-start gap-2">
            {puo.map((v) => (
              <li key={v} className="flex gap-2 text-[14px] leading-snug">
                <Check className="mt-0.5 size-4 shrink-0 text-status-active" aria-hidden />
                {v}
              </li>
            ))}
          </ul>
          <ul className="grid content-start gap-2">
            {nonPuo.map((v) => (
              <li key={v} className="flex gap-2 text-[14px] leading-snug text-muted-foreground">
                <span aria-hidden className="mt-0.5 w-4 shrink-0 text-center">×</span>
                Non può {v}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-2">
          <p className="text-sm font-medium">Esempi di richieste</p>
          <ul className="grid gap-2">
            {esempi.map((e) => (
              <li key={e} className="rounded-md bg-muted px-3 py-2 text-[13px] leading-snug">
                {e}
              </li>
            ))}
          </ul>
        </div>
      </Riquadro>

      <Riquadro titolo="Collegamenti attivi">
        <Collegamenti />
      </Riquadro>
    </div>
  );
}
