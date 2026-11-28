-- ============================================================================
-- 20261128000086 · Crediti di Aura: si torna a 500 al mese (28/11/2026)
--
-- Wesley: «lascia comunque 500 crediti, vediamo quanto consumano». La 084 aveva
-- portato la base a 1000 per il passaggio di Crea idee a Opus; si resta a 500 e si
-- guardano i consumi veri (aura_consumi). Il team aggiunge crediti a chi ne ha bisogno.
-- ============================================================================

create or replace function public.aura_crediti_stato(p_user uuid default null)
returns table (limite integer, usati integer, residui integer, ricarica date, illimitato boolean)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  u uuid := coalesce(p_user, auth.uid());
  m date := private.aura_mese_corrente();
begin
  if u is null then raise exception 'Non autorizzato'; end if;
  if coalesce(auth.role(), '') <> 'service_role' and u is distinct from auth.uid() and not private.es_team() then
    raise exception 'Non autorizzato';
  end if;
  return query
  with b as (
    select (500 + coalesce((select sum(e.crediti) from public.aura_crediti_extra e where e.user_id = u and e.mese = m), 0))::integer as lim
  ), c as (
    select coalesce(ceil(sum(private.aura_costo_centesimi(a.modello, a.input_tokens, a.cache_lettura_tokens, a.cache_scrittura_tokens, a.output_tokens))), 0)::integer as us
    from public.aura_consumi a
    where a.user_id = u
      and a.created_at >= (m::timestamp at time zone 'Europe/Rome')
      and a.funzione not like '%~confronto'
  )
  select b.lim, c.us, greatest(b.lim - c.us, 0), (m + interval '1 month')::date,
         exists (select 1 from public.user_roles r where r.id = u and r.rol in ('admin', 'staff', 'staff_fatture'))
           or exists (select 1 from public.clienti k where k.id = u and k.account_personale)
  from b, c;
end;
$$;
