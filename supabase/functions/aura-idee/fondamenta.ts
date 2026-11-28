/**
 * Le fondamenta del cliente per Crea idee (28/11/2026): l'avatar (mappa + scheda principale
 * intera + le altre partenze in breve) e l'offerta (frase e le parti che servono ai contenuti).
 * Prima Crea idee leggeva solo onboarding, analisi e posizionamento: le parole vere del
 * cliente ideale, le sue obiezioni e la promessa dell'offerta non arrivavano ad Aura.
 * Ogni riga dell'avatar porta la sua origine: «vera» = detta da un cliente vero, il resto ipotesi.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/** Le parti della scheda offerta utili per scrivere contenuti (il resto è prezzo e conti). */
const CAMPI_OFFERTA = ["arrivo", "promessa", "presentazione", "come_fanno_tutti", "freni", "leva", "versioni", "gradini"] as const;

const json = (v: unknown, max: number) => {
  const t = JSON.stringify(v);
  return t.length > max ? `${t.slice(0, max)}…` : t;
};

/**
 * La voce del cliente (28/11/2026, Wesley: il copy di Aura «sembra macchinoso, mi sento un
 * venditore»): fino a 3 script dei video nel suo Calendario, prima i pubblicati. Si saltano
 * quelli arrivati da Crea idee (scritti da Aura): servono le parole sue, non le nostre.
 */
const MAX_SCRIPT_VOCE = 3;
async function scriptDelCliente(admin: SupabaseClient, clienteId: string): Promise<string | null> {
  const [{ data: contenuti }, { data: daIdee }] = await Promise.all([
    admin.from("contenuti").select("id, script, stato").eq("cliente_id", clienteId).not("script", "is", null).order("updated_at", { ascending: false }).limit(30),
    admin.from("idee").select("contenuto_id").eq("cliente_id", clienteId).not("contenuto_id", "is", null),
  ]);
  const diAura = new Set(((daIdee ?? []) as Array<{ contenuto_id: string }>).map((i) => i.contenuto_id));
  const scelti = ((contenuti ?? []) as Array<{ id: string; script: string; stato: string }>)
    .filter((c) => !diAura.has(c.id) && c.script.trim().length >= 200)
    .sort((a, b) => Number(b.stato === "pubblicato") - Number(a.stato === "pubblicato"))
    .slice(0, MAX_SCRIPT_VOCE);
  if (scelti.length === 0) return null;
  const testi = scelti.map((c, i) => `[Script ${i + 1}${c.stato === "pubblicato" ? ", pubblicato" : ""}]\n${c.script.trim().slice(0, 1500)}`);
  return `=== SCRIPT DEL CLIENTE (i suoi video: è la SUA voce, imitala) ===\n${testi.join("\n\n")}`;
}

export async function bloccoFondamenta(admin: SupabaseClient, clienteId: string): Promise<string | null> {
  const [{ data: mappa }, { data: schede }, { data: offerta }] = await Promise.all([
    admin.from("avatar_mappa").select("passo, ponte, arrivo, fuori").eq("cliente_id", clienteId).maybeSingle(),
    admin.from("avatar_scheda").select("ordine, principale, partenza, contenuto").eq("cliente_id", clienteId).order("principale", { ascending: false }).order("ordine"),
    admin.from("offerta").select("frase, scheda").eq("cliente_id", clienteId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const parti: string[] = [];
  const righe = (schede ?? []) as Array<{ ordine: number; principale: boolean; partenza: unknown; contenuto: Record<string, unknown> }>;
  if (mappa || righe.length > 0) {
    const m = mappa as { passo: string; ponte: unknown; arrivo: unknown; fuori: unknown } | null;
    const testa = m ? `Ponte (cosa vende): ${json(m.ponte, 1500)}\nArrivo (dove porta chi compra): ${json(m.arrivo, 1500)}` : "";
    const [prima, ...altre] = righe;
    const principale = prima
      ? (() => {
          const { da_verificare: _dv, ...contenuto } = prima.contenuto;
          return `Avatar principale (partenza: ${json(prima.partenza, 800)}):\n${json(contenuto, 9000)}`;
        })()
      : "";
    const resto = altre.map((s) => `Altro avatar ${s.ordine}: ${json(s.contenuto.nome ?? "", 80)} · partenza ${json(s.partenza, 600)}`);
    parti.push(
      [
        `=== AVATAR DEL CLIENTE (a chi parlano i suoi video) ===`,
        `Le righe {t, o}: o = "vera" è detta da un cliente vero (usala parola per parola), il resto è ipotesi.`,
        testa,
        principale,
        ...resto,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
  const voce = await scriptDelCliente(admin, clienteId);
  if (voce) parti.push(voce);
  const o = offerta as { frase: string | null; scheda: Record<string, unknown> | null } | null;
  if (o && (o.frase || (o.scheda && Object.keys(o.scheda).length > 0))) {
    const scheda = o.scheda ?? {};
    const campi = CAMPI_OFFERTA.filter((k) => scheda[k] != null).map((k) => `${k}: ${json(scheda[k], 1500)}`);
    parti.push([`=== OFFERTA DEL CLIENTE (cosa vende e come lo dice) ===`, o.frase ? `Frase: ${o.frase}` : "", ...campi].filter(Boolean).join("\n"));
  }
  return parti.length > 0 ? parti.join("\n\n") : null;
}
