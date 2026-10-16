import { useState } from "react";
import { ArrowRight, Instagram } from "lucide-react";
import { useCollegaInstagram } from "@/features/pubblicazioni";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

interface PassoInstagramProps {
  clienteId: string;
  onAvanti: () => void;
}

/**
 * Terzo passo: il profilo Instagram. Appena lo conferma parte `instagram-sync`
 * in background (ci vuole circa un minuto) e si va avanti subito: quando il
 * cliente arriverà in Pubblicazioni, le carte dei video ci saranno già.
 */
export function PassoInstagram({ clienteId, onAvanti }: PassoInstagramProps) {
  const collega = useCollegaInstagram(clienteId);
  const [valore, setValore] = useState("");
  const pronto = valore.trim().length >= 2;

  function collegaEAvanti() {
    if (!pronto) return;
    // Non si aspetta la lettura: la mutation continua anche dopo il cambio di pagina.
    collega.mutate(valore.trim());
    onAvanti();
  }

  return (
    <form
      className="grid gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        collegaEAvanti();
      }}
    >
      <div className="grid gap-2 text-center">
        <p className="eyebrow inline-flex items-center justify-center gap-1.5">
          <Instagram className="size-3.5" aria-hidden /> Instagram
        </p>
        <h1 className="text-[clamp(28px,4vw,38px)] leading-tight">Il tuo profilo Instagram</h1>
        <p className="mx-auto max-w-[520px] text-sm leading-relaxed text-muted-foreground">
          Leggo gli ultimi video che hai pubblicato e registro visualizzazioni, mi piace e commenti. Poi i numeri si aggiornano da soli. Lo fai una
          volta sola e intanto tu vai avanti.
        </p>
      </div>
      <div className="grid gap-2 rounded-lg border bg-card p-4">
        <label htmlFor="benvenuto-instagram" className="text-sm font-medium">
          Link o nome del profilo
        </label>
        <Input
          id="benvenuto-instagram"
          placeholder="instagram.com/tuonome oppure @tuonome"
          value={valore}
          onChange={(e) => setValore(e.target.value)}
          autoComplete="off"
          autoFocus
          className="text-base"
        />
        <p className="text-xs text-muted-foreground">Il profilo deve essere pubblico.</p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <Button size="lg" type="submit" disabled={!pronto}>
          Collega e continua <ArrowRight aria-hidden />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onAvanti}>
          Non ho un profilo pubblico, salto per ora
        </Button>
      </div>
    </form>
  );
}
