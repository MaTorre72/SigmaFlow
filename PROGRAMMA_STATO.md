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

Nessuna fase attiva. **Collaudo M0-C su TEST fatto da Marco, con un
piccolo follow-up di performance chiuso**: push su TEST eseguito e
verificato (13/13 file identici via `clasp pull` isolato + diff). Suite
completa passata via harness (81/81). Codice sul branch
`feat/m0-a-frontend-perf` (M0-A + M0-A2 + M0-B + M0-C + bugfix +
follow-up salvataggio colonna), non ancora unito a `main` — decisione
di merge non affrontata in questa sessione.

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

## Nota pendente — non affrontata in questa sessione

Durante la ricognizione di M0-A2 sulla lentezza di `getActivityLog` era
emersa un'ipotesi poi smentita per quella funzione specifica (legge
già in modo mirato). Resta però un sospetto distinto, non ancora
verificato, per `getBoard()`/`getMetrics()`: entrambe chiamano
`readTable_` sull'intero foglio `jobs`, che include `activity_log_json`
per OGNI card — un campo che cresce senza limite a ogni evento. Se
questo pesa sensibilmente sul caricamento board/dashboard (non solo su
un singolo job come in `getActivityLog`) è materia per una sessione
diagnostica dedicata, non affrontata qui.

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
