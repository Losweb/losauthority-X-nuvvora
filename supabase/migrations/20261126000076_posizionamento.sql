-- ============================================================================
-- 20261126000076 · Posizionamento
--
-- Richiesta di Wesley del 26/11/2026: al posto di Concorrenti e Marca, una pagina
-- «Posizionamento»: in alto come si vedrebbe il profilo Instagram (nome, bio, link,
-- storie in evidenza, post fissati), sotto le quattro parti del posizionamento
-- dell'HUB (chi sei, perché puoi dirlo tu, cosa dicono già tutti, come lo dimostri).
-- Lo scrive Aura in un colpo partendo da avatar e offerta (Edge Function
-- aura-posizionamento, service role); il cliente lo corregge da lì.
-- Una riga per cliente. `contenuto` è un documento JSON (come avatar_scheda e
-- offerta.scheda): la forma è in supabase/functions/aura-posizionamento/forma.ts.
-- ============================================================================

create table public.posizionamento (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null unique references public.clienti (id) on delete cascade,
  contenuto   jsonb not null default '{}' check (jsonb_typeof(contenuto) = 'object' and octet_length(contenuto::text) <= 30000),
  -- in_corso mentre Aura scrive; pronto quando c'è; errore se la scrittura è fallita
  stato       text not null default 'in_corso' check (stato in ('in_corso', 'pronto', 'errore')),
  errore      text check (errore is null or length(errore) <= 300),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.posizionamento is 'Posizionamento del cliente (26/11/2026): profilo Instagram (nome, utente, categoria, bio, link, storie in evidenza, post fissati) + chi sei, perché puoi dirlo tu, cosa dicono già tutti, come lo dimostri. Scrive solo aura-posizionamento.';

create trigger set_updated_at before update on public.posizionamento
  for each row execute procedure extensions.moddatetime (updated_at);

alter table public.posizionamento enable row level security;
create policy "posizionamento: lettura propria o team" on public.posizionamento for select to authenticated
  using (cliente_id = (select auth.uid()) or (select private.es_team()));
create policy "posizionamento: elimina propria o team" on public.posizionamento for delete to authenticated
  using (cliente_id = (select auth.uid()) or (select private.es_team()));
revoke all on public.posizionamento from anon;
