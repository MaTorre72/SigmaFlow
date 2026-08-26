# SigmaFlow — Ambiente e lock globale (design)

> Prosegue la numerazione a lettere del progetto — **P**, la fase
> successiva a O (Performance backend, completa e unita a `main` il
> 2026-08-25, commit `32e6d43`/PR #11). Nasce da una domanda diretta di
> Marco dopo la chiusura di O — "perché non si può togliere il lock
> globale sulle sole letture?" — e da un'analisi approfondita, funzione
> per funzione, del meccanismo di risoluzione dell'ambiente
> (TEST/PROD) e del lock che lo avvolge, richiesta esplicitamente con
> attenzione al fatto che il codice porta i segni di più patch
> successivi non del tutto organici sullo stesso meccanismo (il fix del
> 2026-08-19 e la sua recidiva del 2026-08-25, entrambi su
> `PROP_SPREADSHEET_ID`).
>
> **P1 e P2 sono completate e collaudate** (2026-08-26, branch
> `fix/fase-p-lock-ambiente-2026-08-26`, commit `744b95f`/`89bf7ea`,
> 166/166 test nell'harness Node, push su TEST verificato) — verificato
> qui non solo per dichiarazione di Marco ma rileggendo direttamente il
> branch su GitHub. In corsa sono stati trovati e gestiti due dettagli
> non previsti nel piano originale, entrambi tracciati in
> `PROGRAMMA_STATO.md`: `getBoard()` può innescare una scrittura reale
> (`setupSigmaFlow` via `ensureCurrentSchema_`) nella rara finestra
> post-deploy con schema non allineato — gestito con un lock dedicato,
> ristretto a quel solo tratto; e un bug nei test stessi (i casi
> aggiunti in P1 non erano registrati in `runAllTests()` e non giravano
> mai — il precedente "163/163" era un falso positivo, ora corretto).
>
> **P3 e P4 sono completate e collaudate** (2026-08-26, stesso branch,
> commit `c94a32c`, 167/167 test, push su TEST verificato, P4 collaudata
> anche nel Browser pane) — verificato di nuovo rileggendo il branch. P3
> chiudeva un punto segnalato ma non risolto durante l'analisi originale
> (`doPost`, §2.3); P4 non era imparentata con P1/P2/P3 — richiesta di
> feature di Marco (anteprima visiva del percorso della card), accorpata
> qui su sua decisione esplicita per non aprire una fase a lettera nuova
> per una sola sotto-fase, stesso principio già applicato al punto G
> dentro `DESIGN_performance.md`.
>
> **P5 è completata e collaudata** (2026-08-26, stesso branch, commit
> `2c5bc49`/`2159cab`, 170/170 test, push su TEST verificato) — bug reale
> segnalato da Marco durante l'uso, confermato essere due bug distinti
> nella derivazione di `job.status`/`incarico_chiuso_ts` dalla
> Cronologia (§2.5), non un problema di prestazioni. Stesso tema di P4
> (`Kanban.gs`, gestione dell'activity log), diversa natura (bug, non
> feature) — accorpato qui per lo stesso motivo di P3/P4.
>
> **P6** (aggiunta 2026-08-26) è un secondo bug, distinto da P5 e più
> piccolo: Marco ha segnalato con uno screenshot una card visibile
> contemporaneamente in due colonne della board (WIP e ATTESA CLIENTE)
> per alcuni secondi dopo un trascinamento. Non è lo stesso meccanismo
> di P5 (quello è lato server, sulla Cronologia; questo è lato client,
> sul disegno della board) — accorpato qui per lo stesso motivo di
> P3/P4/P5: stesso file (`client.html`), tema imparentato (percorso di
> scrittura di una card), non abbastanza per aprire una lettera nuova.
> Marco ha inoltre segnalato, sullo stesso screenshot, un problema più
> profondo e distinto: la logica con cui `applyManualMoveEffects_`
> sceglie *quale* visita aggiornare quando si corregge un evento storico
> della Cronologia ("è forse frutto di una logica di gate/scrittura/
> timestamp sbagliata?"). Marco ha deciso esplicitamente di tenere le
> due cose separate: **P6** è solo il bug piccolo qui sotto; la revisione
> di quella logica più profonda (derivazione delle `visite` e delle
> metriche di tempo dalla Cronologia) diventa una fase a sé, **Q** — solo
> il nome è riservato qui (§5), il documento di design per Q non è stato
> ancora scritto.
>
> **P6, ambito allargato** (2026-08-26, stessa segnalazione): Marco ha
> chiesto esplicitamente di non richiudere P6 lasciandoci dietro altri
> bug o incongruenze della stessa famiglia — quindi, oltre alla causa
> diretta dello screenshot (§2.6), sono stati riletti tutti i punti di
> scrittura lato client (tutte le chiamate `callApi` in `client.html`,
> non solo quelle toccate dal sintomo segnalato) per lo stesso tipo di
> problema: un aggiornamento ottimistico del DOM senza pulizia del nodo
> precedente. Trovato un solo altro punto reale (il tracciamento non
> centralizzato di `pendingWrites`, già individuato prima di questo
> allargamento, §2.6); tutti gli altri punti di scrittura (colonne,
> opzioni, Archivio, Cestino) si sono confermati già sicuri per
> costruzione — ridisegnano sempre per intero la loro porzione di DOM,
> non fanno mai chirurgia incrementale come `moveJob`. Due punti minori,
> non bug di dati ma comportamenti da documentare per non farli
> ritrovare come sorpresa più avanti, sono descritti in §2.6 come
> esplicitamente fuori scope di questo intervento.
>
> **P6 è completata e collaudata** (2026-08-26, stesso branch, commit
> `8d04b35`, 171/171 test, push su TEST verificato, collaudata nel
> Browser pane — sei trascinamenti rapidi consecutivi senza mai un nodo
> duplicato, le quattro famiglie di azioni prima non protette dal poll
> verificate una per una). **Programma Fase P (P1-P6) completo.**

---

## 1. Cosa si tocca, e cosa no

- **`getSpreadsheet_()` e `withEnvironment_()`** (Utils.gs) — unico
  punto in cui l'ambiente (TEST/PROD) viene risolto e reso disponibile
  al resto del codice durante una chiamata `api()`. *(P1/P2, completate)*
- **Le funzioni admin che oggi scambiano `PROP_SPREADSHEET_ID` a mano**
  attorno a un'orchestrazione più ampia: `eseguiMigrazioneCompleta_`
  (ActivityLog.gs) e `allineaSchemaSuProd` (Schema.gs). *(P1, completata)*
- **`api()`/`routeAction_()`** (Kanban.gs) — punto in cui si decide se
  un'azione richiede il lock globale o può farne a meno. *(P2, completata)*
- **`doPost()`** (Kanban.gs) — bypassava `api()` e quindi anche i fix di
  P1/P2. *(P3, completata)*
- **`client.html`, tab Informazioni** — nuovo pannello, nessuna modifica
  al backend, nessuna nuova chiamata `callApi`. *(P4, completata)*
- **`applyManualMoveEffects_`, `addActivityEvent`, `updateActivityEvent`,
  `deleteActivityEvent`** (Kanban.gs) — dove `job.status`/
  `status_since_ts`/`incarico_chiuso_ts` venivano impostati in modo non
  affidabile. *(P5, completata)*
- **`moveJob`, `callApi`** (client.html) — dove la card duplicata in due
  colonne e la mancata protezione del poll periodico durante una
  scrittura hanno origine. *(P6, nuova)*
- **Non tocca** i 27+ punti che chiamano `getSpreadsheet_()`
  ambientalmente — continuano a chiamarla esattamente come prima,
  nessuna firma di funzione è cambiata in P1/P2.
- **Non tocca** il fallback di bootstrap in `setupSigmaFlow()`
  (Schema.gs) — invariato.
- **Non tocca** i lock indipendenti già esistenti su
  `moveJobToSheet_`/`eliminaJobDefinitivamente`/`svuotaCestino`
  (Kanban.gs) e sulle funzioni admin di migrazione.
- **Non tocca**, in P5: `moveJob` lato server (Kanban.gs) — non ha lo
  stesso bug, vedi §2.5. Non tocca lo schema dati né il modello
  caso/visita.
- **Non tocca**, in P6: nessun file server-side, nessuno schema dati,
  nessuna delle funzioni toccate da P5. La scelta di *quale* visita
  aggiornare in `applyManualMoveEffects_`/`ensureOpenVisit_`/
  `alignOpenVisitFields_` (il punto sollevato da Marco sullo stesso
  screenshot) è esplicitamente fuori scope qui — è il contenuto
  riservato per Q (§5).

## 2. Cosa è stato trovato

### 2.1 — P1 (completata): una Script Property condivisa usata per un dato che vive una sola chiamata

`PROP_SPREADSHEET_ID` è una Script Property: per progettazione di Apps
Script, un valore **persistente e condiviso tra esecuzioni separate**.
`withEnvironment_` la usava però per un dato che dovrebbe vivere **solo
dentro la singola chiamata `api()`** — la scriveva all'inizio, la
ripristinava alla fine nel proprio `finally`. Se un'esecuzione si
interrompeva prima di raggiungere quel `finally`, il valore sporco
sopravviveva e veniva ereditato dalla richiesta successiva — di un
utente diverso, in un momento diverso. Era la causa di fondo, non solo
il sintomo, degli incidenti del 2026-08-19 e della recidiva del
2026-08-25.

Verificato esternamente: ogni esecuzione Apps Script parte in
un'isolate V8 **nuova**, scartata per intero alla fine — nessuna
memoria condivisa tra esecuzioni separate.

**Fatto**: `PROP_SPREADSHEET_ID` sostituita da `__sfRoutedSpreadsheetId_`,
variabile globale valorizzata a inizio chiamata e mai persistita
(Utils.gs, commit `744b95f`). Stesso trattamento in
`eseguiMigrazioneCompleta_`/`allineaSchemaSuProd`.

### 2.2 — P2 (completata): il lock globale era preso una volta per ogni chiamata `api()`, letture comprese

Censimento completo: otto punti nel codice prendevano
`LockService.getScriptLock()`. Uno solo era quello rilevante qui —
`withEnvironment_`, l'unico varco per ogni richiesta web. Combaciava
con la diagnosi già fatta da Marco il 2026-08-20 (fix "elimina il giro
di lock extra"): quel fix aveva rimosso un giro *aggiuntivo*, ma non la
caratteristica di fondo.

**Fatto**: `SF_READ_ACTIONS_` (Kanban.gs, commit `89bf7ea`) classifica
esplicitamente le uniche azioni di sola lettura — censite una per una,
confermate da Marco prima dell'implementazione (gate). Caso limite
gestito in corsa: `getBoard()` può innescare `setupSigmaFlow()`
(scrittura reale) nella rara finestra post-deploy — lock dedicato solo
a quel tratto.

### 2.3 — P3 (completata): il bypass di `doPost`

`doPost` chiamava `routeAction_` direttamente, senza passare da `api()`
— non beneficiava né della risoluzione d'ambiente (P1) né della
classificazione lettura/scrittura (P2). Confermato che il frontend non
lo usa (solo `google.script.run`), ma restava un endpoint pubblico
raggiungibile da una POST diretta.

**Fatto**: `doPost` chiama `api(params.action, params)` invece di
`routeAction_(params)` (commit `c94a32c`) — eredita entrambi i
meccanismi senza logica nuova.

### 2.4 — P4 (completata): anteprima visiva del percorso della card

Idea di Marco: nel tab Informazioni, un riepilogo visivo veloce di
quanto tempo la card ha passato in ciascuna colonna, calcolato dal log
già caricato (`state.activityLog`) — zero nuove letture, zero nuove
chiamate `callApi`. Tre decisioni di Marco: tutta la storia del job
(non solo la visita aperta); nel tab Informazioni, sopra l'anteprima
"ultimi eventi" esistente; barra orizzontale segmentata.

**Fatto**: pannello aggiunto (`client.html`/`board.html`/`style.html`,
commit `c94a32c`) — un segmento per colonna distinta, aggregato su
tutta la storia, colonna attuale marcata "in corso", colori coerenti
con la board. Collaudato nel Browser pane su tre casi (percorso con
rientro, caso base, nuova card).

### 2.5 — P5 (completata): `job.status` non riflette in modo affidabile l'evento più recente della Cronologia

Segnalazione di Marco: lo stato "attuale" della card deve sempre
corrispondere all'ultima colonna registrata in Cronologia — automatica
o manuale, di oggi o di mesi fa. Verificato leggendo il codice (non
solo per il resoconto di un'altra sessione): **due bug distinti**,
entrambi riprodotti.

**Bug 1 — `addActivityEvent`/`updateActivityEvent`**: `applyManualMoveEffects_`
(chiamata da entrambe tramite `applyStructuralAlignment_`) faceva
incondizionatamente `job.status = candidate.to; job.status_since_ts =
candidate.ts;` per qualunque evento move appena inserito o corretto —
senza controllare se fosse davvero il più recente del log ordinato. Un
evento con data passata (dimenticato, corretto mesi dopo) finiva nel
posto giusto nella Cronologia, ma sovrascriveva comunque lo stato
attuale, anche in presenza di eventi successivi più recenti nel log.

**Bug 2 — `deleteActivityEvent`**: la riga che doveva riallineare lo
stato dopo una cancellazione era `applyStructuralAlignment_(job,
checkStructuralAlignment_(job, lastMove))` — senza passare `candidate`/
`log`. Dentro, `applyManualMoveEffects_(job, candidate, log)` riceveva
`candidate` `undefined` e ritornava subito (`if (!candidate ||
candidate.type !== 'move') return;`) — `job.status` non veniva mai
aggiornato. Cancellando l'evento che determinava la posizione attuale,
la card restava bloccata lì invece di tornare alla colonna dell'evento
rimasto più recente.

**Fix**: separazione delle responsabilità in `applyManualMoveEffects_`
— una nuova funzione pura, `recomputeCurrentStatus_(job, log)`, imposta
`job.status`/`status_since_ts` dall'evento `move` cronologicamente più
recente del log **intero** ordinato, nessun effetto su `visite`,
chiamata in fondo a `addActivityEvent`/`updateActivityEvent`/
`deleteActivityEvent`. `applyManualMoveEffects_` ha perso le due righe
che impostavano `job.status`/`status_since_ts`, restando invariata per
tutto il resto — stessa chiamata solo per il candidato specifico in
add/update, mai in delete (punto critico: richiamare l'intera funzione,
inclusi gli effetti su `visite`, anche in delete avrebbe reintrodotto
esattamente il problema che il Bug 2 originale voleva evitare).

**P5b — stesso schema su `incarico_chiuso_ts`**: il test esplorativo
richiesto da Marco ha confermato che `applyManualMoveEffects_` azzerava
`job.incarico_chiuso_ts` per qualunque candidato che rappresentasse un
rientro, indipendentemente da quando fosse davvero accaduto rispetto a
una chiusura più recente. Stesso principio di fix:
`recomputeIncaricoChiusoTs_(job, log)`, funzione pura, riapre solo se
esiste un vero rientro cronologicamente successivo alla chiusura
registrata; chiamata in fondo a `addActivityEvent`/`updateActivityEvent`,
non in `deleteActivityEvent` (il valore originale non è recuperabile
dal solo log dopo un azzeramento). In corsa, un secondo bug distinto:
confronto timestamp con `<=` invece di `<`, che scartava un rientro con
timestamp identico alla chiusura — corretto.

**`moveJob` lato server (drag-and-drop reale) non aveva questo bug**:
scrive `job.status` direttamente dalla mossa in corso, non passa da
questo meccanismo — confermato leggendo il codice, nessuna azione
richiesta lì.

**Limitazione correlata, già nota e documentata nel codice, fuori
scope di P5**: i campi gate della visita (`start_ts`/`prep_ts`/
`incarico_ts`/`done_ts`) vengono scritti da `alignOpenVisitFields_`
sempre sulla visita **attualmente aperta**, non su quella storicamente
pertinente a un evento vecchio corretto/aggiunto. Il commento nel
codice lo dice esplicitamente: identificare la visita storicamente
giusta "è compito della migrazione storica autorevole di L5" — scelta
già presa, non riaperta qui. **Questo è lo stesso meccanismo che Marco
ha rimesso sul tavolo con lo screenshot del 2026-08-26** (§2.6) — resta
fuori scope, ma non più "per sempre": diventa il contenuto di Q (§5).

### 2.6 — P6 (nuova): card visibile in due colonne dopo un trascinamento

Segnalazione di Marco con screenshot: dopo aver trascinato una card da
WIP ad ATTESA CLIENTE, la card resta visibile **in entrambe le colonne
contemporaneamente** per alcuni secondi. Sullo stesso screenshot Marco
ha anche rimesso sul tavolo, con forza, il problema della visita
"live" scelta da `applyManualMoveEffects_`/`ensureOpenVisit_` — quel
punto è distinto (lato server, sulle `visite`) e diventa Q; qui si
tratta solo del disegno della board lato client, verificato leggendo
il codice.

**Causa confermata — nodo DOM orfano lasciato nella colonna di
provenienza**. `moveJob(jobId, status)` (client.html) aggiorna
`state.board` con `moveJobLocally` (corretto: rimuove il job da ogni
colonna, lo aggiunge a quella di arrivo), poi chiama
`placeCardInColumn_(moveResult.job)` per disegnare la card nella
colonna di arrivo. Ma `placeCardInColumn_` cerca ed eventualmente
rimuove un nodo esistente **solo dentro la colonna di arrivo**
(`cardsRoot.querySelector(...)`, con `cardsRoot` preso dalla colonna
di destinazione) — non tocca mai il nodo che si trova ancora, intatto,
nella colonna di provenienza. `renderCard(job, column)` crea sempre un
elemento DOM **nuovo** (`document.createElement('article')`), non
sposta quello esistente: il risultato è che dopo ogni trascinamento
esistono due nodi DOM per la stessa card — quello vecchio, orfano,
nella colonna di provenienza, e quello nuovo in quella di arrivo — fino
al prossimo `renderBoard()` completo (svuota-e-ricostruisce tutto il
DOM), che è quello che li riconcilia e fa sparire il duplicato. La
durata "di alcuni secondi" segnalata da Marco è quindi il tempo che
passa prima del prossimo `renderBoard()` reale (un cambiamento vero
rilevato dal poll periodico dei 45s, o un'altra azione dell'utente) —
non è un problema di timing di per sé, è un nodo che non viene mai
tolto finché qualcos'altro non ridisegna tutto da capo.

Il codice ha già, altrove, il pattern corretto per questo esatto
scenario — `applyActivityJobUpdate_` (usata per gli aggiornamenti da
Cronologia) chiama `removeCardEl_(job.job_id)` **prima** di
`placeCardInColumn_(job)`, con un commento che lo spiega: *"a differenza
del drag-and-drop reale, qui la card può essere cambiata di colonna
senza che il DOM lo sappia ancora"*. È l'assunzione opposta a quella
corretta: il drag-and-drop reale (`moveJob`) crea un nodo nuovo
esattamente come `applyActivityJobUpdate_` (stesso `renderCard`), quindi
ha bisogno della stessa protezione — non ce l'ha, ed è la causa diretta
del bug.

**Causa correlata, meno certa come origine del sintomo visibile ma
reale — poll periodico non protetto durante una scrittura**. La
protezione esistente `state.pendingWrites` (che fa saltare
`loadBoard(false)` durante una scrittura in corso, vedi guardia in
testa a `loadBoard`) è incrementata/decrementata **a mano, un caso
solo**: dentro `saveCardFromModal`, attorno a `updateJob`/`addJob`.
Nessun altro punto di scrittura la tocca — non `moveJob`, non
`deleteJob`, non `archiveJobFromModal` (che tra l'altro chiude il modal
*prima* di chiamare l'API, perdendo anche la protezione indiretta della
guardia "modal aperto"), non `duplicaJob`/`ripristinaJob`/
`eliminaJobDefinitivamente`/`svuotaCestino` (Archivio/Cestino — stessa
pagina, stesso `state`, stesso timer di poll: confermato leggendo
`index.html`, le quattro viste sono sezioni nascoste della stessa SPA,
non pagine separate), non `updateColumn`/`addColumn`/`moveColumn`/
`updateOptionList`. In pratica il backend distingue esplicitamente
letture da scritture (`SF_READ_ACTIONS_`, §2.2) ma lato client
l'equivalente non esiste: `callApi` non sa se l'azione che sta
eseguendo è una scrittura, quindi non può proteggere il poll da sé.
Questo non crea da solo il nodo DOM duplicato (quello è indipendente
dal timing, vedi sopra), ma **aggrava** la finestra in cui può
succedere qualcosa di simile per le altre azioni di scrittura non
protette, e in più fa sì che un poll che arriva a metà di una
scrittura possa sovrascrivere silenziosamente `state.board`/`state.jobs`
con un dato del server non ancora aggiornato (il confronto
"`unchanged`" che decide se saltare il ridisegno confronta con
l'ultimo stato **renderizzato**, mai aggiornato dagli update ottimistici
mirati come `placeCardInColumn_` — quindi un poll che arriva ancora
con il dato vecchio risulta "invariato" e salta il ridisegno, ma
`state.board` viene comunque riassegnato per intero al dato vecchio,
prima ancora di quel controllo).

Una volta che il fix 2 centralizza `pendingWrites` per **ogni** azione
di scrittura (non solo quella di `saveCardFromModal`), questo secondo
problema si chiude come conseguenza diretta: `loadBoard(false)` non
arriva mai più a leggere `getBoard()` mentre una scrittura è in corso,
quindi la riassegnazione silenziosa di `state.board`/`state.jobs` a un
dato vecchio non può più succedere nella finestra che il fix copre. Non
serve un terzo intervento separato su `loadBoard` — è lo stesso motivo
per cui i due fix, pur nascendo da osservazioni distinte, vanno fatti
insieme in questa sotto-fase.

**Censimento allargato (2026-08-26, su richiesta esplicita di Marco:
"mettere quante più cose nello scope, non portiamoci a seguito ancora
bug o incongruenze")** — riletti tutti i punti di scrittura di
`client.html` (ogni chiamata `callApi` che non sia una delle cinque di
sola lettura), cercando lo stesso schema del bug principale
(aggiornamento incrementale del DOM senza rimuovere il nodo
precedente):

- **Colonne** (`saveColumnSettings`/`moveColumn`, tramite
  `applyColumnsResponse_`) e **cambio ordinamento** (`toggleColumnSort`):
  tutti chiamano `renderBoard()` per intero dopo la risposta del
  server — nessun aggiornamento incrementale, nessun nodo orfano
  possibile per costruzione. Verificato, nessuna azione necessaria.
- **Archivio** (`duplicaJobFromArchivio`) e **Cestino**
  (`ripristinaJobFromCestino`, `eliminaJobDefinitivamenteFromCestino`,
  `svuotaCestino`): `renderArchivioList_`/`renderCestinoList_` fanno
  `body.innerHTML = ''` e ricostruiscono l'intera tabella a ogni
  chiamata — stesso motivo, nessun rischio di duplicazione. Verificato,
  nessuna azione necessaria.
- **Cronologia** (`submitActivityPayload_`/`confirmActivityDelete_`,
  tramite `applyActivityJobUpdate_`): già il pattern corretto (§2.6,
  sopra) — `removeCardEl_` prima di `placeCardInColumn_`. Verificato,
  nessuna azione necessaria.

Nessun altro punto con lo stesso bug di `moveJob`, quindi nessuna terza
correzione di codice da aggiungere per questo motivo — ma il
censimento ha fatto emergere due punti minori, entrambi **fuori scope
volontariamente**, documentati qui apposta per non farli ritrovare come
sorpresa in futuro:

- **Residuo teorico su `pendingWrites`**: il fix 2 impedisce a un poll
  di *partire* mentre una scrittura è in corso, ma non protegge dal
  caso (raro) in cui un poll già partito prima dell'inizio di una
  scrittura torni indietro *dopo* che la scrittura è già finita,
  portando comunque un dato catturato a metà della scrittura sul
  server. Richiederebbe un identificatore di versione/timestamp sulla
  risposta di `getBoard()` per essere chiuso del tutto — cambio lato
  server, fuori scope per una sotto-fase "client-only, senza rischi".
  Probabilità bassissima (richiede che un poll di ~45s in corso e una
  scrittura interamente si sovrappongano proprio in quell'ordine), non
  reintroduce il sintomo segnalato da Marco (quello è risolto dal fix
  1, indipendente dal timing), voluto qui come nota per Q o per un
  intervento dedicato futuro, non come azione di P6.
- **`duplicaJobFromArchivio` non aggiorna la board**: creare un nuovo
  caso da un caso archiviato lo scrive correttamente sul server, ma
  `state.board` (e quindi la vista Board, se già aperta) non lo
  riflette finché non arriva il prossimo poll o un refresh esplicito —
  non è un bug di dati (il caso esiste, è corretto, va solo aspettato
  o cercato aprendo la tab Board), è una lacuna di UX distinta dal tema
  di questa sotto-fase (qui si tratta di duplicazione visiva, non di
  dati mancanti) — segnalata qui, non inclusa nel fix.

## 3. Approccio

**P1-P5 sono chiuse** — nessuna azione residua, solo riferimento
storico (§2.1-§2.5). Resta da fare P6:

- **P6 — due correzioni indipendenti, entrambe piccole, solo
  `client.html`.** Rischio molto contenuto: nessuna modifica al
  backend, nessuna modifica allo schema dati, nessuna delle funzioni
  toccate da P1-P5.
  1. In `moveJob`: aggiungere `removeCardEl_(moveResult.job.job_id)`
     prima di `placeCardInColumn_(moveResult.job)` — stesso pattern già
     usato in `applyActivityJobUpdate_` (§2.6). Corregge il sintomo
     segnalato da Marco in modo diretto e deterministico, non legato al
     timing del poll.
  2. In `callApi`: tracciare `state.pendingWrites` in un unico punto
     centrale, invece che a mano in ogni chiamante — un elenco
     client-side delle sole azioni di lettura (specchio di
     `SF_READ_ACTIONS_`, Kanban.gs) decide se l'azione è una scrittura;
     se lo è, `pendingWrites` viene incrementato prima della chiamata e
     decrementato al termine (successo o errore), qualunque sia
     l'azione. L'incremento/decremento oggi presente in
     `saveCardFromModal` diventa ridondante e va tolto, per non avere
     due meccanismi paralleli che fanno la stessa cosa in punti diversi
     — è esattamente il tipo di manutenzione-a-mano-sparsa che ha
     causato il problema (un solo chiamante se n'era ricordato).
  Le due correzioni sono indipendenti (si possono collaudare e, se
  necessario, fare accettare separatamente) ma stanno bene nella stessa
  sotto-fase: stesso file, stessa area, stesso "bug piccolo" per
  decisione di Marco.
- **Perché non c'è una terza correzione**, nonostante l'ambito
  allargato richiesto da Marco: il censimento di tutti gli altri punti
  di scrittura (§2.6) ha confermato che sono già sicuri per costruzione
  (ridisegno completo della loro porzione di DOM, mai chirurgia
  incrementale) — aggiungere protezioni dove il rischio non esiste
  avrebbe solo aumentato la superficie toccata senza chiudere altri
  bug reali. I due punti minori trovati e non inclusi nel fix (il
  residuo teorico su `pendingWrites` e la board non aggiornata dopo
  "Usa come nuovo caso") sono documentati sopra apposta per non
  scomparire — non "portati a seguito" in silenzio, ma tenuti fuori
  scope con motivazione esplicita, com'è la richiesta di Marco intesa
  correttamente: non "risolvi tutto", ma "non lasciare cose trovate e
  non dette".

## 4. Piano di esecuzione — sotto-fasi atomiche

| Sotto-fase | Contenuto | Stato | Gate |
|---|---|---|---|
| **P1** | `getSpreadsheet_()`/`withEnvironment_()`: Script Property → variabile per-esecuzione. | ✅ Completata (commit `744b95f`) | — |
| **P2** | `SF_READ_ACTIONS_`: lock globale solo sulle azioni di scrittura. | ✅ Completata (commit `89bf7ea`, gate confermato) | — |
| **P3** | `doPost` delega ad `api(params.action, params)`. | ✅ Completata (commit `c94a32c`) | — |
| **P4** | Barra segmentata del percorso card, tab Informazioni. | ✅ Completata (commit `c94a32c`) | — |
| **P5** | `applyManualMoveEffects_`: separare il ricalcolo di `job.status`/`status_since_ts`/`incarico_chiuso_ts` (funzioni pure, dal log intero) dagli effetti su `visite`. | ✅ Completata (Bug 1/Bug 2 + P5b, commit `2c5bc49`/`2159cab`) | — |
| **P6** | `moveJob`: `removeCardEl_` prima di `placeCardInColumn_` (nodo DOM orfano). `callApi`: tracciamento centralizzato di `pendingWrites` per ogni azione di scrittura, specchio client-side di `SF_READ_ACTIONS_`. Censimento allargato di tutti i punti di scrittura di `client.html` (§2.6): nessun altro bug dello stesso tipo, due punti minori documentati e lasciati fuori scope. | Da fare | — |

## 5. Fuori scope, per ora

- Un vero indice per `findOpenVisitRow_` — già scartato in O3 (vedi
  `DESIGN_performance.md`, §4/§5).
- Qualunque cambiamento allo schema dati o al modello caso/visita.
- Il rallentamento percepito del drag-and-drop (§2.5) — nessuna causa
  di codice trovata, richiede misura live su TEST, non un fix di
  questo documento.
- **La visita storicamente pertinente scelta da
  `applyManualMoveEffects_`/`ensureOpenVisit_`/`alignOpenVisitFields_`
  per un evento vecchio corretto/aggiunto** (§2.5, rimessa sul tavolo
  da Marco in §2.6) — limitazione nota, non più deferita "a L5" in modo
  indefinito: **riservato qui il nome Fase Q** per la revisione
  organica di questa logica (derivazione delle `visite` e delle
  metriche di tempo — lavorazione/attesa/rientri — dalla Cronologia,
  col principio esplicito di Marco che la storia della card prevale
  sempre sul calcolo delle metriche). Solo il nome è riservato: nessun
  documento di design per Q esiste ancora, nessuna analisi qui sotto è
  da intendersi come tale.

## 6. Criteri di accettazione

**P1-P6 — tutte verificate e chiuse** (commit `744b95f`/`89bf7ea`/
`c94a32c`/`2c5bc49`/`2159cab`/`8d04b35`, 171/171 test, push su TEST
verificato, P4 e P6 anche nel Browser pane): nessuna riga d'azione
residua, elenco completo nei commit e in `PROGRAMMA_STATO.md`.

**P6:**

- [x] `moveJob`: `removeCardEl_(moveResult.job.job_id)` chiamata prima
      di `placeCardInColumn_(moveResult.job)`, stesso posto dove oggi
      c'è solo quest'ultima
- [x] Test manuale nel Browser pane: trascinare ripetutamente una card
      tra due colonne (avanti e indietro, più volte di seguito, anche
      rapidamente) — in nessun momento la card deve essere visibile in
      più di una colonna; nessun nodo DOM orfano dopo N trascinamenti
      (verificabile con `document.querySelectorAll('[data-job-id="..."]')`
      dalla console: deve restituire sempre e solo 1 elemento) — 6
      trascinamenti rapidi consecutivi, sempre `1`, mai `2`
- [x] `callApi`: nuovo elenco client-side delle azioni di sola lettura
      (stessi cinque nomi di `SF_READ_ACTIONS_` — `getBoard`,
      `getActivityLog`, `getArchivio`, `getCestino`, `getMetrics`);
      `state.pendingWrites` incrementato prima della chiamata e
      decrementato al termine (sia successo che errore, via
      `.finally`) per ogni azione **non** in quell'elenco
- [x] L'incremento/decremento manuale di `pendingWrites` in
      `saveCardFromModal` è stato tolto (ridondante col punto sopra)
- [x] Verificato che nessuna azione di sola lettura incrementi
      `pendingWrites` per errore (bloccherebbe il poll anche quando non
      serve) — `getActivityLog` verificato: 0 prima/durante/dopo
- [x] Nessuna regressione sui test esistenti dell'harness Node
      (171/171 — P6 è puramente client-side, nessun nuovo test Node)
- [x] Collaudo su TEST: push verificato (16/16 file identici),
      comportamento osservato nel Browser pane, non solo lettura del diff
- [x] Collaudo manuale su TEST delle azioni ora protette dal fix 2 che
      prima non lo erano — almeno una per famiglia: `deleteJob`,
      `archiveJobFromModal`, un'azione da Archivio (`duplicaJob`) e una
      da Cestino (`ripristinaJob` o `eliminaJobDefinitivamente`) — nessun
      comportamento diverso da prima, solo il poll che ora aspetta
      correttamente — tutte e quattro verificate una per una,
      `pendingWrites` a 1 durante/0 dopo, nessun errore in console
- [x] Confermato (lettura del diff, non solo dei test) che nessuna delle
      correzioni tocca `saveColumnSettings`/`moveColumn`/
      `renderArchivioList_`/`renderCestinoList_`/
      `applyActivityJobUpdate_` — il censimento di §2.6 li ha confermati
      già sicuri, non serve modificarli. **Nota**: la *logica* di
      `applyActivityJobUpdate_` non è stata toccata, ma il commento
      accanto (fuorviante dopo il fix di `moveJob`, "a differenza del
      drag-and-drop reale") è stato riscritto — opzione facoltativa
      esplicitamente lasciata a discrezione nel prompt di sessione,
      zero righe di codice eseguibile modificate in quella funzione.

**Programma Fase P (P1-P6) — completo.** Nessuna sotto-fase residua.

---

**Nota sulla fonte esterna (§2.1)**: la caratteristica "ogni esecuzione
Apps Script parte in un'isolate V8 nuova, senza memoria condivisa tra
esecuzioni separate" è confermata da fonti indipendenti sul runtime V8
di Apps Script, oltre che dalla lettura diretta del codice.
Riferimenti raccolti nella sessione di analisi (2026-08-26):
documentazione ufficiale del runtime V8 di Apps Script, e articoli
tecnici indipendenti sull'uso di `PropertiesService` per stato che deve
sopravvivere tra esecuzioni separate (a contrasto con le variabili
globali, che non lo fanno).
