# Stato SigmaFlow
Aggiornato: 2026-08-16

## Stato generale

Il programma "Activity Log" (Fasi A-K) e il successivo "modello
caso/visita" (Fasi L1-L5) sono **completati**. La migrazione dei dati
reali di PROD è stata eseguita e verificata; il codice è live sul
deployment `@19` dell'unico progetto Apps Script (stesso codice per
`env=test`/`env=prod`, deploy separati). `main` su GitHub è allineato
al codice in produzione.

Cronologia completa fase per fase (Fasi A-K, L1-L5, R0-R5/P4-P8):
[docs/storico/PROGRAMMA_STATO_storico.md](docs/storico/PROGRAMMA_STATO_storico.md).

## In corso

Nessuna fase attiva, nessun gate pendente. Sessione diagnostica su
`activity_log_json` chiusa (vedi sotto): numeri raccolti, nessuna
proposta di soluzione ancora fatta — prossimo passo naturale è
progettare l'archiviazione in una sessione dedicata, quando Marco
vorrà.

`feat/m0-a-frontend-perf`
(M0-A → M0-C + bugfix + follow-up salvataggio colonna) unito a `main`
con PR #3, deployato da Marco sul deployment pubblico.
`fix/prod-schema-version-shared` (bugfix sotto) unito con PR #4, **già
eseguito da Marco su PROD vero (`allineaSchemaSuProd()`) e verificato
da lui direttamente sul foglio**: `notes`/`checklist_json`/
`correction_log_json` rimossi, `status_since_ts` presente e popolato.
Suite completa passata via harness (81/81) a ogni passo.

## Bugfix — PROP_SCHEMA_VERSION condivisa ha saltato il deploy su PROD (2026-08-17)

Dopo che Marco ha aggiornato il deployment pubblico con `main`
(comprendente M0-A → M0-C, `SCHEMA_VERSION` 8→12), ha segnalato che sul
foglio PROD reale `notes`/`checklist_json`/`correction_log_json`
risultavano ancora presenti e `status_since_ts` non esisteva — lo
schema non si era allineato nonostante il codice nuovo fosse live.

**Causa, esattamente il rischio già documentato in
`AUDIT_MIGRAZIONE_PROD.md` §0.1**: `PROP_SCHEMA_VERSION` è una Script
Property condivisa su tutto il progetto Apps Script, non separata per
spreadsheet. Le sessioni di collaudo M0-A/B/C su TEST avevano già
portato quella property al valore corrente (12); al primo caricamento
reale di PROD dopo il deploy, `ensureCurrentSchema_()` ha visto
"versione già allineata" (property globale, non del foglio PROD
specifico) e saltato `setupSigmaFlow()` — pur non avendo mai toccato lo
schema del foglio PROD vero.

**Corretto**: `allineaSchemaSuProd()` (Schema.gs) esegue
`setupSigmaFlow()` direttamente sul foglio PROD vero, bypassando il
controllo sulla property condivisa — additivo/idempotente su ogni suo
passo, nessun rischio nuovo rispetto a quanto già verificato su TEST e
sulla copia di PROD nelle sessioni precedenti. Stesso pattern di
sicurezza di `eseguiMigrazioneCompletaSuProd` (id/nome verificati
indipendentemente, si ferma da sola se non corrispondono).

81/81 test via harness Node. Push su TEST verificato (13/13 file
identici). PR #4 unita a `main`. **Eseguita da Marco su PROD vero e
confermata**: schema allineato, nessuna anomalia riscontrata.

## Collaudo M0-C su TEST — falso allarme + follow-up di performance reale (2026-08-17)

Marco ha segnalato che il badge aging "funziona ma è lentissimo ad
aggiornarsi dopo una modifica a una colonna, serve ricaricare tutta la
lavagna". Non avendo accesso al deployment TEST reale (richiede login
del dominio sigmapiu.it), ho costruito una riproduzione interattiva
fedele del codice reale — markup di `board.html` + script di
`client.html` veri, `google.script.run` simulato, servita da un vero
server HTTP locale (non uno snapshot statico) — ed eseguito lo stesso
scenario nel Browser pane.

**Primo giro**: nessun bug — il badge si aggiornava correttamente senza
reload. Causa del malinteso di Marco: probabile tab del browser rimasta
aperta da prima dell'ultimo push, quindi ancora su JS vecchio (confermato
dopo un refresh forzato).

