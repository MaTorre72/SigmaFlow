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
> **P5** (aggiunta 2026-08-26) è un bug reale segnalato da Marco durante
> l'uso — "lo spostamento della card è a risposta molto ritardata... c'è
> da rivedere l'aggiornamento dello stato attuale delle card" — che
> l'analisi ha confermato essere due bug distinti nella derivazione di
> `job.status` dalla Cronologia, non un problema di prestazioni (§2.5).
> Stesso tema di P4 (`Kanban.gs`, gestione dell'activity log), diversa
> natura (bug, non feature) — accorpato qui per lo stesso motivo di P3/P4.

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
  `status_since_ts` vengono oggi impostati in modo non affidabile.
  *(P5, nuova)*
- **Non tocca** i 27+ punti che chiamano `getSpreadsheet_()`
  ambientalmente — continuano a chiamarla esattamente come prima,
  nessuna firma di funzione è cambiata in P1/P2.
- **Non tocca** il fallback di bootstrap in `setupSigmaFlow()`
  (Schema.gs) — invariato.
- **Non tocca** i lock indipendenti già esistenti su
  `moveJobToSheet_`/`eliminaJobDefinitivamente`/`svuotaCestino`
  (Kanban.gs) e sulle funzioni admin di migrazione.
- **Non tocca**, in P5: `moveJob` (il drag-and-drop reale) — non ha lo
  stesso bug, vedi §2.5. Non tocca lo schema dati né il modello
  caso/visita.

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

### 2.5 — P5 (nuova): `job.status` non riflette in modo affidabile l'evento più recente della Cronologia

Segnalazione di Marco: lo stato "attuale" della card deve sempre
corrispondere all'ultima colonna registrata in Cronologia — automatica
o manuale, di oggi o di mesi fa. Verificato leggendo il codice (non
solo per il resoconto di un'altra sessione): **due bug distinti**,
entrambi riprodotti.

**Bug 1 — `addActivityEvent`/`updateActivityEvent`**: `applyManualMoveEffects_`
(chiamata da entrambe tramite `applyStructuralAlignment_`) fa
incondizionatamente `job.status = candidate.to; job.status_since_ts =
candidate.ts;` per qualunque evento move appena inserito o corretto —
senza controllare se è davvero il più recente del log ordinato. Un
evento con data passata (dimenticato, corretto mesi dopo) finisce nel
posto giusto nella Cronologia, ma sovrascrive comunque lo stato
attuale, anche in presenza di eventi successivi più recenti nel log.

**Bug 2 — `deleteActivityEvent`**: la riga che dovrebbe riallineare lo
stato dopo una cancellazione è `applyStructuralAlignment_(job,
checkStructuralAlignment_(job, lastMove))` — senza passare `candidate`/
`log`. Dentro, `applyManualMoveEffects_(job, candidate, log)` riceve
`candidate` `undefined` e ritorna subito (`if (!candidate ||
candidate.type !== 'move') return;`) — `job.status` non viene mai
aggiornato. Cancellando l'evento che determinava la posizione attuale,
la card resta bloccata lì invece di tornare alla colonna dell'evento
rimasto più recente.

**`moveJob` (drag-and-drop reale) non ha questo bug**: scrive
`job.status` direttamente dalla mossa in corso, non passa da questo
meccanismo — confermato leggendo il codice, nessuna azione richiesta lì.
Sul rallentamento del drag-and-drop segnalato insieme a questo bug:
nessuna causa di codice trovata (P1-P4 non hanno toccato `moveJob`,
l'update lato client resta ottimistico, `ensureCurrentSchema_()` in
testa a `moveJob` fa solo un controllo di property con ritorno
immediato, comportamento preesistente non introdotto da P2) — da
verificare con una misura live su TEST, fuori scope di questo
documento (è un problema di prestazioni percepite, non un bug di
codice individuato).

**Fix proposto — separazione delle responsabilità**, confermata da
Marco come la soluzione logicamente più pulita, da verificare con
attenzione in fase di implementazione: `applyManualMoveEffects_` oggi
fa due cose diverse nello stesso posto — imposta `job.status` per il
candidato appena toccato, **e** applica gli effetti su `visite`
(apertura/chiusura visita, accumulo attese) specifici di quel
candidato. Queste due responsabilità vanno separate:

- Una nuova funzione pura, es. `recomputeCurrentStatus_(job, log)` —
  imposta `job.status`/`status_since_ts` dall'evento `move`
  cronologicamente più recente del log **intero** ordinato, nessun
  effetto su `visite`. Chiamata in fondo a `addActivityEvent`,
  `updateActivityEvent` **e** `deleteActivityEvent`, dopo qualunque
  altra elaborazione — così lo stato è sempre corretto indipendentemente
  da cosa ha causato la modifica.
- `applyManualMoveEffects_` perde le due righe che impostano
  `job.status`/`status_since_ts` (spostate nella funzione sopra), ma
  resta **invariata** per tutto il resto — stessa chiamata solo per il
  candidato specifico in add/update, **mai** in delete. Questo è il
  punto critico da non sbagliare: se si richiamasse l'intera
  `applyManualMoveEffects_` (inclusi gli effetti su `visite`)
  sull'evento-più-recente-rimasto anche in `deleteActivityEvent`, si
  reintrodurrebbe esattamente il problema che il commento originale del
  Bug 2 spiega di voler evitare — spostamenti/visite duplicate su
  cancellazioni non correlate, solo spostato su un altro evento invece
  che eliminato.

**Punto da verificare durante l'implementazione, non ancora confermato
come bug**: `applyManualMoveEffects_` azzera anche `job.incarico_chiuso_ts`
quando il candidato rappresenta un vero rientro — stesso schema di
Bug 1 ("agisce sul candidato appena toccato"), applicato a un altro
campo. Inserire un rientro vecchio e dimenticato su un caso già
richiuso da eventi *più recenti* potrebbe riaprirlo per errore. Non
riprodotto con uno script isolato come per Bug 1/2 (richiede anche di
leggere il flusso di "Chiuso" in `updateJob`, non ancora fatto) — va
scritto un test dedicato prima di decidere se serve un fix analogo o
se il comportamento attuale è già corretto per altri motivi non ancora
visti.

**Limitazione correlata, già nota e documentata nel codice, fuori
scope di P5**: i campi gate della visita (`start_ts`/`prep_ts`/
`incarico_ts`/`done_ts`) vengono scritti da `alignOpenVisitFields_`
sempre sulla visita **attualmente aperta**, non su quella storicamente
pertinente a un evento vecchio corretto/aggiunto. Il commento nel
codice lo dice esplicitamente: identificare la visita storicamente
giusta "è compito della migrazione storica autorevole di L5" — scelta
già presa, non riaperta qui.

## 3. Approccio

**P1-P4 sono chiuse** — nessuna azione residua, solo riferimento
storico (§2.1-§2.4). Resta da fare P5:

- **P5 — separazione delle responsabilità in `applyManualMoveEffects_`.**
  Rischio contenuto ma non trascurabile: tocca una funzione usata da
  tre percorsi di scrittura ad alta frequenza (`addActivityEvent`/
  `updateActivityEvent`/`deleteActivityEvent`). Il rischio vero non è
  "la separazione in sé" (Marco l'ha confermata come l'approccio più
  pulito) ma **dove tracciare il confine** — vedi il punto critico in
  §2.5: la nuova funzione di ricalcolo dello stato deve restare pura
  (mai effetti su `visite`), altrimenti si rischia di scambiare un bug
  con un altro. Da accompagnare con test dedicati per entrambi gli
  scenari riprodotti (§6), non solo con i test di comportamento già
  esistenti — più il test esplorativo su `incarico_chiuso_ts`.

## 4. Piano di esecuzione — sotto-fasi atomiche

| Sotto-fase | Contenuto | Stato | Gate |
|---|---|---|---|
| **P1** | `getSpreadsheet_()`/`withEnvironment_()`: Script Property → variabile per-esecuzione. | ✅ Completata (commit `744b95f`) | — |
| **P2** | `SF_READ_ACTIONS_`: lock globale solo sulle azioni di scrittura. | ✅ Completata (commit `89bf7ea`, gate confermato) | — |
| **P3** | `doPost` delega ad `api(params.action, params)`. | ✅ Completata (commit `c94a32c`) | — |
| **P4** | Barra segmentata del percorso card, tab Informazioni. | ✅ Completata (commit `c94a32c`) | — |
| **P5** | `applyManualMoveEffects_`: separare il ricalcolo di `job.status`/`status_since_ts` (nuova funzione pura, dal log intero) dagli effetti su `visite` (restano legati al candidato specifico, mai in delete). Chiamata di ricalcolo in fondo a `addActivityEvent`/`updateActivityEvent`/`deleteActivityEvent`. Test dedicati per Bug 1, Bug 2, e test esplorativo su `incarico_chiuso_ts` (§2.5/§6). | ✅ Completata (Bug 1/Bug 2, sessione 2026-08-26) — punto esplorativo su `incarico_chiuso_ts` **confermato come bug analogo, non corretto**, in attesa di decisione di Marco | — |

## 5. Fuori scope, per ora

- Un vero indice per `findOpenVisitRow_` — già scartato in O3 (vedi
  `DESIGN_performance.md`, §4/§5).
- Qualunque cambiamento allo schema dati o al modello caso/visita.
- Il rallentamento percepito del drag-and-drop (§2.5) — nessuna causa
  di codice trovata, richiede misura live su TEST, non un fix di
  questo documento.
- La visita storicamente pertinente per i campi gate su eventi vecchi
  corretti (§2.5) — limitazione nota, deferita a L5.

## 6. Criteri di accettazione

**P1-P4 — già verificati e chiusi** (commit `744b95f`/`89bf7ea`/
`c94a32c`, 167/167 test, push su TEST verificato, P4 anche nel Browser
pane): nessuna riga d'azione residua, elenco completo nei commit e in
`PROGRAMMA_STATO.md`.

**P5 — tutti verificati TRUE** (170/170 test, push su TEST verificato):

- [x] Nuova funzione (`recomputeCurrentStatus_(job, log)`) — imposta
      `job.status`/`status_since_ts` dall'evento `move` cronologicamente
      più recente del log ordinato; nessun effetto su `visite` (P5)
- [x] Chiamata in fondo a `addActivityEvent`, `updateActivityEvent` e
      `deleteActivityEvent`, dopo ogni altra elaborazione (P5)
- [x] `applyManualMoveEffects_` non imposta più direttamente
      `job.status`/`status_since_ts` — resta solo per gli effetti su
      `visite`, invariati per il candidato specifico (P5)
- [x] `applyManualMoveEffects_` continua a essere chiamata solo per il
      candidato in `addActivityEvent`/`updateActivityEvent`, **mai** in
      `deleteActivityEvent` — nessun effetto collaterale su `visite`
      reintrodotto dalla cancellazione (P5)
- [x] Test Bug 1: inserire un evento move con data passata su un job
      che ha già eventi più recenti — `job.status` deve riflettere
      l'evento più recente, non quello appena inserito (P5) —
      `testAddActivityEventBackdatedMoveDoesNotOverrideMoreRecentStatus`
- [x] Test Bug 2: cancellare l'evento più recente — `job.status` deve
      tornare a riflettere il nuovo evento più recente rimasto (P5) —
      `testDeleteActivityEventRevertsStatusToNewMostRecentMove`
- [x] Test esplorativo `incarico_chiuso_ts`: inserire un rientro vecchio
      (backdated) su un job già richiuso da eventi successivi più
      recenti — **verificato: SÌ, si riproduce lo stesso schema di
      Bug 1** (`incarico_chiuso_ts` azzerato per errore); segnalato a
      Marco, fix **non applicato** su sua richiesta esplicita, in attesa
      di decisione — documentato con
      `testExploratoryIncaricoChiusoTsResetByOldBackdatedReentry_BugConfirmedNotYetFixed`
      (asserisce il comportamento attuale/il bug, non quello desiderato) (P5)
- [x] `moveJob` non modificata — nessuna regressione sul drag-and-drop
      reale (P5) — verificato con `git diff`, zero righe toccate
- [x] Nessuna regressione sui test esistenti (170/170, 167 preesistenti
      + 3 nuovi) (P5)

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
