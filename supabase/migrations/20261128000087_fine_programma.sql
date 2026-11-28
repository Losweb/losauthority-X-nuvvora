-- ============================================================================
-- 20261128000087 · Data di fine del programma + promemoria Telegram (28/11/2026)
--
-- Wesley vede l'inizio del percorso (`clienti.data_inizio`, campo della scheda che
-- `contratti-admin` compila all'attivazione) ma non la fine. Da qui:
--   1. `clienti.data_fine`: fine del programma. Per chi ha un contratto attivo è la
--      sua scadenza (`contratti.scade_il` = attivazione + `durata_mesi`, es. UPSCALE 6
--      mesi), copiata dal trigger qui sotto; per gli altri la scrive il team nella
--      scheda (Impostazioni → Dati cliente).
--   2. `clienti.scadenza_avvisata`: la data di fine per cui il team ha già ricevuto il
--      promemoria. Il promemoria parte di nuovo solo se la fine cambia (es. rinnovo).
--   3. `scadenze_programmi_da_avvisare(giorni)`: prende (e segna) i clienti che
--      finiscono entro N giorni e non sono ancora stati avvisati per quella data.
--      Usata dalla Edge Function `scadenze-programmi` (solo service role).
--   4. Cron `scadenze-programmi` ogni giorno alle 07:10 UTC.
-- I clienti già esistenti SENZA contratto restano senza data di fine finché Wesley non
-- conferma come ricavarla (nessun dato inventato qui).
-- ============================================================================

-- 1) Colonne ------------------------------------------------------------------
alter table public.clienti
  add column if not exists data_fine date,
  add column if not exists scadenza_avvisata date;

alter table public.clienti drop constraint if exists clienti_fine_dopo_inizio;
alter table public.clienti
  add constraint clienti_fine_dopo_inizio
  check (data_fine is null or data_inizio is null or data_fine > data_inizio);

comment on column public.clienti.data_fine is
  'Fine del programma. Dal contratto attivo (scade_il) via trigger, oppure scritta dal team.';
comment on column public.clienti.scadenza_avvisata is
  'data_fine per cui è già partito il promemoria Telegram (30 giorni prima). La scrive solo scadenze-programmi.';

-- 2) Il contratto attivo porta la sua scadenza nella scheda ------------------------
create or replace function private.contratti_fine_programma()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.stato = 'attivo' and new.cliente_id is not null and new.scade_il is not null then
    update public.clienti
       set data_fine = new.scade_il
     where id = new.cliente_id
       and data_fine is distinct from new.scade_il;
  end if;
  return null;
end;
$$;
revoke execute on function private.contratti_fine_programma() from public, anon, authenticated;

drop trigger if exists contratti_fine_programma on public.contratti;
create trigger contratti_fine_programma
  after insert or update of stato, scade_il, cliente_id on public.contratti
  for each row execute function private.contratti_fine_programma();

-- Clienti che hanno già un contratto attivo: la fine è la scadenza del contratto.
update public.clienti c
   set data_fine = k.scade_il
  from (
    select distinct on (cliente_id) cliente_id, scade_il
      from public.contratti
     where stato = 'attivo' and cliente_id is not null and scade_il is not null
     order by cliente_id, attivato_il desc nulls last
  ) k
 where c.id = k.cliente_id
   and c.data_fine is distinct from k.scade_il;

-- 3) vista_clienti con la fine in coda (stessa definizione della migrazione 29) ------
create or replace view public.vista_clienti
with (security_invoker = true) as
select c.id, u.nombre, u.email, c.fase, c.stato_onboarding, c.data_inizio, c.prossima_call, c.prossima_call_source,
  c.telefono, c.instagram, c.tiktok, c.notion_hub_url, c.hub_creato_il, c.created_at,
  r.totali as fatture_totali, r.da_pagare as fatture_da_pagare, r.prossima_scadenza as fatture_prossima_scadenza,
  hc.call_corrente, hc.fatti, hc.totale, hc.in_corso, hc.di_wesley_aperti,
  c.tags as tag_labels,
  c.da_attivare,
  l.nodo_centrale,
  l.fase_economica,
  c.data_fine
from public.clienti c
join public.user_roles u on u.id = c.id
left join lateral (select * from private.fatture_riepilogo(c.id)) r on true
left join lateral (
  select b.call_n as call_corrente,
    count(*) filter (where k.stato = 'done')::integer as fatti,
    count(*)::integer as totale,
    count(*) filter (where k.stato = 'in_progress')::integer as in_corso,
    count(*) filter (where k.assegnato_a = 'wesley' and k.stato <> 'done')::integer as di_wesley_aperti,
    count(*) filter (where k.stato <> 'done') as aperti
  from public.hub_board b
  join public.hub_compiti k on k.board_id = b.id
  where b.cliente_id = c.id and b.call_n between 1 and 4
  group by b.call_n
  order by (count(*) filter (where k.stato <> 'done') > 0) desc,
    (case when count(*) filter (where k.stato <> 'done') > 0 then b.call_n else -b.call_n end)
  limit 1
) hc on true
left join public.onboarding_lettura l on l.id = c.id
where u.rol = 'cliente';

-- 4) Chi avvisare: prende e segna in un colpo solo (niente doppioni) --------------
-- Finestra: da oggi (ora italiana) a oggi + p_giorni. Esclusi l'account personale di
-- Wesley e le fini già passate. Se Telegram non parte, la funzione rimette
-- scadenza_avvisata a null e il giorno dopo ci riprova.
create or replace function public.scadenze_programmi_da_avvisare(p_giorni integer default 30)
returns table (id uuid, nome text, email text, data_inizio date, data_fine date, programma text)
language plpgsql
set search_path = ''
as $$
declare
  v_oggi date := (now() at time zone 'Europe/Rome')::date;
begin
  return query
  with da as (
    select c.id
      from public.clienti c
      join public.user_roles u on u.id = c.id
     where u.rol = 'cliente'
       and not c.account_personale
       and c.data_fine is not null
       and c.data_fine between v_oggi and v_oggi + p_giorni
       and c.scadenza_avvisata is distinct from c.data_fine
     for update of c skip locked
  ), segnati as (
    update public.clienti c
       set scadenza_avvisata = c.data_fine
      from da
     where c.id = da.id
    returning c.id, c.data_inizio, c.data_fine
  )
  select s.id, u.nombre, u.email, s.data_inizio, s.data_fine,
    (select k.programma from public.contratti k
      where k.cliente_id = s.id and k.stato = 'attivo'
      order by k.attivato_il desc nulls last limit 1)
    from segnati s
    join public.user_roles u on u.id = s.id
   order by s.data_fine;
end;
$$;
revoke execute on function public.scadenze_programmi_da_avvisare(integer) from public, anon, authenticated;
grant execute on function public.scadenze_programmi_da_avvisare(integer) to service_role;

-- 5) Cron ogni giorno (07:10 UTC = 8:10 d'inverno, 9:10 d'estate in Italia) --------
select cron.unschedule('scadenze-programmi') where exists (select 1 from cron.job where jobname = 'scadenze-programmi');
select cron.schedule('scadenze-programmi', '10 7 * * *', $$select private.chiama_edge_function('scadenze-programmi')$$);
