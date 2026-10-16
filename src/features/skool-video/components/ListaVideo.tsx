import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { StatoVuoto } from "@/shared/components/layout/StatoCaricamento";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { formatRelative } from "@/shared/utils/formatDate";
import { durataLeggibile, type SkoolVideo } from "../types";
import { StatoVideoBadge } from "./StatoVideoBadge";

function dove(v: SkoolVideo): string {
  return v.cartella_titolo ? `${v.corso_titolo} › ${v.cartella_titolo}` : v.corso_titolo;
}

function LinkSkool({ v }: { v: SkoolVideo }) {
  if (!v.skool_url) return null;
  return (
    <a
      href={v.skool_url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      Apri su Skool <ExternalLink className="size-3.5" aria-hidden="true" />
    </a>
  );
}

/** I video caricati: tabella da md in su, carte sul telefono. Ogni riga apre il dettaglio. */
export function ListaVideo({ video }: { video: SkoolVideo[] }) {
  if (video.length === 0) {
    return <StatoVuoto titolo="Nessun video ancora" testo="Carica il primo video: Aura lo trascrive, scrive il testo e lo pubblica su Skool." />;
  }
  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Video</TableHead>
              <TableHead>Dove va</TableHead>
              <TableHead className="text-right">Durata</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Caricato</TableHead>
              <TableHead className="text-right">Skool</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {video.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="max-w-[28rem]">
                  <Link to={`/skool-video/${v.id}`} className="font-medium underline-offset-4 hover:underline">
                    {v.titolo}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{dove(v)}</TableCell>
                <TableCell className="text-right tabular-nums">{durataLeggibile(v.durata_sec)}</TableCell>
                <TableCell>
                  <StatoVideoBadge stato={v.stato} />
                </TableCell>
                <TableCell className="text-muted-foreground">{formatRelative(v.created_at)}</TableCell>
                <TableCell className="text-right">
                  <LinkSkool v={v} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="grid gap-3 md:hidden">
        {video.map((v) => (
          <li key={v.id} className="rounded-lg border bg-card p-4">
            <Link to={`/skool-video/${v.id}`} className="block">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium leading-snug">{v.titolo}</p>
                <StatoVideoBadge stato={v.stato} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{dove(v)}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {durataLeggibile(v.durata_sec)} · {formatRelative(v.created_at)}
              </p>
            </Link>
            <div className="mt-2">
              <LinkSkool v={v} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
