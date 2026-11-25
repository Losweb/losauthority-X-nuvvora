-- ============================================================================
-- 20261125000074 · Avatar: una mappa per cliente + da una a tre schede
--
-- Istruzioni di Wesley del 25/11/2026 («A chi parli? I 3 dubbi sull'avatar»):
-- la fase Avatar non è più «un avatar = una conversazione». Il cliente fa UNA
-- conversazione con Aura che produce:
--   · la MAPPA (una per cliente): il ponte (cosa vende), l'arrivo, chi resta
--     fuori, gli esempi per i video, la proporzione dei contenuti, da verificare;
--   · da una a tre PARTENZE, ognuna con la sua SCHEDA avatar; una è la principale.
-- Ogni riga di contenuto porta la sua origine (vera / riassunto / lettura).
--
-- Eccezione documentata a «niente JSON»: i campi di mappa e scheda sono jsonb
-- perché ogni riga è { testo, origine } (o una coppia) e la scheda si legge e
-- si scrive come un documento intero, sezione per sezione. La forma è una sola,
-- in supabase/functions/_shared/avatar/forma.ts (Edge Function + frontend).
--
-- Scrive solo la Edge Function aura-avatar (service role). Il cliente legge le
-- sue righe e può eliminare la mappa (ricomincia da capo); il team legge tutto
-- e segna la mappa «rivista da Wesley».
--
-- In fondo: CONVERSIONE degli avatar del sistema di prima (tabella `avatar`,
-- che resta com'è) nella mappa nuova del loro cliente, tutte le righe marcate
-- con l'origine che avevano («vera (chi): …») o «lettura».
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. La mappa
-- ---------------------------------------------------------------------------
create table public.avatar_mappa (
  id                   uuid primary key default gen_random_uuid(),
  cliente_id           uuid not null unique references public.clienti (id) on delete cascade,
  passo                text not null default 'leggo' check (passo in ('leggo', 'analisi', 'mappa', 'schede', 'fatto')),
  stato                text not null default 'bozza' check (stato in ('bozza', 'rivista')),
  rivista_il           timestamptz,
  rivista_da           uuid references public.user_roles (id) on delete set null,
  tipo                 text check (tipo is null or tipo in ('servizio', 'prodotto')),
  ponte                jsonb not null default '[]' check (jsonb_typeof(ponte) = 'array' and jsonb_array_length(ponte) <= 3 and octet_length(ponte::text) <= 4000),
  arrivo               jsonb check (arrivo is null or (jsonb_typeof(arrivo) = 'object' and octet_length(arrivo::text) <= 1500)),
  principale_perche    jsonb check (principale_perche is null or (jsonb_typeof(principale_perche) = 'object' and octet_length(principale_perche::text) <= 1500)),
  proporzione          jsonb check (proporzione is null or (jsonb_typeof(proporzione) = 'object' and octet_length(proporzione::text) <= 1500)),
  fuori                jsonb not null default '[]' check (jsonb_typeof(fuori) = 'array' and jsonb_array_length(fuori) <= 6 and octet_length(fuori::text) <= 8000),
  esempi               jsonb not null default '[]' check (jsonb_typeof(esempi) = 'array' and jsonb_array_length(esempi) <= 4 and octet_length(esempi::text) <= 6000),
  da_verificare        jsonb not null default '[]' check (jsonb_typeof(da_verificare) = 'array' and jsonb_array_length(da_verificare) <= 12 and octet_length(da_verificare::text) <= 10000),
  -- «Non so ancora cosa vendere»: l'avatar non si costruisce, Wesley costruisce prima l'offerta.
  offerta_da_costruire boolean not null default false,
  -- nata dalla conversione degli avatar del sistema di prima
  convertita           boolean not null default false,
  modello              text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint avatar_mappa_rivista_coerente check ((stato = 'rivista') = (rivista_il is not null))
);
comment on table public.avatar_mappa is 'Fase Avatar (25/11/2026): la mappa del cliente (ponte, arrivo, chi resta fuori, esempi), una per cliente. Le partenze e le schede sono in avatar_scheda. Righe jsonb {t, o} con o = vera|riassunto|lettura.';

create trigger set_updated_at before update on public.avatar_mappa
  for each row execute procedure extensions.moddatetime (updated_at);

-- rivista_il / rivista_da seguono lo stato (chi segna «rivista» è il team, dal browser)
create or replace function private.avatar_mappa_allinea_rivista()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.stato = 'rivista' then
    if tg_op = 'INSERT' or old.stato is distinct from 'rivista' then
      new.rivista_il := now();
      new.rivista_da := (select auth.uid());
    end if;
  else
    new.rivista_il := null;
    new.rivista_da := null;
  end if;
  return new;
end;
$$;
revoke execute on function private.avatar_mappa_allinea_rivista() from public, anon, authenticated;

create trigger avatar_mappa_allinea_rivista before insert or update of stato on public.avatar_mappa
  for each row execute function private.avatar_mappa_allinea_rivista();

-- Dal browser il team può cambiare SOLO lo stato (bozza ↔ rivista); il resto lo scrive Aura.
create or replace function private.avatar_mappa_solo_stato_team()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.role()) = 'authenticated' and (
       new.cliente_id is distinct from old.cliente_id or new.passo is distinct from old.passo
    or new.tipo is distinct from old.tipo or new.ponte is distinct from old.ponte
    or new.arrivo is distinct from old.arrivo or new.principale_perche is distinct from old.principale_perche
    or new.proporzione is distinct from old.proporzione or new.fuori is distinct from old.fuori
    or new.esempi is distinct from old.esempi or new.da_verificare is distinct from old.da_verificare
    or new.offerta_da_costruire is distinct from old.offerta_da_costruire or new.convertita is distinct from old.convertita
  ) then
    raise exception 'Dal gestionale si può cambiare solo lo stato della mappa.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function private.avatar_mappa_solo_stato_team() from public, anon, authenticated;

create trigger avatar_mappa_solo_stato_team before update on public.avatar_mappa
  for each row execute function private.avatar_mappa_solo_stato_team();

alter table public.avatar_mappa enable row level security;
create policy "avatar mappa: lettura propria o team" on public.avatar_mappa for select to authenticated
  using (cliente_id = (select auth.uid()) or (select private.es_team()));
create policy "avatar mappa: il team segna rivista" on public.avatar_mappa for update to authenticated
  using ((select private.es_team())) with check ((select private.es_team()));
create policy "avatar mappa: elimina propria o team" on public.avatar_mappa for delete to authenticated
  using (cliente_id = (select auth.uid()) or (select private.es_team()));
revoke all on public.avatar_mappa from anon;

-- ---------------------------------------------------------------------------
-- 2. Le partenze, ognuna con la sua scheda (da 1 a 3 per mappa)
-- ---------------------------------------------------------------------------
create table public.avatar_scheda (
  id          uuid primary key default gen_random_uuid(),
  mappa_id    uuid not null references public.avatar_mappa (id) on delete cascade,
  cliente_id  uuid not null references public.clienti (id) on delete cascade,
  ordine      smallint not null check (ordine between 1 and 3),
  principale  boolean not null default false,
  -- la partenza sulla mappa: { situazione, descrizione, cosa_manca } (righe {t, o})
  partenza    jsonb not null default '{}' check (jsonb_typeof(partenza) = 'object' and octet_length(partenza::text) <= 4000),
  -- la scheda dell'avatar (sezioni: vedi forma.ts)
  contenuto   jsonb not null default '{}' check (jsonb_typeof(contenuto) = 'object' and octet_length(contenuto::text) <= 60000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (mappa_id, ordine)
);
comment on table public.avatar_scheda is 'Fase Avatar: una partenza della mappa con la sua scheda avatar (max 3 per mappa, una principale). Scrive solo aura-avatar.';

create index avatar_scheda_cliente_idx on public.avatar_scheda (cliente_id);
create unique index avatar_scheda_una_principale on public.avatar_scheda (mappa_id) where principale;

create trigger set_updated_at before update on public.avatar_scheda
  for each row execute procedure extensions.moddatetime (updated_at);

alter table public.avatar_scheda enable row level security;
create policy "avatar scheda: lettura propria o team" on public.avatar_scheda for select to authenticated
  using (cliente_id = (select auth.uid()) or (select private.es_team()));
revoke all on public.avatar_scheda from anon;

-- ---------------------------------------------------------------------------
-- 3. La conversazione (una per cliente, come la mappa)
-- ---------------------------------------------------------------------------
create table public.avatar_mappa_messaggi (
  id          uuid primary key default gen_random_uuid(),
  mappa_id    uuid not null references public.avatar_mappa (id) on delete cascade,
  cliente_id  uuid not null references public.clienti (id) on delete cascade,
  ruolo       text not null check (ruolo in ('cliente', 'aura')),
  contenuto   text not null default '' check (length(contenuto) <= 30000),
  stato       text not null default 'completato' check (stato in ('in_corso', 'completato', 'errore')),
  errore      text check (errore is null or length(errore) <= 500),
  modello     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.avatar_mappa_messaggi is 'Fase Avatar: la conversazione cliente ↔ Aura che costruisce mappa e schede. La riga di Aura nasce in_corso e finisce completato o errore.';

create index avatar_mappa_messaggi_mappa_idx on public.avatar_mappa_messaggi (mappa_id, created_at);
create index avatar_mappa_messaggi_cliente_idx on public.avatar_mappa_messaggi (cliente_id);

create trigger set_updated_at before update on public.avatar_mappa_messaggi
  for each row execute procedure extensions.moddatetime (updated_at);

alter table public.avatar_mappa_messaggi enable row level security;
create policy "avatar mappa messaggi: lettura propria o team" on public.avatar_mappa_messaggi for select to authenticated
  using (cliente_id = (select auth.uid()) or (select private.es_team()));
revoke all on public.avatar_mappa_messaggi from anon;

-- ---------------------------------------------------------------------------
-- 4. Conversione degli avatar di prima
-- ---------------------------------------------------------------------------
-- Una riga di testo → {t, o}: l'origine dalla marca che Aura scriveva in testa
-- («vera (chi): …», «riassunto: …», «lettura: …»); senza marca → «lettura».
create function private.conv_voce(p text) returns jsonb
language sql immutable set search_path = '' as $$
  select case
    when p is null or btrim(p) = '' then null
    when p ~* '^\s*vera\s*(\([^)]*\))?\s*:' then jsonb_build_object('t', left(btrim(regexp_replace(p, '^\s*vera\s*(\([^)]*\))?\s*:\s*', '', 'i')), 600), 'o', 'vera')
    when p ~* '^\s*riassunto\s*:' then jsonb_build_object('t', left(btrim(regexp_replace(p, '^\s*riassunto\s*:\s*', '', 'i')), 600), 'o', 'riassunto')
    when p ~* '^\s*lettura\s*:' then jsonb_build_object('t', left(btrim(regexp_replace(p, '^\s*lettura\s*:\s*', '', 'i')), 600), 'o', 'lettura')
    else jsonb_build_object('t', left(btrim(p), 600), 'o', 'lettura')
  end
$$;

create function private.conv_voci(p text[]) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(v order by n) filter (where v is not null), '[]'::jsonb)
  from (select private.conv_voce(x) as v, n from unnest(coalesce(p, '{}')) with ordinality as u(x, n) where n <= 12) s
$$;

-- «a → b» → {a, b, o}
create function private.conv_coppie(p text[]) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'a', left(btrim(split_part(v ->> 't', '→', 1)), 600),
      'b', left(coalesce(nullif(btrim(substr(v ->> 't', length(split_part(v ->> 't', '→', 1)) + 2)), ''), 'da completare'), 600),
      'o', v ->> 'o') order by n) filter (where v is not null), '[]'::jsonb)
  from (select private.conv_voce(x) as v, n from unnest(coalesce(p, '{}')) with ordinality as u(x, n) where n <= 12) s
