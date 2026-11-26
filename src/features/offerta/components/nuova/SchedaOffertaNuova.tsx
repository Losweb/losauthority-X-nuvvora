import { Dettaglio } from "@/shared/components/layout/Dettaglio";
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
 * La scheda Offerta (26/11/2026, «quadro generale»): in vista solo nome, promessa e prezzi;
 * sotto, righe che si aprono al clic (cosa c'è dentro, bonus e garanzia, come la presenti,
 * se ti dicono, da confermare, come ci siamo arrivati). `aperta` (tab del team e PDF) le apre
 * tutte; `larga` = due colonne nel ragionamento.
 */
export function SchedaOffertaNuova({ o, larga = false, aperta = false }: { o: OffertaNuova; larga?: boolean; aperta?: boolean }) {
  const s = o.scheda ?? {};
  const pr = s.promessa;
  const pres = s.presentazione;
  const cuore = s.gradini?.find((g) => g.livello === "cuore");
  const nome = cuore?.nome || pres?.nomi?.[0] || null;
  const promessa = pr?.scelta ? pr[pr.scelta] : (pr?.tagliente ?? pr?.sicura ?? null);
  const frasi = pres ? (["bio", "video", "chat"] as const).filter((k) => pres[k]) : [];

  const gradini = s.gradini ?? [];
  const bonus = s.bonus ?? [];
  const obiezioni = pres?.obiezioni ?? [];
  const confermare = s.da_confermare ?? [];
  const haQuadro = !!(nome || promessa || gradini.length);

  // Le righe che si aprono al clic: titolo, riassunto corto, dettagli.
  const righe = [
    gradini.some((g) => g.contiene) ? (
      <Dettaglio key="contiene" titolo="Cosa c'è dentro" riassunto={gradini.length === 1 ? "1 prezzo" : `${gradini.length} prezzi`} aperto={aperta}>
        {gradini.map((g, i) => (
          <div key={i} className="grid gap-0.5">
            <p className="flex items-start gap-2 text-[15px] font-semibold">
              <BadgeOrigine o={g.o} />
              {g.nome || ETICHETTA_GRADINO[g.livello]} · <span className="figure">{g.prezzo}</span>
            </p>
            {g.contiene ? <p className="text-[15px] leading-relaxed text-muted-foreground">{g.contiene}</p> : null}
          </div>
        ))}
      </Dettaglio>
    ) : null,
    bonus.length || s.garanzia ? (
      <Dettaglio key="bonus" titolo="Bonus e garanzia" riassunto={[bonus.length ? `${bonus.length} bonus` : null, s.garanzia ? "garanzia" : null].filter(Boolean).join(" e ")} aperto={aperta}>
        {bonus.map((b, i) => (
          <RigaVoce key={i} v={{ t: b.bonus, o: b.o }} />
        ))}
        {s.garanzia ? (
          <div className="grid gap-0.5">
            <p className="text-[13px] text-muted-foreground">Garanzia</p>
            <RigaVoce v={s.garanzia} />
          </div>
        ) : null}
      </Dettaglio>
    ) : null,
    frasi.length ? (
      <Dettaglio key="presenta" titolo="Come la presenti" riassunto={frasi.map((k) => (k === "bio" ? "bio" : k === "video" ? "video" : "chat")).join(", ")} aperto={aperta}>
        {frasi.map((k) => (
          <div key={k} className="grid gap-0.5">
            <p className="text-[13px] text-muted-foreground">{k === "bio" ? "Nella bio" : k === "video" ? "All'inizio di un video" : "In chat"}</p>
            <p className="text-[15px] leading-relaxed">{pres?.[k]}</p>
          </div>
        ))}
      </Dettaglio>
    ) : null,
    obiezioni.length ? (
      <Dettaglio key="obiezioni" titolo="Se ti dicono" riassunto={obiezioni.length === 1 ? "1 obiezione" : `${obiezioni.length} obiezioni`} aperto={aperta}>
        {obiezioni.map((x, i) => (
          <div key={i} className="flex items-start gap-2">
            <BadgeOrigine o={x.o} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] leading-relaxed">«{x.a}»</p>
              <p className="text-[15px] leading-relaxed text-muted-foreground">→ {x.b}</p>
            </div>
          </div>
        ))}
      </Dettaglio>
    ) : null,
    confermare.length ? (
      <Dettaglio key="confermare" titolo="Da confermare" riassunto={<span className="text-status-expiring">{confermare.length === 1 ? "1 cosa" : `${confermare.length} cose`}</span>} aperto={aperta}>
        <ul className="grid list-disc gap-1 pl-4 text-[15px] leading-relaxed marker:text-status-expiring">
          {confermare.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </Dettaglio>
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

  if (!haQuadro && righe.length === 0 && ragionamento.length === 0) return null;
  const sezioniRagionamento = <div className={cn("grid gap-6", larga && "lg:grid-cols-2 lg:gap-x-10")}>{ragionamento}</div>;
  // Fasi iniziali: non c'è ancora un risultato, quindi il ragionamento è l'unica cosa scritta e si vede aperto.
  if (!haQuadro && righe.length === 0) return <div className="rounded-lg border bg-card p-5">{sezioniRagionamento}</div>;

  return (
    <article aria-label="La tua offerta" className="overflow-hidden rounded-lg border bg-card">
      {haQuadro ? (
        <header className="grid gap-4 p-5">
          <div className="grid gap-1.5">
            {nome ? <h3 className="text-[22px] leading-tight font-bold">{nome}</h3> : null}
            {promessa ? <p className="text-[17px] leading-snug font-medium">{promessa}</p> : null}
          </div>
          {gradini.length ? (
            <ul className={cn("grid gap-2", gradini.length > 1 && "sm:grid-cols-2", gradini.length > 2 && "lg:grid-cols-3")}>
              {gradini.map((g, i) => (
                <li key={i} className="grid gap-0.5 rounded-md bg-surface px-3 py-2.5">
                  <p className="truncate text-[13px] text-muted-foreground">{g.nome || ETICHETTA_GRADINO[g.livello]}</p>
                  <p className="figure text-[17px] leading-snug font-semibold">{g.prezzo}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </header>
      ) : null}
      <div className={cn("grid divide-y divide-line px-5", haQuadro && "border-t")}>
        {righe}
        {ragionamento.length ? (
          <Dettaglio titolo="Come ci siamo arrivati" riassunto="mercato, valore, freni, prezzi" aperto={aperta}>
            {sezioniRagionamento}
          </Dettaglio>
        ) : null}
      </div>
    </article>
  );
}
