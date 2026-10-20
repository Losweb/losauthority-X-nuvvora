import path from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

/** Variabili che Vite scrive nel bundle al momento del build: senza, l'app pubblicata parte in bianco. */
const VARIABILI_BUILD = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"] as const;

/** Librerie in chunk propri: cambiano di rado, così il browser le tiene in cache tra un deploy e l'altro. */
const CHUNK_LIBRERIE: Array<[nome: string, pacchetti: RegExp]> = [
  ["react", /[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run)[\\/]/],
  ["supabase", /[\\/]node_modules[\\/]@supabase[\\/]/],
  ["ui", /[\\/]node_modules[\\/](@base-ui|@floating-ui)[\\/]/],
];

/**
 * Versione di questo build: ora UTC compatta, più il commit quando lo passa Cloudflare (Workers Builds).
 * Finisce nel codice (`__VERSIONE_APP__`) e in /version.json: una scheda aperta da prima di un deploy
 * le confronta e mostra il popup «C'è una nuova versione» (src/shared/components/AvvisoNuovaVersione.tsx).
 * Calcolata una sola volta, così codice e file hanno per forza la stessa stringa.
 */
const VERSIONE_APP = (() => {
  const ora = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const commit = (process.env.WORKERS_CI_COMMIT_SHA ?? "").slice(0, 7);
  return commit ? `${ora}-${commit}` : ora;
})();

/** Scrive /version.json accanto a index.html, solo nel build del browser (public/_headers: mai in cache). */
function fileVersione(): Plugin {
  return {
    name: "losauthority:version-json",
    apply: "build",
    applyToEnvironment: (ambiente) => ambiente.name === "client",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "version.json", source: `${JSON.stringify({ versione: VERSIONE_APP })}\n` });
    },
  };
}

// https://vite.dev/config/
// Vite 6 + @cloudflare/vite-plugin: deploy su Cloudflare Workers con static assets (wrangler.jsonc,
// docs/deploy-cloudflare.md). `npm run dev` e `vite preview` girano nel runtime di Cloudflare.
export default defineConfig(({ command, mode }) => {
  if (command === "build") {
    // Su Cloudflare le variabili arrivano dalle «Build variables», in locale dal .env.
    const env = loadEnv(mode, process.cwd(), "VITE_");
    const mancanti = VARIABILI_BUILD.filter((nome) => !env[nome]);
    if (mancanti.length > 0) {
      // Solo i NOMI delle variabili simili che il build riceve (mai i valori): aiuta a trovare un refuso
      // o una variabile messa tra quelle di runtime del Worker invece che tra quelle del build.
      const simili = Object.keys(process.env).filter((k) => /vite|supabase/i.test(k));
      throw new Error(
        `Mancano ${mancanti.join(" e ")}: senza queste variabili l'app pubblicata sarebbe una pagina bianca. ` +
          `Variabili simili ricevute dal build: ${simili.length > 0 ? simili.map((k) => JSON.stringify(k)).join(", ") : "nessuna"}.`,
      );
    }
  }
  return {
    plugins: [react(), tailwindcss(), cloudflare(), fileVersione()],
    define: { __VERSIONE_APP__: JSON.stringify(VERSIONE_APP) },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        // Logica pura del modulo contratti (testi, composizione, validazione, PDF): una sola copia,
        // usata dal browser e dalle Edge Functions (per questo vive sotto supabase/functions/_shared).
        "@contratti": path.resolve(__dirname, "./supabase/functions/_shared/contratti"),
        // Definizione dell'onboarding v3 (domande, condizioni, parole): stessa idea.
        "@onboarding": path.resolve(__dirname, "./supabase/functions/_shared/onboarding"),
        // Pagine dell'area cliente a cui un sotto-compito rimanda («Fallo qui»): la lista la usa anche aura-compiti.
        "@area": path.resolve(__dirname, "./supabase/functions/_shared/area"),
      },
    },
    // ffmpeg.wasm (pagina Skool Video): il pre-bundle di Vite romperebbe il worker del pacchetto.
    optimizeDeps: { exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"] },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            return CHUNK_LIBRERIE.find(([, pacchetti]) => pacchetti.test(id))?.[0];
          },
        },
      },
    },
  };
});
