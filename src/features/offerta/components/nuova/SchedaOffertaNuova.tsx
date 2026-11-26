import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ETICHETTA_CRITERIO,
  ETICHETTA_GRADINO,
  ETICHETTA_LEVA,
  ETICHETTA_POSTO,
  ETICHETTA_TEST,
  ETICHETTA_VALORE,
  SIMBOLO_ESITO,
  type OffertaNuova,
} from "../../nuova";
import { BadgeOrigine, RigaVoce, Sezione, Tabella } from "./PezziBase";

const ETICHETTA_PROMESSA = { sicura: "Sicura", tagliente: "Tagliente", colpo_di_scena: "Colpo di scena" } as const;

/**
 * La scheda Offerta (26/11/2026, «solo il necessario»): in alto il risultato che il cliente usa
 * (nome, promessa, prezzi, bonus, garanzia, come la presenti, cosa confermare); il ragionamento
 * di Aura (test, mercato, leve, valore, freni) sta piegato in «Come ci siamo arrivati».
 * `aperta` (tab del team e PDF) lo mostra già aperto; `larga` = due colonne nel ragionamento.
 */
export function SchedaOffertaNuova({ o, larga = false, aperta = false }: { o: OffertaNuova; larga?: boolean; aperta?: boolean }) {
  const s = o.scheda ?? {};
  const pr = s.promessa;
  const pres = s.presentazione;
  const cuore = s.gradini?.find((g) => g.livello === "cuore");
  const nome = cuore?.nome || pres?.nomi?.[0] || null;
  const promessa = pr?.scelta ? pr[pr.scelta] : (pr?.tagliente ?? pr?.sicura ?? null);
  const frasi = pres ? (["bio", "video", "chat"] as const).filter((k) => pres[k]) : [];

  const risultato = [
    nome || promessa ? (
      <div key="testa" className="grid gap-1.5">
        {nome ? <h3 className="text-[22px] leading-tight font-bold">{nome}</h3> : null}
        {promessa ? <p className="text-[17px] leading-snug font-medium">{promessa}</p> : null}
      </div>
    ) : null,
    s.gradini?.length ? (
      <Sezione key="prezzi" titolo="Prezzi">
        <ul className="grid divide-y divide-line">
          {s.gradini.map((g, i) => (
            <li key={i} className="grid gap-0.5 py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-3">
                <p className="flex min-w-0 items-start gap-2 text-[15px] font-semibold">
                  <BadgeOrigine o={g.o} />
                  {g.nome || ETICHETTA_GRADINO[g.livello]}
                </p>
                <span className="figure shrink-0 text-[15px] font-semibold">{g.prezzo}</span>
              </div>
              {g.contiene ? <p className="text-[14px] leading-relaxed text-muted-foreground">{g.contiene}</p> : null}
            </li>
          ))}
        </ul>
      </Sezione>
    ) : null,
    s.bonus?.length || s.garanzia ? (
      <Sezione key="bonus" titolo="Bonus e garanzia">
        {s.bonus?.map((b, i) => <RigaVoce key={i} v={{ t: b.bonus, o: b.o }} />)}
        {s.garanzia ? <RigaVoce v={s.garanzia} /> : null}
      </Sezione>
    ) : null,
    frasi.length ? (
      <Sezione key="presenta" titolo="Come la presenti">
        {frasi.map((k) => (
          <div key={k} className="grid gap-0.5">
            <p className="text-[13px] text-muted-foreground">{k === "bio" ? "Nella bio" : k === "video" ? "All'inizio di un video" : "In chat"}</p>
            <p className="text-[15px] leading-relaxed">{pres?.[k]}</p>
          </div>
        ))}
      </Sezione>
    ) : null,
    pres?.obiezioni?.length ? (
      <Sezione key="obiezioni" titolo="Se ti dicono">
        {pres.obiezioni.map((x, i) => (
          <div key={i} className="flex items-start gap-2">
            <BadgeOrigine o={x.o} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] leading-relaxed">«{x.a}»</p>
              <p className="text-[14px] leading-relaxed text-muted-foreground">→ {x.b}</p>
            </div>
          </div>
        ))}
      </Sezione>
    ) : null,
    s.da_confermare?.length ? (
      <Sezione key="confermare" titolo="Da confermare">
        <ul className="grid list-disc gap-1 pl-4 text-[15px] leading-relaxed marker:text-status-expiring">
          {s.da_confermare.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </Sezione>
    ) : null,
  ].filter(Boolean);

  const ragionamento = [
    s.arrivo || s.centro ? (
      <Sezione key="arrivo" titolo="Arrivo e cosa al centro">
        {s.arrivo ? <RigaVoce v={s.arrivo} /> : null}
        {s.centro ? <RigaVoce v={s.centro} /> : null}
      </Sezione>
    ) : null,
    s.come_fanno_tutti || s.versioni?.length ? (
      <Sezione key="mercato-diverso" titolo="Diversa dal mercato">
        {s.come_fanno_tutti ? (
          <div className="grid gap-0.5">
            <p className="text-[13px] text-muted-foreground">Come fanno tutti</p>
            <RigaVoce v={s.come_fanno_tutti} />
          </div>
        ) : null}
        {s.versioni?.length ? (
          <Tabella
            intestazioni={["Leva", "Versione", "La vogliono?", "La puoi fare?", "Il tuo mestiere?"]}
            righe={s.versioni.map((v) => [ETICHETTA_LEVA[v.leva], v.testo, v.vuole ? "✅" : "❌", v.puo ? "✅" : "❌", v.mestiere ? "✅" : "❌"])}
          />
        ) : null}
        {s.da_riprovare ? <p className="text-[14px] text-muted-foreground">Da riprovare più avanti: {s.da_riprovare}</p> : null}
      </Sezione>
    ) : null,
    s.test?.length ? (
      <Sezione key="test" titolo="I sei test">
        <Tabella intestazioni={["Test", "", "Nota"]} righe={s.test.map((t) => [ETICHETTA_TEST[t.test], SIMBOLO_ESITO[t.esito], t.nota])} />
      </Sezione>
    ) : null,
    s.mercato?.length ? (
      <Sezione key="regge" titolo="Il mercato regge?">
        <Tabella intestazioni={["Criterio", "", "Perché"]} righe={s.mercato.map((m) => [ETICHETTA_CRITERIO[m.criterio], SIMBOLO_ESITO[m.esito], m.perche])} />
        {s.gradino_massimo ? <RigaVoce v={s.gradino_massimo} /> : null}
      </Sezione>
    ) : null,
    s.dipende_da_te?.length || s.dipende_dal_cliente?.length ? (
      <Sezione key="dipende" titolo="Cosa puoi promettere">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid content-start gap-1">
            <p className="text-[13px] text-muted-foreground">Dipende da te</p>
            {s.dipende_da_te?.map((v, i) => <RigaVoce key={i} v={v} />)}
          </div>
          <div className="grid content-start gap-1">
            <p className="text-[13px] text-muted-foreground">Dipende dal tuo cliente</p>
            {s.dipende_dal_cliente?.map((v, i) => <RigaVoce key={i} v={v} />)}
          </div>
        </div>
      </Sezione>
    ) : null,
    pr ? (
      <Sezione key="promesse" titolo="Le tre promesse">
        {(["sicura", "tagliente", "colpo_di_scena"] as const).map((k) =>
          pr[k] ? (
            <div key={k} className="grid gap-0.5">
              <p className="text-[13px] text-muted-foreground">
                {ETICHETTA_PROMESSA[k]}
                {pr.scelta === k ? " · scelta" : ""}
              </p>
              <p className={cn("text-[15px] leading-relaxed", pr.scelta === k && "font-semibold")}>{pr[k]}</p>
            </div>
          ) : null,
        )}
        {pr.casi ? <RigaVoce v={pr.casi} /> : null}
      </Sezione>
    ) : null,
    s.valore?.length ? (
      <Sezione key="valore" titolo="Il valore">
        <Tabella intestazioni={["Leva", "Voto", "La mossa"]} righe={s.valore.map((v) => [ETICHETTA_VALORE[v.leva], `${v.voto}/5`, v.mossa])} />
      </Sezione>
    ) : null,
    s.freni?.length ? (
      <Sezione key="freni" titolo="I freni">
        <Tabella
          intestazioni={["Freno", "Quando", "Soluzione", "Dove va"]}
          righe={s.freni.map((f) => [f.freno, f.momento, f.soluzione, ETICHETTA_POSTO[f.posto]])}
        />
      </Sezione>
    ) : null,
    s.gradini?.some((g) => g.ragionamento) || s.ore || s.margine || s.scarsita ? (
      <Sezione key="conti" titolo="Perché questi prezzi">
        {s.gradini?.map((g, i) => (g.ragionamento ? <p key={i} className="text-[15px] leading-relaxed"><span className="font-medium">{g.nome || ETICHETTA_GRADINO[g.livello]}:</span> {g.ragionamento}</p> : null))}
        {s.ore ? <RigaVoce v={s.ore} /> : null}
        {s.margine ? <RigaVoce v={s.margine} /> : null}
        {s.scarsita ? <RigaVoce v={s.scarsita} /> : null}
      </Sezione>
    ) : null,
    pres?.nomi && pres.nomi.length > 1 ? (
      <Sezione key="nomi" titolo="Altri nomi possibili">
        <p className="text-[15px]">{pres.nomi.slice(1).join(" · ")}</p>
      </Sezione>
    ) : null,
  ].filter(Boolean);

  if (risultato.length === 0 && ragionamento.length === 0) return null;
  // Finché non c'è un risultato (fasi iniziali) il ragionamento si vede aperto: è l'unica cosa scritta.
  const apri = aperta || risultato.length === 0;
  return (
    <div className="grid gap-6">
      {risultato.length ? <div className="grid gap-6 rounded-lg border bg-card p-5">{risultato}</div> : null}
      {ragionamento.length ? (
        <details className="group/arrivati" open={apri}>
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[14px] font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            <ChevronDown className="size-4 transition-transform group-open/arrivati:rotate-180" aria-hidden />
            Come ci siamo arrivati
          </summary>
          <div className={cn("grid gap-6 pt-5", larga && "lg:grid-cols-2 lg:gap-x-10")}>{ragionamento}</div>
        </details>
      ) : null}
    </div>
  );
}
