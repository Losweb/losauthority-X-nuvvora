-- ============================================================================
-- 20261108000069 · Contenuti: descrizione
--
-- `descrizione`: testo libero sul video, distinto dallo script (di cosa parla,
-- contesto, cosa mostrare, didascalia). Nel popup del Workflow sta sotto lo
-- script. Richiesta dell'utente dell'08/11/2026.
-- ============================================================================

alter table public.contenuti
  add column descrizione text check (descrizione is null or length(descrizione) <= 5000);

comment on column public.contenuti.descrizione is 'Testo libero sul video, diverso dallo script (contesto, cosa mostrare, didascalia).';
