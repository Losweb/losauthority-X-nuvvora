-- ============================================================================
-- 20261126000075 · Offerta: due strade (versione breve / scheda completa)
--
-- Istruzioni di Wesley del 26/11/2026 («Istruzioni per Aura — la fase Offerta»).
-- Una offerta per cliente: si riusa la riga `offerta` che il cliente ha già (così
-- i lead del CRM collegati restano agganciati). Le colonne di prima restano: sono
-- «l'offerta che porti», che Aura mette alla prova con i sei test. Il contenuto
-- nuovo va nelle colonne qui sotto; la forma di `scheda` è una sola, in
-- supabase/functions/_shared/offerta/forma.ts (Edge Function + frontend).
-- Eccezione documentata a «niente JSON» come per avatar_scheda: ogni riga porta
-- la sua origine (vera / ipotesi) e la scheda si legge e si scrive come documento.
--
-- Scrive solo la Edge Function aura-offerta (service role), come prima.
-- ============================================================================

alter table public.offerta
  -- breve = senza avatar approvato (una frase); completa = con avatar approvato (sette fasi)
  add column strada            text check (strada is null or strada in ('breve', 'completa')),
  -- breve: passi 1-6; completa: fasi 0-7
  add column passo             smallint check (passo is null or passo between 0 and 7),
  add column tipo_vendita      text check (tipo_vendita is null or tipo_vendita in ('servizio', 'prodotto')),
  add column brand             text check (brand is null or length(brand) <= 120),
  -- la frase dell'offerta: «Aiuto [chi] a [cosa] senza [cosa teme] grazie a [la sua cosa]»
  add column frase             text check (frase is null or length(frase) <= 500),
  add column frase_origine     text check (frase_origine is null or frase_origine in ('vera', 'ipotesi')),
  -- quando il cliente l'ha approvata (la «data» della frase)
  add column frase_il          timestamptz,
  add column scheda            jsonb not null default '{}' check (jsonb_typeof(scheda) = 'object' and octet_length(scheda::text) <= 80000),
  -- il blocco «Fermo: cosa, perché conta, cosa serve per ripartire»
  add column fermo             jsonb check (fermo is null or (jsonb_typeof(fermo) = 'object' and octet_length(fermo::text) <= 2000)),
  add column fermo_il          timestamptz,
  -- l'ultima volta che Aura ha letto la mappa Avatar: se la mappa cambia dopo, la pagina lo segnala
  add column avatar_letto_il   timestamptz,
  add column breve_fatta_il    timestamptz,
  add column completa_fatta_il timestamptz,
  -- da quando parte la conversazione col metodo nuovo: i messaggi di prima non entrano nel prompt
  add column nuova_dal         timestamptz;

comment on column public.offerta.scheda is 'Fase Offerta dal 26/11/2026: arrivo, come fanno tutti, versioni con le leve, sei test, mercato, promessa, valore, freni, gradini, bonus, garanzia, presentazione. Righe {t, o} con o = vera|ipotesi. Forma in _shared/offerta/forma.ts.';
comment on column public.offerta.fermo is 'Blocco «Fermo» scritto da Aura (cosa, perche, ripartire); null quando si riparte. Avvisa il team via Telegram.';

-- Le offerte che esistono già: la conversazione col metodo nuovo parte da adesso,
-- con un messaggio di Aura che spiega cosa cambia.
update public.offerta set nuova_dal = now();
insert into public.offerta_messaggi (offerta_id, ruolo, stato, contenuto)
select o.id, 'aura', 'completato',
  'Ciao! Ho cambiato il modo in cui lavoriamo sull''offerta. Adesso partiamo da una frase che dice chi aiuti, dove lo porti e perché proprio tu, e poi, quando il tuo avatar è pronto, costruiamo la scheda completa: mercato, promessa, freni, prezzo e come la presenti.' || E'\n\n' ||
  'Quello che avevamo scritto prima resta: lo uso come la tua offerta di oggi e lo metto alla prova.' || E'\n\n' ||
  'Scrivimi anche solo «partiamo» e ti dico cosa tengo, cosa cambierei e cosa manca.'
from public.offerta o;
