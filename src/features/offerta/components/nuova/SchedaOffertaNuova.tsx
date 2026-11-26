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

/**
 * La scheda Offerta nuova, sezione per sezione nell'ordine del metodo: si
 * mostra solo quello che Aura ha già scritto. Vale per la pagina del cliente,
 * il tab del team e il PDF (`larga` = due colonne).
 */
export function SchedaOffertaNuova({ o, larga = false }: { o: OffertaNuova; larga?: boolean }) {
  const s = o.scheda ?? {};
  const pr = s.promessa;
  const pres = s.presentazione;
  const blocchi = [
    s.arrivo || s.centro ? (
      <Sezione key="arrivo" titolo="Arrivo e cosa al centro">
        {s.arrivo ? <RigaVoce v={s.arrivo} /> : null}
        {s.centro ? <RigaVoce v={s.centro} /> : null}
      </Sezione>
    ) : null,
    s.come_fanno_tutti || s.versioni?.length ? (
      <Sezione key="mercato-diverso" titolo="Diversa dal mercato">
        {s.come_fanno_tutti ? (
          <div className="grid gap-1">
            <p className="text-[12px] text-muted-foreground">Come fanno tutti</p>
            <RigaVoce v={s.come_fanno_tutti} />
          </div>
        ) : null}
        {s.versioni?.length ? (
          <Tabella
            intestazioni={["Leva", "Versione", "La vogliono?", "La puoi fare oggi?", "È il tuo mestiere?"]}
            righe={s.versioni.map((v) => [ETICHETTA_LEVA[v.leva], v.testo, v.vuole ? "✅" : "❌", v.puo ? "✅" : "❌", v.mestiere ? "✅" : "❌"])}
          />
        ) : null}
        {s.leva ? <p className="text-[14px]">Leva scelta: <strong>{s.leva === "nessuna" ? "nessuna, si riprova più avanti" : ETICHETTA_LEVA[s.leva]}</strong></p> : null}
        {s.da_riprovare ? <p className="text-[13px] text-muted-foreground">Da riprovare più avanti: {s.da_riprovare}</p> : null}
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
    s.dipende_da_te?.length || s.dipende_dal_cliente?.length || pr ? (
      <Sezione key="promessa" titolo="Arrivo e promessa">
        {s.dipende_da_te?.length || s.dipende_dal_cliente?.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid content-start gap-1.5">
              <p className="text-[12px] text-muted-foreground">Dipende da te (si promette con una data)</p>
              {s.dipende_da_te?.map((v, i) => <RigaVoce key={i} v={v} />)}
            </div>
            <div className="grid content-start gap-1.5">
              <p className="text-[12px] text-muted-foreground">Dipende dal tuo cliente (si racconta con i casi)</p>
              {s.dipende_dal_cliente?.map((v, i) => <RigaVoce key={i} v={v} />)}
            </div>
          </div>
        ) : null}
        {pr ? (
          <ul className="grid gap-1.5 text-[14px]">
            {(["sicura", "tagliente", "colpo_di_scena"] as const).map((k) =>
              pr[k] ? (
                <li key={k} className={cn("rounded-md p-2.5", pr.scelta === k ? "bg-primary/10 font-semibold" : "bg-surface")}>
                  <span className="text-[12px] font-normal text-muted-foreground">{k === "colpo_di_scena" ? "Colpo di scena" : k === "sicura" ? "Sicura" : "Tagliente"}{pr.scelta === k ? " · scelta" : ""}</span>
                  <br />
                  {pr[k]}
                </li>
              ) : null,
            )}
          </ul>
        ) : null}
        {pr?.casi ? (
          <div className="grid gap-1">
            <p className="text-[12px] text-muted-foreground">Il risultato, detto dai casi</p>
            <RigaVoce v={pr.casi} />
          </div>
        ) : null}
      </Sezione>
    ) : null,
    s.valore?.length ? (
      <Sezione key="valore" titolo="Il valore">
        <Tabella intestazioni={["Leva", "Voto", "La mossa", ""]} righe={s.valore.map((v) => [ETICHETTA_VALORE[v.leva], `${v.voto}/5`, v.mossa, <BadgeOrigine key="o" o={v.o} />])} />
      </Sezione>
    ) : null,
    s.freni?.length ? (
      <Sezione key="freni" titolo="La mappa dei freni">
        <Tabella
          intestazioni={["Freno", "Quando", "Soluzione", "Come si consegna", "Dove va", ""]}
          righe={s.freni.map((f) => [f.freno, f.momento, f.soluzione, f.consegna, ETICHETTA_POSTO[f.posto], <BadgeOrigine key="o" o={f.o} />])}
        />
      </Sezione>
    ) : null,
    s.gradini?.length || s.ore || s.margine ? (
      <Sezione key="gradini" titolo="Prezzo e gradini">
        {s.gradini?.map((g, i) => (
          <div key={i} className="grid gap-1 rounded-md bg-surface p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[14px] font-semibold">
                {ETICHETTA_GRADINO[g.livello]}
                {g.nome ? ` · ${g.nome}` : ""}
              </p>
              <span className="flex items-center gap-2">
                <span className="figure text-[15px] font-semibold">{g.prezzo}</span>
                <BadgeOrigine o={g.o} />
              </span>
            </div>
            {g.contiene ? <p className="text-[13px]">{g.contiene}</p> : null}
            {g.ragionamento ? <p className="text-[13px] text-muted-foreground">Perché questo prezzo: {g.ragionamento}</p> : null}
          </div>
        ))}
        {s.ore ? <RigaVoce v={s.ore} /> : null}
        {s.margine ? <RigaVoce v={s.margine} /> : null}
      </Sezione>
    ) : null,
    s.bonus?.length || s.garanzia || s.scarsita ? (
      <Sezione key="potenziatori" titolo="Bonus, garanzia, scarsità">
        {s.bonus?.map((b, i) => (
          <div key={i} className="flex items-start gap-2 text-[14px]">
            <p className="min-w-0 flex-1">
              {b.bonus}
              {b.freno ? <span className="text-muted-foreground"> · toglie: {b.freno}</span> : null}
            </p>
            <BadgeOrigine o={b.o} />
          </div>
        ))}
        {s.garanzia ? <RigaVoce v={s.garanzia} /> : null}
        {s.scarsita ? <RigaVoce v={s.scarsita} /> : null}
      </Sezione>
    ) : null,
    pres ? (
      <Sezione key="presenti" titolo="Come la presenti">
        {pres.nomi?.length ? <p className="text-[14px]">Nomi del metodo: {pres.nomi.join(" · ")}</p> : null}
        {(["bio", "video", "chat"] as const).map((k) =>
          pres[k] ? (
            <p key={k} className="text-[14px]">
              <span className="text-[12px] text-muted-foreground">{k === "bio" ? "Da bio" : k === "video" ? "Da video" : "Da chat"}: </span>
              {pres[k]}
            </p>
          ) : null,
        )}
        {pres.obiezioni?.map((x, i) => (
          <div key={i} className="grid gap-0.5 rounded-md bg-surface p-2.5 text-[14px]">
            <p className="font-medium">«{x.a}»</p>
            <p>{x.b}</p>
          </div>
        ))}
      </Sezione>
    ) : null,
    s.da_confermare?.length ? (
      <Sezione key="confermare" titolo="Da confermare">
        <ul className="grid list-disc gap-1 pl-4 text-[14px] marker:text-muted-foreground">
          {s.da_confermare.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </Sezione>
    ) : null,
  ].filter(Boolean);

  if (blocchi.length === 0) return null;
  return <div className={cn("grid gap-6", larga && "lg:grid-cols-2 lg:gap-x-10")}>{blocchi}</div>;
}
