import { useQuery } from "@tanstack/react-query";
import { useMappaAvatar } from "@/features/avatar";
import { useOffertaCliente } from "@/features/offerta";
import { usePosizionamento } from "@/features/posizionamento";
import { supabase } from "@/integrations/supabase/client";

export type StatoTappa = "fatta" | "ora" | "dopo";

export interface Tappa {
  chiave: "onboarding" | "avatar" | "offerta" | "posizionamento" | "contenuti" | "numeri" | "clienti";
  titolo: string;
  /** Una riga: il risultato se è fatta, a che punto è se è in corso, cosa la apre se viene dopo. */
  riga: string;
  /** Cosa si fa in questa tappa, in una frase (si mostra sulla tappa di adesso). */
  cosa: string;
  durata: string;
  href: string;
  stato: StatoTappa;
}

const chiave = (clienteId: string) => ["percorso", "conteggi", clienteId] as const;

/** Quello che serve oltre a offerta e avatar: quanti contenuti, se Instagram è collegato, quanti lead, la prossima chiamata. */
function useConteggi(clienteId: string | undefined) {
  return useQuery({
    queryKey: chiave(clienteId ?? ""),
    enabled: !!clienteId,
    queryFn: async () => {
      const id = clienteId ?? "";
      const [contenuti, lead, cliente] = await Promise.all([
        supabase.from("contenuti").select("id", { count: "exact", head: true }).eq("cliente_id", id),
        supabase.from("crm_lead").select("id", { count: "exact", head: true }).eq("cliente_id", id),
        supabase.from("clienti").select("instagram, prossima_call").eq("id", id).maybeSingle(),
      ]);
      if (contenuti.error) throw contenuti.error;
      return {
        contenuti: contenuti.count ?? 0,
        // La sezione Clienti può essere ancora chiusa (documenti da accettare): allora zero.
        lead: lead.error ? 0 : (lead.count ?? 0),
        instagram: !!cliente.data?.instagram,
        prossimaCall: cliente.data?.prossima_call ?? null,
      };
    },
  });
}

const CONTENUTI_PER_PARTIRE = 3;

/**
 * Il percorso del cliente in sette tappe, nell'ordine del metodo: onboarding →
 * avatar → offerta → posizionamento → primi contenuti → numeri → clienti
 * (26/11/2026: tolta la tappa «frase dell'offerta», aggiunto il posizionamento). Lo stato viene dai dati che ci sono già: «ora» è la prima non fatta.
 */
export function usePercorso(clienteId: string | undefined) {
  const offerta = useOffertaCliente(clienteId);
  const avatar = useMappaAvatar(clienteId);
  const posizionamento = usePosizionamento(clienteId);
  const conteggi = useConteggi(clienteId);

  const o = offerta.data ?? null;
  const m = avatar.data ?? null;
  const c = conteggi.data;
  const principale = m?.schede.find((s) => s.principale) ?? null;
  const nomeAvatar = principale?.contenuto.nome ?? principale?.partenza.situazione?.t ?? null;
  const cuore = o?.scheda?.gradini?.find((g) => g.livello === "cuore") ?? null;

  const avatarFatto = m?.mappa.passo === "fatto" && (m?.schede.length ?? 0) > 0;
  const offertaFatta = !!o?.completa_fatta_il;
  const posizionamentoFatto = posizionamento.data?.stato === "pronto";
  const contenutiFatti = (c?.contenuti ?? 0) >= CONTENUTI_PER_PARTIRE;
  const numeriFatti = !!c?.instagram;
  const clientiFatti = (c?.lead ?? 0) > 0;

  const base: Array<Omit<Tappa, "stato"> & { fatta: boolean }> = [
    { chiave: "onboarding", titolo: "Onboarding", riga: "Hai raccontato il tuo lavoro", cosa: "", durata: "", href: "/area/onboarding", fatta: true },
    {
      chiave: "avatar",
      titolo: "Il tuo avatar",
      riga: avatarFatto ? (nomeAvatar ?? "Mappa e schede pronte") : m ? "In corso con Aura" : "A chi parlano i tuoi contenuti",
      cosa: "Aura legge quello che sa di te e ti propone a chi parlano i tuoi contenuti. Tu correggi.",
      durata: "circa 15 minuti",
      href: "/area/cervello/avatar",
      fatta: avatarFatto,
    },
    {
      chiave: "offerta",
      titolo: "La tua offerta",
      riga: offertaFatta ? (cuore ? `${cuore.nome || "Offerta"} · ${cuore.prezzo}` : "Scheda pronta") : avatarFatto ? (o?.strada === "completa" ? "In corso con Aura" : "Mercato, promessa, prezzo") : "Si apre quando l'avatar è pronto",
      cosa: "Con Aura, partendo dal tuo avatar: promessa, prezzo e come la presenti.",
      durata: "circa 30 minuti, anche in più volte",
      href: "/area/cervello/offerta",
      fatta: offertaFatta,
    },
    {
      chiave: "posizionamento",
      titolo: "Il tuo posizionamento",
      riga: posizionamentoFatto ? (posizionamento.data?.contenuto.profilo?.utente ? `@${posizionamento.data.contenuto.profilo.utente}` : "Profilo pronto") : offertaFatta ? "Il tuo profilo Instagram e chi sei" : "Si apre quando l'offerta è pronta",
      cosa: "Aura scrive come si vede il tuo profilo Instagram e chi sei nel tuo mercato. Tu correggi.",
      durata: "circa 5 minuti",
      href: "/area/cervello/posizionamento",
      fatta: posizionamentoFatto,
    },
    {
      chiave: "contenuti",
      titolo: "I primi contenuti",
      riga: contenutiFatti ? `${c?.contenuti} video nel calendario` : (c?.contenuti ?? 0) > 0 ? `${c?.contenuti} di ${CONTENUTI_PER_PARTIRE} video nel calendario` : "I primi tre video per il tuo avatar",
      cosa: "Chiedi ad Aura le prime idee e porta tre video nel calendario.",
      durata: "circa 20 minuti",
      href: "/area/crea-idee",
      fatta: contenutiFatti,
    },
    {
      chiave: "numeri",
      titolo: "Pubblica e misura",
      riga: numeriFatti ? "Instagram collegato: i numeri si aggiornano da soli" : "Collega Instagram per vedere i numeri",
      cosa: "Collega il tuo profilo Instagram: i numeri dei video arrivano da soli.",
      durata: "1 minuto",
      href: "/area/pubblicazioni",
      fatta: numeriFatti,
    },
    {
      chiave: "clienti",
      titolo: "I clienti",
      riga: clientiFatti ? `${c?.lead} ${c?.lead === 1 ? "persona segnata" : "persone segnate"}` : "Segna chi ti scrive e chi compra",
      cosa: "Segna la prima persona che ti ha scritto: così vedi cosa porta clienti.",
      durata: "2 minuti",
      href: "/area/clienti",
      fatta: clientiFatti,
    },
  ];

  const indiceOra = base.findIndex((t) => !t.fatta);
  const tappe: Tappa[] = base.map(({ fatta, ...t }, i) => ({ ...t, stato: fatta ? "fatta" : i === indiceOra ? "ora" : "dopo" }));

  return {
    caricamento: offerta.isLoading || avatar.isLoading || posizionamento.isLoading || conteggi.isLoading,
    errore: offerta.isError || avatar.isError || conteggi.isError,
    tappe,
    ora: indiceOra === -1 ? null : tappe[indiceOra],
    fatte: tappe.filter((t) => t.stato === "fatta").length,
    prossimaCall: c?.prossimaCall ?? null,
  };
}
