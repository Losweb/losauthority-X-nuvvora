-- ============================================================================
-- 0053 · Ricerca idee social: 3 keyword per lingua e una top per keyword (10/10/2026)
--
-- Decisione dell'utente: il cliente scrive il tema, Aura sceglie 3 keyword per
-- lingua tra le ricerche VERE di TikTok (completamento automatico della barra
-- di ricerca, con le parole dell'avatar) e il risultato è una top 10 per
-- keyword: 3 top per lingua, fino a 90 video.
--   * `ricerche_tiktok.keyword`: fino a 9 (3 × it, en, es);
--   * `ricerche_tiktok.keyword_lingue`: la lingua di ogni keyword, allo stesso
--     indice (vuoto nelle ricerche precedenti, che restano «una top per lingua»);
--   * `ricerche_tiktok_video.sezione`: nuovo valore `top_keyword` (la keyword è
--     in `query`, la lingua in `lingua`); la posizione è unica per sezione,
--     lingua E keyword (ogni top parte da 1).
-- ============================================================================

alter table public.ricerche_tiktok
  drop constraint ricerche_tiktok_keyword_check,
  add constraint ricerche_tiktok_keyword_check check (cardinality(keyword) between 1 and 9),
  add column keyword_lingue text[] not null default '{}',
  add constraint ricerche_tiktok_keyword_lingue_check
    check (cardinality(keyword_lingue) = 0 or cardinality(keyword_lingue) = cardinality(keyword));

comment on column public.ricerche_tiktok.keyword_lingue is
  'Lingua di ogni keyword allo stesso indice (dal 10/10/2026: una top per keyword). Vuoto = ricerca precedente, una top per lingua.';

alter table public.ricerche_tiktok_video
  drop constraint ricerche_tiktok_video_sezione_check,
  add constraint ricerche_tiktok_video_sezione_check check (sezione in ('top', 'lingua_target', 'top_lingua', 'top_keyword', 'fuori_soglia')),
  -- Una top per keyword ha sempre la sua lingua e la sua keyword.
  add constraint ricerche_tiktok_video_top_keyword_check check (sezione <> 'top_keyword' or (lingua ~ '^[a-z]{2}$' and query is not null)),
  drop constraint ricerche_tiktok_video_posizione_key,
  add constraint ricerche_tiktok_video_posizione_key unique nulls not distinct (ricerca_id, sezione, lingua, query, posizione);

comment on column public.ricerche_tiktok_video.sezione is
  'top_keyword = una top per keyword (keyword in `query`, lingua in `lingua`, dal 10/10/2026); top_lingua = una top per lingua (07-09/10/2026); fuori_soglia = grossi usciti pochi giorni prima della soglia; top e lingua_target = ricerche fatte prima del 07/10/2026.';
