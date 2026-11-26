-- ============================================================================
-- 20261126000077 · Via Concorrenti e Marca (26/11/2026)
--
-- Decisione di Wesley: «toglierei concorrenti e marca, non serve; aggiungerei il
-- posizionamento». Scelta «cancellale del tutto»: si tolgono pagine, tabelle e
-- dati. Al 26/11/2026 c'erano 1 concorrente con 3 video, nessun kit brand e 3 file
-- rimasti nel bucket `kit-brand`.
-- Da fare a mano, fuori da questa migrazione:
--   - svuotare e cancellare il bucket `kit-brand` (Storage non permette di
--     cancellare i file da SQL);
--   - cancellare la Edge Function `kit-brand-leggi`.
-- I sotto-compiti che rimandavano a Concorrenti o Marca ora rimandano al Posizionamento.
-- Stessa decisione per la pagina Numeri (/area/pubblicazioni): tolta dall'area cliente.
-- I dati di Instagram restano (li usano l'onboarding e il team).
-- ============================================================================

-- Il cron che rileggeva i documenti della Marca.
select cron.unschedule('kit-brand-leggi') where exists (select 1 from cron.job where jobname = 'kit-brand-leggi');

update public.compiti set pagina = 'posizionamento' where pagina in ('concorrenti', 'kit_brand');
-- Tolta anche la pagina Numeri (/area/pubblicazioni): i sotto-compiti che ci rimandavano restano senza «Fallo qui».
update public.compiti set pagina = null where pagina = 'pubblicazioni';

alter table public.compiti drop constraint compiti_check2;
alter table public.compiti add constraint compiti_check2 check (
  pagina is null or (
    padre_id is not null and pagina = any (array[
      'avatar', 'offerta', 'posizionamento', 'crea_idee',
      'stili', 'workflow', 'clienti', 'coach'
    ])
  )
);

drop table if exists public.concorrenti_video cascade;
drop table if exists public.concorrenti cascade;
drop table if exists public.kit_brand_documenti cascade;
drop table if exists public.kit_brand_font cascade;
drop table if exists public.kit_brand_colori cascade;
drop table if exists public.kit_brand cascade;

-- Le regole di accesso del bucket (il bucket si svuota e si cancella a mano).
drop policy if exists "storage kit-brand: lettura propria o team" on storage.objects;
drop policy if exists "storage kit-brand: cliente carica nella sua cartella" on storage.objects;
drop policy if exists "storage kit-brand: cliente elimina nella sua cartella" on storage.objects;

-- Le funzioni che servivano solo a queste tabelle.
drop function if exists public.salva_concorrente(uuid, text, text, text[], text, text[], text[]);
drop function if exists public.salva_concorrente(uuid, text, text[], text, text[], text[]);
drop function if exists private.e_mio_concorrente(uuid);
drop function if exists private.concorrenti_limiti();
drop function if exists private.solo_link(text[]);
drop function if exists private.kit_brand_limiti();
drop function if exists private.kit_brand_documenti_solo_aura();
