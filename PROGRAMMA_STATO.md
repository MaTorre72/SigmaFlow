# Stato programma: SigmaFlow — Activity Log / Modello caso-visita
Aggiornato: 2026-08-16 19:40

Fase corrente: Rimozione `case_id`/`markRework` + generatore dati demo su schema finale — completata su TEST
Titolo: JOB_HEADERS senza case_id, seedTestDataset_ riscritto

## Dismissione foglio `cases` (2026-08-16 19:15)

Su richiesta esplicita di Marco (rimandata dopo R3, ripresa ora dopo la
chiusura di R4): rimosso `CASE_HEADERS`, `addCase`,
`refreshCaseVisitCount_` e tutte le chiamate (`addJob`/`moveJob`/
`deleteJob`); `createImplicitCase_` semplificata a generare solo l'id
(il concetto di "caso" — `job_id`/`case_id` — resta valido, solo senza
piu' una riga propria da mantenere allineata a ogni spostamento).
`SCHEMA_VERSION` 7->8. Nuova `removeCasesSheet_(ss)` (idempotente,
chiamata da `setupSigmaFlow`): elimina il foglio se ancora presente —
qui non c'e' nulla da preservare (a differenza della rinomina
`rientro_ts`/`rientro_da` in L1bis), `total_visits`/`is_open` erano gia'
ridondanti con `visite`/`jobs`, mai letti dal frontend (verificato:
nessun riferimento in `client.html`/`board.html`/`dashboard.html`).

Verificato con uno scenario dedicato: foglio `cases` preesistente (come
l'attuale TEST live) + `SCHEMA_VERSION` vecchia in property -> prossimo
`getBoard()` lo rimuove correttamente, dati di `jobs` intatti. Test
aggiornati (nuova asserzione positiva che il foglio non esiste piu'
dopo `setupSigmaFlow`). **69/69 test passati**. Push su TEST eseguito e
verificato (13/13 identici).

**Importante**: il prossimo caricamento reale della board su TEST (bump
di `SCHEMA_VERSION`) rimuovera' automaticamente il foglio `cases` dal
foglio Google reale, con i suoi dati — irreversibile come le altre
rimozioni di schema di questo programma. `markRework`/
`markRowAsRework_` non toccate (gia' dormienti/degradate da L5, non
scrivono su `cases`).

## Chiarimenti Marco su foglio TEST standby e terminologia (2026-08-16, prima della fase seguente)

Due domande di Marco dopo aver visto la dismissione di `cases` applicata
alla copia "Backup di SigmaFlow Database": (1) il vecchio foglio
standby "SigmaFlow Database TEST" (a cui puntava prima
`SIGMAFLOW_TEST_SPREADSHEET_ID`) non ne risente, essendo dati fittizi a
perdere; (2) terminologia ufficiale/finale chiarita da Marco — job =
caso, 1:1, quindi `case_id` e' un doppione di `job_id` da rimuovere, non
"il vero legame". Ho proposto un wrapper `setupSigmaFlowOnTest()` per
proteggere il vecchio foglio standby dal rischio `PROP_SCHEMA_VERSION`
condiviso globalmente (vedi AUDIT_MIGRAZIONE_PROD.md §0.1): **Marco ha
rifiutato**, preferendo riscrivere direttamente il generatore di dati
demo per emettere lo schema finale fin da subito, visto che sono "tutti
dati a perdere, finti".

## Rimozione case_id/markRework + generatore dati demo su schema finale (2026-08-16 19:40)

Su conferma esplicita di Marco per entrambe le richieste sopra:

- **`case_id` rimosso** da `JOB_HEADERS` (Schema.gs), da `addJob`
  (Kanban.gs, niente piu' `createImplicitCase_`/`caseId` nella risposta),
  da `generateId_`/`generateCaseId` (Utils.gs, dead code), e da tutte le
  fixture Tests.gs che non simulano lo schema storico pre-migrazione.
  `SCHEMA_VERSION` 8->9.
- **`markRework`/`markRowAsRework_` rimosse** (Kanban.gs): dipendevano
  interamente dal raggruppamento per `case_id` (righe "dello stesso
  caso"), gia' non richiamate dal frontend da prima di questa sessione
  (verificato in Fase L1). Route `markRework` tolta da `routeAction_`.
  `testMarkRework` rimosso dai test.
- **`setupOldProdShapedSheet_`** (fixture migrazione PROD) lasciata
  intenzionalmente invariata: simula lo schema REALE osservato su PROD
  prima della migrazione, che aveva ancora `case_id`/`cases` — la
  migrazione (`eseguiMigrazioneCompleta_`) deve continuare a rimuoverlo,
  gia' verificato dall'asserzione generica `assertHeaders_(jobsSheet,
  JOB_HEADERS, ...)` dopo lo step di riallineamento schema.
- **`seedTestDataset_` riscritta** (bottone dati demo dashboard TEST):
  prima scriveva ancora `case_id`/`visit_number`/`start_ts`/`done_ts`/
  `service_time_d`/`lead_time_d`/`wait_time_d`/`is_rework`/
  `rework_cause` sull'oggetto job — tutti campi gia' rimossi da
  `JOB_HEADERS` dalla L5 e silenziosamente scartati da `jobToRow_`. Ora
  genera solo campi realmente presenti in `JOB_HEADERS` (incluso un
  `activity_log_json` con l'evento di creazione, come fa `addJob`) e,
  soprattutto, **vere righe `visite`** per ogni job generato (mancavano
  del tutto prima): una singola visita aperta per i job normali, due
  visite (la prima chiusa con un rientro, la seconda aperta con
  `rework_cause` coerente) per l'~1/8 dei job con rework, stessa logica
  di `updateVisiteForMove_`. Prima di questa modifica, la dashboard L4
  (che legge le metriche di governo da `visite`) mostrava zeri su tutti
  i job generati dal bottone demo: verificato via harness che ora
  `getMetrics()` calcola valori reali (E_S ≈ 2.67 sul dataset demo) e
  `getBoard()` mostra tutti i 60 job.

**68/68 test passati** (69 - 1 per la rimozione di `testMarkRework`).
Commit `00e79f0`. Push su TEST eseguito e verificato (13/13 file
identici via `clasp pull` isolato + diff).

## Prossimi miglioramenti raccolti da Marco (2026-08-16, fuori scope da questa migrazione)

Vedi `AUDIT_MIGRAZIONE_PROD.md` §8bis per il dettaglio: frontend
lentissimo, ricostruzione date reali delle card di PROD, pulizia di
vecchi campi non usati (`notes` gia' rimovibile, `checklist_json`/
`correction_log_json` solo dopo che la migrazione reale li ha
consumati), migliore allineamento della dashboard alla dispensa FSC.

## R5-P4-P5 preparazione migrazione PROD vera (2026-08-16 21:22)

Marco ha dato il via libera a completare la migrazione PROD vera e la
messa in produzione ("voglio tutto online in produzione"). Passi fatti
in questa sessione, verso `AUDIT_MIGRAZIONE_PROD.md` §5:

- **R5 chiuso**: Marco ha confermato `SIGMAFLOW_TEST_SPREADSHEET_ID`
  gia' ripristinato al TEST originale (non piu' sulla copia "Backup di
  SigmaFlow Database").
- **P4 deciso**: Marco aggiorna il deployment ESISTENTE (non uno
  nuovo), quello con URL
  `.../AKfycbxKZMfSDbFMI7vCQ1IaQ0wQdgrwBWE_FByTgPY6_2TxFlpmf1jXBzDb1M2ndSgDY4Db/exec?env=prod`
  (`@18 - timestamps-fix`, il piu' recente per numero — confermato, non
  solo dedotto). Verificato che il rischio §0.1 (property di schema
  condivisa) non richiede gestione a parte: `eseguiMigrazioneCompleta_`
  chiama `setupSigmaFlow()` direttamente, bypassando da sola il
  controllo `ensureCurrentSchema_()` che potrebbe saltare l'allineamento
  per errore.
- **Ordine deciso per non lasciare una finestra di codice-nuovo/dati-
  vecchi live**: 1) migrare i dati veri (funzione sotto, dall'editor,
  gira sempre contro HEAD indipendentemente dal deployment pubblicato)
  2) verifica di Marco (P6) 3) solo allora aggiornare il deployment
  esistente perche' serva il codice nuovo 4) comunicazione team (P8).
- **`eseguiMigrazioneCompletaSuProd()`** scritta (ActivityLog.gs): stesso
  pattern di `eseguiMigrazioneCompletaSuCopiaProd` (id e nome del foglio
  scritti come due valori indipendenti, controllo automatico se non
  corrispondono, nome senza underscore finale per restare visibile nel
  menu Esegui). Punta a `SIGMAFLOW.DEFAULT_SPREADSHEET_ID`
  (`15XQwfbTLH4wv8IOzhzIyhpATZY-9KmXoorhD4mpZk4g`), `confermaNome:
  'SigmaFlow Database'` — id e nome confermati da Marco in chat, mai
  letti/aperti autonomamente da questa sessione. **Non ancora eseguita
  da nessuno**: nessun accesso di esecuzione disponibile a Claude Code
  (solo `clasp push`/`pull`), e comunque nessuna scrittura su PROD senza
  gate umano esplicito — tocca a Marco cliccare "Esegui" nell'editor.

**68/68 test passati**. Commit `dc93351`. Push su TEST eseguito e
verificato (13/13 file identici via `clasp pull` isolato + diff).

## P5 eseguita su PROD vero (2026-08-16 21:25)

Marco ha eseguito `eseguiMigrazioneCompletaSuProd()` dall'editor Apps
Script. Esito:

```
step1_backfill_activity_log: cards_processed 50, checklist_items_migrated 11,
  creation_events_backfilled 50, corrections_migrated 0, errors: []
step2_columns_json: corrected true, column_id 'todo', from_role 'wip' -> 'prep'
step3_schema_alignment: success true
step4_migrazione_visite: jobs_processed 50, jobs_without_log 0,
  visite_written 50, coherence_warnings: []
```

Numeri identici (50 card, stessa correzione columns_json, 50 visite, 0
coherence warnings) a quanto gia' verificato in R3/R4 sulla copia
"Backup di SigmaFlow Database" — i dati reali di PROD non sono cambiati
nel frattempo (coerente col team fermo, nessuna sorpresa). PROD vero e'
ora nello schema corrente (`visite` popolata, `case_id`/campi duplicati
rimossi da `jobs` come effetto automatico dello step3, vedi discussione
sessione precedente su questo).

## P6 chiusa (2026-08-16, poco dopo le 21:25)

Marco ha verificato i casi campione sul foglio PROD vero, esito
positivo ("verificato"). Sta aggiornando ora il deployment `@18`
(Distribuisci -> Gestisci distribuzioni -> versione HEAD) perche' il
codice nuovo diventi quello servito dall'URL pubblico
`.../AKfycbxKZMfSDbFMI7vCQ1IaQ0wQdgrwBWE_FByTgPY6_2TxFlpmf1jXBzDb1M2ndSgDY4Db/exec`.
Azione compiuta direttamente da Marco nell'editor, nessun intervento di
Claude Code possibile ne' necessario qui.

## Migrazione PROD e messa online — COMPLETATA (2026-08-16 ~21:35)

Deployment `@19` (nuova versione sulla stessa distribuzione `@18`,
stesso URL pubblico) confermato da Marco come aggiornato. Team avvisato
(P8). Con questo si chiude l'intera sequenza R0-R5/P4-P8 di
`AUDIT_MIGRAZIONE_PROD.md`: PROD vero gira ora sul modello caso/visita
completo (L1-L5), senza `case_id`/`markRework`, con `visite` come fonte
delle metriche di governo (L4).

## Prossimo passo

Nessuna azione tecnica pendente sulla migrazione. Restano aperte, non
urgenti, da riprendere quando Marco lo chiede esplicitamente:
- Decisione sul merge di `codex/case-visit-model` (via
  `codex/activity-log-prep-role`) a `main` — non affrontata in questa
  sessione.
- I quattro miglioramenti raccolti in `AUDIT_MIGRAZIONE_PROD.md` §8bis
  (frontend lento, ricostruzione date reali, pulizia `notes`/
  `checklist_json`/`correction_log_json`, allineamento dashboard alla
  dispensa FSC).

---

## Cronologia precedente (Migrazione PROD — R0-R4)

## R4 chiusa (2026-08-16 19:05)

Marco ha condiviso un caso concreto (`JOB-20260708-W0TO`) con
cronologia reale tenuta solo come note testuali datate in
`description` (mai movimenti tracciati sulla board). Confermato: il
risultato della migrazione per quel caso e' corretto rispetto a cosa il
sistema puo' sapere (un solo evento sintetico, `arrival_ts` originale
preservato) — non e' un bug, e' il limite gia' previsto (Marco: "la
cronologia sarebbe tutta da ricostruire" via email/note, lavoro futuro
separato).

