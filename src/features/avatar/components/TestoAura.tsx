/**
 * Il testo di una risposta di Aura. Le righe che iniziano con «|» sono una
 * tabella (la fase Avatar le usa per l'analisi: mestieri e quattro criteri) e
 * si disegnano come tabella vera; il resto resta testo con gli a capo.
 */
type Blocco = { tipo: "testo"; testo: string } | { tipo: "tabella"; righe: string[][] };

const eRigaTabella = (r: string) => r.trim().startsWith("|");
const eSeparatore = (r: string) => /^\|?[\s:|-]+\|?$/.test(r.trim()) && r.includes("-");
const celle = (r: string) =>
  r
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());

function blocchiTesto(testo: string): Blocco[] {
  const out: Blocco[] = [];
  for (const riga of testo.split("\n")) {
    const ultimo = out.at(-1);
    if (eRigaTabella(riga)) {
      if (eSeparatore(riga)) continue;
      if (ultimo?.tipo === "tabella") ultimo.righe.push(celle(riga));
      else out.push({ tipo: "tabella", righe: [celle(riga)] });
    } else if (ultimo?.tipo === "testo") ultimo.testo += `\n${riga}`;
    else out.push({ tipo: "testo", testo: riga });
  }
  return out.map((b) => (b.tipo === "testo" ? { ...b, testo: b.testo.replace(/^\n+|\n+$/g, "") } : b)).filter((b) => b.tipo === "tabella" || b.testo);
}

export function TestoAura({ testo }: { testo: string }) {
  return (
    <div className="grid gap-3">
      {blocchiTesto(testo).map((b, i) =>
        b.tipo === "testo" ? (
          <p key={i} className="text-[15px] leading-relaxed whitespace-pre-wrap text-foreground">
            {b.testo}
          </p>
        ) : (
          <div key={i} className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[420px] border-collapse text-left text-[14px] leading-snug">
              <thead className="bg-surface">
                <tr>
                  {b.righe[0].map((c, j) => (
                    <th key={j} scope="col" className="border-b border-line px-3 py-2 text-[12px] font-semibold text-muted-foreground">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.righe.slice(1).map((r, k) => (
                  <tr key={k} className="border-b border-line last:border-b-0">
                    {r.map((c, j) => (
                      <td key={j} className="px-3 py-2 align-top">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      )}
    </div>
  );
}
