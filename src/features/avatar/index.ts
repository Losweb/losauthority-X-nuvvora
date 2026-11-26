export { CartaAvatar } from "./components/CartaAvatar";
export { DiagnosiAvatar } from "./components/DiagnosiAvatar";
export { DossierAvatar, ElencoDossier, SezioneDossier, TestoDossier } from "./components/DossierAvatar";
export { FlussoAvatar, type MessaggioChat } from "./components/FlussoAvatar";
export { SceltaVista, type VistaMobile } from "./components/SceltaVista";
export { TestoAura } from "./components/TestoAura";
export { useAvatars, useDiagnosiAvatar } from "./hooks/useAvatar";
export { codiceAvatar } from "./types";
export type { Avatar, DiagnosiAvatar as Diagnosi } from "./types";

// Fase Avatar dal 25/11/2026: una mappa per cliente + da una a tre schede.
export { ElencoSchede } from "./components/mappa/ElencoSchede";
export { VetrinaAvatar } from "./components/mappa/VetrinaAvatar";
export { InizioAvatar } from "./components/mappa/InizioAvatar";
export { MappaPonte } from "./components/mappa/MappaPonte";
export { DubbiAvatar, PassiAvatar } from "./components/mappa/PassiAvatar";
export { RicominciaAvatar } from "./components/mappa/RicominciaAvatar";
export { EtichettaOrigine, RigaAvatar, type Correzione } from "./components/mappa/RigaAvatar";
export { SchedaDocumento } from "./components/mappa/SchedaDocumento";
export { chiaviMappa, useFermaMappa, useIniziaMappa, useInviaMappa, useMappaAvatar, useMessaggiMappa, useModificaRiga, useStatoMappa, type MappaConSchede } from "./hooks/useMappaAvatar";
export { FASI_MAPPA, LINK_LEZIONE_AVATAR, contaVere, titoloScheda } from "./mappa";
export type { MappaAvatar, MessaggioMappa, SchedaAvatar } from "./mappa";
