import { useState } from "react";
import { CheckCircle2, ChevronDown, RotateCcw } from "lucide-react";
import {
  CartaAvatar,
  DiagnosiAvatar,
  DossierAvatar,
  ElencoSchede,
  MappaPonte,
  PassiAvatar,
  SchedaDocumento,
  useAvatars,
  useDiagnosiAvatar,
  useMappaAvatar,
  useStatoMappa,
  type Avatar,
} from "@/features/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { ErroreCaricamento, SkeletonBlocco, StatoVuoto } from "@/shared/components/layout/StatoCaricamento";
import { formatDate } from "@/shared/utils/formatDate";
import type { ClienteDettaglio } from "../types";

/**
 * Tab "Avatar" della scheda cliente. Dal 25/11/2026: la mappa disegnata a ponte
 * e le schede che il cliente costruisce con Aura (sola lettura), con «Segna come
 * rivista» per Wesley. Sotto, piegati, gli avatar del sistema di prima con la
 * diagnosi per Wesley (che il cliente non vede).
 */
export function AvatarTab({ cliente }: { cliente: ClienteDettaglio }) {
  const dati = useMappaAvatar(cliente.id);
  const vecchi = useAvatars(cliente.id);
  const statoMappa = useStatoMappa(cliente.id);
  const [aperta, setAperta] = useState<number | null>(null);

  if (dati.isLoading || vecchi.isLoading) return <SkeletonBlocco altezza="h-64" />;
  if (dati.isError) return <ErroreCaricamento />;
  const avatarVecchi = vecchi.data ?? [];

  if (!dati.data) {
    return (
      <div className="grid gap-6">
        <StatoVuoto titolo="Mappa non ancora iniziata" testo="Il cliente la costruisce dalla sua area: Cervello del tuo branding → Avatar, in conversazione con Aura." />
        <AvatarDiPrima avatars={avatarVecchi} nome={cliente.utente.nombre} />
      </div>
    );
  }

  const { mappa, schede } = dati.data;
  const rivista = mappa.stato === "rivista";
  const scheda = aperta !== null ? schede.find((s) => s.ordine === aperta) : schede.find((s) => s.principale);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
        <div className="grid min-w-0 flex-1 basis-[360px] gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={rivista ? "active" : "neutral"} dot>
              {rivista ? `Rivista${mappa.rivista_il ? ` il ${formatDate(mappa.rivista_il)}` : ""}` : "Bozza di Aura"}
            </Badge>
            {mappa.offerta_da_costruire ? <Badge variant="expiring">L'offerta va costruita</Badge> : null}
            {mappa.convertita ? <Badge variant="outline">Nata dagli avatar di prima</Badge> : null}
          </div>
          <PassiAvatar passo={mappa.passo} />
        </div>
        <Button variant={rivista ? "outline" : "default"} disabled={statoMappa.isPending} onClick={() => statoMappa.mutate({ mappaId: mappa.id, rivista: !rivista })}>
          {rivista ? <RotateCcw aria-hidden /> : <CheckCircle2 aria-hidden />}
          {rivista ? "Rimetti in bozza" : "Segna come rivista"}
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] xl:items-start">
        <div className="grid min-w-0 content-start gap-5">
          <MappaPonte mappa={mappa} schede={schede} />
          <ElencoSchede schede={schede} onApri={setAperta} />
        </div>
        {scheda ? <SchedaDocumento scheda={scheda} stato={mappa.stato} apertaTutta /> : <StatoVuoto titolo="Nessuna scheda ancora" testo="Aura scrive le schede dopo la mappa, partendo dall'avatar principale." />}
      </div>

      <AvatarDiPrima avatars={avatarVecchi} nome={cliente.utente.nombre} />
    </div>
  );
}

/** Gli avatar del sistema di prima (tabella `avatar`), piegati: carta, dossier e diagnosi per Wesley. */
function AvatarDiPrima({ avatars, nome }: { avatars: Avatar[]; nome: string }) {
  const [aperto, setAperto] = useState(false);
  const [sceltoId, setSceltoId] = useState<string | null>(null);
  const scelto = avatars.find((a) => a.id === sceltoId) ?? avatars[0] ?? null;
  const diagnosi = useDiagnosiAvatar(aperto ? scelto?.id : undefined);
  if (avatars.length === 0) return null;
  const numero = scelto ? avatars.findIndex((a) => a.id === scelto.id) + 1 : 1;
  return (
    <section className="grid gap-4 border-t pt-5">
      <Button variant="ghost" className="w-fit" aria-expanded={aperto} onClick={() => setAperto((v) => !v)}>
        <ChevronDown aria-hidden className={aperto ? "rotate-180 transition-transform" : "transition-transform"} />
        Avatar del sistema di prima ({avatars.length}) · con la diagnosi per Wesley
      </Button>
      {aperto && scelto ? (
        <div className="grid gap-4">
          {avatars.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {avatars.map((a, i) => (
                <Button key={a.id} size="sm" variant={a.id === scelto.id ? "secondary" : "outline"} onClick={() => setSceltoId(a.id)}>
                  {a.nome ?? `Avatar ${i + 1}`}
                </Button>
              ))}
            </div>
          ) : null}
          <CartaAvatar avatar={scelto} numero={numero} titolare={`${nome}${scelto.settore ? ` · ${scelto.settore}` : ""}`} inCompilazione={scelto.stato !== "completo"} />
          <DossierAvatar avatar={scelto} numero={numero} />
          {diagnosi.isError ? <ErroreCaricamento /> : <DiagnosiAvatar diagnosi={diagnosi.data ?? null} completo={scelto.stato === "completo"} />}
        </div>
      ) : null}
    </section>
  );
}
