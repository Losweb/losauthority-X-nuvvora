-- ============================================================================
-- 20261128000085 · «Connessione» al posto di «consolidazione» (28/11/2026)
--
-- Wesley: «non voglio che usi il termine consolidazione, ma connessione». La 084
-- aveva portato le idee «consolidazione» a «insegnare»: si spostano a «connessione»
-- (le 23 create prima della 084; quelle nate dopo sono «insegnare» davvero).
-- I blocchi vecchi del metodo in aura_conoscenza (ambito idee, che parlano di
-- «consolidazione») non li legge più nessuno dal 28/11/2026: si spengono.
-- ============================================================================

update public.idee set tipologia = 'connessione'
where tipologia = 'insegnare' and created_at < '2026-11-28 02:15:00+00';

update public.aura_conoscenza set attivo = false where ambito = 'idee' and attivo;
