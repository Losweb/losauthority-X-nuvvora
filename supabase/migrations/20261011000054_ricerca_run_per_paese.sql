-- ============================================================================
-- 0054 · Ricerca idee social: una run Apify per lingua, dal suo paese (11/10/2026)
--
-- TikTok adatta i risultati al paese da cui si cerca: una keyword italiana
-- cercata da un server fuori Italia restituiva pochi video italiani recenti
-- (prova del 11/10/2026: 0-3 video per keyword). Ora ogni lingua ha la sua run
-- (it → IT, en → US, es → ES) con i filtri nativi di TikTok «più piaciuti» e
-- «ultimi 6 mesi». `apify_run_ids` = le run della ricerca (fino a 3);
-- `apify_run_id` resta per le ricerche precedenti (una sola run).
-- ============================================================================

alter table public.ricerche_tiktok
  add column apify_run_ids text[] not null default '{}',
  add constraint ricerche_tiktok_apify_run_ids_check check (cardinality(apify_run_ids) <= 3);

comment on column public.ricerche_tiktok.apify_run_ids is
  'Run Apify della ricerca, una per lingua dal suo paese (dal 11/10/2026). Vuoto = ricerca precedente con la sola apify_run_id.';
