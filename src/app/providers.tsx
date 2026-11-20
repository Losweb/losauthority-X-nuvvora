import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/features/auth";
import { Toaster } from "@/shared/components/ui/sonner";
import { ErrorBoundary } from "@/shared/components/layout/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { useStampaChiara } from "@/shared/hooks/useStampaChiara";

export function Providers({ children }: { children: ReactNode }) {
  useStampaChiara();
  return (
    <ErrorBoundary>
      {/* Tema chiaro di serie; l'interruttore nella card utente passa allo scuro e la scelta resta nel browser. */}
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="losauthority:tema" disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