**Secondo giro, dopo conferma di Marco** ("si aggiorna ma è molto molto
lento"): trovata una causa reale di lentezza, non un'illusione.
`saveColumnSettings`/`moveColumn` chiamavano `updateColumn`/`addColumn`/
`moveColumn` e POI `loadBoard(true)` — un secondo round-trip completo
(`getBoard()`, che rilegge jobs+visite oltre alle colonne) solo per
riottenere `columns` che la risposta del primo salvataggio conteneva
già. Su Apps Script ogni round-trip costa un paio di secondi fissi
(stesso principio di M0-A): raddoppiarlo per un salvataggio di colonna
si sentiva parecchio.

**Corretto**: nuovo `applyColumnsResponse_` — aggiorna `state.columnMeta`
dalla risposta già in mano e ridisegna in locale, un solo giro di rete
invece di due. `show-hidden-columns-button` lasciato apposta su
`loadBoard(true)`: più `updateColumn` in parallelo sullo stesso
`columns_json` rischiano di sovrascriversi a vicenda lato server, un
`getBoard()` dopo che tutte sono finite è l'unico modo sicuro di
rileggere lo stato vero. Verificato di nuovo con la stessa riproduzione
interattiva: un solo round-trip, badge aggiornato.

**81/81 test passati** (nessuna modifica lato backend). Commit
`a64786d`. Push su TEST eseguito e verificato (13/13 file identici). I
file temporanei della riproduzione (server Node + pagina HTML +
`.claude/launch.json`) sono stati rimossi a fine verifica, mai
committati.

## Sessione M0-C bugfix — backfill status_since_ts (2026-08-17)

Trovato in uso reale su TEST dopo M0-C: la migrazione additiva
(corretta per principio — mai inventare dati per righe già esistenti)
lasciava `status_since_ts` vuoto per tutti i job già presenti, ma
`daysSince('')` ritorna 0 — quei job non risultavano mai in aging finché
non venivano spostati almeno una volta. Proprio le card ferme da più
tempo, che nessuno tocca, restavano silenziosamente escluse dal
meccanismo che dovrebbe segnalarle.

**Aggiunta `backfillStatusSinceTs_`** (Schema.gs, stesso punto di
`setupSigmaFlow` dove vive già la migrazione di `aging_days`): per ogni
job con `status_since_ts` vuoto, cerca nell'`activity_log_json` l'evento
move più recente con `to` uguale allo status attuale — riusando
`lastEntryTsForColumn_` (Kanban.gs) già esistente, nessuna
reimplementazione della ricerca all'indietro nel log. Fallback ad
`arrival_ts` se il log non ha un evento simile (dato storico anomalo);
campo lasciato vuoto se anche `arrival_ts` manca — nessuna base su cui
stimare, meglio "non ancora noto" di una data inventata. Idempotente:
non tocca job che hanno già `status_since_ts` (mossa reale successiva a
M0-C). `SCHEMA_VERSION` 11->12 perché la migrazione riparta
automaticamente al prossimo controllo schema, senza azione manuale di
Marco.

**81/81 test passati** (77 + 4 nuovi: match nel log con timestamp
esatto — non "ora" — quando c'è più di un evento verso lo status
attuale; fallback ad `arrival_ts` quando lo status attuale non compare
mai come `to` nel log; nessuna base disponibile → campo lasciato vuoto;
idempotenza su job già valorizzati). Commit `6e27f59`. Push su TEST
eseguito e verificato (13/13 file identici).

**Tempo di backfill misurato** su un dataset realistico (60 job, harness
Node, simulando lo stato pre-backfill di TEST): 4ms di puro calcolo JS.
Il costo reale su Apps Script sarà dominato dalle due chiamate Sheets
API (una lettura, una scrittura), non dal ciclo per-job — dato utile
per la nota pendente sotto, anche se questa migrazione gira una volta
sola e non è la stessa cosa di letture ripetute a ogni caricamento.

## Sessione M0-C — aging configurabile per colonna (2026-08-17)

Sostituisce la soglia fissa `role==='stand_by' && daysSince(start_ts||arrival_ts) > 5`
— sbagliata sia nel riferimento temporale (misurava da inizio
lavorazione, non da quando la card è entrata nella colonna attuale) sia
nella soglia (uguale per tutte le attese) — con `aging_days`
configurabile per colonna, applicabile a qualunque ruolo.

**Ricognizione**: confermato che la regola "aging" viveva duplicata fra
il ciclo colonne di `renderBoard()`, `renderCard()` e
`updateColumnCounters_()` di M0-B (tre copie della stessa condizione).
Unificata in `isJobAging_(job, column)`/`countAgingInColumn_(jobs, column)`,
usate da tutti e tre i punti.

**Backend**:
- `status_since_ts` aggiunto a `JOB_HEADERS` (`SCHEMA_VERSION` 10->11).
  `addJob` lo imposta alla creazione; `moveJob` solo sui cambi di
  colonna reali, mai sul self-move. Il job restituito da `moveJob` lo
  porta già aggiornato (stesso principio dei campi di rientro di
  M0-A2), così l'aggiornamento incrementale di M0-B lo riflette senza
  reload.
- `aging_days` opzionale in `columns_json`. Migrazione una tantum in
  `setupSigmaFlow` (`seedAgingDaysForStandByColumns_`): scrive 5 solo
  sulle colonne `stand_by` ancora prive del campo, idempotente, non
  tocca altri ruoli né colonne già configurate. `DEFAULT_COLUMNS` (solo
  ambienti nuovi/vuoti) lo popola direttamente: 5/15/45 per attesa
  interna/cliente/enti (valori di esempio di Marco).
- **Bugfix trovato in ricognizione, non nell'elenco originale**:
  `normalizeColumns_`/`writeColumns_` (Utils.gs) e `columnMeta` in
  `getBoard()` (Kanban.gs) ricostruivano ogni colonna con un elenco
  fisso di campi che non includeva `aging_days` — senza questa
  correzione, leggere o scrivere QUALUNQUE colonna avrebbe
  silenziosamente cancellato `aging_days` da tutte le altre. Tre copie
  dello stesso problema, tutte e tre corrette.

**Frontend**: badge di colonna mostra la soglia effettiva (`>15g`
invece del fisso `>5g`). Campo "Evidenzia dopo (giorni)" nel pannello
Impostazioni colonna, vuoto ammesso (evidenziazione disattivata per
quella colonna).

**Verifica manuale** (nessun test copre il DOM, come nelle sessioni
precedenti): argomentata leggendo il codice — un solo punto costruisce
il badge (`countAgingInColumn_`), un solo punto decide se una card è
"in aging" (`isJobAging_`), entrambi usati sia dal redraw completo sia
dall'aggiornamento incrementale di M0-B, nessuna copia residua
(verificato via grep: zero occorrenze di `staleCount`/`isStale`/
`role === 'stand_by'` fuori dalle due funzioni unificate).

**77/77 test passati** (69 + 8 nuovi: `status_since_ts` su creazione/
mossa reale/self-move, `aging_days` di default nel `column_meta`,
colonna non configurata senza evidenziazione, migrazione una tantum
solo sulle colonne prive e idempotente, regressione sul bug di
`writeColumns_`). Commit `437fe2e`. Push su TEST eseguito e verificato
(13/13 file identici).

## Sessione M0-B — rendering incrementale della board (2026-08-17)

**Ricognizione**: mappati tutti gli 11 punti che chiamavano
`renderBoard()` (redraw completo — svuota e ricostruisce l'intero DOM,
tutte le colonne/card/listener). Sei legittimi così come sono e non
toccati: cambio filtro (`reset-filters-button`, `filter-priority`,
`toggleFilter`), caricamento board (`loadBoard`, usato sia per il primo
caricamento sia per il polling — trattato come "caricamento", non come
operazione su un job), rollback dopo errore su `moveJob`/`deleteJob`.
Un settimo (`toggleColumnSort`) lasciato volutamente fuori scope e
segnalato con una nota nel codice: un cambio di ordinamento può
riposizionare tutte le card di una colonna, non una sola — un
aggiornamento incrementale utile richiederebbe comunque di ridisegnare
l'intera colonna (ottimizzazione futura possibile, non necessaria ora).
I quattro rimanenti (`moveJob`, `deleteJob`, `saveCardFromModal` per
salvataggio e creazione) riguardano tutti un singolo job: resi
incrementali.

**Implementazione**: nuovi helper `findColumnMeta_`/`findColumnEl_`
(lookup), `updateColumnCounters_` (ricalcola conteggio/punti/badge
"fermo da" di una sola colonna dal solo `state.board` locale, senza
toccare le card già renderizzate), `placeCardInColumn_` (rimuove/
reinserisce il nodo della card nella posizione corretta per
ordinamento/filtri correnti, riusando `renderCard` — stessa funzione
del redraw completo, nessuna logica duplicata), `removeCardEl_`.
`moveJobLocally`/`removeJobLocally` ora restituiscono la colonna di
provenienza (prima solo un booleano), necessaria per aggiornarne i
contatori insieme a quelli della colonna di arrivo. I badge introdotti
in M0-A2 (rework count in Informazioni, anteprima Cronologia) non sono
nel loop di `renderBoard()`/`renderCard()`: verificato che restano
invariati, non toccati.

**Verifica manuale esplicita** (nessun test automatico copre il
rendering DOM): per un singolo drag-and-drop, prima di M0-B
`renderBoard()` svuotava `#kanban-board` e ricreava OGNI colonna
visibile e OGNI card al loro interno (in un dataset da 50-60 card,
decine di nodi DOM + listener ricreati per un solo spostamento). Dopo
M0-B, `moveJob()` chiama `placeCardInColumn_` (che tocca al massimo 2
nodi `.card`: quello vecchio rimosso, quello nuovo inserito — mai più
di uno per colonna) e `updateColumnCounters_` (aggiorna 2-3 nodi di
testo `.count-badge`/`.points-badge`/`.stale-badge` per le sole 2
colonne coinvolte, provenienza e arrivo) — dimostrabile leggendo il
codice: nessuna chiamata a `renderBoard()`/`root.innerHTML` resta nel
percorso di successo di `moveJob`/`deleteJob`/`saveCardFromModal`,
confermato anche dal grep sui chiamanti rimasti (sopra). Le colonne non
coinvolte nell'operazione non vengono mai interrogate.

**69/69 test passati** (nessuna modifica lato backend, solo
`client.html`). Commit `b4ac93d`. Push su TEST eseguito e verificato
(13/13 file identici).

## Sessione diagnostica — peso reale di activity_log_json su TEST (2026-08-17)

Chiude la nota pendente lasciata da M0-A2 (sospetto su
`getBoard()`/`getMetrics()`, mai verificato). Sessione **solo lettura**:
nessuna modifica a schema/dati/codice di produzione. Misurato con
funzioni temporanee (`Diagnostica.gs`, rimosso a fine sessione, dati
sotto) eseguite da Marco dall'editor sul database TEST reale (50 job,
dati migrati da PROD — non il dataset demo sintetico). Dove un dato non
era misurabile in modo affidabile su questo dataset è dichiarato
esplicitamente, non stimato.

