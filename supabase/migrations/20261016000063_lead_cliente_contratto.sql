-- ============================================================================
-- 20261016000063 — Leads → Clienti → Contratto: il filo tra le tre pagine
-- ----------------------------------------------------------------------------
-- Richiesta dell'utente (16/10/2026): la pagina Pipeline si chiama «Leads»; un
-- lead portato allo stage «cliente» compare SUBITO nella pagina Clienti, ma in uno
-- stato a parte («in attesa di contratto», senza scheda apribile) finché non
-- firma il contratto. Da lì un bottone crea l'invito al contratto già intestato
-- a lui; quando il pagamento viene registrato l'account nasce (o si riusa) come
-- oggi e il lead viene agganciato al cliente, così non si crea un doppione.
--   contratti.lead_id → da quale lead è nato l'invito (prefill dei dati del cliente)
--   lead.cliente_id   → l'account che quel lead è diventato (null = ancora in attesa)
-- ============================================================================
alter table public.contratti
  add column if not exists lead_id uuid references public.lead(id) on delete set null;
create index if not exists contratti_lead_idx on public.contratti (lead_id) where lead_id is not null;
comment on column public.contratti.lead_id is 'Il lead da cui è nato l''invito (pagina Leads): i suoi dati precompilano il modulo del cliente.';

alter table public.lead
  add column if not exists cliente_id uuid references public.clienti(id) on delete set null;
create index if not exists lead_cliente_idx on public.lead (cliente_id) where cliente_id is not null;
comment on column public.lead.cliente_id is 'L''account cliente nato dal contratto di questo lead. Null = lead in stage «cliente» ma ancora senza contratto pagato (compare in Clienti come «in attesa di contratto»).';
