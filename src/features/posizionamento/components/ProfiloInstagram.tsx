import { ChevronDown, Link2, Pin } from "lucide-react";
import type { Profilo } from "@posizionamento-forma/forma";

/** Le iniziali per la foto profilo finta («Giulia Rossi | Psicologa» → «GR»). */
const iniziali = (nome: string) =>
  nome
    .split("|")[0]
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

/**
 * Come si vedrebbe il profilo Instagram (26/11/2026, richiesta di Wesley). È un'anteprima:
 * sempre chiara come l'app, anche col tema scuro del sito. Niente numeri di follower inventati.
 */
export function ProfiloInstagram({ p }: { p: Profilo }) {
  return (
    <figure aria-label="Anteprima del profilo Instagram" className="mx-auto w-full max-w-[400px] overflow-hidden rounded-[28px] border border-neutral-200 bg-white text-neutral-900 shadow-md">
      <div className="flex items-center justify-center gap-1 border-b border-neutral-100 px-4 py-3 text-[15px] font-semibold">
        {p.utente || "nomeutente"} <ChevronDown className="size-4" aria-hidden />
      </div>
      <div className="grid gap-3 px-4 pt-4 pb-3">
        <div className="flex items-center gap-4">
          <span className="grid size-[76px] shrink-0 place-items-center rounded-full bg-[conic-gradient(from_200deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5,#feda75)] p-[3px]">
            <span className="grid size-full place-items-center rounded-full border-[3px] border-white bg-neutral-200 text-[22px] font-semibold text-neutral-600">{iniziali(p.nome) || "?"}</span>
          </span>
          <div className="grid min-w-0 gap-0.5">
            <p className="text-[15px] leading-snug font-semibold break-words">{p.nome}</p>
            {p.categoria ? <p className="text-[13px] text-neutral-500">{p.categoria}</p> : null}
          </div>
        </div>
        {p.bio ? <p className="text-[14px] leading-snug whitespace-pre-line">{p.bio}</p> : null}
        {p.link ? (
          <p className="flex items-center gap-1 text-[14px] font-semibold text-[#00376B]">
            <Link2 className="size-4 shrink-0 -rotate-45" aria-hidden /> {p.link}
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <span className="rounded-lg bg-[#0095F6] py-1.5 text-center text-[14px] font-semibold text-white">Segui</span>
          <span className="rounded-lg bg-neutral-100 py-1.5 text-center text-[14px] font-semibold">Messaggio</span>
        </div>
      </div>
      {p.evidenza.length ? (
        <ul aria-label="Storie in evidenza" className="flex gap-4 overflow-x-auto px-4 pt-1 pb-4 [scrollbar-width:none]">
          {p.evidenza.map((e, i) => (
            <li key={i} className="grid w-[68px] shrink-0 justify-items-center gap-1">
              <span className="grid size-[60px] place-items-center rounded-full border border-neutral-300 p-[3px]">
                <span className="grid size-full place-items-center rounded-full bg-neutral-100 text-[24px] leading-none" aria-hidden>
                  {e.icona || e.titolo.slice(0, 1).toUpperCase()}
                </span>
              </span>
              <span className="w-full truncate text-center text-[12px]">{e.titolo}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {p.post.length ? (
        <ul aria-label="Post fissati" className="grid grid-cols-3 gap-0.5 border-t border-neutral-100">
          {p.post.map((x, i) => (
            <li key={i} className="relative grid aspect-[4/5] place-items-center bg-neutral-900 p-2.5 text-center">
              <Pin className="absolute top-2 right-2 size-3.5 rotate-45 fill-white text-white" aria-label="Fissato" />
              <span className="line-clamp-5 text-[12px] leading-tight font-semibold text-white">{x.titolo}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}
