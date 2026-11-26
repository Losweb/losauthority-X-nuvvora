import { ArrowRight, Check, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/shared/components/ui/button";
import { formatDate } from "@/shared/utils/formatDate";
import { cn } from "@/lib/utils";
import type { Tappa } from "../../hooks/usePercorso";

/** La tappa di adesso: una cosa sola in evidenza, con quanto dura e un solo bottone. */
export function TappaOra({ tappa, numero }: { tappa: Tappa; numero: number }) {
  return (
    <section aria-label="La tappa di adesso" className="grid gap-3 rounded-2xl border border-foreground/25 bg-card p-5 shadow-sm md:p-6">
      <p className="eyebrow">
        Adesso · tappa {numero} · {tappa.durata}
      </p>
      <h2 className="text-[24px] leading-tight font-bold">{tappa.titolo}</h2>
      <p className="max-w-[560px] text-[15px] leading-relaxed text-muted-foreground">{tappa.cosa}</p>
      <div>
        <Link to={tappa.href} className={buttonVariants({ size: "lg" })}>
          Continua da qui <ArrowRight aria-hidden />
        </Link>
      </div>
    </section>
  );
}

/** Tutte le tappe in fila: fatte (con il risultato), quella di adesso, quelle che vengono dopo (spente). */
export function ElencoTappe({ tappe }: { tappe: Tappa[] }) {
  return (
    <ol className="grid">
      {tappe.map((t, i) => {
        const riga = (
          <>
            <span
              aria-hidden
              className={cn(
                "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold",
                t.stato === "fatta" ? "bg-status-active-soft text-status-active" : t.stato === "ora" ? "bg-primary text-primary-foreground" : "border border-line-strong text-muted-foreground",
              )}
            >
              {t.stato === "fatta" ? <Check className="size-3.5" strokeWidth={2.5} /> : i + 1}
            </span>
            <span className="grid min-w-0 gap-0.5">
              <span className={cn("text-[15px] leading-snug", t.stato === "dopo" ? "text-muted-foreground" : "font-semibold text-foreground")}>{t.titolo}</span>
              <span className="text-[14px] leading-snug text-muted-foreground">{t.riga}</span>
            </span>
            <span className="sr-only">{t.stato === "fatta" ? "Fatta" : t.stato === "ora" ? "Adesso" : "Viene dopo"}</span>
          </>
        );
        return (
          <li key={t.chiave} aria-current={t.stato === "ora" ? "step" : undefined} className="border-b border-line last:border-b-0">
            {t.stato === "dopo" ? (
              <div className="flex items-start gap-3 py-3.5">{riga}</div>
            ) : (
              <Link to={t.href} className="flex items-start gap-3 rounded-md py-3.5 transition-colors hover:bg-surface-hover/60 md:-mx-2 md:px-2">
                {riga}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** La prossima chiamata con Wesley, se è già fissata. */
export function ProssimaChiamata({ quando }: { quando: string | null }) {
  if (!quando) return null;
  return (
    <p className="flex items-center gap-2.5 rounded-lg bg-surface-hover/60 px-4 py-3 text-[14px] text-foreground">
      <Phone className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      Prossima chiamata con Wesley: {formatDate(quando)}.
    </p>
  );
}
