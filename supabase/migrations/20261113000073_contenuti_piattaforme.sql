-- ============================================================================
-- 20261113000073 · Contenuti: stato di programmazione per piattaforma
--
-- Richiesta dell'utente del 13/11/2026: nella scheda del video tre riquadri
-- (TikTok, Instagram, YouTube) con «da programmare» / «programmato». Li legge e
-- scrive anche l'agente IA che carica e programma i contenuti. Nessun vincolo
-- sulla fase: la regola «in Pubblicato solo con tutte e tre programmate» è
-- dell'agente, non del database né dell'interfaccia (scelta dell'utente).
-- ============================================================================

alter table public.contenuti
  add column tiktok_stato    text not null default 'da_programmare' check (tiktok_stato in ('da_programmare', 'programmato')),
  add column instagram_stato text not null default 'da_programmare' check (instagram_stato in ('da_programmare', 'programmato')),
  add column youtube_stato   text not null default 'da_programmare' check (youtube_stato in ('da_programmare', 'programmato'));

-- I contenuti già pubblicati si considerano programmati ovunque.
update public.contenuti
   set tiktok_stato = 'programmato', instagram_stato = 'programmato', youtube_stato = 'programmato'
 where stato = 'pubblicato';

comment on column public.contenuti.tiktok_stato is 'Programmazione su TikTok: da_programmare | programmato (la scrive anche l''agente IA).';
comment on column public.contenuti.instagram_stato is 'Programmazione su Instagram: da_programmare | programmato (la scrive anche l''agente IA).';
comment on column public.contenuti.youtube_stato is 'Programmazione su YouTube: da_programmare | programmato (la scrive anche l''agente IA).';