**Marco ha scelto esplicitamente**: considerare R4 sufficiente cosi'
com'e' e chiudere la verifica a campione. I casi con storia solo
testuale restano un limite noto, da affrontare nella futura
ricostruzione memoria — non bloccano la chiusura di questa fase.

**Riepilogo R0-R4 (copia di PROD "Backup di SigmaFlow Database")**:
schema allineato, 50/50 card con `activity_log_json` ricostruito senza
errori, `columns_json` corretto (`todo`: `wip`->`prep`), `visite`
materializzata per tutti i 50 casi, 0 `coherence_warnings`. Fallback
data-da-`job_id` verificato e confermato coerente da Marco su dati
reali.

## Prossimo passo — da decidere con Marco

L'audit (`AUDIT_MIGRAZIONE_PROD.md` v2, sez. 5) prevede dopo R4: P4
(decisione su deployment — nuova versione vs aggiornamento
dell'esistente, gestione della Script Property condivisa) fino a P8
(comunicazione al team). Nessuna di queste azioni riguarda PROD vero
finora — **nessuna scrittura su PROD e' mai avvenuta**, solo sulla
copia. Da riprendere quando Marco decide di procedere verso PROD vero
(sessione separata, gate esplicito come sempre).

## Cronologia precedente (R3 rieseguita su copia fresca, fix confermato, 2026-08-16 18:48)

Marco ha ripristinato il foglio "Backup di SigmaFlow Database" allo
stato pre-migrazione (dati vecchi ricopiati, foglio `visite` eliminato)
e rieseguito `eseguiMigrazioneCompletaSuCopiaProd`. Stesso esito pulito
di prima (50 card, 0 errori, 0 card saltate, 0 `coherence_warnings`,
`columns_json` corretto), **confermato da Marco come "comportamento
coerente con la richiesta"** — il fallback data-da-job_id funziona come
atteso sui dati reali.

```
cards_processed: 50, corrections_migrated: 0, checklist_items_migrated: 11,
creation_events_backfilled: 50, cards_skipped: 0, errors: []
columns_json: corrected=true, todo: wip -> prep
schema_alignment: success=true
migrazione_visite: jobs_processed=50, jobs_without_log=0,
  visite_written=50, coherence_warnings=[]
```

Nota: proposta di Marco di dismettere anche il foglio `cases` — non
urgente, rimandata esplicitamente a una sessione successiva (annotato
in `AUDIT_MIGRAZIONE_PROD.md` §8).

## R4 — prossimo passo: verifica a campione di Marco

Chiedere a Marco 3-5 casi reali noti per confrontare `jobs`/`visite`
con la storia vera, **tenendo conto ora del nuovo fallback**: le card
senza `arrival_ts` originale mostreranno le 9:00 del giorno codificato
nel `job_id`, non necessariamente l'ora reale — atteso, dichiarato
esplicitamente come approssimazione di primo passo (Marco: "sarà da
ricostruire attraverso le mail... andiamo con ordine").

---

## Cronologia precedente (2026-08-16, prima del fix)

## R4 — osservazione di Marco: date odierne diffuse, non un errore ma un limite noto

Marco ha notato, verificando i dati della R3, che moltissime card
mostrano `arrival_ts`/`apertura_ts` di oggi anche se il `job_id`
suggerisce una creazione molto precedente (es. `JOB-20260707-...`).

**Verificato con certezza prima di agire** (non fidandosi della sola
lettura manuale di una tabella enorme): scenario dedicato nell'harness
con un caso "arrival_ts gia' popolato nello schema vecchio" e uno
"arrival_ts vuoto" — confermato che **quando arrival_ts era davvero
presente, la migrazione lo preserva correttamente** (non e' corruzione
di dati). Il fallback su "oggi" scattava solo per i casi genuinamente
senza `arrival_ts` — molto piu' diffuso su PROD reale di quanto
osservato nei dati demo di TEST (dove praticamente ogni card aveva
sempre un `arrival_ts`).

**Migliorato il fallback** (`migrateSingleJobActivityLog_`,
`ActivityLog.gs`): quando manca sia il log sia `arrival_ts`, prima di
ricadere sulla data della migrazione si prova a ricavare una data dal
`job_id` stesso (formato `JOB-YYYYMMDD-XXXX`, generato da
`generateJobId`), con le 9:00 come ora di default — su indicazione
esplicita di Marco. Nuova funzione `extractDateFromJobId_`, non
fabbrica mai una data se il job_id non segue il formato atteso o
incorpora una data di calendario non valida. 4 nuovi test dedicati,
**69/69 test passati**. Push su TEST eseguito e verificato (identici).

**Dichiarato esplicitamente da Marco come soluzione solo parziale**:
questo e' il primo passo di un lavoro piu' ampio di "ricostruzione
della memoria" delle card storiche (email, date di creazione delle
cartelle di progetto) — rimandato a sessioni successive, "andiamo con
ordine".

**Nota operativa non ancora risolta**: la copia di PROD gia' migrata in
R3 ha gia' "congelato" le date sbagliate (oggi) per le card senza
arrival_ts, dentro gli eventi di creazione gia' scritti — il backfill
non sovrascrive un evento di creazione gia' presente (evita
duplicazioni). Per beneficiare del fix serve rieseguire la migrazione
su una copia **fresca** di PROD, non su quella gia' processata. Da
confermare con Marco se procedere cosi' per continuare R4, o se accetta
di proseguire la verifica sulla copia attuale sapendo che le date-oggi
verranno riviste comunque in un secondo momento (ricostruzione memoria).

