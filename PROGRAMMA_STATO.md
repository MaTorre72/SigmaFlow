# Stato programma: SigmaFlow — Activity Log / Modello caso-visita
Aggiornato: 2026-08-16 17:15

Fase corrente: Migrazione PROD — R2 completata (orchestratrice scritta
e testata), in attesa di revisione prima di R3 (copia reale di PROD)
Titolo: eseguiMigrazioneCompleta_ — vedi AUDIT_MIGRAZIONE_PROD.md v2
Branch: `codex/case-visit-model` (da `codex/activity-log-prep-role`)
Documento di riferimento: `DESIGN_modello_caso_visita.md` (sezione 11, sotto-fasi L1-L6); `AUDIT_MIGRAZIONE_PROD.md` v2 (sez. 4-5) per la migrazione PROD

## Migrazione PROD — R2 (scritta, testata su TEST sintetico, fermata per revisione)

Su istruzione esplicita di Marco (messaggio `claude "..."`, con
riferimento ad `AUDIT_MIGRAZIONE_PROD.md` v2 sez. 4-5): scritta
`eseguiMigrazioneCompleta_(ss, params)` — orchestratrice unica per i 4
passi verso il modello caso/visita (allineamento schema K/L1, backfill
Fase G, correzione `columns_json`, migrazione storica L5 parte 1). NON
include L5 parte 2 (rimozione campi, irreversibile) — resta un gesto
separato, come specificato.

**Ricognizione preliminare** (richiesta esplicitamente prima di
scrivere codice): confermati i nomi esatti di `migrateActivityLogData_`,
`migrateVisiteFromHistory_`, `computeVisiteFromLog_` (invariati).
Confermato che `setupSigmaFlow()`/`ensureCurrentSchema_()` **non
accettano un parametro `ss`** — risolvono sempre lo spreadsheet tramite
la Script Property globale `PROP_SPREADSHEET_ID`.

**Due problemi reali trovati e corretti durante la stesura**, entrambi
riprodotti con un test isolato prima di decidere la correzione (non
assunti):

1. **Ordine dei passi**: eseguire il backfill Fase G *prima*
   dell'allineamento schema (come nell'elenco concettuale originale,
   1-2-3-4) corrompe i dati — `jobToRow_` scrive un array nella forma
   di `JOB_HEADERS` *corrente* dentro un foglio la cui intestazione e'
   ancora quella vecchia: le colonne si disallineano silenziosamente
   (dati shiftati di posizione). Corretto l'ordine interno di
   esecuzione (schema PRIMA, poi backfill) — i nomi dei campi nel
   risultato restano quelli richiesti, per continuita' con la
   descrizione a 4 passi.
2. **Risoluzione dello spreadsheet nelle chiamate annidate**:
   `migrateActivityLogData_`/`migrateVisiteFromHistory_` accettano `ss`
   in superficie, ma funzioni richiamate al loro interno
   (`checkStructuralAlignment_` → `readColumns_` → `readConfig_` →
   `getSpreadsheet_()`, e la scrittura su `visite` in
   `alignOpenVisitFields_`) risolvono lo spreadsheet tramite la Script
   Property globale, non tramite `ss`. Corretto scambiando
   `PROP_SPREADSHEET_ID` sul foglio target per l'**intera**
   orchestrazione (stesso principio di `withTestSpreadsheet_`/
   `withEnvironment_` in `Utils.gs`), non solo per il passo di
   allineamento schema.

`fixPrepColumnRole_(ss)` (nuova): corregge il ruolo della colonna che
`DEFAULT_COLUMNS` assegna a `prep` (oggi `todo`) se sul foglio live
risulta ancora un ruolo diverso — **generica**, confronta
`columns_json` live con `DEFAULT_COLUMNS` per scoprire quale id
dovrebbe avere ruolo `prep`, non hardcoded sul valore osservato su PROD
(`AUDIT_MIGRAZIONE_PROD.md` sez. 2.1). Corregge solo il campo `role`,
lascia `label`/`color`/`order`/`hidden` invariati.

`params.confermaNome` deve corrispondere esattamente a `ss.getName()`,
altrimenti lancia un errore senza modificare nulla.

