-- =============================================================================
-- 66 · Dashboard: errori da gestire + attività del team (20/10/2026, richiesta dell'utente)
--
-- 1) error_log: un errore si «gestisce». La dashboard mostra, per prima, solo gli
--    errori nuovi e non gestiti (gestito_il null); il team li segna gestiti dalla
--    card o dalla pagina Errori. Gli errori accumulati finora (677 dei 697 erano il
--    cron di Notion che fallisce a ogni giro senza i secret) partono già gestiti.
--    I due cron di Notion (notion-compiti, genera-hub) si disattivano: Notion si
--    elimina (decisione del 25/09/2026) e oggi producono solo errori.
--    Riattivare: select cron.alter_job(jobid, active := true) from cron.job where jobname = '…';
--
-- 2) attivita_team: che cosa ha fatto il team (admin e staff), una riga per azione,
--    in italiano, già pronta da leggere. La scrivono i trigger delle tabelle
--    (l'attore è auth.uid(): i clienti e le automazioni con service role non
--    lasciano traccia) e le Edge Functions che agiscono per conto di un membro del
--    team (contratti-admin: pagato/attivato/firma; gestione-utenti: utenti).
--    Solo lettura per il team; nessuna policy di scrittura: inserisce solo
--    private.attivita_registra (security definer) o il service role.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) error_log: gestito
-- ---------------------------------------------------------------------------
alter table public.error_log
  add column if not exists gestito_il timestamptz,
  add column if not exists gestito_da uuid references auth.users(id) on delete set null;

comment on column public.error_log.gestito_il is 'Quando il team ha segnato l''errore come gestito (null = da gestire: compare nella dashboard).';
comment on column public.error_log.gestito_da is 'Chi lo ha segnato gestito (auth.uid(), messo dal trigger).';

create index if not exists error_log_da_gestire_idx on public.error_log (created_at desc) where gestito_il is null;
create index if not exists error_log_gestito_da_idx on public.error_log (gestito_da) where gestito_da is not null;

-- Dal browser si può solo segnare/togliere «gestito»: tutto il resto è immutabile (è un log).
create or replace function private.error_log_solo_gestione()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) = 'service_role' then
    return new;
  end if;
  if new.scope <> old.scope or new.message <> old.message or new.context is distinct from old.context
     or new.created_at <> old.created_at then
    raise exception 'error_log: si può solo segnare l''errore come gestito' using errcode = 'check_violation';
  end if;
  if new.gestito_il is not null and old.gestito_il is null then
    new.gestito_da := (select auth.uid());
  elsif new.gestito_il is null then
    new.gestito_da := null;
  else
    new.gestito_il := old.gestito_il;
    new.gestito_da := old.gestito_da;
  end if;
  return new;
end;
$$;

revoke execute on function private.error_log_solo_gestione() from public, anon, authenticated;

drop trigger if exists error_log_solo_gestione on public.error_log;
create trigger error_log_solo_gestione
  before update on public.error_log
  for each row execute function private.error_log_solo_gestione();

drop policy if exists "error_log: team segna gestito" on public.error_log;
create policy "error_log: team segna gestito" on public.error_log
  for update to authenticated
  using ((select private.es_team()))
  with check ((select private.es_team()));

-- Gli errori di prima partono gestiti: la card della dashboard nasce pulita.
update public.error_log set gestito_il = now() where gestito_il is null;

-- I cron di Notion falliscono a ogni giro (nessun secret di Notion): fermi.
select cron.alter_job(jobid, active := false)
from cron.job
where jobname in ('notion-compiti', 'genera-hub');

-- ---------------------------------------------------------------------------
-- 2) attivita_team
-- ---------------------------------------------------------------------------
create table if not exists public.attivita_team (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  utente_id    uuid references auth.users(id) on delete set null,
  utente_nome  text not null default '',
  azione       text not null check (char_length(azione) between 1 and 60),
  descrizione  text not null check (char_length(descrizione) between 1 and 300),
  entita       text check (entita is null or char_length(entita) <= 40),
  entita_id    text check (entita_id is null or char_length(entita_id) <= 60),
  cliente_id   uuid references public.clienti(id) on delete set null
);

