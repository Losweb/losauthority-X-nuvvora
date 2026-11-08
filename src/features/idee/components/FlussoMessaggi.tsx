import { useEffect, useRef } from "react";
import { Palette, RotateCcw } from "lucide-react";
import { AuraSfera } from "@/shared/components/brand/AuraSfera";
import { Button } from "@/shared/components/ui/button";
import { scorriChatInFondo } from "../scorriChat";
import { ERRORE_FERMATA, type Idea, type Messaggio, type Stile } from "../types";
import { CardIdea } from "./CardIdea";
import { PensieroAura } from "./PensieroAura";

interface FlussoMessaggiProps {
  messaggi: Messaggio[];
  idee: Idea[];
  /** Gli stili del cliente, per mostrare quale è stato richiamato in un messaggio. */
  stili?: Stile[];
  /** Messaggio appena inviato e non ancora arrivato dal server: lo mostriamo subito con Aura che pensa. */
  pendente: string | null;
  /** Stile agganciato al messaggio pendente. */
  pendenteStile?: string | null;
  occupato: boolean;
  onRiprova: (messaggio: Messaggio) => void;
  onSalva: (idea: Idea) => void;
  onScarta: (idea: Idea) => void;
  onWorkflow: (idea: Idea) => void;
}

function BollaCliente({ testo, stile }: { testo: string; stile?: string | null }) {
  return (
    <div className="flex flex-col items-end gap-1">
      {stile ? (
        <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
          <Palette className="size-3" aria-hidden /> Stile · {stile}
        </span>
      ) : null}
      {/* La selezione globale è dello stesso colore della bolla: qui si inverte, o il testo evidenziato sparisce. */}
      <p className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap text-primary-foreground selection:bg-(--on-action) selection:text-(--action)">
        {testo}
      </p>
    </div>
  );
}

/** La conversazione: il cliente a destra, Aura a sinistra con le sue proposte sotto ogni risposta. */
export function FlussoMessaggi({
  messaggi,
  idee,
  stili = [],
  pendente,
  pendenteStile = null,
  occupato,
  onRiprova,
  onSalva,
  onScarta,
  onWorkflow,
}: FlussoMessaggiProps) {
  const titoloStile = (id: string | null) => (id ? (stili.find((s) => s.id === id)?.titolo ?? null) : null);
  const fineRef = useRef<HTMLDivElement>(null);
  const ultimoId = messaggi.at(-1)?.id;
  const ultimoStato = messaggi.at(-1)?.stato;

  // Da md scorre SOLO il contenitore della chat, sul telefono la finestra (vedi scorriChatInFondo).
  useEffect(() => {
    scorriChatInFondo(fineRef.current);
  }, [ultimoId, ultimoStato, idee.length, pendente]);

  return (
    <div className="grid gap-6">
      {messaggi.map((m) => {
        if (m.ruolo === "cliente") return <BollaCliente key={m.id} testo={m.contenuto} stile={titoloStile(m.stile_id)} />;
        const proposte = idee.filter((i) => i.messaggio_id === m.id);
        return (
          <div key={m.id} className="grid gap-4">
            {m.stato === "in_corso" ? (
              <PensieroAura />
            ) : (
              <div className="flex items-start gap-3">
                <AuraSfera dimensione={32} conNome={false} className="mt-0.5" />
                <div className="min-w-0 flex-1 pt-1">
                  {m.stato === "completato" && m.contenuto ? (
                    <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">{m.contenuto}</p>
                  ) : null}
                  {m.stato === "errore" ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm text-muted-foreground">
                        {m.errore === ERRORE_FERMATA ? "Hai fermato Aura." : `Aura non è riuscita a rispondere${m.errore ? ` (${m.errore.toLowerCase()})` : ""}.`}
                      </p>
                      <Button size="sm" variant="outline" disabled={occupato} onClick={() => onRiprova(m)}>
                        <RotateCcw aria-hidden /> Riprova
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
            {proposte.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 md:pl-11 xl:grid-cols-3">
                {proposte.map((idea, i) => (
                  <CardIdea key={idea.id} idea={idea} indice={i} occupato={occupato} onSalva={onSalva} onScarta={onScarta} onWorkflow={onWorkflow} />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}

      {pendente !== null ? (
        <>
          {pendente ? <BollaCliente testo={pendente} stile={pendenteStile} /> : null}
          <PensieroAura />
        </>
      ) : null}

      <div ref={fineRef} />
    </div>
  );
}
