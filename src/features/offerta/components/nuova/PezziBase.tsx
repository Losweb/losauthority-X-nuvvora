import type { ReactNode } from "react";
import { AlertOctagon, Check } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDate } from "@/shared/utils/formatDate";
import { FASI_COMPLETA, PASSI_BREVE, type Fermo, type OffertaNuova, type Origine, type Voce } from "../../nuova";

/** Le proposte di Aura hanno un pallino ocra; le righe vere niente (26/11/2026, «solo il necessario»). */
export function BadgeOrigine({ o }: { o: Origine }) {
  if (o !== "ipotesi") return null;
  return (
    <span title="Proposta di Aura, da confermare" className="relative mt-[7px] inline-block size-1.5 shrink-0 rounded-full bg-status-expiring">
      <span className="sr-only">Proposta di Aura, da confermare</span>
    </span>
  );
}

/** Una riga {t, o}: il pallino se è un'ipotesi, poi il testo. */
export function RigaVoce({ v, grande = false }: { v: Voce; grande?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <BadgeOrigine o={v.o} />
      <p className={cn("min-w-0 flex-1 leading-relaxed", grande ? "text-[17px] font-semibold" : "text-[15px]")}>{v.t}</p>
    </div>
  );
}

export function Sezione({ titolo, children, className }: { titolo: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("grid content-start gap-2.5", className)}>
      <h4 className="text-[13px] font-semibold text-foreground">{titolo}</h4>
      {children}
    </section>
  );
}

/** Strada (versione breve / scheda completa) e la barra dei passi o delle fasi. */
export function PassiOfferta({ o }: { o: OffertaNuova }) {
  const completa = o.strada === "completa";
  const passi = completa ? FASI_COMPLETA : PASSI_BREVE;
  const finita = completa ? !!o.completa_fatta_il : !!o.breve_fatta_il;
  // breve: passo 1-6 → indice 0-5; completa: fase 0-7 → indice 0-7
  const corrente = finita ? passi.length : completa ? (o.passo ?? 0) : Math.max((o.passo ?? 1) - 1, 0);
  return (
    <nav aria-label="A che punto sei" className="grid gap-2">
      <p className="text-[13px] text-muted-foreground">
        {completa ? "Scheda completa" : "Versione breve"}
        {finita ? " · fatta" : <span className="sm:hidden"> · {completa ? `fase ${corrente} di 7` : `passo ${corrente + 1} di 6`}: {passi[corrente]}</span>}
      </p>
      {/* Sul telefono solo la barra sottile; i nomi delle fasi da sm in su. */}
      <ol className={cn("grid gap-1.5", completa ? "grid-cols-8" : "grid-cols-6")}>
        {passi.map((p, i) => (
          <li key={p} aria-current={i === corrente ? "step" : undefined} className="grid gap-1">
            <span className={cn("h-1.5 rounded-full", i < corrente ? "bg-primary" : i === corrente ? "bg-primary/45" : "bg-secondary")} />
            <span className={cn("hidden items-center gap-1 text-[12px] leading-tight sm:flex", i === corrente ? "font-semibold text-foreground" : "text-muted-foreground")}>
              {i < corrente ? <Check className="size-3 shrink-0" aria-hidden /> : null}
              {completa ? i : i + 1}. {p}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** La frase dell'offerta, in evidenza, con la data in cui è stata approvata. */
export function FraseOfferta({ o }: { o: OffertaNuova }) {
  if (!o.frase) {
    if (o.strada === "completa") return null;
    return (
      <div className="rounded-lg border border-dashed border-line p-4 text-[14px] text-muted-foreground">
        La frase arriva alla fine della versione breve: chi aiuti, dove lo porti, senza cosa, grazie a cosa.
      </div>
    );
  }
  return (
    <div className="grid gap-2 rounded-lg bg-primary p-4 text-primary-foreground shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow text-primary-foreground/70">La tua offerta in una frase{o.brand ? ` · ${o.brand}` : ""}</p>
        <Badge variant={o.frase_il ? "active" : "expiring"}>{o.frase_il ? `Approvata il ${formatDate(o.frase_il)}` : "Da approvare"}</Badge>
      </div>
      <p className="text-[18px] leading-snug font-semibold">{o.frase}</p>
    </div>
  );
}

/** Il blocco «Fermo»: Aura non va avanti finché manca una cosa. Il team riceve un avviso su Telegram. */
export function FermoOfferta({ fermo }: { fermo: Fermo | null }) {
  if (!fermo) return null;
  return (
    <div role="alert" className="grid gap-1.5 rounded-lg border border-status-churn/40 bg-status-churn-soft p-4 text-[14px] text-status-churn">
      <p className="flex items-center gap-2 font-semibold">
        <AlertOctagon className="size-4" aria-hidden /> Fermo: {fermo.cosa}
      </p>
      {fermo.perche ? <p>Perché conta: {fermo.perche}</p> : null}
      {fermo.ripartire ? <p>Per ripartire: {fermo.ripartire}</p> : null}
    </div>
  );
}

/** Tabella semplice usata da mercato, test, versioni e freni. */
export function Tabella({ intestazioni, righe }: { intestazioni: string[]; righe: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[420px] border-collapse text-left text-[13px] leading-snug">
        <thead className="bg-surface">
          <tr>
            {intestazioni.map((h) => (
              <th key={h} scope="col" className="border-b border-line px-3 py-2 text-[12px] font-semibold text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {righe.map((r, i) => (
            <tr key={i} className="border-b border-line align-top last:border-b-0">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
