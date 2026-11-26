-- ============================================================================
-- 20261126000078 · Catalogo Skool ogni settimana (26/11/2026)
--
-- Wesley Coach sceglie le lezioni dal catalogo `lezioni`, che si aggiornava solo
-- il primo del mese: un corso caricato su Skool dopo il 1/11 il coach non lo
-- conosceva fino a dicembre. Ora ogni lunedì alle 4:00 (UTC).
-- Le live pubblicate dal gestionale entrano subito (skool-pubblica): questo serve
-- per tutto quello che Wesley carica a mano su Skool.
-- ============================================================================

select cron.unschedule('skool-lezioni') where exists (select 1 from cron.job where jobname = 'skool-lezioni');
select cron.schedule('skool-lezioni', '0 4 * * 1', $$select private.chiama_edge_function('skool-lezioni')$$);
