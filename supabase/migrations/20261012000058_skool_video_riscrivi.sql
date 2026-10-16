-- ============================================================================
-- 0058 · Skool Video: «Riscrivi con Aura» dalla bozza (12/10/2026)
--
-- Dal browser l'admin può rimandare in `scrittura` anche un video già in
-- `bozza` (il testo non convince → Aura lo riscrive dalla stessa trascrizione).
-- Resto del trigger invariato (vedi 0057).
-- ============================================================================

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
  if new.stato is distinct from old.stato and not (
       (old.stato = 'caricamento' and new.stato = 'trascrizione')
    or (old.stato = 'errore' and new.stato in ('trascrizione', 'scrittura'))
    or (old.stato = 'bozza' and new.stato in ('pubblicazione', 'scrittura'))
  ) then
    raise exception 'skool_video: passaggio di stato non consentito' using errcode = 'check_violation';
  end if;
  if new.stato is distinct from old.stato then
    new.errore := null;
  end if;
  return new;
end;
$$;
