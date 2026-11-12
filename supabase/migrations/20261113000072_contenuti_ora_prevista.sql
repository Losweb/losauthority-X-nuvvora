-- ============================================================================
-- 20261113000072 · Contenuti: orario di pubblicazione previsto
--
-- Nel Workflow si programma non solo il giorno ma anche l'ora (richiesta
-- dell'utente del 13/11/2026). Colonna a parte, facoltativa: la data resta
-- `pubblicazione_prevista` (date), così calendario e raggruppamento per giorno
-- non cambiano. Senza data non c'è ora.
-- ============================================================================

alter table public.contenuti
  add column ora_prevista time;

alter table public.contenuti
  add constraint contenuti_ora_con_data
  check (ora_prevista is null or pubblicazione_prevista is not null);

comment on column public.contenuti.ora_prevista is 'Ora (Europe/Rome) in cui il cliente prevede di pubblicare; facoltativa, solo se c''è pubblicazione_prevista.';
