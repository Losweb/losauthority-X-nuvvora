import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useMappaAvatar } from "@/features/avatar";

/**
 * Sugli strumenti dei contenuti (Idee, Stili, Calendario) finché l'avatar non
 * è pronto: lo strumento funziona lo stesso, ma Aura scrive meglio quando sa a
 * chi parli. Un avviso solo, con dove andare; sparisce da solo ad avatar fatto.
 */
export function AvvisoSenzaAvatar({ clienteId }: { clienteId: string }) {
  const avatar = useMappaAvatar(clienteId);
  if (avatar.isLoading || avatar.isError) return null;
  const m = avatar.data;
  if (m && m.mappa.passo === "fatto" && m.schede.length > 0) return null;
  return (
    <Link
      to="/area/cervello/avatar"
      className="flex items-center justify-between gap-3 rounded-lg border bg-surface p-3.5 text-[14px] transition-colors hover:bg-surface-hover"
    >
      <span>
        <span className="font-semibold">Il tuo avatar non è ancora pronto.</span>{" "}
        <span className="text-muted-foreground">Puoi usare questa pagina lo stesso, ma Aura scrive meglio quando sa a chi parli.</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 font-medium">
        {m ? "Finisci l'avatar" : "Fai l'avatar"} <ArrowRight className="size-4" aria-hidden />
      </span>
    </Link>
  );
}
