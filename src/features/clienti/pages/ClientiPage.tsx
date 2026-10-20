import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileSignature, Plus, Tags } from "lucide-react";
import { useAccountPersonale, useAuth } from "@/features/auth";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { ErroreCaricamento, SkeletonRighe, StatoVuoto } from "@/shared/components/layout/StatoCaricamento";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { ClientiInAttesa } from "../components/ClientiInAttesa";
import { TabellaClienti } from "../components/TabellaClienti";
import { useClientiInAttesa } from "../hooks/useClientiInAttesa";
import { FASI } from "../fasi";
import { useClienti } from "../hooks/useClienti";

const TUTTE = "tutte";
const VOCI_FASE = [{ value: TUTTE, label: "Tutte le fasi" }, ...FASI.map((f) => ({ value: f.value, label: f.label }))];

export default function ClientiPage() {
  const { utente } = useAuth();
  const eAdmin = utente?.rol === "admin";
  const { data, isLoading, isError } = useClienti();
  const idPersonale = useAccountPersonale().data?.id ?? null;
  // Il conteggio è dei clienti veri: «Wesley ME» resta in lista con il suo badge.
  const numeroClienti = (data ?? []).filter((c) => c.id !== idPersonale).length;
  const inAttesa = useClientiInAttesa();
  const [testo, setTesto] = useState("");
  const [fase, setFase] = useState<string>(TUTTE);

  const righe = useMemo(() => {
    const q = testo.trim().toLowerCase();
    return (data ?? []).filter((c) => {
      if (fase !== TUTTE && c.fase !== fase) return false;
      if (!q) return true;
      return (c.nombre ?? "").toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q);
    });
  }, [data, testo, fase]);

  return (
    <div>
      <PageHeader
        titolo="Clienti"
        sottotitolo={
          data
            ? `${numeroClienti} ${numeroClienti === 1 ? "cliente" : "clienti"} · ordinati per prossima call${inAttesa.data?.length ? ` · ${inAttesa.data.length} in attesa di contratto` : ""}`
            : undefined
        }
        azioni={
          <>
            <Button variant="ghost" size="sm" render={<Link to="/tag" />}>
              <Tags aria-hidden />
              Gestisci tag
            </Button>
            {eAdmin ? (
              <Button variant="outline" size="sm" render={<Link to="/contratti/nuovo?da=clienti" />}>
                <FileSignature aria-hidden />
                Nuovo contratto
              </Button>
            ) : null}
            <Button size="sm" render={<Link to="/clienti/nuovo" />}>
              <Plus aria-hidden />
              Nuovo cliente
            </Button>
          </>
        }
      />

      {/* Telefono: i due filtri a tutta larghezza, uno sotto l'altro. */}
      <div className="mb-4 grid gap-3 sm:flex sm:flex-wrap sm:items-end">
        <div className="grid gap-1">
          <Label htmlFor="filtro-testo">Cerca</Label>
          <Input id="filtro-testo" className="sm:w-64" placeholder="Nome o email" value={testo} onChange={(e) => setTesto(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="filtro-fase">Fase</Label>
          <Select items={VOCI_FASE} value={fase} onValueChange={(v) => setFase(v ?? TUTTE)}>
            <SelectTrigger id="filtro-fase" className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VOCI_FASE.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {inAttesa.data && inAttesa.data.length > 0 && fase === TUTTE ? <ClientiInAttesa righe={inAttesa.data} testo={testo} /> : null}

      {isLoading ? <SkeletonRighe righe={6} /> : null}
      {isError ? <ErroreCaricamento /> : null}
      {data && data.length === 0 ? (
        <StatoVuoto titolo="Nessun cliente ancora" testo="Crea il primo: riceverà email e password per accedere e completare l'onboarding." />
      ) : null}
      {data && data.length > 0 && righe.length === 0 ? <StatoVuoto titolo="Nessun cliente corrisponde ai filtri" /> : null}
      {righe.length > 0 ? <TabellaClienti righe={righe} idPersonale={idPersonale} /> : null}
    </div>
  );
}