**1. Peso reale**: `activity_log_json` totale 7.643 byte su 50 card
(media 152,86 byte/card, mediana 151, più pesante `JOB-20260707-0ZU7`
con 323 byte). Rispetto al totale trasportato da una lettura completa
di `jobs` (18.970 byte su tutti i campi, tutte le righe):
**40,29%** — quasi metà del peso di ogni lettura è quel solo campo.

**2. Distribuzione per stato**: card concluse (`done`, 9 card) 1.296
byte totali, media 144/mediana 144. Card attive (41 card) 6.347 byte
totali, media 154,8/mediana 153 — **le card attive sono leggermente
più pesanti in media (+7,5%), non il contrario**, e la card più pesante
in assoluto è tra le attive. Il peso totale è concentrato sulle attive
solo perché sono la maggioranza (82% delle card, 83% dei byte — stessa
proporzione, nessun eccesso). **Implicazione per l'archiviazione**:
archiviare solo le card chiuse toglierebbe solo ~17% del peso totale,
non risolverebbe la maggior parte del problema — conferma l'ipotesi di
Marco sul rischio di una soluzione parziale.

**3. Correlazione con numero di visite — NON misurabile su questo
dataset**: tutte e 50 le card hanno `MAX(numero_visita) = 1` in
`visite`, nessuna ha mai un rientro registrato in questo campione.
Nessuna base di confronto tra bucket (2, 3, 4+ rientri tutti vuoti).
Serve un dataset con job effettivamente rientrati per rispondere alla
domanda "i log crescono con i rientri?" — non deducibile da questi
numeri.

