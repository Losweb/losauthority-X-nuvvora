-- ============================================================================
-- 20261126000079 · Fermo il giro automatico di Instagram (26/11/2026)
--
-- Decisione di Wesley: «fermiamo la parte di instagram per ora». Si toglie solo il
-- cron di ogni mattina (05:00 UTC) che rileggeva profili, numeri e follower via Apify.
-- Restano la Edge Function `instagram-sync`, i dati già letti e le chiamate a mano
-- (prima lettura dopo l'onboarding, «Aggiorna adesso» del team).
-- Per riaccenderlo:
--   select cron.schedule('instagram-sync', '0 5 * * *', $$select private.chiama_edge_function('instagram-sync')$$);
-- ============================================================================

select cron.unschedule('instagram-sync') where exists (select 1 from cron.job where jobname = 'instagram-sync');
