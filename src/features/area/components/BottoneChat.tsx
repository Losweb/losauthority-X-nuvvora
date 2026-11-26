import { ChevronUp, MessageCircle, X } from "lucide-react";
import { AuraSfera } from "@/shared/components/brand/AuraSfera";
import { Button } from "@/shared/components/ui/button";

/** «Parla con Aura» / «Chiudi la chat»: a lavoro finito la conversazione si apre solo quando serve. */
export function BottoneChat({ aperta, disabilitato, onCambia }: { aperta: boolean; disabilitato?: boolean; onCambia: (aperta: boolean) => void }) {
  return aperta ? (
    <Button variant="ghost" disabled={disabilitato} onClick={() => onCambia(false)}>
      <X aria-hidden /> Chiudi la chat
    </Button>
  ) : (
    <Button
      variant="default"
      onClick={() => {
        onCambia(true);
        // Porta in vista tutta la chat, con il campo per scrivere, appena compare.
        window.setTimeout(() => document.getElementById("chat-aura")?.scrollIntoView({ block: "start", behavior: "smooth" }), 60);
      }}
    >
      <MessageCircle aria-hidden /> Parla con Aura
    </Button>
  );
}

/**
 * L'inizio della chat riaperta a lavoro finito: la conversazione di prima piegata in un tasto e
 * una domanda di Aura, così non si apre in cima a decine di messaggi vecchi.
 */
export function InizioChatNuova({ nascosti, onMostra, invito }: { nascosti: number; onMostra: () => void; invito: string }) {
  return (
    <div className="grid gap-5 pr-8">
      {/* A sinistra e con spazio a destra: in alto a destra c'è la X che chiude la chat. */}
      <Button variant="ghost" size="sm" className="-ml-2 justify-self-start text-muted-foreground" onClick={onMostra}>
        <ChevronUp aria-hidden /> Messaggi di prima ({nascosti})
      </Button>
      <div className="flex items-start gap-3">
        <AuraSfera dimensione={30} conNome={false} className="mt-0.5" />
        <p className="min-w-0 flex-1 pt-1 text-[15px] leading-relaxed">{invito}</p>
      </div>
    </div>
  );
}