**4. Costo di lettura reale**: `getBoard()` completo, media 852ms
(mediana 696, dev.std 312,7, un campione a 1.453ms). Isolando solo la
lettura del foglio `jobs`: **con** `activity_log_json`
(`getDataRange()`) media 420ms/mediana 158ms/**dev.std 402,5**
(campioni tra 123 e 1.179ms); **senza** quella colonna (due `getRange`
mirati) media **9,8ms**/mediana 8ms/dev.std 2,7 (campioni tra 8 e
15ms). **~40-50 volte più lento con il campo incluso, anche solo su 50
righe e ~7,6KB totali** — e la variabilità stessa crolla di due ordini
di grandezza togliendolo: `activity_log_json` non solo pesa in media,
introduce anche imprevedibilità nel tempo di lettura. Misurato
server-side (Apps Script + Sheets API); il vero round-trip da browser
via `google.script.run` (che include il costo fisso di rete/dispatch
già isolato in M0-A) non è stato raccolto in questa sessione — nessuno
snippet lato browser eseguito da Marco.

**5. Proiezione di crescita — NON affidabile su questo dataset**: solo
1 card su 50 ha un log con almeno due eventi con timestamp validi
(quindi un ritmo calcolabile: 1,43 eventi/mese). Le altre 49 hanno un
log a un solo evento — verosimilmente l'evento di creazione ricostruito
dalla migrazione storica di PROD, non una cronologia di uso reale
accumulata dopo il deploy. Un tasso derivato da un singolo campione non
è una stima di popolazione affidabile: **non è possibile proiettare il
peso a 6/12 mesi da questi dati**. Servirà rimisurare quando ci sarà
più uso reale post-deploy accumulato.

