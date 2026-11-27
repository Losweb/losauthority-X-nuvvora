-- ============================================================================
-- 20261127000080 · Mappa delle lezioni per argomenti (27/11/2026)
--
-- Wesley: Wesley Coach spendeva ~21.000 token a domanda perché riceveva tutto il
-- catalogo (107 lezioni con descrizioni e capitoli) e la cache non serviva (le
-- domande arrivano a ore di distanza). Decisione: «un database per argomenti».
-- Una volta per lezione Aura la scompone in argomenti (aura-argomenti); a ogni
-- domanda il coach sceglie gli argomenti da un elenco corto e legge solo quelle
-- lezioni. La profondità (passo passo / spiegazione / accenno) è scritta qui:
-- così il coach non manda più a un accenno di 5 minuti invece che al corso.
--
-- argomenti          → l'elenco unico degli argomenti (nome corto + cosa comprende)
-- lezioni_argomenti  → una riga = un argomento dentro una lezione (o un capitolo di una live)
-- lezioni_indice     → quando e su che testo è stata letta ogni lezione (fonte_hash:
--                      si rilegge solo se descrizione o capitoli cambiano; updated_at di
--                      `lezioni` cambia a ogni sync settimanale e non serve)
-- Scrive solo il service role (aura-argomenti). Il team legge (e in futuro corregge).
-- ============================================================================

create table public.argomenti (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null unique check (char_length(nome) between 2 and 60),
  descrizione text check (descrizione is null or char_length(descrizione) <= 300),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.lezioni_argomenti (
  id            uuid primary key default gen_random_uuid(),
  lezione_id    uuid not null references public.lezioni (id) on delete cascade,
  argomento_id  uuid not null references public.argomenti (id) on delete cascade,
  inizio_sec    integer check (inizio_sec is null or inizio_sec >= 0),
  durata_min    integer check (durata_min is null or durata_min between 0 and 600),
  profondita    text not null check (profondita in ('passo_passo', 'spiegazione', 'accenno')),
  riassunto     text not null check (char_length(riassunto) between 1 and 600),
  origine       text not null default 'aura' check (origine in ('aura', 'team')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index lezioni_argomenti_argomento_idx on public.lezioni_argomenti (argomento_id);
create index lezioni_argomenti_lezione_idx on public.lezioni_argomenti (lezione_id);

create table public.lezioni_indice (
  lezione_id      uuid primary key references public.lezioni (id) on delete cascade,
  fonte_hash      text not null check (char_length(fonte_hash) between 8 and 128),
  stato           text not null check (stato in ('fatto', 'errore')),
  errore          text check (errore is null or char_length(errore) <= 500),
  indicizzata_il  timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger set_updated_at before update on public.argomenti
  for each row execute procedure extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.lezioni_argomenti
  for each row execute procedure extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.lezioni_indice
  for each row execute procedure extensions.moddatetime (updated_at);

alter table public.argomenti enable row level security;
alter table public.lezioni_argomenti enable row level security;
alter table public.lezioni_indice enable row level security;

create policy "argomenti: lettura team" on public.argomenti for select to authenticated using (private.es_team());
create policy "lezioni_argomenti: lettura team" on public.lezioni_argomenti for select to authenticated using (private.es_team());
create policy "lezioni_indice: lettura team" on public.lezioni_indice for select to authenticated using (private.es_team());

-- La mappa si tiene aggiornata da sola: ogni 15 minuti aura-argomenti legge le lezioni
-- nuove o cambiate (poche per giro; se non c'è niente da fare esce subito).
select cron.unschedule('aura-argomenti') where exists (select 1 from cron.job where jobname = 'aura-argomenti');
select cron.schedule('aura-argomenti', '*/15 * * * *', $$select private.chiama_edge_function('aura-argomenti')$$);
