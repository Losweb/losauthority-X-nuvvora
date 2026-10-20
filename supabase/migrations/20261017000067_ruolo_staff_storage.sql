-- =============================================================================
-- 67 · Ruolo «Staff», parte storage (seconda metà della 65, 20/10/2026)
--
-- Le policy del bucket skool-audio passano da solo admin a tutto il team.
-- Qui con drop + create (non `alter policy … rename`): dal SQL Editor l'alter
-- su storage.objects dà «must be owner of table objects», il create no
-- (le stesse policy sono nate così nella migrazione 57).
-- =============================================================================

drop policy if exists "storage skool-audio: admin legge" on storage.objects;
drop policy if exists "storage skool-audio: team legge" on storage.objects;
create policy "storage skool-audio: team legge" on storage.objects
  for select to authenticated
  using (bucket_id = 'skool-audio' and (select private.es_team()));

drop policy if exists "storage skool-audio: admin carica" on storage.objects;
drop policy if exists "storage skool-audio: team carica" on storage.objects;
create policy "storage skool-audio: team carica" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'skool-audio' and (select private.es_team()));

drop policy if exists "storage skool-audio: admin cancella" on storage.objects;
drop policy if exists "storage skool-audio: team cancella" on storage.objects;
create policy "storage skool-audio: team cancella" on storage.objects
  for delete to authenticated
  using (bucket_id = 'skool-audio' and (select private.es_team()));
