-- ============================================================================
-- 0056 · Sessione Skool per l'attore che scrive nella classroom (12/10/2026)
--
-- `skool-pubblica` entra su Skool con email+password (segreti) e riusa i cookie
-- di sessione per ~3 giorni. I cookie sono un token d'accesso all'account admin:
-- la tabella ha la RLS attiva SENZA policy, così dal browser nessuno (nemmeno il
-- team) li legge; li tocca solo il service role dalle Edge Function.
-- ============================================================================

create table public.skool_sessione (
  id boolean primary key default true check (id),
  cookies text not null,
  aggiornata_il timestamptz not null default now()
);

comment on table public.skool_sessione is
  'Cookie di sessione Skool dell''account admin usato da skool-pubblica. RLS senza policy: solo service role.';

alter table public.skool_sessione enable row level security;