**Test**: 5 nuovi test dedicati, incluso un end-to-end
(`testEseguiMigrazioneCompletaEndToEndOnOldSchemaData`) che riproduce
esattamente la forma di `JOB_HEADERS` osservata su PROD (31 colonne,
senza `activity_log_json`) e il `columns_json` reale (TO DO a ruolo
`wip`). Estesa anche `gas-harness.js` (`deleteSheet`/`getName`
mancanti su `MockSpreadsheet`). **65/65 test passati**. Push su TEST
eseguito e verificato (13/13 identici).

**Non eseguita su nessuna copia di dati reali** — solo su TEST
sintetico (harness Node), come richiesto esplicitamente. Nessuna azione
su PROD. La Script Property `SIGMAFLOW_TEST_SPREADSHEET_ID` non e'
stata toccata, punta ancora al TEST originale.

### Prossimo passo (fermo qui, in attesa di revisione)

Per procedere a **R3** (esecuzione su una copia reale di PROD, per
AUDIT_MIGRAZIONE_PROD.md sez. 5) serve: (1) Marco crea la copia Google
Sheets di PROD (R0); (2) Marco punta `SIGMAFLOW_TEST_SPREADSHEET_ID`
alla copia (R1); (3) richiesta esplicita separata per eseguire
`eseguiMigrazioneCompleta_` sulla copia (R3) — non prima.

---

Stato precedente (Fase L, chiusa): Marco sta verificando i dati reali
post-migrazione (foglio `jobs`/`visite` con `activity_log_json`
completo). Nessuna incoerenza trovata nella ricostruzione finora — ogni
caso analizzato a mano (incluso JOB-DEMO-1, il piu' complesso con 3
visite, e alcuni con `from` storicamente contraddittorio) torna
esattamente coerente con la sequenza reale degli eventi.

## Richiesta aggiuntiva di Marco, fuori programma L (fatta, verificata)

Marco aveva interpretato la casella "Fatturato" nella card come un
flag di chiusura, aspettandosi una data associata — non esisteva mai,
era un booleano puro, comportamento pre-esistente non introdotto da
questa sessione. Rinominata **"Chiuso"** e collegata al campo
`incarico_chiuso_ts` gia' presente in schema dalla Fase L1 (sez. 3 del
documento: chiusura manuale dell'incarico, indipendente dai movimenti
sulla board) — la spunta imposta il timestamp corrente, la rimozione lo
svuota, nessun re-stamp se il valore non cambia. Il vero ridisegno del
significato del campo resta per una sessione futura (parole di Marco:
"faremo successivamente le modifiche del caso").

Nuovo test dedicato. **61/61 test passati**. Push su TEST eseguito e
verificato (13/13 identici).

## Rinomina chiusura_ts/chiusura_tipo -> rientro_ts/rientro_da (fatta, verificata)

Durante il collaudo Marco ha segnalato confusione tra `visite.chiusura_ts`/
`chiusura_tipo` (quando/da dove il caso e' rientrato, chiudendo la
visita corrente per aprirne una nuova — automatico) e
`jobs.incarico_chiuso_ts` (chiusura definitiva manuale dell'incarico —
concetto diverso). Rinominati su sua richiesta in **`rientro_ts`/
`rientro_da`**, coerenti con la terminologia gia' usata ovunque nel
codice ("rientro diretto da...", `rework_cause`).

`SCHEMA_VERSION` 6->7. Aggiunta `renameVisiteChiusuraFields_` (Schema.gs):
rinomina in loco solo il testo delle intestazioni su un foglio `visite`
con i nomi vecchi, **preservando i dati esistenti** nella stessa
colonna — verificato con uno scenario dedicato (dati con l'intestazione
vecchia, dopo `setupSigmaFlow` tutti i valori risultano intatti sotto
il nuovo nome). Senza questo passo il riallineamento automatico dello
schema avrebbe trattato le vecchie colonne come rimosse, perdendo i
dati gia' scritti sul foglio TEST reale di Marco.

**61/61 test passati**. Push su TEST eseguito e verificato (13/13
identici). Il rename delle intestazioni sul foglio `visite` reale
avviene automaticamente al prossimo caricamento della board (bump di
`SCHEMA_VERSION`), preservando i dati.

## Prossimo passo

