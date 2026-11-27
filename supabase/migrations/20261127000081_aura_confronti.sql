-- ============================================================================
-- 20261127000081 · Prova dei modelli nuovi in parallelo (27/11/2026)
--
-- Wesley: «possiamo usare modelli diversi per diminuire i token? … sì, con una
-- prova». Finché il secret ANTHROPIC_MODEL_CONFRONTO è impostato (es.
-- "claude-sonnet-5-5@low,claude-haiku-5-5@low"), ogni chiamata ad Aura viene
-- rifatta in sottofondo con quei modelli sullo stesso prompt. Il cliente riceve
-- sempre la risposta del modello di oggi; qui finiscono le due versioni affiancate
-- con i token, per giudicare qualità e costo prima di cambiare modello.
-- Solo service role (RLS senza policy). Si svuota a prova finita.
-- ============================================================================

create table public.aura_confronti (
  id                      uuid primary key default gen_random_uuid(),
  funzione                text not null,
  user_id                 uuid,
  modello_originale       text not null,
  testo_originale         text,
  modello                 text not null,
  effort                  text,
  testo                   text,
  input_tokens            integer not null default 0,
  cache_lettura_tokens    integer not null default 0,
  cache_scrittura_tokens  integer not null default 0,
  output_tokens           integer not null default 0,
  millisecondi            integer,
  created_at              timestamptz not null default now()
);
create index aura_confronti_created_idx on public.aura_confronti (created_at desc);

alter table public.aura_confronti enable row level security;