$$;

-- toglie le chiavi vuote (null, [], {}) da un oggetto
create function private.conv_pulisci(p jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(k, v), '{}'::jsonb)
  from jsonb_each(p) as e(k, v)
  where v is not null and v <> 'null'::jsonb and v <> '[]'::jsonb and v <> '{}'::jsonb
$$;

do $$
declare
  c record;
  a record;
  v_mappa uuid;
  v_ordine int;
  v_fuori jsonb;
begin
  for c in select distinct cliente_id from public.avatar loop
    v_ordine := 0;
    v_fuori := '[]'::jsonb;
    v_mappa := null;
    for a in
      select * from public.avatar where cliente_id = c.cliente_id
      order by (stato = 'completo') desc, created_at
    loop
      v_ordine := v_ordine + 1;
      if v_ordine = 1 then
        insert into public.avatar_mappa (cliente_id, passo, convertita, ponte, arrivo, principale_perche, modello)
        values (
          c.cliente_id, 'schede', true,
          case when a.ponte is not null then jsonb_build_array(private.conv_voce(a.ponte)) else '[]'::jsonb end,
          private.conv_voce(a.arrivo),
          jsonb_build_object('t', 'Era il primo avatar costruito con Aura' || case when a.stato = 'completo' then ' e il più completo.' else '.' end, 'o', 'lettura'),
          a.modello)
        returning id into v_mappa;
      end if;
      if v_ordine <= 3 then
        insert into public.avatar_scheda (mappa_id, cliente_id, ordine, principale, partenza, contenuto)
        values (
          v_mappa, c.cliente_id, v_ordine, v_ordine = 1,
          private.conv_pulisci(jsonb_build_object(
            'situazione', private.conv_voce(a.situazione),
            'descrizione', private.conv_voce(left(a.snapshot, 600)),
            'cosa_manca', private.conv_voce(a.cosa_manca))),
          private.conv_pulisci(jsonb_build_object(
            'nome', a.nome,
            'eta', a.eta,
            'situazione', private.conv_voce(concat_ws(' · ', a.situazione, a.momento)),
            'ritratto', private.conv_pulisci(jsonb_build_object('cosa_fa', private.conv_voce(a.contesto))),
            'cosa_manca', private.conv_voce(a.cosa_manca),
            'dolori', private.conv_pulisci(jsonb_build_object('dice', private.conv_voci(a.dolori_superficie), 'sente', private.conv_voci(a.dolori_profondi))),
            'desideri', private.conv_pulisci(jsonb_build_object('dice', private.conv_voci(array_remove(array[a.desiderio_pratico], null)))),
            'compra_davvero', private.conv_voce(a.desiderio_emotivo),
            'credenze', private.conv_coppie(a.credenze_limitanti),
            'momenti', private.conv_voci(array_remove(array[a.momento], null) || a.trigger_acquisto),
            'obiezioni', private.conv_coppie(a.obiezioni),
            'linguaggio', private.conv_pulisci(jsonb_build_object('parole', private.conv_voci(array_remove(array[a.frase], null) || a.linguaggio))),
            'dove_sta', private.conv_pulisci(jsonb_build_object(
              'guarda', private.conv_voci(a.piattaforme || a.chi_segue),
              'cercato', private.conv_voci(array_remove(array[a.dove_cerca], null)))),
            'da_verificare', jsonb_build_array(jsonb_build_object('t', 'Rivedere la scheda con il metodo nuovo: arrivata dal sistema di prima', 'fatto', false))
          )));
      else
        v_fuori := v_fuori || jsonb_build_object(
          'chi', left(coalesce(a.nome, 'Avatar') || coalesce(' · ' || a.situazione, ''), 600),
          'perche', 'Massimo tre partenze: questo avatar del sistema di prima resta fuori finché non lo rivedi con Aura.',
          'o', 'lettura');
      end if;
    end loop;
    if jsonb_array_length(v_fuori) > 0 then
      update public.avatar_mappa set fuori = v_fuori where id = v_mappa;
    end if;
    insert into public.avatar_mappa_messaggi (mappa_id, cliente_id, ruolo, stato, contenuto)
    values (v_mappa, c.cliente_id, 'aura', 'completato',
      'Ciao! Ho cambiato il modo in cui lavoriamo sull''avatar: adesso costruiamo una mappa sola, con quello che vendi, dove porti chi compra e le persone che partono da punti diversi per arrivarci.' || E'\n\n' ||
      'Ho già portato qui quello che avevamo scritto prima: lo trovi nella mappa e nelle schede qui accanto. Le righe con l''etichetta «lettura» sono mie ipotesi: vanno confermate.' || E'\n\n' ||
      'Ripartiamo da qui: dimmi cosa vendi oggi e come lo fai pagare, così controllo che la mappa regga. Se qualcosa non ti torna, dimmi cosa cambieresti.');
  end loop;
end;
$$;

drop function private.conv_pulisci(jsonb);
drop function private.conv_coppie(text[]);
drop function private.conv_voci(text[]);
drop function private.conv_voce(text);
