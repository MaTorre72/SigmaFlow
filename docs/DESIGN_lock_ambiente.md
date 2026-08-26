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
> ristretto a quel solo tratto, per non lasciare quella scrittura
> sprotetta; e un bug nei test stessi (i casi aggiunti in P1 non erano
> registrati in `runAllTests()` e non giravano mai — il precedente
> "163/163" era un falso positivo, ora corretto).
>
> **P3 e P4** sono aggiunte del 2026-08-26, dopo il completamento di
> P1/P2: P3 chiude un punto segnalato ma non risolto durante l'analisi
> originale (`doPost`, vedi §2.3); P4 non è imparentata con P1/P2/P3 —
> è una richiesta di feature di Marco (anteprima visiva del percorso
> della card nel tab Informazioni), non un problema trovato nel codice.
> Accorpata qui su sua decisione esplicita, per non aprire una fase a
> lettera nuova per una sola sotto-fase — stesso principio già
> applicato al punto G dentro `DESIGN_performance.md`.

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
- **`doPost()`** (Kanban.gs) — oggi bypassa `api()` e quindi anche i fix
  di P1/P2. *(P3, nuova)*
- **Non tocca** i 27+ punti che chiamano `getSpreadsheet_()`
  ambientalmente (in `Kanban.gs`, `ActivityLog.gs`, `Model.gs`,
  `Backup.gs`) — continuano a chiamarla esattamente come prima,
  nessuna firma di funzione è cambiata in P1/P2.
- **Non tocca** il fallback di bootstrap in `setupSigmaFlow()`
  (Schema.gs): se non è ancora configurato nulla, resta un uso
  legittimo e volutamente persistente tra esecuzioni — invariato.
- **Non tocca** i lock indipendenti già esistenti su
  `moveJobToSheet_`/`eliminaJobDefinitivamente`/`svuotaCestino`
  (Kanban.gs) e sulle funzioni admin di migrazione — proteggono la
  concorrenza sulle scritture di archiviazione/cestino/migrazione, non
  la risoluzione dell'ambiente.
- **P4, tema diverso**: `client.html`, tab Informazioni della card —
  nessuna modifica al backend, nessuna nuova chiamata `callApi`. Il
  calcolo del percorso della card usa dati già scaricati dal client per
  la Cronologia (`state.activityLog`).

## 2. Cosa è stato trovato

### 2.1 — P1 (completata): una Script Property condivisa usata per un dato che vive una sola chiamata