In attesa che Marco completi la verifica dei dati post-L5 e confermi
se: (a) la Fase L (caso/visita) puo' considerarsi conclusa su TEST, (b)
procedere con la pianificazione PROD (vedi nota separata sopra), o (c)
altre correzioni/rinomine emergano dal collaudo.

Fase J e Fase K: chiuse. L1: chiusa, gate umano confermato da Marco
("verificato, tutto ok" sul foglio `visite` su TEST) prima di avviare L2.

## L1 — riepilogo (chiuso)

Schema additivo: foglio `visite` nuovo e separato (`VISITE_HEADERS`,
sez. 9.2), `cases`/`CASE_HEADERS`/`refreshCaseVisitCount_` invariati,
`incarico_chiuso_ts` aggiunto a `JOB_HEADERS`, `SCHEMA_VERSION` 4->5.
Push su TEST verificato con `clasp pull` + diff (13/13 file identici).
Dettaglio completo nella cronologia del branch (commit `da56212`,
`cedf8fd`).

## L2 — lavoro svolto (da verificare su TEST, poi gate umano)

Ricognizione mirata su `Kanban.gs` prima di scrivere: confermato che il
guardia anti-reingresso-WIP copriva solo provenienza `stand_by` (non
`done`) e che il ramo di marcatura rework copriva anch'esso solo
`stand_by`, esattamente come segnalato nell'audit L1.

Implementata la regola di apertura/chiusura visita (sez. 2 del
documento di design) in `moveJob` (`Kanban.gs`):

- **Guardia anti-reingresso-WIP esteso**: ora blocca il rientro diretto
  a WIP sia da `stand_by` sia da `done` (prima solo da `stand_by`).
  Normalizzato a confrontare `targetColumn.role === 'wip'` invece del
  solo id letterale `'wip'`, per coerenza con il resto del codice.
- **Chiusura/apertura visita**: qualunque spostamento con provenienza
  `stand_by` o `done` verso `backlog` o `prep` chiude la visita aperta
  (`chiusura_ts`, `chiusura_tipo` = colonna di provenienza) e ne apre
  una nuova (`apertura_ts` = ora, `rework_cause` = `chiusura_tipo`
  della precedente). Uno spostamento tra due colonne di attesa diverse,
  o l'ingresso in `done`, non apre/chiude nulla — la visita resta
  aperta.
- **`consegna_ts`**: si valorizza al primo ingresso in una colonna di
  ruolo `done` entro la visita aperta; non la chiude (la card puo'
  ancora rientrare).
- **Accumulatori per tipo** (`t_cliente_d`/`t_ente_d`/`t_interno_d`):
  incrementati ad ogni uscita da una colonna `stand_by`, qualunque sia
  la destinazione, cercando l'ingresso nella colonna lasciata
  all'indietro nel log (stesso principio di `computeFrom_`, non
  toccato). Mappa fissa colonna->campo aggiunta in `Constants.gs`
  (`SIGMAFLOW.WAIT_ACCUMULATOR_FIELDS`), sugli stessi tre id gia'
  assunti da `REWORK_CAUSES`.
- **Scrittura su `visite` in aggiunta a `jobs`**: la mutazione in-place
  esistente su `jobs` (start_ts/incarico_ts/prep_ts/done_ts/ecc.) resta
  invariata, non ancora rimossa (previsto solo in L5). `visite` si
  aggiorna in parallelo.
- **Bootstrap visita mancante**: i job creati prima di questa sessione
  non hanno ancora una riga in `visite` (la materializzazione storica e'
  L5, non ancora eseguita). Per non bloccare gli spostamenti nel
  frattempo, `moveJob` crea al volo una visita aperta minima se non ne
  trova una per il job — verra' sovrascritta dalla migrazione storica
  autorevole di L5. **Assunzione non esplicitata nel documento di
  design, segnalata qui per visibilita': da confermare o correggere.**
- `ensureCurrentSchema_()` aggiunto in testa a `moveJob` (mancava,
  presente solo in `getBoard()`): garantisce che il foglio `visite`
  esista anche se `moveJob` viene chiamato senza un caricamento board
  precedente.

