export { CartaOfferta } from "./components/CartaOfferta";
export { DiagnosiOfferta } from "./components/DiagnosiOfferta";
export { StrutturaOfferta } from "./components/StrutturaOfferta";
export { chiaviOfferta, useDiagnosiOfferta, useMessaggiOfferta, useOfferta, useOfferte } from "./hooks/useOfferta";
export { campiCompilati, codiceOfferta, ETICHETTA_POSIZIONAMENTO, FASI_OFFERTA, haStruttura, sezioniOfferta } from "./types";
export type { DiagnosiOfferta as DiagnosiOffertaRiga, MessaggioOfferta, Offerta } from "./types";

// Fase Offerta dal 26/11/2026: una offerta per cliente, due strade.
export { AvvisiOfferta, OffertaDiPrima, RicominciaOfferta } from "./components/nuova/AvvisiOfferta";
export { BadgeOrigine, FermoOfferta, FraseOfferta, PassiOfferta } from "./components/nuova/PezziBase";
export { SchedaOffertaNuova } from "./components/nuova/SchedaOffertaNuova";
export { chiaveOffertaCliente, useIniziaOfferta, useInviaOffertaCliente, useOffertaCliente, useRicominciaOfferta } from "./hooks/useOffertaCliente";
export { asNuova, FASI_AURA_OFFERTA, haOffertaDiPrima, schedaIniziata } from "./nuova";
export type { OffertaNuova } from "./nuova";

/** Vista di stampa (fuori dalle shell): si apre in una scheda nuova e propone "Salva come PDF". */
export const linkPdfOfferta = (id: string) => `/stampa/offerta/${id}`;
