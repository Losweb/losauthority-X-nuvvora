-- ============================================================================
-- 0057 · Skool Video: dal video alla lezione su Skool (12/10/2026)
--
-- Pagina del gestionale (solo admin): Wesley sceglie un video, il browser ne
-- estrae l'audio (ffmpeg.wasm, il video non lascia il Mac) e carica i blocchi
-- audio nel bucket `skool-audio`; `skool-trascrivi` li trascrive con OpenAI
-- (whisper-1, con i minuti) un blocco per volta, poi Aura scrive il testo della
-- lezione secondo la regola dell'utente: video da 60 minuti in su → capitoli
-- per tema con il minuto; sotto i 60 → riassunto. `skool-pubblica` crea la
-- lezione su Skool (corpo + transcript); il video lo carica Wesley a mano
-- (nessun attore sa caricare file video su Skool).
--
-- Stati di skool_video: caricamento (il browser sta caricando i blocchi)
--   → trascrizione → scrittura → bozza (testo pronto da rivedere)
--   → pubblicazione → pubblicato | errore (ripartibile).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) Bucket privato dei blocchi audio: solo l'admin carica/legge/cancella.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('skool-audio', 'skool-audio', false, 31457280, array['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/webm', 'audio/wav'])
on conflict (id) do nothing;

create policy "storage skool-audio: admin legge" on storage.objects for select to authenticated
  using (bucket_id = 'skool-audio' and (select private.tiene_rol('admin')));
create policy "storage skool-audio: admin carica" on storage.objects for insert to authenticated
  with check (bucket_id = 'skool-audio' and (select private.tiene_rol('admin')));
create policy "storage skool-audio: admin cancella" on storage.objects for delete to authenticated
  using (bucket_id = 'skool-audio' and (select private.tiene_rol('admin')));

