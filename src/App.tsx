import { Providers } from "@/app/providers";
import { AppRoutes } from "@/app/routes";
import { AvvisoNuovaVersione } from "@/shared/components/AvvisoNuovaVersione";

export default function App() {
  return (
    <>
      <Providers>
        <AppRoutes />
      </Providers>
      {/* Fuori dai provider e dall'ErrorBoundary: il popup deve vedersi anche sopra una pagina andata in errore. */}
      <AvvisoNuovaVersione />
    </>
  );
}
