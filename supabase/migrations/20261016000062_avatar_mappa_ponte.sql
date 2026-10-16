-- ============================================================================
-- 20261016000062 — Avatar: la mappa completa (ponte, cosa manca, arrivo, nemico)
-- ----------------------------------------------------------------------------
-- Richiesta dell'utente (16/10/2026): nella skill LosAvatar la mappa ha anche il
-- PONTE (cosa vende la persona e con quale passo o gradino porta la fascia
-- all'arrivo), la freccia «gli manca», lo stesso arrivo e, in «quello che hanno
-- in comune», il nemico (un'idea). Nell'adattamento del 16/10 (migrazione 59)
-- erano schiacciati nello snapshot. Ora hanno un campo ciascuno in `avatar`
-- (li vede il cliente nel dossier, sezione «La mappa») e Aura li compila nella
-- Fase 3. Si alzano anche i limiti che tagliavano le frasi: snapshot 1000,
-- quadro 1200, come_usarlo 1500 (le voci delle liste: 400 nel validatore).
-- Punti di forza e criticità della diagnosi diventano obbligatori alla chiusura
-- (lato funzione). I blocchi 16-18 di aura_conoscenza si riscrivono.
-- ============================================================================
alter table public.avatar
  drop constraint if exists avatar_snapshot_check,
  add constraint avatar_snapshot_check check (snapshot is null or length(snapshot) <= 1000),
  add column if not exists cosa_manca text check (cosa_manca is null or length(cosa_manca) <= 400),
  add column if not exists ponte      text check (ponte is null or length(ponte) <= 800),
  add column if not exists arrivo     text check (arrivo is null or length(arrivo) <= 400),
  add column if not exists nemico     text check (nemico is null or length(nemico) <= 300);
comment on column public.avatar.cosa_manca is 'La freccia della mappa: cosa gli manca per arrivare, una riga.';
comment on column public.avatar.ponte is 'Il ponte della mappa: cosa vende il cliente e con quale passo o gradino dell''offerta porta questo avatar all''arrivo (con più fasce, quale gradino serve a quale).';
comment on column public.avatar.arrivo is 'Lo stesso arrivo: il risultato concreto più come vuole sentirsi chi ci arriva.';
comment on column public.avatar.nemico is 'Il nemico: un''idea contro cui si parla, mai una categoria di persone.';

alter table public.avatar_diagnosi
  drop constraint if exists avatar_diagnosi_quadro_check,
  add constraint avatar_diagnosi_quadro_check check (quadro is null or length(quadro) <= 1200),
  drop constraint if exists avatar_diagnosi_come_usarlo_check,
  add constraint avatar_diagnosi_come_usarlo_check check (come_usarlo is null or length(come_usarlo) <= 1500);

-- Fase 3: la proposta della mappa con il ponte, il nemico e la promessa.
update public.aura_conoscenza set contenuto = $t$
Prima di compilare la scheda, proponi la mappa in poche righe. È la mappa della skill, a parole: in alto le fasce, una freccia per ognuna con «gli manca…», al centro il ponte, in basso lo stesso arrivo.
- Le fasce (o l'avatar unico). Per ognuna: chi è, in che situazione si trova, la frase che dice.
- Cosa le manca per arrivare (la scritta sulla freccia), una riga per fascia.
- Il ponte: cosa vende la persona e come porta la fascia dal punto di partenza all'arrivo. Il suo metodo in due o tre passi, oppure i gradini della sua offerta con scritto quale gradino serve a quale fascia. Usa i servizi VERI della scheda onboarding (nomi e prezzi come li ha scritti), non un'offerta inventata. Se l'offerta non è ancora chiara, scrivi la direzione.
- Lo stesso arrivo, in una frase: il risultato concreto più come vuole sentirsi chi ci arriva.
- Quello che hanno in comune: cosa comprano davvero, il nemico (un'idea, mai una categoria di persone), il tono, la promessa in una frase.
- La principale, e perché. Proponi anche la proporzione dei contenuti (es. due su tre alla principale) e di' che è una proposta.
- Chi resta fuori e perché. Chi arriva «più avanti».
- Nella strada D: la direzione scelta.
Chiudi con «Dimmi cosa cambieresti», non con «va bene?». La prima invita a correggere, la seconda a dire sì per cortesia.
Nello stesso turno la mappa va nella scheda: cosa_manca, ponte, arrivo, nemico (e la principale/le altre fasce nello snapshot). Se il cliente corregge, aggiorni quei campi.
Con più fasce: in questa conversazione si compila la scheda della principale; per le altre il cliente farà «Nuovo avatar» e tu ripartirai da quello che sai. Diglielo in una frase.

Come tratti le correzioni
- Corregge un fatto (chi sono i clienti, cosa hanno detto, quanto pagano): ha ragione lei. Accetti subito, ricostruisci, dici cosa cambia.
- Corregge per gusto o per paura («voglio parlare a tutti», «preferisco i grandi»): non discuti di gusti. Torni ai criteri e fai da specchio: «Mi hai detto che con X ci hai messo sei mesi e con Y due settimane. Chi ti conviene oggi per farti un nome?»
- Mette in dubbio una cosa senza portare un motivo: non cambi versione solo per questo. Spieghi perché l'avevi scelta e chiedi cosa non le torna.
- Un dato nuovo smentisce una tua lettura: la ritiri e lo dici. Un messaggio vero di un cliente vale più della tua ipotesi migliore.
La scelta finale resta sua, e di Wesley in chiamata. Tu hai il dovere di farle vedere l'evidenza prima che scelga.
$t$ where ambito = 'avatar' and ordine = 16;

-- Fase 4: dove va ogni cosa, con i campi della mappa.
update public.aura_conoscenza set contenuto = replace(contenuto,
$t$- Cosa gli manca per arrivare + il punto di arrivo → snapshot (3-5 frasi: chi è, cosa gli manca, lo stesso arrivo; «principale» o «secondario»; «estratto da clienti veri» o «in gran parte costruito»; se ci sono altre fasce, quali).$t$,
$t$- La mappa → cosa_manca (la scritta sulla freccia: cosa gli manca per arrivare, una riga), ponte (cosa vende la persona e con quale passo o gradino della sua offerta, con nomi e prezzi veri della scheda, lo porta all'arrivo; con più fasce, quale gradino serve a quale), arrivo (lo stesso arrivo: il risultato concreto più come vuole sentirsi), nemico (l'idea contro cui parli, mai una categoria di persone; la scusa interna va in credenze_limitanti).
- Il riassunto → snapshot (3-5 frasi: chi è e in che situazione, «principale» o «secondario», «estratto da clienti veri» o «in gran parte costruito», se ci sono altre fasce quali e perché restano fuori dai contenuti).$t$)
where ambito = 'avatar' and ordine = 17;

-- Diagnosi: punti di forza e criticità obbligatori; i numeri solo dalla scheda.
update public.aura_conoscenza set contenuto = replace(replace(contenuto,
$t$- punti_forza → per esempio: frasi vere e una prova fresca; un prototipo chiaro tra i clienti.
- criticita → per esempio: una scheda quasi tutta costruita che ha bisogno di clienti veri; credibilità bassa per la fascia scelta.$t$,
$t$- punti_forza → OBBLIGATORIO, almeno una voce: per esempio frasi vere e una prova fresca; un prototipo chiaro tra i clienti; un'offerta già pronta per questo avatar.
- criticita → OBBLIGATORIO, almeno una voce: per esempio una scheda quasi tutta costruita che ha bisogno di clienti veri; credibilità bassa per la fascia scelta; il ponte che poggia su un servizio mai venduto.$t$),
$t$PRIMA DI CHIUDERE, CONTROLLA$t$,
$t$PRIMA DI CHIUDERE, CONTROLLA
- I numeri, le percentuali e i nomi che hai scritto stanno nella scheda onboarding o li ha detti il cliente in questa conversazione. Se un numero ti serviva e non lo avevi, hai scritto «da verificare» invece di inventarlo.$t$)
where ambito = 'avatar' and ordine = 18;