-- ---------------------------------------------------------------------------
-- 1) skool_video: un video = una lezione da scrivere e pubblicare.
-- ---------------------------------------------------------------------------
create table public.skool_video (
  id               uuid primary key default gen_random_uuid(),
  titolo           text not null check (length(titolo) between 3 and 200),
  -- Dove va su Skool: corso (id interno + `name` breve che forma l'URL) e, se c'è, la cartella.
  corso_id         text not null check (corso_id ~ '^[0-9a-f]{32}$'),
  corso_nome       text not null check (length(corso_nome) between 1 and 40),
  corso_titolo     text not null check (length(corso_titolo) between 1 and 200),
  cartella_id      text check (cartella_id is null or cartella_id ~ '^[0-9a-f]{32}$'),
  cartella_titolo  text check (cartella_titolo is null or length(cartella_titolo) <= 200),
  -- Il file (resta sul Mac: qui solo i dati per capire di che video si tratta).
  nome_file        text check (nome_file is null or length(nome_file) <= 300),
  dimensione_byte  bigint check (dimensione_byte is null or dimensione_byte >= 0),
  durata_sec       integer not null check (durata_sec between 1 and 21600),
  blocchi          integer not null check (blocchi between 1 and 72),
  -- Lavorazione.
  stato            text not null default 'caricamento'
                   check (stato in ('caricamento', 'trascrizione', 'scrittura', 'bozza', 'pubblicazione', 'pubblicato', 'errore')),
  errore           text check (errore is null or length(errore) <= 500),
  tentativi        integer not null default 0,
  avviato_il       timestamptz,
  -- Risultato della trascrizione (righe «[h:mm:ss] testo») e del testo di Aura.
  trascrizione     text check (trascrizione is null or length(trascrizione) <= 600000),
  tipo_testo       text check (tipo_testo is null or tipo_testo in ('capitoli', 'riassunto')),
  apertura         text check (apertura is null or length(apertura) <= 2000),
  riassunto        text check (riassunto is null or length(riassunto) <= 8000),
  parole_chiave    text[] not null default '{}' check (cardinality(parole_chiave) <= 15),
  modello          text,
  -- Pubblicazione.
  skool_page_id    text check (skool_page_id is null or skool_page_id ~ '^[0-9a-f]{32}$'),
  skool_url        text check (skool_url is null or skool_url ~ '^https://(www\.)?skool\.com/'),
  pubblicato_il    timestamptz,
  creato_da        uuid references public.user_roles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.skool_video is 'Skool Video (admin): video → trascrizione (OpenAI) → testo di Aura → lezione su Skool.';
comment on column public.skool_video.tipo_testo is 'capitoli se il video dura 60 minuti o più, riassunto sotto i 60 (regola del 12/10/2026).';
comment on column public.skool_video.corso_nome is 'Il `name` breve del corso su Skool: forma l''URL classroom/{corso_nome}?md={page_id}.';

create index skool_video_stato_idx on public.skool_video (stato, created_at);
create trigger set_updated_at before update on public.skool_video
  for each row execute procedure extensions.moddatetime (updated_at);

-- ---------------------------------------------------------------------------
-- 2) skool_video_blocchi: i blocchi audio (10 minuti l'uno), uno per riga.
-- ---------------------------------------------------------------------------
create table public.skool_video_blocchi (
  id            uuid primary key default gen_random_uuid(),
  video_id      uuid not null references public.skool_video (id) on delete cascade,
  indice        integer not null check (indice >= 0),
  inizio_sec    integer not null check (inizio_sec >= 0),
  durata_sec    integer not null check (durata_sec between 1 and 1800),
  storage_path  text not null check (length(storage_path) <= 300),
  stato         text not null default 'da_fare' check (stato in ('da_fare', 'in_corso', 'fatto', 'errore')),
  tentativi     integer not null default 0,
  avviato_il    timestamptz,
  -- Trascrizione del blocco, già con i tempi assoluti del video («[h:mm:ss] testo»).
  testo         text check (testo is null or length(testo) <= 100000),
  errore        text check (errore is null or length(errore) <= 500),
  created_at    timestamptz not null default now(),
  unique (video_id, indice)
);

comment on table public.skool_video_blocchi is 'Blocchi audio di un video Skool, trascritti uno per volta da skool-trascrivi.';

-- ---------------------------------------------------------------------------
-- 3) skool_video_capitoli: i capitoli scritti da Aura (video ≥ 60 min).
-- ---------------------------------------------------------------------------
create table public.skool_video_capitoli (
  id          uuid primary key default gen_random_uuid(),
  video_id    uuid not null references public.skool_video (id) on delete cascade,
  ordine      integer not null check (ordine >= 0),
  inizio_sec  integer not null check (inizio_sec >= 0),
  titolo      text not null check (length(titolo) between 2 and 120),
  testo       text check (testo is null or length(testo) <= 1500),
  unique (video_id, ordine)
);

-- ---------------------------------------------------------------------------
-- 4) RLS: tutto e solo l'admin. Le Edge Function scrivono con il service role.
-- ---------------------------------------------------------------------------
alter table public.skool_video enable row level security;
alter table public.skool_video_blocchi enable row level security;
alter table public.skool_video_capitoli enable row level security;

create policy "skool video: admin legge" on public.skool_video for select to authenticated
  using ((select private.tiene_rol('admin')));
create policy "skool video: admin crea" on public.skool_video for insert to authenticated
  with check ((select private.tiene_rol('admin')) and creato_da = (select auth.uid()));
create policy "skool video: admin aggiorna" on public.skool_video for update to authenticated
  using ((select private.tiene_rol('admin'))) with check ((select private.tiene_rol('admin')));
create policy "skool video: admin cancella" on public.skool_video for delete to authenticated
  using ((select private.tiene_rol('admin')));

create policy "skool blocchi: admin legge" on public.skool_video_blocchi for select to authenticated
  using ((select private.tiene_rol('admin')));
create policy "skool blocchi: admin crea" on public.skool_video_blocchi for insert to authenticated
  with check ((select private.tiene_rol('admin')));

create policy "skool capitoli: admin legge" on public.skool_video_capitoli for select to authenticated
  using ((select private.tiene_rol('admin')));