**Esplicitamente fuori scope in questa sotto-fase** (non implementato):
l'avviso "incarico risulta chiuso" (sez. 3) quando si sposta verso
lavoro attivo un caso con `incarico_chiuso_ts` gia' valorizzato — non
elencato tra i punti che L2 doveva coprire (guardia esteso, regola
apertura/chiusura, accumulatori, consegna_ts) e richiederebbe una
modifica frontend non prevista in questa sessione.

`addJob`, `ActivityLog.gs`, `Model.gs`: non toccati, come richiesto.

## Test dedicati aggiunti (Tests.gs)

7 nuovi test, tutti verificati con l'harness Node (48/48 passati,
nessuna regressione sui 41 preesistenti):

- `testVisitWipToWipDoesNotOpenNewVisit` — wip->wip non apre nulla
- `testVisitStandByReentryOpensNewVisit` — ciclo attesa->rientro apre
  una nuova visita, con chiusura_tipo/rework_cause coerenti
- `testVisitDoneReentryTreatedLikeStandBy` — rientro da done trattato
  come da stand_by (chiude/apre visita, visit_number su jobs coerente)
- `testDoneCannotReturnDirectlyToWip` — guardia esteso verificato
- `testVisitConsegnaTsSetOnDoneWithoutClosingVisit` — consegna_ts si
  valorizza senza chiudere la visita
- `testVisitAccumulatesWaitTimeOnStandByExit` — accumulatore per tipo
  si aggiorna sull'uscita da un'attesa
- `testVisitStandByToStandByDoesNotOpenNewVisit` — spostamento tra due
  attese diverse non apre una nuova visita, accumulatore comunque
  aggiornato

`resetTestDatabase_` esteso per creare/pulire anche il foglio `visite`
tra un test e l'altro (mancava, avrebbe lasciato righe residue).

## Verifica

- Suite test completa: **48/48 passati** (41 preesistenti + 7 nuovi),
  nessuna regressione.
- Push su TEST: **eseguito e verificato**. `clasp pull` in directory
  isolata + diff riga per riga contro i sorgenti locali per tutti i 13
  file — **identici**, nessuna divergenza. La logica L2 e' ora live sul
  progetto Apps Script TEST.

## Bug trovato e corretto durante il collaudo di Marco (commit `b80bba4`)

Marco ha provato gli spostamenti su TEST e incollato l'export del
foglio `visite`. Analizzando i dati: numerazione visite, `chiusura_tipo`
e `rework_cause` incrociati correttamente tra visite consecutive
(`rework_cause` di una visita = `chiusura_tipo` della precedente, come
da sez. 6.1), accumulatori valorizzati anche su uscite dirette
stand_by -> done. Nessun dato scritto da Marco risultava corrotto.

Un bug pero' emergeva in un caso non ancora capitato nei dati di
Marco ma latente: se la PRIMA mossa toccata dal nuovo codice per un job
pre-esistente (nessuna riga `visite` ancora presente) e' proprio quella
che chiude la visita (stand_by/done -> backlog/prep), il bootstrap in
`ensureOpenVisit_` leggeva `job.visit_number` **dopo** l'incremento gia'
applicato in `moveJob`, etichettando la visita che si chiude con lo
stesso numero della nuova che si apre nella stessa mossa. Corretto
passando il numero pre-mossa esplicitamente. Nuovo test dedicato
(`testVisitBootstrapCoincidingWithClosureNumbersCorrectly`) che
riproduce lo scenario — **49/49 test passati**. Push su TEST rieseguito
e riverificato (13/13 identici).

Marco ha confermato ("va bene così") l'assunzione di bootstrap dopo aver
riverificato su TEST. Fase L2 chiusa. Procede L3 nella stessa sessione,
per esplicita richiesta di Marco ("procedi con L3").

## L3 — lavoro svolto (Kanban.gs)

Ricognizione: `applyStructuralAlignment_` (Kanban.gs) e' condivisa da
`addActivityEvent`, `updateActivityEvent`, `deleteActivityEvent` (via
`checkStructuralAlignment_`) e dal ricalcolo della migrazione Fase F
(`migrateSingleJobActivityLog_`, unico altro chiamante). Nessun "dialog
di conferma" separato nel frontend: le correzioni si allineano gia' in
automatico e silenziosamente (comportamento invariato dalla Fase G).
`client.html` verificato: **nessun riferimento a `visite`**, nessuna
modifica frontend necessaria.

