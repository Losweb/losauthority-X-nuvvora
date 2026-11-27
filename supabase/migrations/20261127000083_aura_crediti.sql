-- ============================================================================
-- 20261127000083 · Crediti di Aura al mese per cliente (27/11/2026)
--
-- Wesley: «possiamo dare dei crediti al mese agli utenti … così non potrà spendere
-- più di quello che diamo» → «sì, costruiscilo» (500 crediti, ricarica il 1° del
-- mese, blocco a credito finito).
--
-- 1 credito = 1 centesimo di dollaro di costo reale (token × prezzo del modello),
-- contato da `aura_consumi` del cliente nel mese (ora italiana). Base 500 al mese
-- (≈ 5 $; un cliente attivo con 90 copy ne usa ~230-340). Il team ne aggiunge con
-- `aura_crediti_aggiungi` (righe in `aura_crediti_extra`, valgono per quel mese).
-- Il team e l'account del team («Wesley ME», clienti.account_personale) non hanno limiti. Il controllo lo fanno le Edge Function (_shared/crediti.ts)
-- prima di chiamare Aura; i lavori di sistema (user_id null) non contano.
-- ============================================================================

/** Centesimi di dollaro di una chiamata. Prezzi $/MTok del 27/11/2026 (cache: lettura 0,1×, scrittura 1,25×). */
create or replace function private.aura_costo_centesimi(p_modello text, p_in integer, p_cr integer, p_cw integer, p_out integer)
returns numeric
language sql immutable
set search_path = ''
as $$
  select (case
    when p_modello like 'claude-sonnet-5%' then p_in * 2.0 + p_cr * 0.1  + p_cw * 2.5   + p_out * 10.0
    when p_modello like 'claude-haiku-5%'  then p_in * 0.1 + p_cr * 0.01 + p_cw * 0.125 + p_out * 0.5
    when p_modello like 'claude-haiku-4%'  then p_in * 1.0 + p_cr * 0.1  + p_cw * 1.25  + p_out * 5.0
    when p_modello like 'claude-opus-5%'   then p_in * 4.0 + p_cr * 0.2  + p_cw * 5.0   + p_out * 20.0
    else                                        p_in * 3.0 + p_cr * 0.3  + p_cw * 3.75  + p_out * 15.0  -- Sonnet 4.x e modelli sconosciuti
  end) / 10000.0;
$$;

create table public.aura_crediti_extra (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  mese        date not null check (extract(day from mese) = 1),
  crediti     integer not null check (crediti <> 0 and crediti between -100000 and 100000),
  nota        text check (nota is null or char_length(nota) <= 200),
  creato_da   uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index aura_crediti_extra_user_idx on public.aura_crediti_extra (user_id, mese);
alter table public.aura_crediti_extra enable row level security;
create policy "team legge crediti extra" on public.aura_crediti_extra for select to authenticated using (private.es_team());

/** Il mese corrente in ora italiana (primo giorno). */
create or replace function private.aura_mese_corrente()
returns date
language sql stable
set search_path = ''
as $$ select date_trunc('month', now() at time zone 'Europe/Rome')::date $$;

/**
 * Lo stato dei crediti di un utente nel mese: limite (500 + aggiunte del team), usati,
 * residui, quando si ricaricano, e se è del team (nessun limite). Lo chiede il cliente
 * per sé, il team per chiunque, le Edge Function (service role) per chi le chiama.
 */
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
revoke all on function public.aura_crediti_stato(uuid) from public, anon;
grant execute on function public.aura_crediti_stato(uuid) to authenticated, service_role;

/** Il team aggiunge (o toglie, con un numero negativo) crediti a un cliente per il mese corrente. */
create or replace function public.aura_crediti_aggiungi(p_user uuid, p_crediti integer, p_nota text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.es_team() then raise exception 'Non autorizzato'; end if;
  insert into public.aura_crediti_extra (user_id, mese, crediti, nota, creato_da)
  values (p_user, private.aura_mese_corrente(), p_crediti, nullif(trim(p_nota), ''), auth.uid());
end;
$$;
revoke all on function public.aura_crediti_aggiungi(uuid, integer, text) from public, anon;
grant execute on function public.aura_crediti_aggiungi(uuid, integer, text) to authenticated;
