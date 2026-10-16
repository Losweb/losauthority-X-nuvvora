-- ============================================================================
-- 20261016000060 — Benvenuto dell'area cliente (16/10/2026)
-- ----------------------------------------------------------------------------
-- Richiesta dell'utente: al primo accesso il cliente vede, PRIMA dell'onboarding,
-- una schermata di benvenuto a passi (route /area/benvenuto, fuori dalle shell):
--   1. il video di benvenuto (per ora una carta segnaposto) + «Continua»;
--   2. i requisiti da accettare: le tre caselle dei documenti della sezione
--      Clienti (crm_versioni/documenti_legali), ognuna con il bottone che apre
--      il documento; l'accettazione passa da crm_accetta come in /area/clienti,
--      così la sezione Clienti non la richiede più;
--   3. il profilo Instagram: parte subito instagram-sync in background, così la
--      pagina Pubblicazioni è già piena quando il cliente ci arriva;
--   4. transizione → /area/onboarding.
-- `benvenuto_il` segna che il giro è stato fatto (su qualsiasi dispositivo).
-- Lo scrive il cliente stesso: la riga è sua e in bozza (policy di update), e il
-- trigger onboarding_transizioni non la blocca perché non è una colonna di Aura.
-- ============================================================================
alter table public.data_onboarding add column if not exists benvenuto_il timestamptz;
comment on column public.data_onboarding.benvenuto_il is
  'Quando il cliente ha completato la schermata di benvenuto (video, requisiti, Instagram). Null = da mostrare al prossimo accesso prima dell''onboarding.';
