-- ============================================================================
-- 0055 · Via la «Ricerca idee social» (TikTok) (11/10/2026)
--
-- Decisione dell'utente: la ricerca non era efficiente e al suo posto arriverà
-- una pagina nuova («Mappa Idee», da definire). Si tolgono le tabelle, le
-- funzioni, la colonna `idee_messaggi.ricerca_id` e la pagina `ricerca_tiktok`
-- del «Fallo qui» dei compiti. I contenuti del Workflow nati da una ricerca
-- restano (non avevano un legame con le tabelle, solo il link nei riferimenti).
-- La Edge Function `ricerca-tiktok` va cancellata a mano dal dashboard.
-- ============================================================================

-- I sotto-compiti che rimandavano alla ricerca ora rimandano a Crea idee.
update public.compiti set pagina = 'crea_idee' where pagina = 'ricerca_tiktok';

alter table public.compiti drop constraint compiti_check2;
alter table public.compiti add constraint compiti_check2 check (
  pagina is null or (
    padre_id is not null and pagina = any (array[
      'avatar', 'offerta', 'concorrenti', 'kit_brand', 'crea_idee',
      'stili', 'workflow', 'pubblicazioni', 'clienti', 'coach'
    ])
  )
);

drop index if exists public.idee_messaggi_ricerca_idx;
alter table public.idee_messaggi drop column if exists ricerca_id;

drop table if exists public.ricerche_tiktok_video;
drop table if exists public.ricerche_tiktok;

drop function if exists private.ricerche_tiktok_quota();
drop function if exists private.e_mia_ricerca(uuid);