Estesa `applyStructuralAlignment_` per allineare, oltre al campo su
`jobs` come gia' faceva, il campo corrispondente sulla **visita aperta
corrente** in `visite` (`incarico_ts`/`prep_ts`/`start_ts`, e
`done_ts` -> `consegna_ts`). `arrival_ts` esclusa (campo di caso, non
di visita, sez. 6.3). Bootstrap riusato da L2 se la visita non esiste
ancora.

**Limite esplicito, dichiarato nel codice**: allinea sempre la visita
APERTA corrente, non quella a cui l'evento corretto apparteneva
storicamente (una correzione su un evento molto vecchio, appartenente
a una visita gia' chiusa, aggiorna comunque la visita aperta oggi).
Identificare con precisione la visita storica giusta e' compito della
migrazione autorevole di L5, non di questo allineamento live — stessa
lettura data al testo del documento ("scrivere sulla visita aperta
corrente").

4 nuovi test dedicati (allineamento su add/update/delete di un evento,
allineamento durante la migrazione Fase F): **53/53 test passati**
(nessuna regressione). Push su TEST eseguito e verificato (13/13
identici).

## Bug trovato e corretto durante il collaudo di Marco (commit `931a45c`)

Marco ha segnalato eventi "WIP -> WIP" / "TO DO -> TO DO" e modifiche
incoerenti nella Cronologia dopo aver corretto alcuni eventi in test
ravvicinati. Causa individuata: **bug preesistente dalla Fase G**
(introduzione dell'activity log, non causato dal modello caso/visita,
ma trovato durante il suo collaudo). `computeFrom_` (`ActivityLog.gs`)
calcolava il `from` di ogni evento cercando indipendentemente "l'ultimo
evento con ts < insertedTs": con due eventi allo **stesso timestamp
esatto** — facile da ottenere, il campo data/ora della Cronologia in
`client.html` ha precisione al minuto (`isoToDatetimeLocal_` tronca i
secondi) — nessuno dei due risultava "prima" dell'altro, ed entrambi
calcolavano lo stesso `from`, ignorandosi a vicenda.

Corretto sostituendo `computeFrom_` con due funzioni che rispettano
l'ordine reale della sequenza invece di confrontare ogni evento in
isolamento: `recalculateMoveFrom_` (per il log gia' completo — lettura
in `getActivityLog`, ricalcolo dopo `deleteActivityEvent`) e
`computeFromForCandidate_` (per l'inserimento di un evento nuovo/
modificato in `buildActivityEventCandidate_` — usato da
`addActivityEvent`/`updateActivityEvent`). A parita' di timestamp
esatto, l'ordine di inserimento decide chi viene "prima", non un
confronto indipendente.

L'evento AUTO "TO DO -> TO DO" visto da Marco e' probabilmente un caso
diverso, genuino: la card e' stata trascinata e rilasciata nella stessa
colonna in cui si trovava gia' — non un artefatto di visualizzazione,
un evento reale auto-registrato da `moveJob` (nessun guardia impedisce
oggi un "self-move"; non necessariamente un problema, da confermare con
Marco se e' un comportamento indesiderato o accettabile).

Nuovo test dedicato che riproduce lo scenario dei timestamp identici.
**54/54 test passati**. Push su TEST eseguito e verificato (13/13
identici).

## Fix aggiuntivo: self-move senza feedback (commit `401d474`)

Marco ha confermato la causa dell'evento "TO DO -> TO DO": la board a
volte non da' un feedback visivo immediato del drag, l'utente rilascia
la card piu' volte pensando che non si sia spostata — genera uno
spostamento verso la colonna in cui la card si trova gia', un evento
"X -> X" senza alcun significato, solo fuorviante in Cronologia.

`moveJob` ora riconosce questo caso (colonna di destinazione = colonna
attuale del job, confrontate normalizzate) e ritorna subito senza
toccare Cronologia, gate su `jobs` ne' `visite`. Nuovo test dedicato.
**55/55 test passati**. Push su TEST eseguito e verificato (13/13
identici).

Nota: la causa di fondo (board poco reattiva, nessun feedback visivo
del drag) resta un problema di UX/performance del frontend, non
affrontato qui — questo fix elimina solo il sintomo nella Cronologia,
non il ritardo percepito nel drag-and-drop.

Marco ha verificato L2/L3 su TEST (Cronologia coerente, self-move senza
traccia) e confermato di procedere con L4 nella stessa sessione.

## Decisione esplicita di Marco su L4 (precondizione bloccante)

Prima di scrivere codice ho segnalato un problema: `visite` non ha
ancora lo storico completo (la materializzazione e' L5, non ancora
eseguita) — spostare subito le metriche di governo a leggere da
`visite` avrebbe fatto apparire il cruscotto TEST con campioni
sparsi/incompleti per la stragrande maggioranza dei job storici (solo
quelli toccati da uno spostamento dopo il deploy di L2 hanno righe
`visite`, via bootstrap). Ho chiesto a Marco come procedere; ha scelto
esplicitamente: **procedere subito con L4, accettando la dashboard
degradata su TEST fino a L5**. Questa e' quindi una regressione VISIBILE
E ATTESA sul cruscotto TEST, non un bug, fino a quando L5 non
materializza lo storico.

## L4 — lavoro svolto (Model.gs)

`calculateMetrics_`/`buildSystemState_` ora derivano osservati,
completati, tempi di servizio e indicatori di rework da `visite`
(`apertura_ts`, `consegna_ts`, `start_ts`/`chiusura_ts`,
`numero_visita`) invece che dai campi derivati su `jobs`
(`arrival_ts`/`service_time_d`/`is_rework`/`visit_number`) — coerente
con sez. 10-11 del documento ("la visita e' la vera unita' che fa
coda"). `workloadMetrics`/`pointsMetrics` restano **invariati** su
`jobs`, come richiesto esplicitamente (`currentWorkload_`/
`pointsStatistics_` non toccate).

Adattate `initiativeGroups_`/`reworkMetrics_`/`leadTimeBySize_` alla
nuova fonte (`job_id`/`numero_visita` al posto di
`case_id`/`visit_number`); aggiunti `indexBy_` (join `visite`→`jobs`
per `size_class`, assente su `visite`), `visitServiceTimeDays_` (sez. 5:
`consegna_ts - start_ts`, o `chiusura_ts - start_ts` se la visita si
chiude senza mai raggiungere `done`), `visitLeadTimeDays_`
(`apertura_ts → consegna_ts`, analogo di `lead_time_d` a livello di
visita). Rimossa `numberJobField_` (diventata morta — l'aliasing
`_d`/`_h` non serve piu', i campi di `visite` sono gia' puliti).

**Nessun cambiamento allo shape dell'output JSON** di `getMetrics()`:
`client.html`/`dashboard.html` verificati, non richiedono modifiche
(confermato leggendo `renderMetrics`/`loadMetrics` in `client.html`).

Test esistenti (`testMetrics`, `testSystemStateInsufficientData`,
`testSystemStateSeparatesFlowFromTimeSamples`,
`testSystemStateWorkload`) adattati per costruire anche l'array
`visite` sintetico accanto a `jobs` (`buildSystemState_` e' ora a 4
argomenti: `jobs, visite, config, now`). `appendCompletedJob_` (helper
di test) estesa per scrivere anche la riga `visite` corrispondente.

2 nuovi test dedicati che provano concretamente lo spostamento della
fonte dati, non solo che i numeri combacino per coincidenza:
- `testGetMetricsUsesVisiteNotJobFields` — un job con `service_time_d`
  "decoy" chiaramente sbagliato su `jobs`, il tempo vero solo su
  `visite`: verifica che `E_S` rifletta `visite`, non il decoy.
- `testWorkloadAndPointsStayOnJobsEvenWithEmptyVisite` — `workloadMetrics`/
  `pointsMetrics` corretti anche con `visite` completamente vuota.

**57/57 test passati**. Push su TEST eseguito e verificato (13/13
identici).

Marco ha confermato L4 e chiesto di procedere con L5 nella stessa
sessione.

## L5, parte 1/2 — migrazione storica (fatta, in attesa di verifica)

Per esplicita indicazione del documento, L5 si divide in due passi con
un gate umano nel mezzo: (1) materializzazione storica di `visite` dal
log — fatta ora; (2) rimozione dei campi duplicati da `JOB_HEADERS` —
**NON fatta**, richiede conferma esplicita separata di Marco dopo aver
verificato il risultato del passo 1 su TEST.

**`computeVisiteFromLog_`** (`ActivityLog.gs`): ricostruisce la
sequenza di visite di un caso dall'intero `activity_log_json`,
applicando in ordine cronologico la stessa regola di apertura/chiusura
gia' live in `moveJob` (sez. 2). Scelta di progetto importante: **non
legge mai il campo `from` memorizzato** (che puo' essere
contraddittorio — vedi "Card A" in
`BUGFIX_derivazione_gate_dal_log.md`: creazione con `to=wip` ma un
evento successivo che dichiara `from=backlog` mai realmente visitato) —
ricostruisce la sequenza delle colonne solo dal `to` di ogni evento, in
ordine. Quel tipo di incoerenza non puo' quindi piu' verificarsi in
questa derivazione. Un rientro diretto da attesa/`done` a WIP nello
storico (impedito dal guardia live, ma possibile su dati precedenti o
corretti manualmente aggirandolo) viene raccolto in un report
(`coherence_warnings`), **non corretto automaticamente** — stesso
principio del documento bugfix.

**`migrateVisiteFromHistory_`** (+ azione API `migrateVisiteFromHistory`,
solo `env:test`, + wrapper `migrateVisiteFromHistoryOnTest` per
l'editor Apps Script, stesso pattern di `migrateActivityLogOnTest` della
Fase F): sovrascrive **integralmente** `visite` con la ricostruzione
autorevole (le righe bootstrap/live di L2/L3 erano provvisorie), e
riallinea i campi derivati ancora presenti su `jobs`
(`incarico_ts`/`prep_ts`/`start_ts`/`done_ts`/`visit_number`/
`is_rework`/`rework_cause`/`service_time_d`/`lead_time_d`/
`wait_time_d`) alla visita aperta risultante — chiude il cerchio sul
bug originale (Card A/Card B) con la derivazione ora corretta, invece
che lasciare quei campi con eventuali valori sbagliati fino alla
rimozione.

## Test e verifica

- 4 nuovi test dedicati, inclusi i due criteri di accettazione
  **espliciti** del documento bugfix: `testComputeVisiteFromLogWipToWipKeepsFirstStartTs`
  (wip->wip non sposta `start_ts` dal primo ingresso) e
  `testComputeVisiteFromLogStandByReentryOpensNewVisit` (rientro
  legittimo da attesa aggiorna correttamente il gate). Piu'
  `testComputeVisiteFromLogFlagsIllegalDirectReentryToWip` e
  `testMigrateVisiteFromHistoryEndToEnd`.
- Verifica aggiuntiva su dataset piu' ampio (60 job demo, via harness
  Node, non solo i test unitari): `jobs_processed: 60,
  jobs_without_log: 0, visite_written: 60, job_fields_realigned: 39,
  coherence_warnings: []` — nessun crash, nessun warning di
  incoerenza segnalato su questo set sintetico.
- **61/61 test passati**. Push su TEST eseguito e verificato (13/13
  identici).
- **La migrazione NON e' ancora stata eseguita sui dati reali di
  TEST** — `migrateVisiteFromHistory` e' solo distribuita, non
  lanciata. Va eseguita da Marco (stesso meccanismo della Fase F:
  aprire l'editor Apps Script, selezionare la funzione
  `migrateVisiteFromHistoryOnTest`, cliccare "Esegui" — nessuna UI
  frontend per questa azione, come gia' per `migrateActivityLogOnTest`).

## Esito della migrazione, eseguita da Marco su TEST

`migrateVisiteFromHistoryOnTest()` eseguita da Marco dall'editor Apps
Script. Risultato verificato con l'export completo del foglio `visite`
(62 righe, tutti i 60 job demo + 2 job creati durante i test manuali di
questa sessione): analisi riga per riga a campione — apertura/chiusura
coerenti tra visite consecutive, `rework_cause` di ogni visita = 
`chiusura_tipo` della precedente, gate vuoti quando il ruolo di
destinazione non li prevede, accumulatori coerenti anche per uscite da
attesa verso `done` o un'altra attesa. Nessuna anomalia trovata.

Confermato da Marco: `coherence_warnings` vuoto nell'esecuzione (nessun
rientro diretto attesa/done->WIP anomalo nello storico).

Osservazione positiva: per JOB-DEMO-1 la ricostruzione completa dal log
intero ha corretto la numerazione/causa che il solo bootstrap
incompleto di L2 aveva stimato in modo approssimato (chiusura_tipo
passato da una stima parziale a quella corretta) — prova diretta che la
migrazione funziona come da disegno.

## L5 parte 2/2 — rimozione campi (eseguita, verificata su TEST)

Marco ha confermato esplicitamente ("prima chiudi L5 su TEST, poi
pensiamo a PROD") dopo aver deciso di posticipare la valutazione PROD a
una sessione separata (vedi nota sotto).

Rimossi da `JOB_HEADERS`: `visit_number`, `start_ts`, `done_ts`,
`service_time_d`, `lead_time_d`, `wait_time_d`, `is_rework`,
`rework_cause`, `incarico_ts`, `prep_ts` — duplicati con `visite`
(sez. 9.1). `SCHEMA_VERSION` 5->6.

**Conseguenze a catena gestite nella stessa sessione** (altrimenti la
board si sarebbe rotta subito dopo la rimozione):

- `addJob` crea subito la visita 1 alla creazione (prima nasceva solo
  al primo `moveJob`).
- `moveJob`/`updateVisiteForMove_`/`ensureOpenVisit_`: il numero della
  nuova visita si calcola da quella aperta trovata/creata
  (`numero_visita+1`), non piu' da `job.visit_number` (che non esiste
  piu' — elimina strutturalmente, non solo corregge, la classe di bug
  del bootstrap di L2).
- **`loadJobsWithVisitSummary_`** (nuova, `Kanban.gs`): `getBoard()` e
  `getMetrics()` ricalcolano `visit_number`/`is_rework`/`rework_cause`/
  `start_ts`/`done_ts` al volo dalla visita piu' recente del caso —
  `client.html` (badge R1/R2, indicatore "fermo da N giorni") e
  `pointsStatistics_`/`monthBuckets_` (`Model.gs`, restano su `jobs`
  per L4) continuano a funzionare **senza alcuna modifica al
  frontend**.
- `checkStructuralAlignment_` semplificata; `correctJobTimestamps`
  ridotta a solo `arrival_ts`; `migrateVisiteFromHistory_` non
  sincronizza piu' verso `jobs` (`syncJobFieldsFromVisit_` eliminata,
  ora priva di effetto).

**Verifica**: 13 test adattati, 1 reso obsoleto e rimosso (bug ora
strutturalmente impossibile). Verificato anche il riallineamento
automatico dello schema (dati con l'intestazione vecchia a 34 colonne
-> nuova a 25) e la migrazione+lettura end-to-end su 60 job demo,
nessun crash. **60/60 test passati**. Push su TEST eseguito e
verificato (13/13 identici).

**Importante**: il riallineamento delle intestazioni sul foglio `jobs`
reale di TEST avviene **automaticamente al prossimo caricamento della
board** (o qualunque azione che triggera `ensureCurrentSchema_`, per
via del bump di `SCHEMA_VERSION`) — le colonne rimosse spariranno dal
foglio con i loro dati. E' il passo irreversibile del programma:
verifica la board/dashboard su TEST dopo il primo caricamento.

## Nota su PROD (discussa, non decisa)

Marco ha chiesto di capire se/come migrare PROD. Emerso dai dati reali
condivisi: **PROD e' su uno schema precedente persino alla Fase G**
(nessun `activity_log_json`) — una migrazione PROD richiederebbe
portare in sequenza Fase G, Fase K, L1-L5, non solo "rilanciare L5".
Raccomandazione data: sequenza incrementale con gate ad ogni passo,
come fatto qui, non un deploy unico. **Nessuna decisione presa,
nessuna azione su PROD in questa sessione.** Da riprendere in una
sessione dedicata quando Marco vorra'.

Nessuna scrittura su PROD in questa sessione.
