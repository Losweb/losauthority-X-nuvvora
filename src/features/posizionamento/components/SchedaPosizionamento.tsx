import type { ReactNode } from "react";
import { LIMITI, type Posizionamento } from "@posizionamento-forma/forma";
import { RigaAvatar, type Correzione } from "@/features/avatar";
import { Dettaglio } from "@/shared/components/layout/Dettaglio";
import { cn } from "@/lib/utils";
import { ProfiloInstagram } from "./ProfiloInstagram";

function Campo({ etichetta, nota, children }: { etichetta: string; nota?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-3">
      <p className="flex items-baseline justify-between gap-3 text-[13px] text-muted-foreground">
        {etichetta}
        {nota ? <span className="text-[12px]">{nota}</span> : null}
      </p>
      {children}
    </div>
  );
}

function Elenco({ righe, percorso, c }: { righe: string[]; percorso: string; c: Correzione }) {
  return (
    <ul className="grid gap-1.5">
      {righe.map((r, i) => (
        <li key={i}>
          <RigaAvatar percorso={`${percorso}.${i}`} valori={[r]} {...c}>
            <p className="flex items-start gap-2 text-[15px] leading-relaxed">
              <span className="mt-[9px] inline-block size-1.5 shrink-0 rounded-full bg-foreground/40" aria-hidden />
              {r}
            </p>
          </RigaAvatar>
        </li>
      ))}
    </ul>
  );
}

/**
 * Il posizionamento (26/11/2026): a sinistra il profilo Instagram come si vedrebbe, a destra
 * le sue righe da correggere; sotto chi sei nel tuo mercato (la frase in vista, il resto al clic).
 * `aperta` (team) apre tutte le righe.
 */
export function SchedaPosizionamento({ p, aperta = false, onModifica, occupato }: { p: Posizionamento; aperta?: boolean } & Correzione) {
  const c: Correzione = { onModifica, occupato };
  const pr = p.profilo;
  const lunghezzaBio = pr?.bio.length ?? 0;
  return (
    <div className="grid gap-8">
      {pr ? (
        <section aria-labelledby="titolo-profilo" className="grid gap-4">
          <h2 id="titolo-profilo" className="text-[18px] font-bold">
            Il tuo profilo Instagram
          </h2>
          <div className="grid items-start gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
            <ProfiloInstagram p={pr} />
            <div className="grid divide-y divide-line rounded-lg border bg-card px-5">
              <Campo etichetta="Nome">
                <RigaAvatar percorso="profilo.nome" valori={[pr.nome]} semplice {...c}>
                  <p className="text-[15px] font-semibold">{pr.nome}</p>
                </RigaAvatar>
              </Campo>
              <Campo etichetta="Nome utente">
                <RigaAvatar percorso="profilo.utente" valori={[pr.utente]} semplice {...c}>
                  <p className="text-[15px]">@{pr.utente}</p>
                </RigaAvatar>
              </Campo>
              <Campo etichetta="Categoria">
                <RigaAvatar percorso="profilo.categoria" valori={[pr.categoria]} semplice {...c}>
                  <p className="text-[15px]">{pr.categoria}</p>
                </RigaAvatar>
              </Campo>
              <Campo etichetta="Bio" nota={<span className={cn(lunghezzaBio > LIMITI.bio && "font-medium text-status-churn")}>{lunghezzaBio}/{LIMITI.bio}</span>}>
                <RigaAvatar percorso="profilo.bio" valori={[pr.bio]} semplice {...c}>
                  <p className="text-[15px] leading-relaxed whitespace-pre-line">{pr.bio}</p>
                </RigaAvatar>
              </Campo>
              <Campo etichetta="Link in bio">
                <RigaAvatar percorso="profilo.link" valori={[pr.link]} semplice {...c}>
                  <p className="text-[15px]">{pr.link}</p>
                </RigaAvatar>
              </Campo>
              {pr.evidenza.length ? (
                <Dettaglio titolo="Storie in evidenza" riassunto={`${pr.evidenza.length} storie`} aperto={aperta}>
                  {pr.evidenza.map((e, i) => (
                    <RigaAvatar key={i} percorso={`profilo.evidenza.${i}`} valori={[e.titolo, e.contiene]} chiavi={["titolo", "contiene"]} etichette={["Titolo", "Cosa ci metti dentro"]} {...c}>
                      <p className="text-[15px] font-semibold">{e.titolo}</p>
                      <p className="text-[15px] leading-relaxed text-muted-foreground">{e.contiene}</p>
                    </RigaAvatar>
                  ))}
                </Dettaglio>
              ) : null}
              {pr.post.length ? (
                <Dettaglio titolo="Post da fissare in cima" riassunto={`${pr.post.length} post`} aperto={aperta}>
                  {pr.post.map((x, i) => (
                    <RigaAvatar key={i} percorso={`profilo.post.${i}`} valori={[x.titolo, x.perche]} chiavi={["titolo", "perche"]} etichette={["Titolo in copertina", "Perché fissarlo"]} {...c}>
                      <p className="text-[15px] font-semibold">{x.titolo}</p>
                      <p className="text-[15px] leading-relaxed text-muted-foreground">{x.perche}</p>
                    </RigaAvatar>
                  ))}
                </Dettaglio>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {p.chi_sei || p.perche_tu || p.cosa_dicono_tutti || p.come_lo_dimostri ? (
        <section aria-labelledby="titolo-chi-sei" className="grid gap-4">
          <h2 id="titolo-chi-sei" className="text-[18px] font-bold">
            Chi sei nel tuo mercato
          </h2>
          <article className="overflow-hidden rounded-lg border bg-card">
            {p.chi_sei ? (
              <div className="p-5">
                <RigaAvatar percorso="chi_sei" valori={[p.chi_sei]} etichette={["Chi sei"]} semplice {...c}>
                  <p className="text-[19px] leading-snug font-semibold">{p.chi_sei}</p>
                </RigaAvatar>
              </div>
            ) : null}
            <div className={cn("grid divide-y divide-line px-5", p.chi_sei && "border-t")}>
              {p.perche_tu?.length ? (
                <Dettaglio titolo="Perché puoi dirlo tu" riassunto={p.perche_tu.length === 1 ? "1 fatto" : `${p.perche_tu.length} fatti`} aperto={aperta}>
                  <Elenco righe={p.perche_tu} percorso="perche_tu" c={c} />
                </Dettaglio>
              ) : null}
              {p.cosa_dicono_tutti?.length ? (
                <Dettaglio titolo="Cosa dicono già tutti" riassunto="da evitare" aperto={aperta}>
                  <Elenco righe={p.cosa_dicono_tutti} percorso="cosa_dicono_tutti" c={c} />
                </Dettaglio>
              ) : null}
              {p.come_lo_dimostri?.length ? (
                <Dettaglio titolo="Come lo dimostri nei contenuti" riassunto={`${p.come_lo_dimostri.length} modi`} aperto={aperta}>
                  <Elenco righe={p.come_lo_dimostri} percorso="come_lo_dimostri" c={c} />
                </Dettaglio>
              ) : null}
            </div>
          </article>
        </section>
      ) : null}
    </div>
  );
}