Nessuna proposta di soluzione in questa sessione, come richiesto — solo
numeri, per la sessione di design dell'archiviazione.

## Sessione M0-A2 — follow-up dall'uso reale (2026-08-17)

Quattro correzioni, alcune collegate tra loro, emerse collaudando M0-A:

1. **Cronologia lenta (ipotesi di partenza smentita in ricognizione)**:
   il sospetto era che `getActivityLog` leggesse l'intero foglio `jobs`
   (`readTable_`, incluso `activity_log_json` di ogni card) per poi
   usarne una sola riga. Verificato che non è così: usa già
   `findRowById_` + `readJobFromRow_`, lettura mirata a una singola
   riga/colonna, nessuna scansione dell'intero foglio. **Causa reale
   trovata**: M0-A stessa aveva introdotto un secondo round-trip
   indipendente a `getActivityLog` per la stessa card — uno per
   l'anteprima "Cronologia recente" all'apertura della card, uno per il
   tab Cronologia al click. Su Apps Script il costo fisso per chiamata
   (1-3s, dispatch server-side) pesa più della quantità di dati letti:
   raddoppiarlo per la stessa card era il vero rallentamento. Unificato
   in un solo fetch per apertura di card (`loadActivityLogForModal_`,
   chiamato da `openCardModal`), riusato da entrambe le viste; il
   cambio tab ora ridisegna solo dalla cache in `state.activityLog`,
   nessuna nuova chiamata.
2. **Bugfix — badge rientri (Rnn) fermo dopo una mossa**: effetto
   collaterale di M0-A, come previsto nel ticket. `moveJob` ora
   restituisce il job con `visit_number`/`is_rework`/`rework_cause`
   già ricalcolati (fattorizzato `applyVisitSummaryFields_` da
   `loadJobsWithVisitSummary_`, riusa la visita già in mano da
   `updateVisiteForMove_` — nessuna lettura sheet aggiuntiva); il
   client aggiorna solo la card spostata (`mergeJobIntoState` +
   `renderBoard()`), senza reload completo. Gestito anche il caso
   self-move (stessa colonna): senza i campi di rientro nella risposta,
   il merge avrebbe cancellato un badge già corretto.
3. **Gap colmato**: badge "Rnn" (stesso stile di quello sulla card)
   aggiunto nel tab Informazioni, vicino al riquadro Cronologia
   recente — prima il numero di rientri era leggibile solo nelle
   `visite` o aprendo la tab Cronologia.
4. **Coerenza**: l'anteprima Cronologia recente (M0-A) mostrava gli
   eventi dal più recente al più vecchio; la tab Cronologia esistente
   dal più vecchio al più recente. Uniformato all'ordine della tab
   esistente (non toccata).

**69/69 test passati** (67 + 2 nuovi, sulla risposta diretta di
`moveJob`: mossa reale e self-move). Commit `26d2401`. Push su TEST
eseguito e verificato (13/13 file identici).

## Sessione M0-A — manutenzione frontend/performance (2026-08-17)

Cinque modifiche indipendenti, tutte implementate e testate via
harness Node (67/67, verifica su TEST in sospeso per il blocco clasp
sopra):