## R0-R3 completati (2026-08-16, riepilogo)

Marco ha creato la copia reale di PROD ("Backup di SigmaFlow Database",
id `1xUMWhAK8tovUU_gHEqizi9WDoqxTULzzfaygAfYL3FI`, R0) e confermato di
procedere con R3.

**Bug trovato e corretto dopo il primo tentativo di Marco**: il wrapper
`eseguiMigrazioneCompletaSuCopiaProd_` (con underscore finale) non
compariva nel menu "Esegui" dell'editor — Apps Script nasconde di
proposito dal menu le funzioni con underscore finale (convenzione
"privata"), esattamente l'opposto di quanto serve a un wrapper pensato
per essere cliccato. Rinominata `eseguiMigrazioneCompletaSuCopiaProd`
(senza), stesso pattern gia' corretto di
`migrateActivityLogOnTest`/`migrateVisiteFromHistoryOnTest`. Pushato e
riverificato.

**R3 eseguita da Marco, esito pulito**:

```
cards_processed: 50, corrections_migrated: 0, checklist_items_migrated: 11,
creation_events_backfilled: 50, cards_skipped: 0, errors: []
columns_json: corrected=true, todo: wip -> prep
schema_alignment: success=true
migrazione_visite: jobs_processed=50, jobs_without_log=0,
  visite_written=50, coherence_warnings=[]
```

