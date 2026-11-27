-- ============================================================================
-- 20261127000082 · sync_stati accetta la chiave del riordino (27/11/2026)
--
-- aura-argomenti salva in sync_stati (chiave aura_argomenti_riordino) quando ha
-- fatto l'ultimo riordino della mappa, per farlo al massimo una volta a settimana.
-- Il CHECK su `chiave` non la prevedeva: l'upsert falliva in silenzio e il
-- riordino ripartiva a ogni giro del cron (3 volte in 20 minuti, ~0,10 USD l'uno).
-- ============================================================================

do $$
declare c text;
begin
  select conname into c from pg_constraint
   where conrelid = 'public.sync_stati'::regclass and pg_get_constraintdef(oid) like '%chiave = ANY%';
  if c is not null then execute format('alter table public.sync_stati drop constraint %I', c); end if;
end $$;

alter table public.sync_stati add constraint sync_stati_chiave_check
  check (chiave in ('skool', 'notion_compiti', 'fathom', 'genera_hub', 'instagram', 'aura_argomenti_riordino'));

insert into public.sync_stati (chiave, synced_at, esito, dettaglio, totale, nuove)
values ('aura_argomenti_riordino', now(), 'ok', 'riordino fatto alla fine della passata del 27/11', 0, 0)
on conflict (chiave) do update set synced_at = excluded.synced_at, esito = excluded.esito, dettaglio = excluded.dettaglio;