comment on table public.attivita_team is
  'Registro delle azioni del team (admin e staff): «Nome ha creato il cliente X». Solo aggiunta; nessun updated_at perché è un log. La scrivono i trigger (attore = auth.uid()) e le Edge Functions per conto del chiamante.';
comment on column public.attivita_team.utente_nome is 'Nome dell''attore al momento dell''azione (istantanea: resta anche se l''utente viene eliminato).';
comment on column public.attivita_team.azione is 'Chiave dell''azione (lead_creato, cliente_fase, contratto_pagato…).';
comment on column public.attivita_team.descrizione is 'La frase, senza il nome: «ha creato il cliente «Mario Rossi»».';
comment on column public.attivita_team.entita_id is 'Id della riga toccata, come testo (uuid o bigint).';

create index if not exists attivita_team_created_idx on public.attivita_team (created_at desc);
create index if not exists attivita_team_cliente_idx on public.attivita_team (cliente_id) where cliente_id is not null;
create index if not exists attivita_team_utente_idx on public.attivita_team (utente_id) where utente_id is not null;

alter table public.attivita_team enable row level security;

drop policy if exists "attivita: team legge" on public.attivita_team;
create policy "attivita: team legge" on public.attivita_team
  for select to authenticated
  using ((select private.es_team()));

