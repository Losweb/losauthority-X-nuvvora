-- =============================================================================
-- 65 · Ruolo «Staff» ridefinito (17/10/2026, richiesta dell'utente)
--
-- Staff = la vista dell'admin, ridotta: lead e clienti SENZA importi, niente
-- Finance / Contratti / Offerte, e tutto quello che riguarda Skool (Lezioni e
-- Skool Video). I ruoli restano quattro (admin, staff, staff_fatture, cliente):
-- staff_fatture è «Staff + Finance» e vede anche gli importi.
--
-- 1) Skool Video (tabelle; il bucket skool-audio è nel file …067): da solo admin a tutto il team.
-- 2) Il valore dei lead è un importo: chi non è finance lo legge come null
--    (vista `lead_team`, security invoker) e non può scriverlo (trigger).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Skool Video → team
-- ---------------------------------------------------------------------------
alter policy "skool video: admin legge" on public.skool_video rename to "skool video: team legge";
alter policy "skool video: team legge" on public.skool_video
  using ((select private.es_team()));

alter policy "skool video: admin crea" on public.skool_video rename to "skool video: team crea";
alter policy "skool video: team crea" on public.skool_video
  with check ((select private.es_team()) and creato_da = (select auth.uid()));

alter policy "skool video: admin aggiorna" on public.skool_video rename to "skool video: team aggiorna";
alter policy "skool video: team aggiorna" on public.skool_video
  using ((select private.es_team())) with check ((select private.es_team()));

alter policy "skool video: admin cancella" on public.skool_video rename to "skool video: team cancella";
alter policy "skool video: team cancella" on public.skool_video
  using ((select private.es_team()));

alter policy "skool blocchi: admin legge" on public.skool_video_blocchi rename to "skool blocchi: team legge";
alter policy "skool blocchi: team legge" on public.skool_video_blocchi
  using ((select private.es_team()));

alter policy "skool blocchi: admin crea" on public.skool_video_blocchi rename to "skool blocchi: team crea";
alter policy "skool blocchi: team crea" on public.skool_video_blocchi
  with check ((select private.es_team()));

alter policy "skool capitoli: admin legge" on public.skool_video_capitoli rename to "skool capitoli: team legge";
alter policy "skool capitoli: team legge" on public.skool_video_capitoli
  using ((select private.es_team()));

alter policy "skool capitoli: admin aggiorna" on public.skool_video_capitoli rename to "skool capitoli: team aggiorna";
alter policy "skool capitoli: team aggiorna" on public.skool_video_capitoli
  using ((select private.es_team())) with check ((select private.es_team()));

alter policy "skool capitoli: admin cancella" on public.skool_video_capitoli rename to "skool capitoli: team cancella";
alter policy "skool capitoli: team cancella" on public.skool_video_capitoli
  using ((select private.es_team()));

-- Le tre policy del bucket skool-audio (storage.objects) stanno nel file
-- 20261017000067_ruolo_staff_storage.sql: `alter policy` su storage.objects
-- fallisce dal SQL Editor («must be owner of table objects», 20/10/2026),
-- mentre drop + create funzionano (come nella migrazione 57).

-- ---------------------------------------------------------------------------
-- 2) Lead: il valore lo vede e lo scrive solo chi vede gli importi
-- ---------------------------------------------------------------------------
-- Il gestionale legge i lead da questa vista: stesse righe della tabella (la RLS
-- di `lead` vale perché è security invoker), ma `valore` è null per chi non è
-- finance. Le scritture restano sulla tabella.
create or replace view public.lead_team
with (security_invoker = true) as
select
  l.id,
  l.nome,
  l.contatto,
  l.fonte,
  l.stage,
  case when (select private.es_finance()) then l.valore else null end as valore,
  l.note,
  l.prossima_azione,
  l.prossima_azione_il,
  l.cliente_id,
  l.created_at,
  l.updated_at
from public.lead l;

comment on view public.lead_team is
  'I lead come li legge il gestionale: `valore` è visibile solo ad admin e staff_fatture (null per lo staff). Security invoker: vale la RLS di `lead`.';

revoke all on public.lead_team from anon, public;
grant select on public.lead_team to authenticated, service_role;

-- Chi non è finance non può inserire un valore né cambiarlo (dal browser il
-- campo non c'è; questo chiude anche la via diretta via API).
create or replace function private.lead_valore_solo_finance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) = 'service_role' then
    return new;
  end if;
  if (select private.es_finance()) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if coalesce(new.valore, 0) <> 0 then
      raise exception 'lead: il valore lo inserisce solo chi vede gli importi' using errcode = 'check_violation';
    end if;
  elsif new.valore is distinct from old.valore then
    raise exception 'lead: il valore lo modifica solo chi vede gli importi' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke execute on function private.lead_valore_solo_finance() from public, anon, authenticated;

drop trigger if exists lead_valore_solo_finance on public.lead;
create trigger lead_valore_solo_finance
  before insert or update on public.lead
  for each row execute function private.lead_valore_solo_finance();

comment on column public.user_roles.rol is
  'admin = tutto · staff = lead e clienti senza importi + Skool (Lezioni, Skool Video), niente Finance/Contratti · staff_fatture = staff + Finance e importi · cliente = solo la propria area';
