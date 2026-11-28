-- ============================================================================
-- 20261128000088 · Fine programma dei clienti «Los Authority VIP» (28/11/2026)
--
-- Decisione di Wesley: per i clienti già esistenti senza contratto, la fine è
-- «6 mesi dall'inizio». Si toccano solo i clienti con il tag «Los Authority VIP»,
-- con una data di inizio, senza data di fine e senza contratto attivo (quelli con
-- contratto prendono la scadenza dal trigger della migrazione 87).
-- ============================================================================

update public.clienti c
   set data_fine = (c.data_inizio + interval '6 months')::date
 where 'Los Authority VIP' = any (c.tags)
   and c.data_inizio is not null
   and c.data_fine is null
   and not exists (
     select 1 from public.contratti k
      where k.cliente_id = c.id and k.stato = 'attivo'
   );