Tutte le 50 card reali processate, **zero errori, zero card saltate,
zero warning di incoerenza**. `columns_json` corretto esattamente come
previsto dall'audit (sez. 2.1). `creation_events_backfilled=50` =
`cards_processed` conferma che PROD non aveva mai avuto
`activity_log_json` (atteso, coerente con l'audit).

**Nota positiva emersa**: il wrapper apre lo spreadsheet per ID
diretto (`SpreadsheetApp.openById`), non tramite
`SIGMAFLOW_TEST_SPREADSHEET_ID` — i passi R1/R5 dell'audit (puntare/
ripristinare quella property) non sono stati necessari con questo
approccio, un rischio in meno rispetto al piano originale (nessun
momento in cui TEST e la copia di PROD potessero essere confusi tramite
quella property condivisa).

## Prossimo passo — R4, verifica a campione (di Marco)

Chiesto a Marco di scegliere 3-5 casi reali che conosce bene (uno con
rientri/rework, uno semplice, uno vecchio) e confrontare il risultato
su `jobs`/`visite` con quanto ricorda della storia vera — stesso
controllo gia' fatto sui dati demo di TEST durante L1-L5. In attesa
della sua risposta prima di qualunque passo P4-P8 (deploy/migrazione
su PROD vero) — nessuna azione su PROD vero fin qui, solo sulla copia.
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
