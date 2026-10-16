import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logDev, MESSAGGIO_ERRORE_GENERICO } from "@/shared/utils/errors";
import { ErroreAudio, estraiAudio } from "../audio/estraiAudio";
import { BUCKET_AUDIO, type CartellaSkool, type CorsoSkool } from "../types";
import { chiaviSkoolVideo, eliminaAudio } from "./useSkoolVideo";

export type FaseCaricamento =
  | { fase: "fermo" }
  | { fase: "motore" }
  | { fase: "estrazione"; percento: number }
  | { fase: "caricamento"; fatti: number; totale: number }
  | { fase: "fatto"; id: string }
  | { fase: "errore"; messaggio: string };

export interface DatiNuovoVideo {
  file: File;
  titolo: string;
  corso: CorsoSkool;
  cartella: CartellaSkool | null;
  utenteId: string;
}

/**
 * Il flusso «Nuovo video»: audio estratto nel browser → riga `skool_video` →
 * blocchi nel bucket → righe `skool_video_blocchi` → stato `trascrizione`
 * (da lì lavorano le Edge Function). Se qualcosa si rompe a metà, la riga e i
 * blocchi caricati si cancellano: non restano video a metà.
 */
export function useCaricaVideo() {
  const qc = useQueryClient();
  const [fase, setFase] = useState<FaseCaricamento>({ fase: "fermo" });

  const carica = useCallback(
    async (d: DatiNuovoVideo): Promise<string | null> => {
      let videoId: string | null = null;
      try {
        const audio = await estraiAudio(d.file, (a) => setFase(a));
        setFase({ fase: "caricamento", fatti: 0, totale: audio.blocchi.length });

        const { data: riga, error } = await supabase
          .from("skool_video")
          .insert({
            titolo: d.titolo,
            corso_id: d.corso.id,
            corso_nome: d.corso.name,
            corso_titolo: d.corso.titolo,
            cartella_id: d.cartella?.id ?? null,
            cartella_titolo: d.cartella?.titolo ?? null,
            nome_file: d.file.name.slice(0, 300),
            dimensione_byte: d.file.size,
            durata_sec: audio.durataSec,
            blocchi: audio.blocchi.length,
            creato_da: d.utenteId,
          })
          .select("id")
          .single();
        if (error || !riga) throw error ?? new Error("riga non creata");
        videoId = riga.id;

        for (const b of audio.blocchi) {
          const path = `${videoId}/${String(b.indice).padStart(3, "0")}.mp3`;
          const { error: eUp } = await supabase.storage.from(BUCKET_AUDIO).upload(path, b.file, { contentType: "audio/mpeg", upsert: true });
          if (eUp) throw eUp;
          const { error: eRiga } = await supabase
            .from("skool_video_blocchi")
            .insert({ video_id: videoId, indice: b.indice, inizio_sec: b.inizioSec, durata_sec: b.durataSec, storage_path: path });
          if (eRiga) throw eRiga;
          setFase({ fase: "caricamento", fatti: b.indice + 1, totale: audio.blocchi.length });
        }

        const { error: eStato } = await supabase.from("skool_video").update({ stato: "trascrizione" }).eq("id", videoId);
        if (eStato) throw eStato;
        setFase({ fase: "fatto", id: videoId });
        void qc.invalidateQueries({ queryKey: chiaviSkoolVideo.elenco });
        return videoId;
      } catch (err) {
        logDev(err);
        if (videoId) {
          await eliminaAudio(videoId).catch(() => undefined);
          await supabase.from("skool_video").delete().eq("id", videoId);
        }
        const messaggio = err instanceof ErroreAudio ? err.message : MESSAGGIO_ERRORE_GENERICO;
        setFase({ fase: "errore", messaggio });
        return null;
      }
    },
    [qc],
  );

  const azzera = useCallback(() => setFase({ fase: "fermo" }), []);
  const inCorso = fase.fase === "motore" || fase.fase === "estrazione" || fase.fase === "caricamento";
  return { fase, inCorso, carica, azzera };
}
