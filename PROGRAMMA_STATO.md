# Stato programma: SigmaFlow — Activity Log / Modello caso-visita
Aggiornato: 2026-08-16 14:40

Fase corrente: L4
Titolo: Modello caso/visita — Model.gs, metriche di governo da 'visite'
Branch: `codex/case-visit-model` (da `codex/activity-log-prep-role`)
Documento di riferimento: `DESIGN_modello_caso_visita.md` (sezione 11, sotto-fasi L1-L6)

Stato: IN_ATTESA_GATE_UMANO

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

## Prossimo passo

1. **Gate umano**: Marco verifica su TEST che il cruscotto mostri le
   metriche attese — **ricordando che per lo storico non ancora
   toccato da uno spostamento sotto il nuovo codice i numeri saranno
   parziali/bassi fino a L5** (non un bug, gia' concordato sopra).
2. Se conferma, prossimo passo e' **L5** (migrazione storica +
   rimozione dei campi duplicati da `JOB_HEADERS`) — l'unico passo
   irreversibile del programma, richiede un gate umano esplicito
   *prima* di qualunque rimozione, solo su TEST. Sessione separata.

Nessuna scrittura su PROD.
