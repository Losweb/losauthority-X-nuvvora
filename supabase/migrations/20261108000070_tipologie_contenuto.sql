-- ============================================================================
-- 20261108000070 · Tipologie dei contenuti (Workflow dell'area cliente)
--
-- Le tipologie non sono più una lista fissa nel codice: una tabella con le
-- quattro PREDEFINITE (Valore, Intrattenimento, Connessione, Vendita: uguali
-- per tutti, non modificabili) e quelle che ogni utente si crea, con un colore
-- per riconoscerle nel calendario e nelle card. Ognuno vede le predefinite e le
-- proprie. «Predefinita» = `predefinita = true` con `creato_da` null (una FK
-- uuid non può contenere la parola "default"); `chiave` è il nome stabile con
-- cui il codice le riconosce (es. il travaso delle idee di Aura).
-- `contenuti.tipologia` (testo tra quattro valori) diventa `tipologia_id` (la vecchia
-- colonna si elimina nella 71).
-- ============================================================================

create table public.tipologie_contenuto (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null check (length(btrim(nome)) between 1 and 40),
  colore       text not null check (colore ~ '^#[0-9a-f]{6}$'),
  -- chi l'ha creata; null = predefinita, uguale per tutti
  creato_da    uuid references public.user_roles (id) on delete cascade,
  predefinita  boolean not null default false,
  -- chiave stabile delle sole predefinite (il codice le cerca così, non per nome)
  chiave       text unique check (chiave ~ '^[a-z_]{2,30}$'),
  ordine       smallint not null default 0 check (ordine >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint tipologie_contenuto_proprietario check (
    (predefinita and creato_da is null and chiave is not null)
    or (not predefinita and creato_da is not null and chiave is null)
  )
);
comment on table public.tipologie_contenuto is 'Tipologie dei contenuti del Workflow: le predefinite (creato_da null) e quelle create da ogni utente, con colore.';
comment on column public.tipologie_contenuto.creato_da is 'Chi l''ha creata; null = predefinita (uguale per tutti, non modificabile).';
comment on column public.tipologie_contenuto.chiave is 'Nome stabile delle predefinite (valore, intrattenimento, connessione, vendita); null per quelle degli utenti.';

-- Stesso nome una volta sola per proprietario (le predefinite contano come un unico proprietario).
create unique index tipologie_contenuto_nome_unico
  on public.tipologie_contenuto (coalesce(creato_da, '00000000-0000-0000-0000-000000000000'::uuid), lower(btrim(nome)));
create index tipologie_contenuto_creato_da_idx on public.tipologie_contenuto (creato_da);

create trigger set_updated_at before update on public.tipologie_contenuto
  for each row execute procedure extensions.moddatetime (updated_at);

-- Limiti per chi crea le proprie: niente nomi uguali a una predefinita, massimo 30 a testa.
create or replace function private.tipologie_contenuto_limiti()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.creato_da is not null then
    if exists (
      select 1 from public.tipologie_contenuto t
      where t.predefinita and lower(btrim(t.nome)) = lower(btrim(new.nome)) and t.id <> new.id
    ) then
      raise exception 'Esiste già una tipologia predefinita con questo nome';
    end if;
    if tg_op = 'INSERT' and (select count(*) from public.tipologie_contenuto t where t.creato_da = new.creato_da) >= 30 then
      raise exception 'Hai già 30 tipologie: eliminane una prima di aggiungerne altre';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function private.tipologie_contenuto_limiti() from public, anon, authenticated;

create trigger tipologie_contenuto_limiti before insert or update on public.tipologie_contenuto
  for each row execute function private.tipologie_contenuto_limiti();

-- ---------------------------------------------------------------------------
-- RLS: tutti leggono le predefinite e le proprie (il team tutte); ognuno
-- scrive solo le proprie; le predefinite non si toccano dal browser.
-- ---------------------------------------------------------------------------
alter table public.tipologie_contenuto enable row level security;

create policy "tipologie: lettura predefinite, proprie o team" on public.tipologie_contenuto for select to authenticated
  using (predefinita or creato_da = (select auth.uid()) or (select private.es_team()));

create policy "tipologie: inserisce le proprie" on public.tipologie_contenuto for insert to authenticated
  with check (not predefinita and creato_da = (select auth.uid()));

create policy "tipologie: aggiorna le proprie" on public.tipologie_contenuto for update to authenticated
  using (creato_da = (select auth.uid()))
  with check (not predefinita and creato_da = (select auth.uid()));

create policy "tipologie: elimina le proprie" on public.tipologie_contenuto for delete to authenticated
  using (creato_da = (select auth.uid()));

revoke all on public.tipologie_contenuto from anon;

-- Le quattro predefinite (colori dai toni del design system: salvia, ocra, lilla, argilla).
insert into public.tipologie_contenuto (nome, colore, predefinita, chiave, ordine) values
  ('Valore',          '#34503e', true, 'valore',          10),
  ('Intrattenimento', '#6e5526', true, 'intrattenimento', 20),
  ('Connessione',     '#55496a', true, 'connessione',     30),
  ('Vendita',         '#6e3e38', true, 'vendita',         40);

-- ---------------------------------------------------------------------------
-- contenuti: dal testo fisso alla FK. Le righe esistenti passano alla
-- predefinita più vicina (virale → Intrattenimento, consolidazione → Valore,
-- vendita → Vendita, content_series → Connessione).
-- ---------------------------------------------------------------------------
alter table public.contenuti
  add column tipologia_id uuid references public.tipologie_contenuto (id) on delete set null;
comment on column public.contenuti.tipologia_id is 'Tipologia del contenuto (tipologie_contenuto); null = nessuna.';
create index contenuti_tipologia_idx on public.contenuti (tipologia_id);

update public.contenuti c
   set tipologia_id = t.id
  from public.tipologie_contenuto t
 where t.predefinita
   and t.chiave = case c.tipologia
                    when 'virale' then 'intrattenimento'
                    when 'consolidazione' then 'valore'
                    when 'vendita' then 'vendita'
                    when 'content_series' then 'connessione'
                  end;

-- La colonna vecchia `contenuti.tipologia` si elimina nella migrazione 71 (DDL distruttivo:
-- il MCP la rifiuta, la esegue l'utente nel SQL Editor). Fino ad allora resta nullable e inutilizzata.