-- Chi scrive: solo questa funzione (definer) o il service role. Attore assente o non team → nessuna riga.
create or replace function private.attivita_registra(
  p_azione      text,
  p_descrizione text,
  p_entita      text default null,
  p_entita_id   text default null,
  p_cliente_id  uuid default null,
  p_utente      uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_utente uuid := coalesce(p_utente, (select auth.uid()));
  v_nome   text;
begin
  if v_utente is null then
    return;
  end if;
  select coalesce(nullif(u.nombre, ''), u.email, '')
    into v_nome
    from public.user_roles u
   where u.id = v_utente and u.rol in ('admin', 'staff', 'staff_fatture');
  if v_nome is null then
    return;
  end if;
  insert into public.attivita_team (utente_id, utente_nome, azione, descrizione, entita, entita_id, cliente_id)
  values (v_utente, v_nome, left(p_azione, 60), left(p_descrizione, 300), p_entita, left(p_entita_id, 60), p_cliente_id);
exception when others then
  -- Mai bloccare l'operazione vera per colpa del registro.
  raise warning 'attivita_registra: %', sqlerrm;
end;
$$;

revoke execute on function private.attivita_registra(text, text, text, text, uuid, uuid) from public, anon;
grant execute on function private.attivita_registra(text, text, text, text, uuid, uuid) to authenticated, service_role;

-- Piccoli aiuti per le frasi.
create or replace function private.nome_utente(p_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(u.nombre, ''), u.email, 'cliente') from public.user_roles u where u.id = p_id;
$$;
revoke execute on function private.nome_utente(uuid) from public, anon;
grant execute on function private.nome_utente(uuid) to authenticated, service_role;

create or replace function private.etichetta(p_chiave text)
returns text
language sql
immutable
set search_path = ''
as $$
  select initcap(replace(coalesce(p_chiave, ''), '_', ' '));
$$;

create or replace function private.euro(p_importo numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(to_char(coalesce(p_importo, 0), 'FM999999999990.00'), '.', ',') || ' €';
$$;

-- --- lead ------------------------------------------------------------------
create or replace function private.attivita_lead()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.attivita_registra('lead_creato', format('ha aggiunto il lead «%s»', new.nome), 'lead', new.id::text, new.cliente_id);
  elsif tg_op = 'UPDATE' then
    if new.stage is distinct from old.stage then
      perform private.attivita_registra('lead_stage', format('ha spostato il lead «%s» in %s', new.nome, private.etichetta(new.stage)), 'lead', new.id::text, new.cliente_id);
    elsif row(new.nome, new.contatto, new.fonte, new.note, new.prossima_azione, new.prossima_azione_il, new.valore)
          is distinct from row(old.nome, old.contatto, old.fonte, old.note, old.prossima_azione, old.prossima_azione_il, old.valore) then
      perform private.attivita_registra('lead_modificato', format('ha modificato il lead «%s»', new.nome), 'lead', new.id::text, new.cliente_id);
    end if;
  elsif tg_op = 'DELETE' then
    perform private.attivita_registra('lead_eliminato', format('ha eliminato il lead «%s»', old.nome), 'lead', old.id::text, old.cliente_id);
    return old;
  end if;
  return new;
end;
$$;
drop trigger if exists attivita_lead on public.lead;
create trigger attivita_lead after insert or update or delete on public.lead
  for each row execute function private.attivita_lead();

-- --- clienti (la creazione la registra gestione-utenti) --------------------
create or replace function private.attivita_clienti()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome text := private.nome_utente(new.id);
begin
  if new.fase is distinct from old.fase then
    perform private.attivita_registra('cliente_fase', format('ha portato «%s» alla fase %s', v_nome, private.etichetta(new.fase)), 'cliente', new.id::text, new.id);
  end if;
  if new.stato_onboarding is distinct from old.stato_onboarding then
    perform private.attivita_registra('cliente_onboarding', format('ha segnato l''onboarding di «%s» come %s', v_nome, private.etichetta(new.stato_onboarding)), 'cliente', new.id::text, new.id);
  end if;
  if new.prossima_call is distinct from old.prossima_call then
    if new.prossima_call is null then
      perform private.attivita_registra('cliente_call', format('ha tolto la prossima call di «%s»', v_nome), 'cliente', new.id::text, new.id);
    else
      perform private.attivita_registra('cliente_call', format('ha fissato la prossima call di «%s» al %s', v_nome, to_char(new.prossima_call at time zone 'Europe/Rome', 'DD/MM HH24:MI')), 'cliente', new.id::text, new.id);
    end if;
  end if;
  if new.note is distinct from old.note then
    perform private.attivita_registra('cliente_nota', format('ha aggiornato la nota di «%s»', v_nome), 'cliente', new.id::text, new.id);
  end if;
  if new.tags is distinct from old.tags then
    perform private.attivita_registra('cliente_tag', format('ha cambiato i tag di «%s» (%s)', v_nome, coalesce(nullif(array_to_string(new.tags, ', '), ''), 'nessuno')), 'cliente', new.id::text, new.id);
  end if;
  if row(new.telefono, new.instagram, new.tiktok) is distinct from row(old.telefono, old.instagram, old.tiktok) then
    perform private.attivita_registra('cliente_contatti', format('ha aggiornato i contatti di «%s»', v_nome), 'cliente', new.id::text, new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists attivita_clienti on public.clienti;
create trigger attivita_clienti after update on public.clienti
  for each row execute function private.attivita_clienti();

-- --- compiti (piano d'azione; quelli di Aura arrivano col service role e non contano) ---
create or replace function private.attivita_compiti()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_padre uuid := case when tg_op = 'DELETE' then old.padre_id else new.padre_id end;
  v_cosa  text := case when (case when tg_op = 'DELETE' then old.padre_id else new.padre_id end) is null then 'la tappa' else 'il sotto-compito' end;
begin
  if tg_op = 'INSERT' then
    if new.origine = 'team' then
      perform private.attivita_registra('compito_creato', format('ha aggiunto %s «%s» a «%s»', v_cosa, left(new.testo, 80), private.nome_utente(new.cliente_id)), 'compito', new.id::text, new.cliente_id);
    end if;
  elsif tg_op = 'UPDATE' then
    if new.stato is distinct from old.stato then
      perform private.attivita_registra('compito_stato', format('ha segnato %s %s «%s» di «%s»', case when new.stato = 'fatto' then 'fatto' else 'da fare' end, v_cosa, left(new.testo, 80), private.nome_utente(new.cliente_id)), 'compito', new.id::text, new.cliente_id);
    elsif row(new.testo, new.link_skool, new.nota_skool, new.pagina) is distinct from row(old.testo, old.link_skool, old.nota_skool, old.pagina) then
      perform private.attivita_registra('compito_modificato', format('ha modificato %s «%s» di «%s»', v_cosa, left(new.testo, 80), private.nome_utente(new.cliente_id)), 'compito', new.id::text, new.cliente_id);
    end if;
  elsif tg_op = 'DELETE' then
    -- Figli cancellati a cascata (la tappa non c'è più): una riga sola, quella della tappa.
    if v_padre is null or exists (select 1 from public.compiti c where c.id = v_padre) then
      perform private.attivita_registra('compito_eliminato', format('ha eliminato %s «%s» di «%s»', v_cosa, left(old.testo, 80), private.nome_utente(old.cliente_id)), 'compito', old.id::text, old.cliente_id);
    end if;
    return old;
  end if;
  return new;
end;
$$;
drop trigger if exists attivita_compiti on public.compiti;
create trigger attivita_compiti after insert or update or delete on public.compiti
  for each row execute function private.attivita_compiti();

-- --- contratti (invito nasce col service role: attore = creato_da; pagato/attivo li registra la funzione) ---
create or replace function private.attivita_contratti()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_per text;
begin
  if tg_op = 'INSERT' then
    v_per := coalesce(new.cliente_nome, new.note, new.programma);
    perform private.attivita_registra('contratto_invito', format('ha creato l''invito al contratto %s per «%s»', new.programma, v_per), 'contratto', new.id::text, new.cliente_id, new.creato_da);
  elsif tg_op = 'UPDATE' then
    v_per := coalesce(new.cliente_nome, new.note, new.programma);
    if new.stato = 'annullato' and old.stato <> 'annullato' then
      perform private.attivita_registra('contratto_annullato', format('ha annullato il contratto di «%s»', v_per), 'contratto', new.id::text, new.cliente_id);
    end if;
  elsif tg_op = 'DELETE' then
    v_per := coalesce(old.cliente_nome, old.note, old.programma);
    perform private.attivita_registra('contratto_eliminato', format('ha eliminato l''invito al contratto di «%s»', v_per), 'contratto', old.id::text, old.cliente_id);
    return old;
  end if;
  return new;
end;
$$;
drop trigger if exists attivita_contratti on public.contratti;
create trigger attivita_contratti after insert or update or delete on public.contratti
  for each row execute function private.attivita_contratti();

-- --- fatture ----------------------------------------------------------------
create or replace function private.attivita_fatture()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.attivita_registra('fattura_creata', format('ha registrato la fattura «%s» di %s per «%s»', new.descrizione, private.euro(new.importo), private.nome_utente(new.cliente_id)), 'fattura', new.id::text, new.cliente_id);
  elsif tg_op = 'UPDATE' then
    if new.pagata and not old.pagata then
      perform private.attivita_registra('fattura_pagata', format('ha segnato pagata la fattura «%s» di «%s»', new.descrizione, private.nome_utente(new.cliente_id)), 'fattura', new.id::text, new.cliente_id);
    elsif row(new.descrizione, new.importo, new.emessa_il, new.pagata, new.pagata_il, new.prossimo_pagamento, new.note) is distinct from row(old.descrizione, old.importo, old.emessa_il, old.pagata, old.pagata_il, old.prossimo_pagamento, old.note) then
      perform private.attivita_registra('fattura_modificata', format('ha modificato la fattura «%s» di «%s»', new.descrizione, private.nome_utente(new.cliente_id)), 'fattura', new.id::text, new.cliente_id);
    end if;
  elsif tg_op = 'DELETE' then
    perform private.attivita_registra('fattura_eliminata', format('ha eliminato la fattura «%s» di «%s»', old.descrizione, private.nome_utente(old.cliente_id)), 'fattura', old.id::text, old.cliente_id);
    return old;
  end if;
  return new;
end;
$$;
drop trigger if exists attivita_fatture on public.fatture;
create trigger attivita_fatture after insert or update or delete on public.fatture
  for each row execute function private.attivita_fatture();

-- --- spese ------------------------------------------------------------------
create or replace function private.attivita_spese()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.attivita_registra('spesa_creata', format('ha registrato la spesa «%s» di %s', new.descrizione, private.euro(new.importo)), 'spesa', new.id::text);
  elsif tg_op = 'UPDATE' then
    if row(new.descrizione, new.importo, new.tipo, new.data, new.attiva) is distinct from row(old.descrizione, old.importo, old.tipo, old.data, old.attiva) then
      perform private.attivita_registra('spesa_modificata', format('ha modificato la spesa «%s»', new.descrizione), 'spesa', new.id::text);
    end if;
  elsif tg_op = 'DELETE' then
    perform private.attivita_registra('spesa_eliminata', format('ha eliminato la spesa «%s»', old.descrizione), 'spesa', old.id::text);
    return old;
  end if;
  return new;
end;
$$;
drop trigger if exists attivita_spese on public.spese;
create trigger attivita_spese after insert or update or delete on public.spese
  for each row execute function private.attivita_spese();

-- --- f24 --------------------------------------------------------------------
create or replace function private.attivita_f24()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.attivita_registra('f24_creato', format('ha aggiunto l''F24 «%s» di %s con scadenza %s', new.descrizione, private.euro(new.importo), to_char(new.scadenza, 'DD/MM/YYYY')), 'f24', new.id::text);
  elsif tg_op = 'UPDATE' then
    if new.pagato and not old.pagato then
      perform private.attivita_registra('f24_pagato', format('ha segnato pagato l''F24 «%s»', new.descrizione), 'f24', new.id::text);
    elsif row(new.descrizione, new.importo, new.scadenza, new.pagato, new.pagato_il) is distinct from row(old.descrizione, old.importo, old.scadenza, old.pagato, old.pagato_il) then
      perform private.attivita_registra('f24_modificato', format('ha modificato l''F24 «%s»', new.descrizione), 'f24', new.id::text);
    end if;
  elsif tg_op = 'DELETE' then
    perform private.attivita_registra('f24_eliminato', format('ha eliminato l''F24 «%s»', old.descrizione), 'f24', old.id::text);
    return old;
  end if;
  return new;
end;
$$;
drop trigger if exists attivita_f24 on public.f24;
create trigger attivita_f24 after insert or update or delete on public.f24
  for each row execute function private.attivita_f24();

-- --- chiamate: «Assegna a questo cliente» dal gestionale ---------------------
create or replace function private.attivita_chiamate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.cliente_id is not null and new.cliente_id is distinct from old.cliente_id then
    perform private.attivita_registra('call_assegnata', format('ha assegnato la call «%s» a «%s»', coalesce(new.titolo, 'senza titolo'), private.nome_utente(new.cliente_id)), 'chiamata', new.id::text, new.cliente_id);
  end if;
  return new;
end;
$$;
drop trigger if exists attivita_chiamate on public.chiamate;
create trigger attivita_chiamate after update of cliente_id on public.chiamate
  for each row execute function private.attivita_chiamate();

-- --- skool_video (la pubblicazione passa dal service role: attore = creato_da) ---
create or replace function private.attivita_skool_video()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.attivita_registra('skool_video_caricato', format('ha caricato il video «%s» per Skool', new.titolo), 'skool_video', new.id::text, null, new.creato_da);
  elsif tg_op = 'UPDATE' then
    if new.stato = 'pubblicato' and old.stato <> 'pubblicato' then
      perform private.attivita_registra('skool_video_pubblicato', format('ha pubblicato su Skool la lezione «%s»', new.titolo), 'skool_video', new.id::text, null, new.creato_da);
    end if;
  elsif tg_op = 'DELETE' then
    perform private.attivita_registra('skool_video_eliminato', format('ha eliminato il video «%s»', old.titolo), 'skool_video', old.id::text);
    return old;
  end if;
  return new;
end;
$$;
drop trigger if exists attivita_skool_video on public.skool_video;
create trigger attivita_skool_video after insert or update or delete on public.skool_video
  for each row execute function private.attivita_skool_video();

-- --- offerte ----------------------------------------------------------------
create or replace function private.attivita_offerte()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.attivita_registra('offerta_creata', format('ha creato l''offerta «%s» (%s)', new.nome, private.euro(new.prezzo)), 'offerta', new.id::text);
  elsif tg_op = 'UPDATE' then
    if new.attiva is distinct from old.attiva then
      perform private.attivita_registra('offerta_attiva', format('ha %s l''offerta «%s»', case when new.attiva then 'attivato' else 'disattivato' end, new.nome), 'offerta', new.id::text);
    elsif row(new.nome, new.prezzo, new.modello) is distinct from row(old.nome, old.prezzo, old.modello) then
      perform private.attivita_registra('offerta_modificata', format('ha modificato l''offerta «%s»', new.nome), 'offerta', new.id::text);
    end if;
  elsif tg_op = 'DELETE' then
    perform private.attivita_registra('offerta_eliminata', format('ha eliminato l''offerta «%s»', old.nome), 'offerta', old.id::text);
    return old;
  end if;
  return new;
end;
$$;
drop trigger if exists attivita_offerte on public.offerte;
create trigger attivita_offerte after insert or update or delete on public.offerte
  for each row execute function private.attivita_offerte();

-- --- tags -------------------------------------------------------------------
create or replace function private.attivita_tags()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.attivita_registra('tag_creato', format('ha creato il tag «%s»', new.label), 'tag', new.id::text);
  elsif tg_op = 'UPDATE' then
    if new.label is distinct from old.label then
      perform private.attivita_registra('tag_rinominato', format('ha rinominato il tag «%s» in «%s»', old.label, new.label), 'tag', new.id::text);
    end if;
  elsif tg_op = 'DELETE' then
    perform private.attivita_registra('tag_eliminato', format('ha eliminato il tag «%s»', old.label), 'tag', old.id::text);
    return old;
  end if;
  return new;
end;
$$;
drop trigger if exists attivita_tags on public.tags;
create trigger attivita_tags after insert or update or delete on public.tags
  for each row execute function private.attivita_tags();

-- --- error_log: «gestito» ---------------------------------------------------
create or replace function private.attivita_error_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.gestito_il is not null and old.gestito_il is null then
    perform private.attivita_registra('errore_gestito', format('ha gestito l''errore «%s»', new.scope), 'errore', new.id::text);
  end if;
  return new;
end;
$$;
drop trigger if exists attivita_error_log on public.error_log;
create trigger attivita_error_log after update of gestito_il on public.error_log
  for each row execute function private.attivita_error_log();

-- Nessun EXECUTE diretto sui trigger: li chiama solo il motore.
revoke execute on function private.attivita_lead() from public, anon, authenticated;
revoke execute on function private.attivita_clienti() from public, anon, authenticated;
revoke execute on function private.attivita_compiti() from public, anon, authenticated;
revoke execute on function private.attivita_contratti() from public, anon, authenticated;
revoke execute on function private.attivita_fatture() from public, anon, authenticated;
revoke execute on function private.attivita_spese() from public, anon, authenticated;
revoke execute on function private.attivita_f24() from public, anon, authenticated;
revoke execute on function private.attivita_chiamate() from public, anon, authenticated;
revoke execute on function private.attivita_skool_video() from public, anon, authenticated;
revoke execute on function private.attivita_offerte() from public, anon, authenticated;
revoke execute on function private.attivita_tags() from public, anon, authenticated;
revoke execute on function private.attivita_error_log() from public, anon, authenticated;
