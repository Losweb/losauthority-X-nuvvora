import { haDossier, type Avatar } from "../types";
import { CartaAvatar } from "./CartaAvatar";

interface CartaGirevoleProps {
  avatar: Avatar;
  numero: number;
  titolare: string;
  inCompilazione: boolean;
  /** «Gira per il dossier»: la pagina mostra il dossier al posto di chat e carta (DossierPagina). */
  onApriDossier: () => void;
}

/**
 * Il fronte della carta nella colonna di destra. Dal 16/10/2026 il retro non
 * gira più qui dentro (stava stretto): «Gira per il dossier» lo apre nell'area
 * dei contenuti, a tutta larghezza, e la pagina decide quando tornare.
 */
export function CartaGirevole({ avatar, numero, titolare, inCompilazione, onApriDossier }: CartaGirevoleProps) {
  return (
    <div className="marmo-carta-gira">
      <CartaAvatar avatar={avatar} numero={numero} titolare={titolare} inCompilazione={inCompilazione} onGira={onApriDossier} dossierPronto={haDossier(avatar)} />
    </div>
  );
}