1. **Niente reload dopo mosse ottimistiche** — `moveJob`/`deleteJob` in
   `client.html` non richiamano piu' `loadBoard(true)` sul successo (lo
   stato era gia' aggiornato in locale): risparmia una rilettura
   completa di `jobs`+`visite` a ogni drag-and-drop/eliminazione. Sul
   fallimento il rollback ora e' seguito da un `loadBoard(true)` per
   riallinearsi allo stato server vero (prima si tornava solo alla
   board precedente in locale).
2. **Polling in pausa a tab nascosta** — il polling a 45s si ferma
   quando `document.visibilityState !== 'visible'` e riparte al ritorno
   in foreground con un refresh immediato (non solo la ripresa del
   timer).
3. **Metriche pigre** — `loadMetrics()` non parte piu' al caricamento
   pagina: solo al primo click sulla tab Dashboard, con cache in
   sessione (`state.metricsLoaded`); il bottone dati demo TEST forza un
   refresh esplicito (`loadMetrics(true)`) perche' i dati sono
   davvero cambiati.
4. **Rimossi `notes`/`checklist_json`/`correction_log_json`** da
   `JOB_HEADERS` (`SCHEMA_VERSION` 9->10). La ricognizione ha trovato
   residui reali non previsti dalla nota precedente in questo file:
   scritture in `addJob`/`updateJob`/`correctJobTimestamps` (Kanban.gs),
   letture di migrazione in `migrateSingleJobActivityLog_`
   (ActivityLog.gs, i due rami che spostavano `correction_log_json`
   verso eventi di correzione e `checklist_json` in coda a
   `description` — ora dead code, rimossi insieme ai campi, la
   migrazione reale che li consumava e' gia' stata eseguita su PROD),
   e due test che esercitavano `checklist_json` end-to-end
   (`testAmbassadorAndChecklist` semplificato in `testAmbassadorOption`,
   `testMigrateToActivityLogChecklist` rimosso). `setupOldProdShapedSheet_`
   (fixture schema storico pre-migrazione) lasciata invariata apposta.
5. **Bugfix + feature Cronologia**: `activityEventDescription_` in
   `client.html` ignorava `event.note` sugli eventi di tipo `move` —
   la nota si vedeva solo aprendo l'evento in modifica, mai scorrendo
   la Cronologia. Corretto (append `— nota` alla descrizione). Aggiunto
   un riquadro "Cronologia recente" nel tab Informazioni (sopra
   Descrizione, che resta invariata — note libere dell'utente,
   concettualmente separate), 7 eventi piu' recenti, sola lettura,
   riusa `activityEventDescription_` senza duplicarla.

## Prossimi passi noti

Raccolti da Marco il 16/08/2026, nessuna priorità assegnata (il punto
sulla pulizia campi e' stato chiuso in M0-A, vedi sopra):

- **Frontend lentissimo** — M0-A (punti 1-3 sopra) affronta le cause a
  piu' alto impatto individuate in ricerca (reload ridondanti, polling
  sempre attivo, metriche caricate a freddo). Restano, non affrontate:
  rendering completo del DOM ad ogni `renderBoard()` (ricostruisce
  tutte le colonne/card anche per una singola modifica) e la crescita
  nel tempo dei fogli Google Sheets (`getDataRange().getValues()`
  rilegge tutto ad ogni chiamata).
- **Ricostruzione date reali delle card di PROD** — molte card reali
  hanno `arrival_ts`/`apertura_ts` mancanti; oltre al fallback già
  implementato (data dal nome del job, `extractDateFromJobId_`), mail e
  date di creazione delle cartelle di progetto sono fonti future per una
  ricostruzione più accurata caso per caso.
- **Migliore allineamento e lettura della dashboard alla dispensa FSC**
  — riferimento a un documento/manuale FSC esterno da riprendere.

## Riferimenti tecnici correnti

- Design del modello caso/visita: [docs/DESIGN_modello_caso_visita.md](docs/DESIGN_modello_caso_visita.md)
- Architettura (schema fogli, backend, frontend): [docs/architecture.md](docs/architecture.md)
- Metriche dashboard: [docs/dashboard-metrics.md](docs/dashboard-metrics.md)
- Testing e sicurezza: [docs/testing-and-security.md](docs/testing-and-security.md)
- Setup Google Workspace: [docs/google-workspace-setup.md](docs/google-workspace-setup.md)
