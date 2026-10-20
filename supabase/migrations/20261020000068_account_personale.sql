-- =============================================================================
-- 68 · Account personale del team: «Wesley ME» (20/10/2026, richiesta dell'utente)
--
-- Wesley usa l'area cliente come cliente di se stesso (il suo brand, il suo Instagram,
-- il suo CRM) con un account cliente a parte, «Wesley ME». Dal gestionale admin e staff
-- lo aprono con «Passa a Wesley ME» senza password: la Edge Function gestione-utenti
-- (azione accedi_account_personale) genera un accesso di un solo uso e il browser,
-- che ha messo da parte la sessione del team, torna indietro con «Torna al gestionale».
--
-- clienti.account_personale dice quale account è. Uno solo (indice unico parziale) e
-- lo cambia solo il database (SQL Editor) o il service role: chi potesse spostare il
-- flag su un altro cliente entrerebbe nel suo account con il bottone. Per questo il
-- trigger lo blocca alle richieste che arrivano dal browser (authenticated / anon),
-- anche se la policy «clienti: team aggiorna» lascia al team il resto della riga.
--
-- Il flag su «Wesley ME» si mette nello script dei dati (dati-v1/import/09, fuori da
-- git), dopo il cambio di email: questa migrazione è solo schema.
-- =============================================================================

alter table public.clienti
  add column if not exists account_personale boolean not null default false;

comment on column public.clienti.account_personale is
  'true = l''account cliente del team («Wesley ME»): lo apre «Passa a Wesley ME» nel gestionale, non conta nei contatori della dashboard. Uno solo; lo cambia solo il database.';

create unique index if not exists clienti_un_solo_account_personale
  on public.clienti (account_personale)
  where account_personale;

create or replace function private.clienti_account_personale_protetto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- SQL Editor e service role passano (auth.role() è null o 'service_role').
  if (select auth.role()) in ('authenticated', 'anon') then
    if tg_op = 'INSERT' and new.account_personale then
      raise exception 'clienti: l''account personale si imposta solo dal database' using errcode = 'check_violation';
    elsif tg_op = 'UPDATE' and new.account_personale is distinct from old.account_personale then
      raise exception 'clienti: l''account personale si cambia solo dal database' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function private.clienti_account_personale_protetto() from public, anon, authenticated;

drop trigger if exists clienti_account_personale_protetto on public.clienti;
create trigger clienti_account_personale_protetto
  before insert or update of account_personale on public.clienti
  for each row execute function private.clienti_account_personale_protetto();