create policy "skool capitoli: admin aggiorna" on public.skool_video_capitoli for update to authenticated
  using ((select private.tiene_rol('admin'))) with check ((select private.tiene_rol('admin')));
create policy "skool capitoli: admin cancella" on public.skool_video_capitoli for delete to authenticated
  using ((select private.tiene_rol('admin')));

-- ---------------------------------------------------------------------------
-- 5) Dal browser l'admin può toccare solo i campi suoi: titolo, apertura,
--    riassunto, parole chiave e lo stato per far partire / riprovare la coda.
--    Trascrizione, blocchi, modello e pubblicazione li scrive solo la funzione.
-- ---------------------------------------------------------------------------
create or replace function private.skool_video_solo_campi_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) = 'service_role' then
    return new;
  end if;
  if new.trascrizione is distinct from old.trascrizione
     or new.tipo_testo is distinct from old.tipo_testo
     or new.modello is distinct from old.modello
     or new.skool_page_id is distinct from old.skool_page_id
     or new.skool_url is distinct from old.skool_url
     or new.pubblicato_il is distinct from old.pubblicato_il
     or new.blocchi is distinct from old.blocchi
     or new.durata_sec is distinct from old.durata_sec
     or new.corso_id is distinct from old.corso_id
     or new.tentativi is distinct from old.tentativi
     or new.avviato_il is distinct from old.avviato_il then
    raise exception 'skool_video: campo riservato alla funzione' using errcode = 'check_violation';
  end if;
  -- Dal browser lo stato può solo: caricamento → trascrizione (blocchi caricati),
  -- errore → trascrizione o scrittura (riprova), bozza → pubblicazione (pubblica).
  if new.stato is distinct from old.stato and not (
       (old.stato = 'caricamento' and new.stato = 'trascrizione')
    or (old.stato = 'errore' and new.stato in ('trascrizione', 'scrittura'))
    or (old.stato = 'bozza' and new.stato = 'pubblicazione')
  ) then
    raise exception 'skool_video: passaggio di stato non consentito' using errcode = 'check_violation';
  end if;
  if new.stato is distinct from old.stato then
    new.errore := null;
  end if;
  return new;
end;
$$;
revoke execute on function private.skool_video_solo_campi_admin() from public, anon, authenticated;

create trigger skool_video_solo_campi_admin before update on public.skool_video
  for each row execute function private.skool_video_solo_campi_admin();

-- ---------------------------------------------------------------------------
-- 6) Coda: appena un video entra in trascrizione/scrittura/pubblicazione, o un
--    blocco finisce, si chiama la funzione (il cron ogni 5 minuti è la rete).
-- ---------------------------------------------------------------------------
create or replace function private.skool_video_avvia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_funzione text;
begin
  if tg_table_name = 'skool_video' then
    if new.stato is distinct from old.stato and new.stato in ('trascrizione', 'scrittura') then
      v_funzione := 'skool-trascrivi';
    elsif new.stato is distinct from old.stato and new.stato = 'pubblicazione' then
      v_funzione := 'skool-pubblica';
    end if;
  elsif tg_table_name = 'skool_video_blocchi' then
    if new.stato = 'fatto' and old.stato is distinct from 'fatto' then
      v_funzione := 'skool-trascrivi';
    end if;
  end if;
  if v_funzione is not null then
    begin
      perform private.chiama_edge_function(v_funzione);
    exception when others then
      raise warning 'skool_video_avvia: avvio non riuscito (%), ci pensa il cron', sqlerrm;
    end;
  end if;
  return null;
end;
$$;
revoke execute on function private.skool_video_avvia() from public, anon, authenticated;

create trigger skool_video_avvia after update on public.skool_video
  for each row execute function private.skool_video_avvia();
create trigger skool_video_blocchi_avvia after update on public.skool_video_blocchi
  for each row execute function private.skool_video_avvia();

select cron.schedule('skool-trascrivi', '*/5 * * * *', $$select private.chiama_edge_function('skool-trascrivi')$$);
