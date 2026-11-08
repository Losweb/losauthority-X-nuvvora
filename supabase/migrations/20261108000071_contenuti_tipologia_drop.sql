-- ============================================================================
-- 20261108000071 · contenuti: via la colonna `tipologia` (testo fisso)
--
-- Sostituita da `tipologia_id` (migrazione 70, che ha già travasato i valori).
-- DDL distruttivo: il MCP lo rifiuta, va eseguito nel SQL Editor.
-- ============================================================================

alter table public.contenuti drop column if exists tipologia;