`PROP_SPREADSHEET_ID` è una Script Property: per progettazione di Apps
Script, un valore **persistente e condiviso tra esecuzioni separate**.
`withEnvironment_` la usava però per un dato che dovrebbe vivere **solo
dentro la singola chiamata `api()`** — la scriveva all'inizio, la
ripristinava alla fine nel proprio `finally`. Se un'esecuzione si
interrompeva prima di raggiungere quel `finally` (un'esecuzione
lanciata a mano dall'editor, un timeout), il valore sporco sopravviveva
e veniva ereditato dalla richiesta successiva — di un utente diverso,
in un momento diverso. Era la causa di fondo, non solo il sintomo,
degli incidenti del 2026-08-19 e della recidiva del 2026-08-25.

Verificato esternamente (non solo per lettura del codice): ogni
esecuzione di uno script Apps Script — ogni chiamata `api()` inclusa —
parte in un'isolate V8 **nuova**, scartata per intero alla fine. Non
c'è memoria condivisa tra esecuzioni separate: una variabile globale
JavaScript dichiarata in cima a un file è isolata per costruzione a
quella singola esecuzione, senza bisogno di nessun lock per proteggerla
dal rischio di essere letta da un'altra chiamata in corso.

**Fatto**: `PROP_SPREADSHEET_ID` sostituita da `__sfRoutedSpreadsheetId_`,
una variabile globale valorizzata a inizio chiamata e mai persistita
(Utils.gs, commit `744b95f`). Stesso trattamento in
`eseguiMigrazioneCompleta_`/`allineaSchemaSuProd`. Chiude l'intera
classe di bug alla radice — non solo verso PROD (già corretto il
25/08), ma anche verso TEST, e in ogni punto del codice che leggeva
`PROP_SPREADSHEET_ID` ambientalmente.

### 2.2 — P2 (completata): il lock globale era preso una volta per ogni chiamata `api()`, letture comprese

Censimento completo (tutti i file `.gs`): otto punti nel codice
prendevano `LockService.getScriptLock()`. Uno solo era quello
rilevante qui — `withEnvironment_`, l'unico varco per **ogni**
richiesta web (letture e scritture indistintamente). Gli altri sette
sono lock indipendenti già mirati a scritture specifiche (archiviazione,
cestino, funzioni admin di migrazione) e sono rimasti fuori da questo
intervento.

Combaciava con la diagnosi già fatta da Marco il 2026-08-20 (fix
"elimina il giro di lock extra dopo un salvataggio"): quel fix aveva
rimosso un giro di lock *aggiuntivo*, ma non la caratteristica di fondo
— ogni singola lettura si metteva comunque in coda dietro tutte le
altre richieste in corso, esattamente come una scrittura.

Punto di attenzione decisivo per il rischio: `moveJob`,
`addActivityEvent`, `updateActivityEvent` e `deleteActivityEvent` — le
azioni di scrittura più usate — non avevano nessun lock proprio,
dipendevano al 100% dal lock globale.

**Fatto**: `SF_READ_ACTIONS_` (Kanban.gs, commit `89bf7ea`) classifica
esplicitamente `getBoard`/`getActivityLog`/`getArchivio`/`getCestino`/
`getMetrics` come uniche azioni di lettura — censite una per una contro
`routeAction_`, confermate da Marco prima dell'implementazione (gate).
Solo queste saltano il lock globale; ogni altra azione lo mantiene,
nessuna eccezione. Caso limite trovato e gestito in corsa: `getBoard()`
può innescare `setupSigmaFlow()` (scrittura reale) nella rara finestra
di schema non allineato post-deploy — protetto con un lock dedicato
solo a quel tratto, non con l'intero lock globale.

### 2.3 — P3 (nuova): chiudere il bypass di `doPost`

`doPost` (Kanban.gs) chiama `routeAction_` **direttamente**, senza
passare da `api()` — quindi, anche dopo P1/P2, non beneficia né della
risoluzione d'ambiente né della classificazione lettura/scrittura per
il lock. Verificato di nuovo sul branch dove P1/P2 sono state fatte:
non è stato toccato, resta esattamente come prima. Confermato che il
frontend (`client.html`) non lo usa — solo `google.script.run` (quindi
sempre `api()`) — ma resta un endpoint pubblico, raggiungibile da
chiunque faccia una POST diretta all'URL pubblicato.

Fix proposto, il più piccolo possibile: far chiamare a `doPost` la
stessa `api()` già corretta da P1/P2, al posto di `routeAction_`
direttamente — `api(params.action, params)` invece di
`routeAction_(params)`. Zero logica nuova da scrivere: eredita
automaticamente sia la risoluzione d'ambiente (P1) sia la
classificazione lettura/scrittura (P2), lo stesso comportamento di
ogni chiamata `google.script.run`. Unico effetto collaterale, minore e
non pericoloso: la risposta guadagna un campo `data.env` che prima non
c'era — stesso arricchimento che `api()` già fa oggi per ogni chiamata
reale; nessun consumatore noto di `doPost` da rompere (nessuno trovato
nel frontend).

### 2.4 — P4 (nuova): anteprima visiva del percorso della card (richiesta di Marco, non un problema)

Idea di Marco: nel tab Informazioni della card, invece di dover aprire
la Cronologia completa per farsi un'idea, un riepilogo visivo veloce
di quanto tempo la card ha passato in ciascuna colonna — "un'
anticipazione del calcolo dei tempi per colonna già presente in
dashboard", ma per la singola card.

**Il materiale c'è già, senza bisogno di leggere nulla di nuovo dal
foglio.** `activity_log_json` è già una sequenza cronologica di eventi
`type: 'move'` (`{from, to, ts}`), e viene già caricato per intero sul
client una sola volta all'apertura della card — `loadActivityLogForModal_`
(client.html), commento M0-A2: proprio per evitare la doppia chiamata
che causava "Cronologia lenta". Sia il tab Cronologia sia l'anteprima
"ultimi eventi" già esistente (`renderRecentActivityPreview_`) leggono
dallo stesso `state.activityLog`, senza richiamare il server. Il
prospettino di Marco può agganciarsi allo stesso dato: **zero nuove
letture Sheets, zero nuove chiamate `callApi`**, solo una nuova
funzione di rendering client-side.

Verificato che il log è completo fin dalla creazione della card:
`addJob` scrive già un evento `{type:'move', from:null, to:<colonna
iniziale>, ts:<arrival>}` (Kanban.gs) — non serve nessun altro campo
(es. `arrival_ts`) come punto di partenza, il log da solo racconta
tutta la storia, rientri compresi (`activity_log_json` è un unico
array continuo per l'intera vita del job, non uno per visita). Il
segmento "colonna attuale, ancora in corso" può usare `job.status_since_ts`
come inizio — stesso campo già mantenuto per questo scopo esatto da
`moveJob`/`addJob` (commento M0-C).

Verificato anche un punto di consistenza: `correctJobTimestamps`
corregge solo `arrival_ts` su `jobs`, **non tocca il log** — quindi non
introduce nessuna discrepanza con il calcolo qui proposto (che legge
solo il log). Le uniche modifiche che possono cambiare il calcolo sono
quelle fatte tramite `updateActivityEvent`/`deleteActivityEvent`, che
editano il log stesso — la stessa fonte usata da Cronologia oggi:
nessuna doppia fonte di verità da tenere allineata a parte.

Tre decisioni prese da Marco: (1) tutta la storia del job, non solo la
visita aperta; (2) nel tab Informazioni, sopra l'anteprima "ultimi
eventi" esistente — le due cose rispondono a domande diverse ("dove
è andato il tempo" vs. "cosa è successo di recente"), tenerle entrambe
non è ridondanza; (3) barra orizzontale segmentata, un tratto colorato
per colonna.

Un dettaglio di implementazione non ancora deciso da Marco, qui
proposto come raccomandazione (non un punto da confermare — reversibile
in un secondo momento senza impatto sui dati): **un segmento per
colonna distinta**, aggregando tutte le permanenze in quella colonna su
tutta la storia — non un segmento per ogni singolo soggiorno. Con
rientri multipli la stessa colonna può essere visitata più volte in
momenti non consecutivi; una vera timeline (un blocco per ogni singolo
soggiorno, ripetuti) sarebbe più fedele alla sequenza reale ma diventa
larga e poco leggibile con molti rientri o soggiorni brevi — l'aggregato
per colonna resta sempre leggibile (mai più segmenti delle colonne
esistenti) e risponde meglio alla domanda "dove se n'è andato il
tempo", stessa logica già usata in `dashboard-metrics.md` ma applicata
alla singola card invece che a tutto il sistema. Ordine dei segmenti
nella barra: stesso ordine delle colonne in board (coerenza visiva con
la board stessa), non ordinamento per durata.

## 3. Approccio

**P1 e P2 sono chiuse** — nessuna azione residua, solo riferimento
storico (§2.1/§2.2). Restano da fare P3 e P4, indipendenti tra loro e
da P1/P2 (nessuna delle due dipende da un prerequisito ancora aperto):

- **P3 — `doPost` delega ad `api()`.** Rischio molto basso: una riga
  di codice, zero logica nuova, eredita meccanismi già collaudati
  (166/166 test). Da verificare solo che nessun test esistente assuma
  il comportamento precedente di `doPost` (verosimilmente nessuno, dato
  che non risultava usato da nessun percorso reale).
- **P4 — riepilogo visivo del percorso, solo client-side.** Rischio
  basso e di natura diversa da P1/P2/P3: non tocca backend, dati,
  schema o test dell'harness Node — solo `client.html`.

## 4. Piano di esecuzione — sotto-fasi atomiche

| Sotto-fase | Contenuto | Stato | Gate |
|---|---|---|---|
| **P1** | `getSpreadsheet_()`/`withEnvironment_()` (Utils.gs): Script Property condivisa sostituita da una variabile globale per-esecuzione, mai persistita. Stesso trattamento in `eseguiMigrazioneCompleta_`/`allineaSchemaSuProd`. | ✅ Completata (commit `744b95f`, 2026-08-26) | — |
| **P2** | `api()`/`routeAction_()` (Kanban.gs): `SF_READ_ACTIONS_` classifica le azioni di sola lettura, solo quelle saltano il lock globale. | ✅ Completata (commit `89bf7ea`, 2026-08-26, gate confermato da Marco) | — |
| **P3** | `doPost` (Kanban.gs) chiama `api(params.action, params)` invece di `routeAction_(params)` direttamente — eredita risoluzione d'ambiente (P1) e classificazione lettura/scrittura (P2) senza nuova logica. | Da fare | — |
| **P4** | `client.html`, tab Informazioni: nuova funzione di rendering che cammina su `state.activityLog` (già caricato, nessuna nuova chiamata) e calcola, per l'intera storia del job, il tempo totale trascorso in ciascuna colonna (un segmento aggregato per colonna, non uno per soggiorno — §2.4). Barra orizzontale segmentata sopra l'anteprima "ultimi eventi" esistente (che resta invariata), colori presi da `state.columnMeta` (stessi della board), legenda testuale con il tempo per colonna accanto ai segmenti. Segmento della colonna attuale marcato come "in corso" (base: `job.status_since_ts`). | Da fare | — |

P3 e P4 sono indipendenti tra loro e da P1/P2 — possono essere fatte in
qualunque ordine, anche nella stessa sessione, senza gate intermedio.

## 5. Fuori scope, per ora

- Un vero indice per `findOpenVisitRow_` — già scartato in O3 per
  fragilità sugli spostamenti riga di archiviazione/cestino (vedi
  `DESIGN_performance.md`, §4/§5).
- Qualunque cambiamento allo schema dati o al modello caso/visita.
- P4: una vera timeline con un blocco per ogni singolo soggiorno
  (invece dell'aggregato per colonna) — scartata per leggibilità con
  rientri multipli, vedi §2.4. Riconsiderabile se l'aggregato si rivela
  insufficiente in uso reale.

## 6. Criteri di accettazione

**P1/P2 — già verificati e chiusi** (commit `744b95f`/`89bf7ea`,
166/166 test, push su TEST verificato): nessuna riga d'azione residua,
elenco completo nel commit e in `PROGRAMMA_STATO.md`.

- [ ] `doPost` chiama `api(params.action, params)` invece di
      `routeAction_(params)` direttamente (P3)
- [ ] Le richieste POST dirette all'URL pubblicato ereditano
      risoluzione d'ambiente e classificazione lettura/scrittura, stesso
      comportamento di una chiamata `google.script.run` (P3)
- [ ] Nessuna regressione sui test esistenti; nessun consumatore noto
      di `doPost` da aggiornare (nessuno trovato) (P3)
- [ ] Il calcolo del percorso usa solo eventi `type: 'move'` di
      `state.activityLog` già caricato — nessuna nuova lettura Sheets,
      nessuna nuova chiamata `callApi` introdotta (P4)
- [ ] Copre l'intera storia del job (tutti i rientri), non solo la
      visita aperta (P4)
- [ ] Un segmento per colonna distinta, aggregato su tutte le
      permanenze in quella colonna — mai più segmenti dei colori/
      colonne esistenti (P4)
- [ ] Il segmento della colonna attuale è marcato come "in corso" e la
      sua durata riflette il tempo trascorso da `status_since_ts` (P4)
- [ ] Colori dei segmenti coerenti con `state.columnMeta` (stessi
      colori già usati sulla card in board) (P4)
- [ ] Colonna eliminata nel frattempo: mostrata con l'id/etichetta di
      fallback esistente (`columnLabelById_`), nessun errore (P4)
- [ ] Il riquadro compare nel tab Informazioni, sopra l'anteprima
      "ultimi eventi" esistente, che resta invariata (P4)
- [ ] Legenda testuale con il tempo per colonna accanto ai segmenti,
      non solo il colore (P4)

---

**Nota sulla fonte esterna (§2.1)**: la caratteristica "ogni esecuzione
Apps Script parte in un'isolate V8 nuova, senza memoria condivisa tra
esecuzioni separate" è confermata da fonti indipendenti sul runtime V8
di Apps Script, oltre che dalla lettura diretta del codice — non è
un'assunzione. Riferimenti raccolti nella sessione di analisi
(2026-08-26): documentazione ufficiale del runtime V8 di Apps Script,
e articoli tecnici indipendenti sull'uso di `PropertiesService` per
stato che deve sopravvivere tra esecuzioni separate (a contrasto con
le variabili globali, che non lo fanno).
