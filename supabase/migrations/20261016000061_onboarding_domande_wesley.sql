-- ============================================================================
-- 20261016000061 — Onboarding: tre domande finali su Wesley (16/10/2026)
-- ----------------------------------------------------------------------------
-- Richiesta dell'utente. Tolte dal percorso (la definizione condivisa in
-- supabase/functions/_shared/onboarding/): C3 tentativi_passati, C4 riferimenti,
-- C9 follower e views_medie, D4 ore_per_attivita, F5 ore_percorso e tutto il
-- blocco G Materiali (allegati). Le colonne e files_onboarding restano: le
-- risposte dei clienti vecchi si leggono ancora dal gestionale e da Aura
-- (materiali_testo). In coda al blocco F entrano tre domande nuove, una colonna
-- ciascuna come da regola «id della domanda = colonna».
-- ============================================================================
alter table public.data_onboarding
  add column if not exists come_conosciuto  text,
  add column if not exists perche_wesley    text,
  add column if not exists messaggio_wesley text check (messaggio_wesley is null or length(messaggio_wesley) <= 4000);
comment on column public.data_onboarding.come_conosciuto is 'F6 · Come ha conosciuto Wesley.';
comment on column public.data_onboarding.perche_wesley is 'F7 · Cosa lo ha convinto a scegliere Wesley e non un altro.';
comment on column public.data_onboarding.messaggio_wesley is 'F8 · Messaggio personale a Wesley prima di iniziare (paure, dubbi, aspettative). Opinione del cliente.';
