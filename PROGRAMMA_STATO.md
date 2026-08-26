# Stato SigmaFlow
Aggiornato: 2026-08-26

## Fase Q — derivazione unificata di 'visite' dal log: COMPLETA (codice + TEST + PROD) (2026-08-26, sessione 7)

Confermato da Marco: P6/P7 chiusi definitivamente, nessuno strascico
(PR #13/#14 mergiate in `main`, `origin/main` allineato). Nuova branch
dedicata `fix/fase-q-derivazione-visite-2026-08-26`, creata da `main`
aggiornato. Eseguito secondo il prompt operativo di Fase Q gia'
concordato, su `docs/DESIGN_derivazione_visite.md` — file trovato
mancante dal working tree all'inizio sessione (mai committato),
recuperato integro da uno stash locale rimasto orfano dalla sessione
P6/P7 (`git stash show -p` + `git show <commit-untracked>:<path>`,
202 righe, contenuto verificato prima di procedere) invece di essere
riscritto da zero — nessuna perdita di lavoro.

**Codice** (commit `225bd03`): `computeVisiteFromLog_` (ActivityLog.gs)
cambia firma da `(job)` a `(jobId, moveLog)` — riceve il log gia'
filtrato/ordinato dal chiamante. Nuova `syncVisiteFromLog_(job, moveLog)`
(Kanban.gs): unico meccanismo di aggiornamento di 'visite', usato ora da
`moveJob`, `addActivityEvent`, `updateActivityEvent` **e**
`deleteActivityEvent` (che prima non toccava mai 'visite' — commento
esplicito nel vecchio codice, superato dalla ricostruzione completa,
idempotente per natura). Ritirate (rimosse, non lasciate morte):
`alignOpenVisitFields_`, `ensureOpenVisit_`, `reentryAlreadyApplied_`,
`updateVisiteForMove_`, la vecchia `applyManualMoveEffects_`,
`writeVisitToRow_` (rimasta senza chiamanti), i 4 rami di
`checkStructuralAlignment_` che generavano warning per i gate della
visita (start_ts/done_ts/incarico_ts/prep_ts — ora derivati per intero
da `computeVisiteFromLog_`, mai piu' da un warning sul solo candidato).
`findOpenVisitRow_` resta (lettura, usata da `attachOpenVisitSummary_`).
Anche `migrateSingleJobActivityLog_` (Fase F, ActivityLog.gs) ora chiama
`syncVisiteFromLog_` in fondo — non elencata nel prompt originale, ma
necessaria: senza, `testMigrateToActivityLogAlignsOpenVisit` si sarebbe
rotto (la migrazione Fase F cambia il log quanto gli altri quattro
percorsi, stesso principio "un solo meccanismo, sempre" del documento).

**Comportamento cambiato, intenzionalmente, da questa unificazione**:
il vecchio `alignOpenVisitFields_` sovrascriveva incondizionatamente
`start_ts` ad ogni move manuale verso WIP; `moveJob`/`computeVisiteFromLog_`
mantengono invece sempre il PRIMO ingresso (principio "Card B", gia'
testato altrove) — esattamente il tipo di divergenza tra i due
meccanismi che Q elimina. Due test esistenti aggiornati di conseguenza
(`testDeleteActivityEventManual`, `testDeleteActivityEventRealignsOpenVisit`):
valore atteso di `start_ts` corretto dall'ultimo ingresso al primo.

**Due nuovi test dedicati** (criteri di accettazione del documento,
entrambi registrati in `runAllTests()`):
`testAddActivityEventHistoricalReentryUpdatesHistoricallyCorrectVisit`
(un rientro storico scoperto/corretto DOPO un secondo rientro gia'
registrato: con la ricostruzione completa l'effetto va sulla visita
storicamente corretta, non su quella "attualmente aperta" — quella
resta intatta) e `testDeleteActivityEventHistoricalReentryRecalculatesVisite`
(stesso principio via cancellazione: rimuovere il rientro che separava
due visite le fonde in una sola, cosa che oggi — prima di Q — non
succede affatto).

**177/177 test nell'harness Node** (175 preesistenti + 2 nuovi). Push
su TEST verificato: 16/16 file identici (`push-and-verify.sh`).

**Blocco tecnico, stesso di P7, verificato di nuovo prima di procedere**:
`clasp run migrateVisiteFromHistoryOnTest` fallisce con "Unable to run
script function..." — stesso limite dell'Execution API gia' documentato
in P7 (probabile causa: serve un consenso completato dall'editor online,
non coperto dal login da riga di comando). **Non risolvibile da questa
sessione.**

**Bug trovato e corretto DOPO la prima esecuzione reale di Marco su
TEST** (commit `0dbc1bd`): `migrateVisiteFromHistory_` non loggava mai
il proprio risultato (a differenza di `recomputeExistingJobsStatus_`,
la funzione equivalente di P7, che usa `Logger.log`) — la prima
esecuzione di Marco da editor ha mostrato solo "avviata/completata",
nessun dato da incollare. Aggiunto `Logger.log(JSON.stringify(summary))`
(stesso pattern di P7), 177/177 test ancora verdi, ripushato e
riverificato su TEST (16/16 identici).

**TEST — eseguito da Marco** (`migrateVisiteFromHistoryOnTest`,
19:13:49): `{"jobs_processed":52,"jobs_without_log":0,"visite_written":57,"coherence_warnings":[]}`
— 52 job scansionati (stesso numero della dry-run P7 su TEST, stesso
dataset), nessuna riga malformata, 57 visite scritte per 52 job (alcuni
job hanno piu' di una visita/rientro, come atteso), **zero warning di
coerenza** (nessun `RIENTRO_DIRETTO_A_WIP` nello storico TEST reale).

**Confronto a campione — eseguito da Marco, coerente**: `JOB-DEMO-19` e
altri due job con piu' rientri controllati a mano contro la loro
Cronologia reale su TEST — tutto coerente, nessuna discrepanza.

**PROD — eseguito da Marco** (`migrateVisiteFromHistorySuProd`,
19:20:11): `{"jobs_processed":54,"jobs_without_log":0,"visite_written":76,"coherence_warnings":[]}`
— 54 job scansionati (stesso numero dello scan P7 su PROD), nessuna
riga malformata, 76 visite scritte per 54 job, **zero warning di
coerenza**. Nessuna scrittura su dati reali eseguita da Claude, in
nessun momento — sempre dall'editor Apps Script, da Marco stesso, per
regola tecnica del progetto.

**Resta, facoltativo — collaudo visivo finale**: pannello "Percorso
della card" e tempi di attesa in dashboard su un job noto per avere
rientri (es. `JOB-DEMO-19` su TEST, `JOB-20260707-GUKC` su PROD, gia'
verificato "coerente" nel confronto a campione sopra) — non bloccante,
Marco puo' farlo con comodo alla prossima apertura della board.

**Programma Fase Q — completo.** Codice scritto e collaudato
nell'harness Node (177/177, nuovi test compresi), pushato e verificato
su TEST, migrazione eseguita e verificata su TEST **e PROD** con esito
pulito (zero warning in entrambi), confronto a campione su TEST
confermato coerente da Marco. Nessuna PR aperta verso `main` (non
richiesto in questa sessione) — branch `fix/fase-q-derivazione-visite-2026-08-26`
pronta per la review quando Marco vorra' aprirla.

---

## Fase P — CHIUSA DEFINITIVAMENTE (P1-P7 tutte DONE), in attesa di merge/deploy da parte di Marco (2026-08-26, chiusura sessione 6)

**Correzione importante prima della chiusura**: `docs/DESIGN_lock_ambiente.md`
conteneva, in una versione intermedia, una riga secondo cui **Q**
sarebbe stata "eseguita nella stessa giornata di lavoro di P6/P7, non
deferita" — **errore**, segnalato da Claude prima di agire (non
eseguito nulla di Q sulla base di quella riga) e confermato da Marco:
Q resta una fase a sé, in coda, non parte di questa chiusura. Riga
corretta nel documento (§6) per allinearla al resto del documento
stesso (§5: "Q resta il passo successivo, pronta ma non lanciata
insieme"), che era già coerente.

**`docs/DESIGN_lock_ambiente.md` §6 — tutte le caselle P1-P7 spuntate.**
P1-P5 già chiuse e mergiate su `main` (PR #12). P6 (tre punti: card
orfana, `pendingWrites` centralizzato, `renderCardPathSummary_`) e P7
(migrazione una tantum, TEST e PROD) verificate end-to-end e
documentate con i riferimenti ai commit e ai log di esecuzione reali.

**Stato del branch**: `fix/fase-p-lock-ambiente-2026-08-26`, tutto
pushato, nessun commit locale in sospeso. PR [#13](https://github.com/MaTorre72/SigmaFlow/pull/13)
aperta per la review (copre solo i commit non ancora in `main`: P6
terzo punto + P7 — P1-P6 primi due punti già mergiati con PR #12).

**Cosa resta, riservato a Marco — non eseguibile da Claude per regola
tecnica del progetto** (stessa regola già applicata a fine P1-P6):
1. Review/merge della PR #13 su GitHub.
2. Redeploy del deployment PROD (Distribuisci → Gestisci distribuzioni
   → Nuova versione → Distribuisci) — necessario perché il fix di P6
   (pannello percorso card) sia visibile agli utenti reali. I **dati**
   di P7 sono già corretti su PROD in modo permanente, indipendentemente
   dal deployment (scritti direttamente sul foglio da Marco).

**Programma Fase P (P1-P7) — completo.** Nessun'altra azione lato
Claude in sospeso. Fase **Q** resta riservata (solo il nome, design
già scritto in `docs/DESIGN_derivazione_visite.md`) per una sessione
futura, su richiesta esplicita di Marco quando deciderà di riprenderla
— non prima.

---

## P7 — COMPLETA anche su PROD, eseguita da Marco (2026-08-26, sessione 6 continua)

Seguito diretto della sezione sotto (TEST). Marco ha eseguito lui
stesso, dall'editor Apps Script, dry-run e scrittura su PROD — nessuna
azione di scrittura dati eseguita da Claude, come da regola del
progetto.

**PROD — dry-run** (`recomputeExistingJobsStatusSuProdDryRun`, 17:59:51):
54 job scansionati, 0 righe malformate, **20 job cambierebbero** — 1
su `status` (`JOB-20260707-0YXL`: `wait_client`→`wait_authority`), 20
su `status_since_ts`, 0 su `incarico_chiuso_ts`. Numeri coerenti con
l'analisi di §2.7 del documento (~20/55 disallineati).

**Punto chiarito da Marco durante la review del dry-run**: l'analisi
originale (§2.7) segnalava **2** job con `status` diverso dalla
Cronologia (`JOB-20260707-0YXL` e `JOB-20260707-QSCD`), ma il dry-run
ne mostra **1 solo**. Non è un bug della migrazione: `JOB-20260707-QSCD`
non compare perché il suo `status` già corrisponde a quello che dice
la sua Cronologia — l'errore è nell'**evento della Cronologia stesso**
(un rientro in WIP registrato per sbaglio da un umano, confermato da
Marco: "non doveva stare in WIP"), non un disallineamento status↔log.
Dato che P5/P7 seguono sempre "la Cronologia comanda", un evento
storico sbagliato ma coerente con lo `status` attuale non viene (e non
deve) essere toccato da questa migrazione — correggerlo richiederebbe
modificare l'evento stesso in Cronologia, un'azione manuale distinta,
fuori scope qui. **1 è quindi il numero corretto**, confermato da
Marco.

**PROD — scrittura** (`recomputeExistingJobsStatusSuProdWrite`, 18:01:28):
**esito identico al dry-run**, riga per riga, job per job, stesso
prima/dopo per tutti e 20 — nessuna scrittura fuori da quanto già
previsto e verificato. Nessun errore.

**Log completo delle due esecuzioni PROD, conservato per un controllo
a posteriori:**

```
Dry-run PROD (17:59:51): {"dry_run":true,"spreadsheet_id":"15XQwfbTLH4wv8IOzhzIyhpATZY-9KmXoorhD4mpZk4g","spreadsheet_name":"SigmaFlow Database","executed_at":"2026-08-26T17:59:53+02:00","total_rows_scanned":54,"rows_skipped_unparsable":[],"rows_changed":20,"changes_by_field":{"status":1,"status_since_ts":20,"incarico_chiuso_ts":0},"status_changes_detail":[{"job_id":"JOB-20260707-0YXL","row":21,"fields":[{"field":"status","before":"wait_client","after":"wait_authority"},{"field":"status_since_ts","before":"2026-06-15T09:00","after":"2026-07-20T14:12"}]}],"changes":[{"job_id":"JOB-20260707-GUKC","row":8,"fields":[{"field":"status_since_ts","before":"2026-05-15T15:00","after":"2026-08-12T13:58"}]},{"job_id":"JOB-20260707-EMPA","row":11,"fields":[{"field":"status_since_ts","before":"2026-07-07T09:00:00+02:00","after":"2026-07-10T09:00"}]},{"job_id":"JOB-20260707-18H2","row":12,"fields":[{"field":"status_since_ts","before":"2026-07-07T09:00:00+02:00","after":"2025-12-01T12:00"}]},{"job_id":"JOB-20260707-Q0RY","row":14,"fields":[{"field":"status_since_ts","before":"2026-07-07T09:00:00+02:00","after":"2025-12-01T11:47"}]},{"job_id":"JOB-20260707-NZFQ","row":16,"fields":[{"field":"status_since_ts","before":"2026-07-07T09:00:00+02:00","after":"2026-08-06T15:00"}]},{"job_id":"JOB-20260707-763N","row":17,"fields":[{"field":"status_since_ts","before":"2026-07-07T09:00:00+02:00","after":"2026-07-21T15:00"}]},{"job_id":"JOB-20260707-6QIZ","row":18,"fields":[{"field":"status_since_ts","before":"2026-07-07T09:00:00+02:00","after":"2026-07-21T15:00"}]},{"job_id":"JOB-20260707-BGHE","row":19,"fields":[{"field":"status_since_ts","before":"2026-08-19T10:59:21+02:00","after":"2026-07-21T10:00"}]},{"job_id":"JOB-20260707-7YP8","row":20,"fields":[{"field":"status_since_ts","before":"2026-07-07T09:00:00+02:00","after":"2026-07-21T09:00"}]},{"job_id":"JOB-20260707-0YXL","row":21,"fields":[{"field":"status","before":"wait_client","after":"wait_authority"},{"field":"status_since_ts","before":"2026-06-15T09:00","after":"2026-07-20T14:12"}]},{"job_id":"JOB-20260707-AI13","row":26,"fields":[{"field":"status_since_ts","before":"2026-07-07T09:00:00+02:00","after":"2026-07-22T09:00"}]},{"job_id":"JOB-20260707-427Q","row":35,"fields":[{"field":"status_since_ts","before":"2026-07-07T09:00:00+02:00","after":"2026-08-05T16:45"}]},{"job_id":"JOB-20260707-QDXZ","row":37,"fields":[{"field":"status_since_ts","before":"2026-08-18T15:39:41+02:00","after":"2026-04-22T15:12"}]},{"job_id":"JOB-20260707-DQSL","row":41,"fields":[{"field":"status_since_ts","before":"2026-07-07T09:00:00+02:00","after":"2026-05-30T09:00"}]},{"job_id":"JOB-20260729-UXVS","row":49,"fields":[{"field":"status_since_ts","before":"2026-07-29T09:00:00+02:00","after":"2026-07-28T17:00"}]},{"job_id":"JOB-20260810-0PBJ","row":50,"fields":[{"field":"status_since_ts","before":"2026-08-18T10:27:17+02:00","after":"2026-08-01T12:01"}]},{"job_id":"JOB-20260818-C79W","row":51,"fields":[{"field":"status_since_ts","before":"2026-08-18T10:46:42+02:00","after":"2026-08-17T09:00"}]},{"job_id":"JOB-20260818-XIM6","row":52,"fields":[{"field":"status_since_ts","before":"2026-08-18T12:13:36+02:00","after":"2026-05-07T15:51"}]},{"job_id":"JOB-20260818-1BE6","row":53,"fields":[{"field":"status_since_ts","before":"2026-08-18T12:37:40+02:00","after":"2026-05-18T07:55"}]},{"job_id":"JOB-20260818-E67E","row":54,"fields":[{"field":"status_since_ts","before":"2026-08-18T12:55:31+02:00","after":"2026-06-22T15:49"}]}]}

Scrittura PROD (18:01:28): {"dry_run":false,"spreadsheet_id":"15XQwfbTLH4wv8IOzhzIyhpATZY-9KmXoorhD4mpZk4g","spreadsheet_name":"SigmaFlow Database","executed_at":"2026-08-26T18:01:30+02:00","total_rows_scanned":54,"rows_skipped_unparsable":[],"rows_changed":20,"changes_by_field":{"status":1,"status_since_ts":20,"incarico_chiuso_ts":0},"status_changes_detail":[{"job_id":"JOB-20260707-0YXL","row":21,"fields":[{"field":"status","before":"wait_client","after":"wait_authority"},{"field":"status_since_ts","before":"2026-06-15T09:00","after":"2026-07-20T14:12"}]}],"changes":[{"job_id":"JOB-20260707-GUKC","row":8,"fields":[{"field":"status_since_ts","before":"2026-05-15T15:00","after":"2026-08-12T13:58"}]},{"job_id":"JOB-20260707-EMPA","row":11,"fields":[{"field":"status_since_ts","before":"2026-07-07T09:00:00+02:00","after":"2026-07-10T09:00"}]},{"job_id":"JOB-20260707-18H2","row":12,"fields":[{"field":"status_since_ts","before":"2026-07-07T09:00:00+02:00","after":"2025-12-01T12:00"}]},{"job_id":"JOB-20260707-Q0RY","row":14,"fields":[{"field":"status_since_ts","before":"2026-07-07T09:00:00+02:00","after":"2025-12-01T11:47"}]},{"job_id":"JOB-20260707-NZFQ","row":16,"fields":[{"field":"status_since_ts","before":"2026-07-07T09:00:00+02:00","after":"2026-08-06T15:00"}]},{"job_id":"JOB-20260707-763N","row":17,"fields":[{"field":"status_since_ts","before":"2026-07-07T09:00:00+02:00","after":"2026-07-21T15:00"}]},{"job_id":"JOB-20260707-6QIZ","row":18,"fields":[{"field":"status_since_ts","before":"2026-07-07T09:00:00+02:00","after":"2026-07-21T15:00"}]},{"job_id":"JOB-20260707-BGHE","row":19,"fields":[{"field":"status_since_ts","before":"2026-08-19T10:59:21+02:00","after":"2026-07-21T10:00"}]},{"job_id":"JOB-20260707-7YP8","row":20,"fields":[{"field":"status_since_ts","before":"2026-07-07T09:00:00+02:00","after":"2026-07-21T09:00"}]},{"job_id":"JOB-20260707-0YXL","row":21,"fields":[{"field":"status","before":"wait_client","after":"wait_authority"},{"field":"status_since_ts","before":"2026-06-15T09:00","after":"2026-07-20T14:12"}]},{"job_id":"JOB-20260707-AI13","row":26,"fields":[{"field":"status_since_ts","before":"2026-07-07T09:00:00+02:00","after":"2026-07-22T09:00"}]},{"job_id":"JOB-20260707-427Q","row":35,"fields":[{"field":"status_since_ts","before":"2026-07-07T09:00:00+02:00","after":"2026-08-05T16:45"}]},{"job_id":"JOB-20260707-QDXZ","row":37,"fields":[{"field":"status_since_ts","before":"2026-08-18T15:39:41+02:00","after":"2026-04-22T15:12"}]},{"job_id":"JOB-20260707-DQSL","row":41,"fields":[{"field":"status_since_ts","before":"2026-07-07T09:00:00+02:00","after":"2026-05-30T09:00"}]},{"job_id":"JOB-20260729-UXVS","row":49,"fields":[{"field":"status_since_ts","before":"2026-07-29T09:00:00+02:00","after":"2026-07-28T17:00"}]},{"job_id":"JOB-20260810-0PBJ","row":50,"fields":[{"field":"status_since_ts","before":"2026-08-18T10:27:17+02:00","after":"2026-08-01T12:01"}]},{"job_id":"JOB-20260818-C79W","row":51,"fields":[{"field":"status_since_ts","before":"2026-08-18T10:46:42+02:00","after":"2026-08-17T09:00"}]},{"job_id":"JOB-20260818-XIM6","row":52,"fields":[{"field":"status_since_ts","before":"2026-08-18T12:13:36+02:00","after":"2026-05-07T15:51"}]},{"job_id":"JOB-20260818-1BE6","row":53,"fields":[{"field":"status_since_ts","before":"2026-08-18T12:37:40+02:00","after":"2026-05-18T07:55"}]},{"job_id":"JOB-20260818-E67E","row":54,"fields":[{"field":"status_since_ts","before":"2026-08-18T12:55:31+02:00","after":"2026-06-22T15:49"}]}]}
```

**Programma Fase P7 — completo, TEST e PROD.** Tutte le azioni di
scrittura su PROD eseguite da Marco stesso, dall'editor Apps Script —
nessuna scrittura dati eseguita da Claude, in nessun momento.
`docs/DESIGN_lock_ambiente.md` §6 da aggiornare con le caselle P7.

---

## P7 — migrazione una tantum status/status_since_ts/incarico_chiuso_ts: TEST completo, PROD in attesa di Marco (2026-08-26, sessione 6)

Richiesta esplicita di Marco: "deve tutto essere coerente con la
Cronologia, sempre — se una card viene toccata deve essere aggiornata",
niente gate, TEST e PROD nella stessa sessione. **Rispettato per TEST,
non per PROD**: la scrittura su dati reali PROD resta riservata a
Marco stesso, per regola tecnica di `CLAUDE.md` — nessuna eccezione,
nemmeno su richiesta esplicita in sessione. Segnalato subito a inizio
sessione, prima di scrivere codice.

**Codice** (`ActivityLog.gs`, commit `5ebef32`): `recomputeExistingJobsStatus_(ss, dryRun)`
— riusa `recomputeCurrentStatus_`/`recomputeIncaricoChiusoTs_` (P5)
così come sono, applicandole retroattivamente a ogni riga di `jobs`.
`dryRun=true` (default): solo report, nessuna scrittura. `dryRun=false`
(sempre esplicito): scrive solo i campi che differiscono. Riga con
`activity_log_json` mancante/non interpretabile: saltata e segnalata,
non blocca le altre. Wrapper `OnTest`/`SuProd` (stesso pattern di
sicurezza di `allineaSchemaSuProd`) + wrapper senza parametri per
l'editor (`...OnTestDryRun`/`...OnTestWrite`/`...SuProdDryRun`/`...SuProdWrite`,
dato che il menu Esegui chiama sempre a zero argomenti).

**Blocco tecnico incontrato e non risolto**: `clasp run` (Execution
API) fallisce sempre con "Unable to run script function..." — verificato
non specifico alla nuova funzione (fallisce anche su una funzione
banale preesistente), non risolto da un nuovo `clasp login` con
riautorizzazione completa. Causa più probabile: l'Execution API in
modalità `MYSELF` richiede che l'account abbia già eseguito almeno una
funzione dall'editor online per completare il consenso — non coperto
dal login da riga di comando. **Non bloccante**: Marco ha eseguito
direttamente dall'editor Apps Script (menu Esegui → Log di esecuzione),
stesso identico output che avrebbe dato `clasp run`.

**TEST — dry-run eseguito da Marco** (`recomputeExistingJobsStatusOnTestDryRun`,
17:52:50): 52 job scansionati, 0 righe malformate, **1 solo job
cambierebbe** (`JOB-DEMO-19`: `status` todo→wip, `status_since_ts`
2026-07-27T08:38→2026-07-29T08:40; `incarico_chiuso_ts` invariato per
tutti) — dataset demo/TEST, in gran parte già coerente (diversamente
da PROD, vedi sotto). **Verificato contro la Cronologia reale** da
Marco prima di procedere: ultimo evento davvero un move verso WIP
il 29/07 08:40, confermato.

**TEST — scrittura eseguita da Marco** (`recomputeExistingJobsStatusOnTestWrite`,
17:55:52): stesso identico risultato del dry-run (1 job, stessi
valori before/after) — scrittura applicata. **175/175 test
nell'harness Node** (171 preesistenti + 4 nuovi: dry-run senza
scrittura, scrittura dei soli campi cambiati, riga malformata non
blocca le altre, job già consistente non tocca). Push su TEST
verificato: 16/16 file identici.

**Log delle due esecuzioni reali, conservato per un controllo a
posteriori** (copiato qui integralmente, non solo riassunto):

```
Dry-run (17:52:50): {"dry_run":true,"spreadsheet_id":"1kzoVGcIqcYIuGWgmRQbeuyK-37cmSaUQye3d36rhDRU","spreadsheet_name":"SigmaFlow Database TEST","executed_at":"2026-08-26T17:52:52+02:00","total_rows_scanned":52,"rows_skipped_unparsable":[],"rows_changed":1,"changes_by_field":{"status":1,"status_since_ts":1,"incarico_chiuso_ts":0},"status_changes_detail":[{"job_id":"JOB-DEMO-19","row":20,"fields":[{"field":"status","before":"todo","after":"wip"},{"field":"status_since_ts","before":"2026-07-27T08:38","after":"2026-07-29T08:40"}]}],"changes":[{"job_id":"JOB-DEMO-19","row":20,"fields":[{"field":"status","before":"todo","after":"wip"},{"field":"status_since_ts","before":"2026-07-27T08:38","after":"2026-07-29T08:40"}]}]}

Scrittura (17:55:52): {"dry_run":false,"spreadsheet_id":"1kzoVGcIqcYIuGWgmRQbeuyK-37cmSaUQye3d36rhDRU","spreadsheet_name":"SigmaFlow Database TEST","executed_at":"2026-08-26T17:55:54+02:00","total_rows_scanned":52,"rows_skipped_unparsable":[],"rows_changed":1,"changes_by_field":{"status":1,"status_since_ts":1,"incarico_chiuso_ts":0},"status_changes_detail":[{"job_id":"JOB-DEMO-19","row":20,"fields":[{"field":"status","before":"todo","after":"wip"},{"field":"status_since_ts","before":"2026-07-27T08:38","after":"2026-07-29T08:40"}]}],"changes":[{"job_id":"JOB-DEMO-19","row":20,"fields":[{"field":"status","before":"todo","after":"wip"},{"field":"status_since_ts","before":"2026-07-27T08:38","after":"2026-07-29T08:40"}]}]}
```

**PROD — non eseguito da questa sessione, in attesa di Marco.**
Numeri attesi (già noti da §2.7 del documento, verificati in
precedenza sui dati reali, da confermare col vero dry-run): **20 job
su 55 con `status_since_ts` disallineato**, **2 con `status` (la
colonna sulla board) diverso da dove l'ultimo evento della Cronologia
dice che dovrebbero essere** — `JOB-20260707-0YXL` e
`JOB-20260707-QSCD`. Questi due vanno segnalati esplicitamente nel
report finale quando Marco esegue, non nascosti in un conteggio
aggregato — per decisione sua esplicita, corretti come tutti gli
altri, senza eccezione.

**Istruzioni per Marco (stesso procedimento già seguito su TEST)**:
1. Editor Apps Script → menu funzioni → `recomputeExistingJobsStatusSuProdDryRun` → Esegui → Log di esecuzione, incollarmelo.
2. Dopo conferma che i numeri tornano (in particolare i due job con `status` diverso): `recomputeExistingJobsStatusSuProdWrite` → Esegui → Log di esecuzione, incollarmelo di nuovo.

**Programma Fase P7 — completo lato Claude.** Codice scritto,
collaudato nell'harness Node, eseguito e verificato su TEST reale
(dry-run + scrittura). Manca solo l'esecuzione su PROD, riservata a
Marco.

---

## P6 — terzo punto aggiunto dopo il merge: fix su renderCardPathSummary_ (2026-08-26, sessione 5)

Dopo il merge/deploy di Fase P (P1-P6, sezione sotto), Marco ha
segnalato un secondo problema distinto sullo stesso screenshot: il
pannello "Percorso della card" mostrava una durata impossibile (WIP:
103g per una card spostata lì 14 giorni prima — caso reale
`JOB-20260707-GUKC`). Verificato sui dati veri del foglio "SigmaFlow
Database": `job.status_since_ts` è disallineato dall'ultimo evento
della Cronologia su **20 job su 55** (scritto in modo inaffidabile
prima del fix di P5, mai aggiornato sui job già esistenti — P5 corregge
solo da quel momento in avanti). Due correzioni distinte decise con
Marco: una difesa lato client qui (**P6, terzo punto**, aggiunta allo
stesso branch dopo il merge — i primi due punti di P6 erano già
mergiati/deployati), una migrazione dati lato server in una sotto-fase
a sé (**P7**, tocca dati reali, fuori scope qui).

**Fix**: `renderCardPathSummary_` (client.html) — il segmento "in corso"
usava `job.status_since_ts` come inizio senza controllare che fosse
successivo all'ultimo evento `move` del log. Ora `Math.max(status_since_ts,
segmentStart)`: `status_since_ts` può solo spostare l'inizio in AVANTI
rispetto a quanto dice il log, mai indietro. Stesso principio di P5 ("la
Cronologia comanda"), applicato qui solo alla visualizzazione — **non
corregge il dato sul foglio** (quello è P7).

**Collaudato nel Browser pane** (server locale di riproduzione, chiamata
diretta a `renderCardPathSummary_` con un `job.status_since_ts`
manipolato, per isolare esattamente la funzione toccata):
- Caso bug reale: `status_since_ts` spostato 103 giorni prima
  dell'ultimo evento del log → il pannello mostra la durata calcolata
  dal log (pochi minuti, coerente col tempo reale trascorso nel test),
  non più 103 giorni.
- Caso opposto (M0-C, già supportato prima del fix, verificato di non
  averlo rotto): `status_since_ts` più recente dell'ultimo evento del
  log (2 minuti dopo) → il pannello rispetta il valore corretto, non lo
  scavalca con quello del log.
- Nessun errore in console.

**171/171 test nell'harness Node** (nessuna regressione — fix puramente
client-side, coerente con P6 punti 1/2 già verificati in precedenza).
Push su TEST verificato: 16/16 file identici. Nessuna PR aperta, come
da richiesta — resta sullo stesso branch `fix/fase-p-lock-ambiente-2026-08-26`
(ora un commit avanti rispetto a `main`, che ha già i primi due punti di
P6 mergiati/deployati).

---

## Fase P — CHIUSA (P1-P6 tutte DONE), in attesa di merge/deploy da parte di Marco (2026-08-26)

Tutte le caselle di `docs/DESIGN_lock_ambiente.md` §6 spuntate (P1-P6).
Ultima verifica di chiusura, ripetuta da capo su richiesta di Marco
("chiudiamo la fase P"): **171/171 test** nell'harness Node, push su
TEST **verificato di nuovo** (16/16 file identici), branch
`fix/fase-p-lock-ambiente-2026-08-26` allineato a `origin` (nessun
commit locale non pushato).

**Riepilogo completo della fase**:
- **P1** (`744b95f`) — Script Property condivisa → variabile
  per-esecuzione, chiude la classe di incidenti PROD/TEST del 19/08 e
  25/08.
- **P2** (`89bf7ea`) — lock globale solo sulle azioni di scrittura,
  gate confermato da Marco prima dell'implementazione.
- **P3** (`c94a32c`) — `doPost` delega ad `api()`, eredita P1/P2 anche
  sulle POST dirette.
- **P4** (`c94a32c`) — riepilogo visivo del percorso della card, tab
  Informazioni (feature, non bug).
- **P5** (`2c5bc49`) — `job.status` derivato sempre dall'evento più
  recente della Cronologia, non dal candidato appena toccato (due bug
  distinti corretti).
- **P5b** (`2159cab`) — stesso principio applicato a
  `incarico_chiuso_ts`, su richiesta esplicita di Marco dopo il punto
  esplorativo di P5.
- **P6** (`8d04b35`) — card orfana in due colonne dopo un drag
  (`removeCardEl_` mancante in `moveJob`) + `pendingWrites` non
  centralizzato (poll poteva sovrascrivere lo stato durante scritture
  non protette).

**Cosa resta, riservato a Marco — non eseguibile da Claude per regola
tecnica del progetto** (`.claude/settings.local.json` blocca il push su
`main`/`master` a livello di permessi; la scrittura su PROD, dati o
deployment, è "sempre riservata a un'azione eseguita da Marco stesso"
per `CLAUDE.md`, senza eccezioni nemmeno su richiesta esplicita in
sessione):
1. Review/merge della PR [#12](https://github.com/MaTorre72/SigmaFlow/pull/12)
   (`fix/fase-p-lock-ambiente-2026-08-26` → `main`) da GitHub.
2. Dopo il merge, `clasp push` verso PROD (se il flusso del progetto
   lo prevede da locale) e/o ripubblicazione del deployment Apps
   Script PROD (Distribuisci → Gestisci distribuzioni → Nuova versione
   → Distribuisci) — stessa procedura già seguita per i fix PROD
   precedenti in questo progetto (vedi sezioni storiche più sotto in
   questo file).

Nessun'altra azione lato Claude in sospeso su questa fase.

---

## Fase P (ambiente e lock globale) — P6 DONE, solo client-side (2026-08-26, sessione 4)

Proseguimento sullo stesso branch (`fix/fase-p-lock-ambiente-2026-08-26`,
verificato allineato all'ultimo commit `2159cab` prima di iniziare —
`git pull` senza nulla da scaricare). Bug segnalato da Marco con uno
screenshot: card visibile contemporaneamente in due colonne (WIP e
ATTESA CLIENTE) per alcuni secondi dopo un trascinamento. Documento
già aggiornato con P6 (§2.6/§3/§4/§6) prima di questa sessione — solo
implementazione, nessuna scrittura al documento in questa fase (lettura
e implementazione secondo un prompt operativo dettagliato).

**Causa reale (`moveJob`, client.html)**: `placeCardInColumn_` rimuove
il nodo esistente della card solo **dentro la colonna di arrivo**
(`cardsRoot.querySelector(...)`, `cardsRoot` è già scoping sulla
colonna target) — mai da quella di provenienza. Un trascinamento reale
lasciava quindi il vecchio nodo orfano nella colonna di provenienza,
visibile insieme al nuovo finché un `renderBoard()` completo (poll a
45s o refresh) non lo ripuliva. Stesso bug già risolto altrove
(`applyActivityJobUpdate_`, fix precedente) con `removeCardEl_`
(rimozione board-wide) prima di `placeCardInColumn_` — pattern non
applicato al drag-and-drop reale per un'assunzione sbagliata nel
commento originale ("a differenza del drag-and-drop reale"), ora
corretta.

**Fix 1 — `moveJob`**: `removeCardEl_(moveResult.job.job_id)` aggiunta
subito prima di `placeCardInColumn_(moveResult.job)` nell'update
ottimistico. Commento fuorviante in `applyActivityJobUpdate_` corretto
di conseguenza.

**Fix 2 — `callApi`/`pendingWrites`**: il conteggio delle scritture in
corso (usato da `loadBoard` per non sovrascrivere lo stato locale con
un poll a metà di una scrittura) era affidato a incrementi/decrementi
manuali sparsi nei singoli chiamanti — solo `saveCardFromModal` lo
faceva, lasciando **tutte le altre azioni di scrittura** (`deleteJob`,
`archiveJobFromModal`, `duplicaJob`, `ripristinaJob`,
`eliminaJobDefinitivamente`, `updateOptionList`, ...) senza protezione
dal poll periodico. Centralizzato in `callApi`: nuova mappa
`SF_READ_ACTIONS_CLIENT_` (specchio client-side di `SF_READ_ACTIONS_`,
Kanban.gs — annotato esplicitamente come da tenere allineato a mano se
cambia lato server), incremento prima della chiamata per ogni azione
non in quella mappa, decremento via `.finally()` sulla Promise
(copertura simmetrica successo/errore). Rimosso l'incremento/decremento
manuale ridondante in `saveCardFromModal`.

**Censimento allargato** (richiesto esplicitamente da Marco, non solo
la causa diretta dello screenshot): riletti tutti i punti di scrittura
client-side (`client.html`) per lo stesso tipo di problema (aggiornamento
ottimistico del DOM senza pulizia del nodo precedente). Trovato solo il
punto sopra (`pendingWrites`); tutti gli altri (colonne, opzioni,
Archivio, Cestino) confermati già sicuri per costruzione — ridisegnano
sempre per intero la loro porzione di DOM. Due punti minori, non bug di
dati, documentati come esplicitamente fuori scope (§2.6 del documento):
un residuo teorico su `pendingWrites` (poll partito prima di una
scrittura molto veloce, richiederebbe un identificatore di versione
lato server) e `duplicaJobFromArchivio` che non aggiorna subito
`state.board` (lacuna di UX — il caso nuovo compare solo al prossimo
poll/refresh, non un bug di dati). Nessuno dei due offriva un modo
economico e a basso rischio di chiuderlo in questa sessione — non
proposto, lasciato come documentato.

**Collaudato nel Browser pane** (server locale di riproduzione,
rimosso a fine sessione):
- Sei trascinamenti rapidi avanti e indietro tra WIP e ATTESA CLIENTE
  (chiamate sincrone consecutive a `moveJob`, senza attendere la
  risposta server tra l'una e l'altra, per simulare un drag reale
  veloce): `document.querySelectorAll('[data-job-id="..."]').length`
  sempre `1`, mai `2`, sia durante sia dopo tutte le risposte server.
- `getActivityLog` (lettura): `state.pendingWrites` invariato (0)
  prima, durante e dopo la chiamata.
- `moveJob` (scrittura): `state.pendingWrites` correttamente `1`
  durante la chiamata, tornato a `0` dopo.
- Le quattro famiglie di azioni prima non protette, una per una:
  `deleteJob`, `archiveJobFromModal`, `duplicaJob` (Archivio),
  `ripristinaJob` (Cestino) — tutte e quattro `pendingWrites` a `1`
  durante, `0` dopo, nessun errore in console, stesso comportamento
  funzionale di prima (card spostata/duplicata/ripristinata
  correttamente).

**171/171 test nell'harness Node** (nessuna regressione — P6 è
puramente client-side, non coperto dall'harness Node per costruzione).
Push su TEST verificato: 16/16 file identici.

**Programma Fase P — P1-P6 tutte DONE.** Nessuna PR aperta per questa
sotto-fase (richiesta esplicita di Marco — resta sullo stesso branch
`fix/fase-p-lock-ambiente-2026-08-26`, PR [#12](https://github.com/MaTorre72/SigmaFlow/pull/12)
da aggiornare quando deciso). Fase **Q** riservata (nome soltanto, §5
del documento) per la revisione più profonda della logica di
`ensureOpenVisit_`/`alignOpenVisitFields_` — segnalata da Marco sullo
stesso screenshot, esplicitamente fuori scope qui.

---

## Fase P (ambiente e lock globale) — P5b: fix anche su incarico_chiuso_ts, su richiesta di Marco (2026-08-26, sessione 3 continua)

Marco ha confermato di voler applicare anche il fix sul punto
esplorativo di P5 (`incarico_chiuso_ts`). Stesso principio di
`recomputeCurrentStatus_`: nuova funzione pura
`recomputeIncaricoChiusoTs_(job, log)` (Kanban.gs) — un incarico chiuso
viene riaperto (`incarico_chiuso_ts` azzerato) solo se nel log esiste
un vero rientro (move da stand_by/done verso backlog/prep)
**cronologicamente successivo alla chiusura registrata**, non per
qualunque candidato che rappresenti quel pattern indipendentemente da
quando è davvero accaduto. Le due righe che facevano l'azzeramento
incondizionato sono state tolte da `applyManualMoveEffects_` (che resta
solo per gli altri effetti su `visite`, invariati). Chiamata in fondo a
`addActivityEvent`/`updateActivityEvent`, **non** in
`deleteActivityEvent` — deliberatamente fuori scope: una volta azzerato,
il valore originale di `incarico_chiuso_ts` non è più recuperabile dal
solo log, stesso limite (per lo stesso motivo) per cui
`applyManualMoveEffects_` già non tocca gli effetti su `visite` in
cancellazione.

**Bug reale trovato scrivendo il test del caso legittimo** (non solo
"sembra corretto" — verificato con un secondo test dedicato, prima
mancante): la prima versione confrontava gli istanti con `< / <=`
stretto, scartando un rientro con timestamp **identico** alla chiusura
(caso reale: un rientro registrato "ora" subito dopo una chiusura fatta
anch'essa "ora" — capita spesso, la precisione dei timestamp non
garantisce mai un ordinamento stretto tra due azioni ravvicinate nello
stesso secondo). Corretto usando `< 0` invece di `<= 0` nel confronto
(un pareggio conta come "successivo", non viene scartato).

**Test aggiornati/aggiunti** (`Tests.gs`), entrambi registrati e
verificati: il test esplorativo di P5 è stato rinominato e la sua
asserzione capovolta (da "documenta il bug" a "verifica il fix") —
`testAddActivityEventOldBackdatedReentryDoesNotReopenAlreadyClosedJob`.
Aggiunto il test simmetrico per il caso legittimo, che ha trovato il
bug del pareggio sopra —
`testAddActivityEventRecentReentryAfterClosureStillReopensJob` (un
rientro vero, registrato "ora" subito dopo una chiusura fatta anch'essa
"ora", deve continuare a riaprire l'incarico esattamente come prima di
questo fix).

**171/171 test nell'harness Node** (170 preesistenti + 1 nuovo — il test
esplorativo di P5 è stato riusato/rinominato, non duplicato). Push su
TEST verificato: 16/16 file identici. `moveJob`/`deleteActivityEvent`
non toccate (verificato con `git diff`, zero righe modificate in
entrambe).

**Programma Fase P — P1-P5 tutte DONE, nessun residuo aperto.**
`docs/DESIGN_lock_ambiente.md` §6 aggiornato, tutte le spunte a TRUE.

**PR**: [#12](https://github.com/MaTorre72/SigmaFlow/pull/12) da
aggiornare con questo commit.

---

## Fase P (ambiente e lock globale) — P5 DONE, due bug reali corretti + un terzo confermato in attesa di decisione (2026-08-26, sessione 3)

Proseguimento della sessione P1-P4 (stesso branch, verificato allineato
all'ultimo commit `c94a32c` prima di iniziare). Bug segnalato da Marco:
lo stato "attuale" della card non riflette in modo affidabile l'ultima
colonna registrata in Cronologia — automatica o manuale, di oggi o di
mesi fa. Documento aggiornato con la sotto-fase P5 (§2.5/§4/§6) prima
di implementare.

**Causa reale, in `applyManualMoveEffects_` (Kanban.gs)**: la funzione
faceva due cose diverse nello stesso posto — impostava `job.status`/
`status_since_ts` sul candidato appena toccato dalla chiamata in corso
**e** applicava gli effetti su `visite` (apertura/chiusura, accumulo
attese) specifici di quel candidato. La prima parte era sbagliata:
un evento move non è detto sia il più recente del log solo perché è
quello appena inserito/corretto/cancellato.

**Due bug distinti riprodotti e corretti**:
- **Bug 1** (`addActivityEvent`/`updateActivityEvent`): un evento move
  con data passata (dimenticato, corretto mesi dopo) sovrascriveva
  comunque lo stato attuale, anche con eventi successivi più recenti
  già nel log.
- **Bug 2** (`deleteActivityEvent`): cancellare l'evento che determinava
  la posizione attuale lasciava la card bloccata lì, invece di tornare
  alla colonna dell'evento rimasto più recente (la funzione non
  ricalcolava mai `job.status` dopo una cancellazione).

**Fix implementato**: nuova funzione pura `recomputeCurrentStatus_(job, log)`
(Kanban.gs) — imposta `job.status`/`status_since_ts` dall'evento `move`
cronologicamente più recente dell'intero log ordinato (`log` arriva già
ordinato per ts da ogni chiamante), nessun effetto su `visite`. Chiamata
in fondo a `addActivityEvent`, `updateActivityEvent` **e**
`deleteActivityEvent`, dopo ogni altra elaborazione. `applyManualMoveEffects_`
ha perso le due righe che impostavano `job.status`/`status_since_ts` —
resta **solo** per gli effetti su `visite`, invariata per il resto,
chiamata solo per il candidato specifico in add/update, **mai** in
delete (già strutturalmente vero prima di questa sessione — `deleteActivityEvent`
passa `applyStructuralAlignment_` senza `candidate`/`log`, quindi
`applyManualMoveEffects_` riceve `candidate` `undefined` e ritorna
subito; verificato di non aver introdotto nessuna chiamata nuova lì).

**`moveJob` (drag-and-drop reale) non toccata** — non ha questo bug
(scrive `job.status` direttamente dalla mossa in corso, non passa da
questo meccanismo), confermato con `git diff` (zero righe modificate in
quella funzione).

**Punto esplorativo su `incarico_chiuso_ts` — CONFERMATO UN BUG ANALOGO,
NON CORRETTO in questa sessione** (richiesta esplicita di Marco, in
attesa di una sua decisione): `applyManualMoveEffects_` azzera
`incarico_chiuso_ts` incondizionatamente quando il candidato rappresenta
un vero rientro (stesso schema del Bug 1, applicato a un altro campo).
Riprodotto con un log costruito direttamente sulla riga (gli eventi
automatici sono sempre stampati "ora" dall'API, non backdatabili via
parametro): job chiuso di recente (`invoiced: true`, "ora"), poi
aggiunto un rientro vecchio dimenticato (tra due eventi già esistenti,
`from` ricalcolato correttamente a `wait_client` — un vero pattern di
rientro, non un caso degenere) — `incarico_chiuso_ts` viene azzerato
per errore, riaprendo un incarico che avrebbe dovuto restare chiuso.
`job.status` invece resta corretto (`wip`, non toccato da questo evento
vecchio) — conferma che il fix di P5 funziona correttamente anche in
questo scenario più complesso, il problema residuo è isolato al solo
campo `incarico_chiuso_ts`. Documentato con un test dedicato
(`testExploratoryIncaricoChiusoTsResetByOldBackdatedReentry_BugConfirmedNotYetFixed`)
che **asserisce il comportamento attuale (il bug)**, non quello
desiderato — commentato esplicitamente come tale, da aggiornare insieme
a un eventuale fix futuro, non lasciato così per sempre.

**Test aggiunti** (`Tests.gs`), tutti registrati nell'array `tests` di
`runAllTests()` (verificato che il conteggio sia salito, non solo che
dicesse "N/N" — lezione della sessione precedente):
`testAddActivityEventBackdatedMoveDoesNotOverrideMoreRecentStatus` (Bug 1),
`testDeleteActivityEventRevertsStatusToNewMostRecentMove` (Bug 2),
`testExploratoryIncaricoChiusoTsResetByOldBackdatedReentry_BugConfirmedNotYetFixed`
(esplorativo). **170/170 test nell'harness Node** (167 preesistenti + 3
nuovi, nessuna regressione). Push su TEST verificato: 16/16 file
identici.

**Nota metodologica per sessioni future**: le prime riproduzioni di
Bug 2 e del punto esplorativo sono fallite per un problema del mock
timestamp dell'harness (non un bug prodotto) — mescolare `new
Date().toISOString()` reale con `nowIso_()`/`Utilities.formatDate` del
mock (che etichetta l'ora locale della macchina con un offset fisso
"+02:00", indipendentemente dal vero fuso) produce istanti assoluti
incoerenti tra loro. Soluzione: usare sempre gli helper già esistenti
in `Tests.gs` per questo scopo (`testTsMinutesAgo_`, `testIsoDaysAgo_`,
`testAddJobWithPastArrival_`) o, quando serve controllo totale su una
sequenza storica con eventi ben separati nel tempo, costruire il log
direttamente sulla riga (`readJobFromRow_`/`writeJobToRow_`) invece di
affidarsi a eventi automatici dell'API (sempre stampati "ora").

**Criteri di accettazione P5 (§6 del documento) — tutti verificati
TRUE**, incluso il punto esplorativo (riportato, non lasciato senza
risposta).

**Programma Fase P — P1-P5 tutte DONE.** Residuo aperto, in attesa di
decisione di Marco: fix di `incarico_chiuso_ts` (stesso principio di
P5, applicabile in una sotto-fase successiva se confermato).

**PR**: [#12](https://github.com/MaTorre72/SigmaFlow/pull/12) da
aggiornare con il commit di P5.

---

## Fase P (ambiente e lock globale) — P3 e P4 DONE, programma completo (2026-08-26, sessione 2)

Proseguimento della sessione P1/P2 (stesso branch
`fix/fase-p-lock-ambiente-2026-08-26`, verificato allineato a
`origin/main` prima di iniziare — nessuna divergenza). Documento
aggiornato con le sotto-fasi P3/P4 (commit `741d065`) prima di
implementarle. Nessun gate su nessuna delle due — indipendenti tra
loro, eseguite entrambe nella stessa sessione.

**P3 — `doPost` delega ad `api()`** (Kanban.gs): prima chiamava
`routeAction_(params)` direttamente, bypassando `api()`/`withEnvironment_`
— nessuna risoluzione d'ambiente (P1), nessuna classificazione
lettura/scrittura per il lock (P2), per qualunque POST diretta all'URL
pubblicato. Cambiata una riga: `api(params.action, params)`. Nessun
consumatore noto di `doPost` da aggiornare (confermato di nuovo:
`client.html` usa solo `google.script.run`, mai una POST diretta).

**Test aggiunto**: `testDoPostDelegatesToApiInheritingEnvironmentAndLock`
— verifica con l'evidenza piu' diretta possibile che `doPost` passa
davvero da `api()`: la risposta guadagna `data.env` (arricchimento che
solo `api()` fa), e una lettura via `doPost` non prende il lock globale
mentre una scrittura lo prende esattamente una volta (stesso contatore
`__sfLockState.waitCalls` gia' usato per i test di P2). **Registrato
subito nell'array `tests` di `runAllTests()`** — lezione della sessione
precedente (il conteggio e' salito da 166 a 167, verificato non essere
un falso positivo).

**P4 — riepilogo visivo del percorso della card** (client.html/
board.html/style.html, solo frontend, nessun test nell'harness Node —
coerente col fatto che non tocca nulla lato server): nuovo pannello nel
tab Informazioni, sopra l'anteprima "ultimi eventi" esistente (che resta
invariata) — barra orizzontale segmentata con un segmento aggregato per
colonna (non uno per singolo soggiorno, decisione di Marco per
leggibilita' con rientri multipli — §2.4 del documento), calcolato
camminando su `state.activityLog` **gia' caricato** (nessuna nuova
chiamata `callApi`, nessuna nuova lettura Sheets). Segmento della
colonna attuale marcato "in corso" (tratteggio diagonale + etichetta),
durata basata su `job.status_since_ts`. Colori dei segmenti presi da
`state.columnMeta` (stessi della card in board), fallback grigio per
colonne rinominate/eliminate nel frattempo (`columnLabelById_` gestisce
gia' l'etichetta). Ordine dei segmenti: stesso ordine delle colonne in
board, non per durata. Legenda testuale con etichetta + durata formattata
(giorni/ore/minuti) accanto a ogni segmento.

**Collaudato nel Browser pane** (server locale di riproduzione, markup
reale + `routeAction_` via harness — rimosso a fine sessione):
- Percorso a piu' colonne con un rientro (BACKLOG → TO DO → WIP →
  ATTESA CLIENTE → TO DO → WIP, eventi backdatati via
  `addActivityEvent`): segmenti aggregati correttamente per colonna
  (TO DO e WIP compaiono una volta sola, sommando entrambi i soggiorni),
  ordine identico a quello delle colonne in board, colori dei segmenti
  verificati byte per byte contro `column_meta.color`, colonna WIP
  (quella attuale) marcata "in corso", percentuali e durate coerenti
  con la somma totale del periodo.
- Caso base (card appena creata, mai spostata): un solo segmento al
  100%, marcato "in corso", "0m".
- Modale "nuova card" (nessun job_id): pannello resta nascosto, stesso
  comportamento gia' esistente per l'anteprima "ultimi eventi".
- Nessun errore in console in nessuno dei tre scenari.

**167/167 test nell'harness Node** (166 preesistenti + 1 nuovo, P3 —
P4 non ha test Node, solo collaudo Browser pane, coerente con "solo
frontend"). Push su TEST verificato: 16/16 file identici.

**Criteri di accettazione P3/P4 (§6 del documento) — tutti verificati
TRUE**: elenco completo nel documento, tutti confermati sia da test
automatici (P3) sia da collaudo manuale nel Browser pane (P4, che non
ha equivalente nell'harness Node essendo puro rendering client-side).

**Programma Fase P — completo (P1, P2, P3, P4 tutte DONE)**, nessuna
sotto-fase residua in `docs/DESIGN_lock_ambiente.md` §4.

**PR**: [#12](https://github.com/MaTorre72/SigmaFlow/pull/12) da
aggiornare con i commit di P3/P4 sullo stesso branch.

---

## Fase P (ambiente e lock globale) — P1 e P2 DONE, programma completo (2026-08-26)

**P2 — lock globale solo sulle azioni di scrittura**, dopo il gate 🔴 del
documento: elenco delle 24 azioni di `routeAction_` classificate
lettura/scrittura mostrato a Marco in chat, confermato ("sì, procedi")
prima di scrivere codice.

**Trovato durante la verifica del gate** (non ancora nel documento): la
classificazione "5 letture" da sola non bastava — `getBoard()` chiama
`ensureCurrentSchema_()` in testa, che nella rara finestra post-deploy in
cui `PROP_SCHEMA_VERSION` non e' ancora allineata chiama `setupSigmaFlow()`,
una SCRITTURA reale (crea fogli, backfilla colonne). Senza gestirlo,
togliere il lock a `getBoard()` avrebbe permesso a piu' `getBoard()`
concorrenti di scrivere lo schema in parallelo in quella finestra —
esattamente il tipo di rischio che P2 dovrebbe eliminare. Presentato a
Marco con tre opzioni, scelta la piu' conservativa in termini di
prestazioni normali: **lock dedicato, ristretto al solo tratto che puo'
scrivere** (`ensureCurrentSchema_(acquireOwnLock)` — `true` solo da
`getBoard()`, che gira senza il lock globale; `moveJob()` continua a
chiamarla senza `acquireOwnLock`, dato che gira gia' dentro il lock
globale come scrittura — evita di dover assumere che `LockService` di
Apps Script sia rientrante nella stessa esecuzione, mai verificato).

**Implementato**:
- `withEnvironment_(env, callback, requiresLock)` (Utils.gs): terzo
  parametro opzionale, default `true` — nessun chiamante esistente
  cambia comportamento senza passarlo esplicitamente (es.
  `eseguiArchiviazioneAutomaticaGiornaliera` continua a prendere il lock
  come prima).
- `SF_READ_ACTIONS_` (Kanban.gs) — mappa esplicita delle 5 azioni di
  lettura (`getBoard`, `getActivityLog`, `getArchivio`, `getCestino`,
  `getMetrics`). `api()` calcola `requiresLock = !SF_READ_ACTIONS_[action]`
  e lo passa a `withEnvironment_`.
- `ensureCurrentSchema_(acquireOwnLock)` (Schema.gs): doppio controllo
  della versione schema (prima e dopo aver preso l'eventuale lock
  proprio) per evitare una seconda chiamata ridondante a
  `setupSigmaFlow()` se un'altra esecuzione concorrente ha gia'
  allineato lo schema nel frattempo.
- `doPost` (§2.3 del documento, fuori scope) — non toccato, come da
  documento.

**Bug trovato e corretto nella stessa sessione, non di P2**: i due test
aggiunti in P1 (`testGetSpreadsheetIgnoresDirtyAmbientSpreadsheetProperty`
e, a scoppio ritardato, gli altri) non erano registrati nell'array
`tests` dentro `runAllTests()` (Tests.gs) — la suite li ignorava
silenziosamente, il conteggio "163/163" riportato per P1 era quindi
**falso positivo** (163 era gia' il totale prima, il nuovo test non
girava affatto). Scoperto scrivendo i test di P2 (il conteggio non
saliva a 166 come atteso). **Corretto**: tutti e tre i test aggiunti in
P1 registrati nell'array. Nessun problema nel codice di P1 stesso — solo
nella registrazione del test, ora corretta. **Lezione per sessioni
future**: dopo aver aggiunto un test a `Tests.gs`, verificare che il
conteggio totale sia effettivamente salito (non solo che l'output dica
"N/N passati" — un totale invariato con un test in piu' scritto e' il
segnale dello stesso bug).

**Test aggiunti** (`Tests.gs`), registrati e verificati:
`testApiTakesLockOnlyForWriteActions` — chiama `api()` (il vero entry
point di produzione) per le 5 letture e per `moveJob`/`addActivityEvent`
(le due scritture piu' usate senza lock proprio), contando le
acquisizioni del lock tramite un contatore aggiunto al mock
`LockService` dell'harness (`__sfLockState.waitCalls`, gas-harness.js) —
verifica DIRETTAMENTE il meccanismo introdotto da P2 (quali azioni
prendono il lock), non simulabile con una vera gara di concorrenza in
un harness Node sincrono a singolo thread.
`testTwoRapidSequentialWritesOnSameJobDoNotLoseEitherChange` — due
scritture consecutive sullo stesso job (moveJob poi addActivityEvent)
via `api()`, verifica che nessuna delle due perda l'effetto dell'altra
(limite onesto documentato nel test: verifica la correttezza del
percorso di scrittura in sequenza, non una vera sovrapposizione —
quella resta garantita dal lock, verificato dal test precedente).

**166/166 test nell'harness Node** (163 preesistenti + 3 nuovi — 2 di
P2 piu' 1 di P1 rimasto orfano, ora tutti registrati). Push su TEST
verificato: 16/16 file identici.

**Criteri di accettazione P2 (§6 del documento) — tutti verificati
TRUE**: `moveJob`/`addActivityEvent`/`updateActivityEvent`/
`deleteActivityEvent` restano sotto lock globale (verificato
esplicitamente per i primi due, gli altri due condividono lo stesso
percorso `api()`/`SF_READ_ACTIONS_` non modificato per loro);
`getBoard`/`getActivityLog`/`getArchivio`/`getCestino`/`getMetrics` non
prendono piu' il lock globale; nuovo test di concorrenza aggiunto; nessun
cambio di risultato osservabile su nessun test esistente (166/166,
nessuna regressione sui 163 preesistenti).

**Programma Fase P — completo.** P1 e P2 entrambi DONE, nessuna
sotto-fase residua in `docs/DESIGN_lock_ambiente.md` §4. `doPost` (§2.3,
§5) resta fuori scope come da documento — segnalazione tracciata, non
un'azione richiesta.

**PR**: [#12](https://github.com/MaTorre72/SigmaFlow/pull/12) aggiornata
con il commit di P2 sullo stesso branch `fix/fase-p-lock-ambiente-2026-08-26`.

---

## Fase P (ambiente e lock globale) — P1 DONE, in pausa al gate di P2 (2026-08-26)

Sessione autonoma (runbook `docs/RUNBOOK_esecuzione_autonoma.md`), su
[docs/DESIGN_lock_ambiente.md](docs/DESIGN_lock_ambiente.md) — nuovo
documento, allegato da Marco in questa sessione, aggiunto al repo su
branch dedicato `fix/fase-p-lock-ambiente-2026-08-26` (creato da
`origin/main` aggiornato, commit `3e13ba2`, verificato con `git fetch` +
`git status` prima di iniziare — nessuna divergenza).

**P1 — variabile per-esecuzione al posto della Script Property
condivisa**, causa di fondo degli incidenti del 2026-08-19 e 2026-08-25
(vedi sezioni sotto): `PROP_SPREADSHEET_ID` era letta/scritta da
`getSpreadsheet_()`/`withEnvironment_()` (Utils.gs) per instradare
l'ambiente di ogni singola chiamata `api()` — un dato che dovrebbe vivere
solo dentro quella chiamata, ma persisteva tra esecuzioni separate
(Script Property, per progettazione condivisa su tutto il progetto Apps
Script). Se un'esecuzione si interrompeva prima del proprio `finally`, il
valore sporco sopravviveva ed era ereditato dalla richiesta successiva —
di un utente diverso, in un momento diverso.

**Implementato**: nuova variabile globale `__sfRoutedSpreadsheetId_`
(Utils.gs) — per costruzione isolata alla singola esecuzione (ogni
esecuzione Apps Script parte in un'isolate V8 nuova, nessuna memoria
condivisa tra esecuzioni separate), mai persistita. `getSpreadsheet_()`
la legge al posto della property; `withEnvironment_()` la valorizza a
inizio chiamata e la ripristina nel proprio `finally` (stesso pattern di
prima, lock incluso — P1 non tocca il lock, solo l'instradamento).
Stesso trattamento in `eseguiMigrazioneCompleta_` (ActivityLog.gs),
`allineaSchemaSuProd` (Schema.gs) e `withTestSpreadsheet_` (Tests.gs —
non elencata esplicitamente in §1 del documento ma necessaria: e' il
meccanismo che instrada praticamente ogni test verso il foglio TEST,
sarebbe rimasta orfana altrimenti). Il fallback di bootstrap in
`setupSigmaFlow()` (Schema.gs, righe 178-179) resta invariato, sulla
Script Property — comportamento persistente voluto, non toccato da P1
come da documento.

**Test aggiornati/aggiunti** (`Tests.gs`): i tre test che manipolavano
`PROP_SPREADSHEET_ID` direttamente per verificare il vecchio meccanismo
sono stati riscritti per il nuovo —
`testEseguiArchiviazioneAutomaticaGiornalieraIgnoresDirtyAmbientSpreadsheetProperty`
(l'assert finale non verifica piu' "la property sporca viene ripristinata"
ma "non viene ne' letta ne' scritta da questo percorso"),
`testWithTestSpreadsheetFallsBackToDefaultTestIdWhenPropertyAbsent`
(rimosso il salvataggio/ripristino di `PROP_SPREADSHEET_ID`, ormai
irrilevante per quella funzione). Nuovo test aggiunto, copertura diretta
della causa di fondo:
`testGetSpreadsheetIgnoresDirtyAmbientSpreadsheetProperty` — chiama
`getSpreadsheet_()` fuori da qualunque `withEnvironment_`/
`withTestSpreadsheet_` (variabile a `null`, come l'inizio di
un'esecuzione reale) con la property sporcata a mano, verifica che
risolva `DEFAULT_SPREADSHEET_ID` e non la property.
`testGetSpreadsheetForEnvProdIgnoresDirtyAmbientSpreadsheetProperty`
(regressione del fix 08-25 su `getSpreadsheetForEnv_('prod')`) lasciato
invariato — funzione diversa, non toccata da P1, gia' non passava mai da
`getSpreadsheet_()` nel ramo 'prod'.

**163/163 test nell'harness Node** (161 preesistenti + 2 nuovi, nessuna
regressione). Push su TEST verificato: 16/16 file identici tra TEST e
`apps-script/src`.

**Criteri di accettazione P1 (§6 del documento) — tutti verificati
TRUE**: `getSpreadsheet_()`/`withEnvironment_()` non leggono/scrivono
piu' `PROP_SPREADSHEET_ID` per instradare; `eseguiMigrazioneCompleta_`/
`allineaSchemaSuProd` aggiornate allo stesso meccanismo, stesso
comportamento osservabile (confermato da
`testEseguiMigrazioneCompletaEndToEndOnOldSchemaData`, gia' esistente,
passata invariata); il fallback di bootstrap in `setupSigmaFlow()`
funziona come prima, invariato; tutti i test esistenti restano verdi,
quelli che manipolavano la property riscritti con stessa copertura;
nessun cambio di risultato osservabile su nessun test esistente.

**P2 (lock solo sulle scritture) — in pausa al gate 🔴 esplicito del
documento**: prima di scrivere qualunque codice, l'elenco delle azioni di
`routeAction_` classificate lettura/scrittura va confermato da Marco.
Non best-guessato. In attesa.

**PR**: da aprire su `fix/fase-p-lock-ambiente-2026-08-26` per la
review di P1, senza aspettare la chiusura di P2 (richiesta esplicita di
Marco in sessione).

## Incidente di sessione — checkout locale disallineato da `origin/main`, riconciliazione (2026-08-25)

**Cosa è successo**: la sessione di oggi (Fase O, poi i bugfix a
seguire — tutti descritti più sotto in questo file) è partita da un
checkout locale di `main` **indietro di 22 commit** rispetto a
`origin/main` su GitHub — mai verificato con `git fetch`/`git status`
prima di iniziare a lavorare. Quei 22 commit (uniti il 19-20 agosto,
PR #10) includevano lavoro **già live su PROD prima di oggi**
(confermato da Marco): consolidamento dashboard (M3-M9), la feature
"Cronologia diventa fonte di verità per lo stato derivato" (M2 +
fix, **più completa** della reimplementazione scritta oggi più sotto —
gestisce qualunque move manuale, non solo l'ultimo evento), un fix di
performance sul giro di lock extra della Cronologia, `setupSigmaFlowOnTest`,
un fix di sicurezza su `readTable_` (foglio null → `[]`).

**Conseguenza**: ogni `clasp push` di oggi (dalla primissima, per la
Fase O) ha sostituito l'intero progetto Apps Script con una versione
mancante di quei 22 commit — e dato che nel corso della sessione Marco
ha ripubblicato il deployment PROD (per portare live il fix
dell'incidente sulla property ambientale, sezione sotto), **anche PROD
è stato temporaneamente privato di quel lavoro**, non solo TEST.

**Riconciliazione eseguita**: creato un branch dedicato
(`fix/reconcile-fase-o-2026-08-25`) da `origin/main` vero e aggiornato.
Confrontata **funzione per funzione** ogni modifica di oggi con il
codice reale, non un merge automatico:

- **Tenute e riapplicate sul codice vero** (genuinamente nuove, non
  presenti in `origin/main`): O1/O2/O3 (performance `moveJob`/
  `findOpenVisitRow_`/`updateVisiteForMove_`/scrittura parziale
  `writeJobToRow_`, riapplicate senza toccare la logica M2 già
  presente), il fix sulla property ambientale PROD/TEST
  (`getSpreadsheetForEnv_`/`withTestSpreadsheet_`), il bottone
  "Archivia" sempre disponibile (`archiveJob_`/client.html/board.html),
  il refresh forzato di Archivio/Cestino all'apertura del tab.
- **Scartate perché superate da una versione migliore già presente**:
  la reimplementazione odierna di "Cronologia sposta la card"
  (`computeStatusTransitionFromLog_`/`applyStatusTransition_` e le
  relative funzioni client `applyJobUpdateFromServer_`/
  `mergeJobIntoStateWithColumnMove_`) — la versione già in `main`
  (`applyManualMoveEffects_`, M2) gestisce correttamente **qualunque**
  move manuale (non solo l'ultimo evento del log), l'idempotenza sui
  rientri, e l'accumulo del tempo di attesa sulle mosse manuali (bug
  reale trovato da Marco su dati PROD, corretto il 20/08) — tutte cose
  che la versione di oggi non copriva. Le sezioni più sotto in questo
  file che descrivono quella reimplementazione restano come registro
  storico di cosa è stato fatto **nella sessione**, non di cosa è
  **live**: il codice realmente in uso è quello di M2, invariato da
  oggi.
- **Non riapplicato** (bug trovato oggi ma non più presente nel codice
  reale): il fix a `placeCardInColumn_`/`mergeJobIntoState` per la
  card "duplicata" — verificato che i percorsi reali del codice vero
  (`moveJob`, `applyActivityJobUpdate_`) non espongono questo bug
  (evitato per costruzione: `applyActivityJobUpdate_` chiama già
  `removeCardEl_` prima di `placeCardInColumn_`), quindi il fix era
  necessario solo per la reimplementazione scartata sopra, non per il
  codice reale.

**Verificato di nuovo, sul codice riconciliato**: 163/163 test
nell'harness Node. Verifica end-to-end nel Browser pane (server locale
di riproduzione) su tutti e quattro i punti tenuti: bottone Archivia
sempre attivo su una card mai chiusa, correzione manuale in Cronologia
sposta la card (logica M2, non quella scartata), drag-and-drop senza
card duplicate, Archivio aggiornato subito dopo l'apertura del tab
senza refresh di pagina. Push su TEST verificato: 16/16 file identici.
`origin/main` (GitHub) non era mai stato toccato dall'errore — la
riconciliazione è avvenuta su un branch dedicato, mai su `main`.


## Estensione — anche la property TEST può restare assente a riposo (2026-08-25)

Dopo aver chiuso l'incidente PROD (sotto), Marco ha chiesto se poteva
eliminare anche `SIGMAFLOW_TEST_SPREADSHEET_ID` (property separata, mai
coinvolta nell'incidente — un suo valore sbagliato non può far
trapelare nulla su PROD, la separazione resta quella di
`getSpreadsheetForEnv_`). Prima del fix però `withTestSpreadsheet_`
(Tests.gs — usata da `runAllTestsAndLog`, `migrateActivityLogOnTest`,
`migrateVisiteFromHistoryOnTest` e da tutta la suite quando eseguita
dall'editor) **richiedeva esplicitamente** quella property e lanciava
`Script Property mancante` se assente — a differenza di
`getSpreadsheetForEnv_('test')` (Utils.gs), che già ricadeva su
`DEFAULT_TEST_SPREADSHEET_ID` se la property mancava.

**Corretto**: `withTestSpreadsheet_` ora ricade anch'essa su
`SIGMAFLOW.DEFAULT_TEST_SPREADSHEET_ID` quando la property è assente,
stesso principio del fix su PROD. La property resta un **override
facoltativo** (documentato in `docs/testing-and-security.md`, aggiornato)
per chi volesse un giorno puntare test/migrazioni a uno spreadsheet TEST
diverso dal default — non più un requisito.

**Test aggiunto**: `testWithTestSpreadsheetFallsBackToDefaultTestIdWhenPropertyAbsent`
(Tests.gs) — verifica che, con la property esplicitamente assente,
`withTestSpreadsheet_` risolva `DEFAULT_TEST_SPREADSHEET_ID` invece di
lanciare un errore. **138/138 test nell'harness Node** (137 + 1 nuovo,
nessuna regressione). Push su TEST verificato: 16/16 file identici.

Marco può ora eliminare anche `SIGMAFLOW_TEST_SPREADSHEET_ID` dalle
Proprietà script se vuole — nessun impatto su test/migrazioni/uso
normale della vista TEST del web app.

## Incidente RICORRENTE — property ambientale sporca, PROD mostra ancora dati di TEST — CHIUSO (2026-08-25)

Marco ha segnalato che PROD mostrava di nuovo dati di TEST — stesso
sintomo dell'incidente del 2026-08-19 (vedi sezione storica sotto),
**mai davvero chiuso alla radice**: quel fix aveva blindato solo il
trigger di archiviazione (`archiveEligibleJobs_`), non il percorso
generale usato da ogni richiesta web.

**Causa reale, trovata leggendo il codice** (non solo ipotizzata):
`getSpreadsheetForEnv_('prod')` (Utils.gs) — usata da `withEnvironment_`,
quindi da **ogni singola chiamata** di `api()` per l'ambiente di
default (qualunque richiesta senza `env=test` esplicito) — delegava a
`getSpreadsheet_()`, che legge **prima** la Script Property condivisa
`SIGMAFLOW_SPREADSHEET_ID` (mutabile, la stessa che l'incidente
precedente aveva già dimostrato fragile) e solo se vuota ricade
sull'id fisso di PROD (`DEFAULT_SPREADSHEET_ID`). Con la property
sporca (puntata su TEST, per qualunque motivo — un'esecuzione
interrotta, un test lanciato a mano dall'editor), **ogni richiesta
prod la eredita silenziosamente** e la **ripersiste** nel proprio
`finally` (che restituisce "il valore precedente", cioè quello sporco)
— un ciclo che si auto-perpetua finché qualcuno non pulisce la property
a mano, esattamente il comportamento osservato due volte.

**Corretto** (Utils.gs, `getSpreadsheetForEnv_`): il ramo `'prod'` ora
risolve **sempre** `SIGMAFLOW.DEFAULT_SPREADSHEET_ID` esplicitamente,
esattamente come il ramo `'test'` risolve già il proprio id fisso — mai
più la property ambientale. Il fallback a `getSpreadsheet_()` resta
solo per un bootstrap teorico (nessun `DEFAULT_SPREADSHEET_ID`
configurato), caso che oggi non si presenta in pratica.

**Difesa aggiuntiva** (Schema.gs, `setupSigmaFlow()`): la scrittura
incondizionata `PropertiesService...setProperty(PROP_SPREADSHEET_ID,
ss.getId())` (nessun try/finally, nessun "valore precedente" da
ripristinare) poteva *rinforzare* una property già sporca invece di
limitarsi al proprio scopo reale (il bootstrap iniziale). Ora scrive
solo se la property è vuota.

**Verificato concretamente, non solo a occhio**: script isolato che
confronta la vecchia logica (`getSpreadsheet_()` ambientale) con la
nuova (`getSpreadsheetForEnv_('prod')`) a parità di property sporca —
la vecchia risolve l'id sporco (riproduce l'incidente), la nuova
risolve sempre il vero id di PROD. Nuovo test
`testGetSpreadsheetForEnvProdIgnoresDirtyAmbientSpreadsheetProperty`
(Tests.gs) — verifica sia `getSpreadsheetForEnv_('prod')` sia l'ambiente
implicito (nessun `env` passato, il caso reale di un browser puntato
sul deployment pubblico senza `?env=test`). Solo `SpreadsheetApp.openById(...).getId()`
— nessuna lettura/scrittura di dati, sicuro anche se eseguito per
errore sul vero progetto. **137/137 test nell'harness Node** (136 +
1 nuovo, nessuna regressione). Push su TEST verificato: 16/16 file
identici.

**IMPORTANTE — il fix non è ancora live su PROD**: il codice è
corretto e verificato su TEST, ma il deployment pubblico di PROD resta
fissato alla versione precedente finché Marco non lo ripubblica
esplicitamente (Distribuisci → Gestisci distribuzioni → distribuzione
PROD → Modifica → Nuova versione → Distribuisci) — stessa regola di
sempre, nessuna scrittura al deployment PROD eseguita da Claude.
**Rimedio immediato dato a Marco**: eliminare subito
`SIGMAFLOW_SPREADSHEET_ID` da Impostazioni progetto → Proprietà script
per fermare il sintomo visibile, mentre pianifica il redeploy. Con il
fix in codice, una property assente risolve comunque PROD in automatico
per qualunque richiesta prod — non serve nemmeno riscriverla con l'id
corretto.

**Redeploy eseguito da Marco il 2026-08-25 — confermato ("problema
risolto")**: il fix è ora live sul deployment pubblico di PROD. Nessuna
sotto-fase residua su questo incidente.

**Domanda di Marco, per chiarezza futura**: come cambiare l'indirizzo
del foglio PROD in futuro, se mai servisse — risposta data: una sola
riga, la costante `SIGMAFLOW.DEFAULT_SPREADSHEET_ID` (Constants.gs),
unica fonte di verità usata da `getSpreadsheetForEnv_`/`backupProd_`/
`allineaSchemaSuProd`/`eseguiMigrazioneCompletaSuProd` — cambiarla
richiede comunque `clasp push` + un nuovo redeploy PROD eseguito da
Marco, mai un'azione autonoma.

## Bugfix — vista Archivio (e Cestino) non si aggiornava riaprendo il tab (2026-08-25)

Segnalato da Marco dopo aver archiviato una card col nuovo bottone
sempre attivo: la tabella Archivio non mostrava la card appena
archiviata finché non ricaricava l'intera pagina. Causa: `loadArchivio()`/
`loadCestino()` (client.html, N4) usano una cache in sessione
(`state.archivioLoaded`/`state.cestinoLoaded`) pensata per non
ricaricare ad ogni apertura tab una vista "consultata molto raramente"
— corretta come idea, ma il caso reale (appena creato qualcosa che
dovrebbe comparirci) non era coperto: bastava aprire il tab una volta
per bloccare qualunque aggiornamento successivo nella stessa sessione.

**Corretto**: il click sul tab "Archivio"/"Cestino" ora passa sempre
`force: true` a `loadArchivio`/`loadCestino` — un refresh dal server ad
ogni apertura, non solo la primissima. Resta comunque pigro rispetto al
caricamento pagina (nessuna chiamata finché l'utente non apre il tab
almeno una volta) — non ricaricato ogni N secondi, solo ad ogni
apertura esplicita, coerente con "consultata raramente".

**Verificato nel Browser pane** (spia su `callApi('getArchivio', ...)`):
1 chiamata alla prima apertura del tab, **2 chiamate su 2 aperture**
tornando alla board e riaprendo Archivio senza refresh di pagina —
prima del fix sarebbe rimasta a 1 (cache mai invalidata). 136/136 test
nell'harness Node (nessuna regressione — cambio puramente client, non
coperto da test backend). Push su TEST verificato: 16/16 file identici.

## Decisione di prodotto — bottone "Archivia" sempre disponibile, nessun vincolo (2026-08-25)

Marco ha segnalato il bottone "Archivia" grigio/disattivato e chiesto
come archiviare una card. Causa: la regola di eleggibilità originale
(N2, `docs/DESIGN_archiviazione.md` §2/§4.1) — il bottone si abilitava
solo con `incarico_chiuso_ts` valorizzato (spunta "Chiuso"), verificato
sia lato client sia lato server (`archiveJob_` rifiutava altrimenti).
Un primo tentativo di correggerlo (far salvare subito la spunta
"Chiuso" per riattivare il bottone senza dover chiudere/riaprire la
card) è stato **scartato in corsa** dopo la sua richiesta esplicita,
più radicale: **"il tasto archivia deve essere sempre aperto,
funzionante, sempre in ogni stato"** — nessun vincolo, né client né
server.

**Implementato**:
- `archiveJob_` (Kanban.gs): rimossa la verifica `!job.incarico_chiuso_ts`
  → throw. Qualunque job, chiuso o no, viene spostato in
  `jobs_archivio`. **L'archiviazione *automatica* notturna
  (`archiveEligibleJobs_`) resta invariata**: seleziona da sola, prima
  di chiamare `archiveJob_`, solo i casi con `incarico_chiuso_ts`
  valorizzato e oltre soglia — non dipende dal controllo appena
  rimosso, quindi il trigger giornaliero continua ad archiviare solo
  chiusure vere come da design originale.
- `updateArchiveButtonState_`/`archiveJobFromModal` (client.html):
  bottone disabilitato solo quando non c'è un job attivo nel modale
  (card nuova non ancora creata) — non più legato a `incarico_chiuso_ts`.
  Tooltip aggiornato (board.html).
- `docs/DESIGN_archiviazione.md`: §2/§4.1 annotati con la decisione
  rivista (non riscritti da zero — la motivazione originale resta
  valida per l'automatico), criterio di accettazione corrispondente
  barrato con nota.
- **Test**: `testArchiveJobRejectsCaseNotClosed`/
  `testArchiveJobApiActionRejectsCaseNotClosed` (asserivano il rifiuto)
  sostituiti con `testArchiveJobSucceedsOnCaseNotClosed`/
  `testArchiveJobApiActionSucceedsOnCaseNotClosed` (asseriscono il
  successo). Nessun altro test toccato — `testArchiveEligibleJobsSkipsCasesNeverClosed`
  (automatico) resta verde invariato, confermando che l'automatico non
  è stato toccato.

**Verificato end-to-end nel Browser pane**: card mai chiusa (`invoiced:
false`) → bottone "Archivia" attivo (`disabled: false`) → click →
archiviazione riuscita, card sparita dalla board. **136/136 test**
nell'harness Node. Push su TEST verificato: 16/16 file identici.

## Bugfix — la card corretta in Cronologia si spostava solo dopo "Salva e chiudi" o un refresh (2026-08-25)

Segnalato da Marco subito dopo il collaudo della feature "Cronologia
fonte di verita'" (vedi sezione sotto): la card si spostava
visivamente, ma **tornava alla colonna vecchia** appena chiudeva il
modale con la sola X o comunque senza un refresh completo — capiva solo
di aver fatto la mossa giusta salvando anche dal tab Informazioni
("Salva e chiudi") o ricaricando la board a mano.

**Causa reale, confermata riproducendo il bug** (non solo letta dal
codice): `applyJobUpdateFromServer_` (client.html, introdotta dal
bugfix precedente) chiamava `mergeJobIntoState(job)` — funzione che
sostituisce l'oggetto job **sul posto**, in qualunque array di
`state.board` si trovi gia' oggi, ma **non lo sposta mai** tra gli
array delle colonne. Per `moveJob` (drag&drop) questo va bene, perche'
`moveJobLocally` ha gia' spostato la card tra gli array PRIMA che
arrivi la risposta server — `mergeJobIntoState` trova la card gia' nel
posto giusto, sostituisce solo l'oggetto. Ma per un'azione di
Cronologia (nessun equivalente di `moveJobLocally` prima), la card
restava "intrappolata" nell'array `state.board[colonnaVECCHIA]`, con un
campo `status` che pero' punta alla colonna nuova: `placeCardInColumn_`
sistema subito il singolo nodo DOM (per questo lo spostamento SEMBRA
funzionare appena salvato), ma il primo `renderBoard()` completo
successivo — che ricostruisce tutto il DOM da `state.board`, non dal
DOM esistente — trova ancora la card nell'array della colonna vecchia e
la rimette li'. "Salva e chiudi" e il refresh "risolvevano" solo perche'
rifanno un giro che (per vie diverse) riallinea lo stato, non perche'
la correzione in Cronologia da sola bastasse.

**Riprodotto concretamente** con lo stesso server locale delle sessioni
precedenti: card in "Attesa enti" → corretta in Cronologia a "Attesa
clienti" → chiusa con la X (non "Salva e chiudi") → **prima del fix**,
un `renderBoard()` forzato (senza refresh dati, solo redraw da
`state.board`) rimetteva la card in "Attesa enti"; **dopo il fix**,
resta correttamente in "Attesa clienti" anche dopo il redraw completo —
verificato leggendo direttamente `state.board.wait_authority`/
`state.board.wait_client` (non solo il DOM): l'array della colonna
vecchia e' vuoto, quello della nuova contiene la card.

**Corretto**: nuova `mergeJobIntoStateWithColumnMove_(job)` (client.html)
— rimuove prima la card da OGNI array di `state.board`, poi la
reinserisce in quello della colonna corrente (`job.status`), stesso
principio gia' corretto in `moveJobLocally`. `applyJobUpdateFromServer_`
ora la usa al posto di `mergeJobIntoState` (la vecchia funzione resta
invariata e in uso per `moveJob`, dove va gia' bene cosi').

**136/136 test nell'harness Node** (nessuna regressione — il bug era
solo nello stato client, non coperto dai test backend). Push su TEST
verificato: 16/16 file identici.

## O3 (performance backend) — DONE, programma Fase O completo (2026-08-25)

Su richiesta esplicita di Marco, dopo aver confermato O1/O2 funzionanti
su TEST ("provato su TEST e funziona"). Riferimento:
[docs/DESIGN_performance.md](docs/DESIGN_performance.md), §4 — la
sotto-fase, inizialmente proposta come "indice vero, da progettare a
parte" dietro un gate 🔴, e' stata **riprogettata prima di scriverla**:
un indice posizionale (job → numero di riga) e' stato scartato perche'
diventerebbe silenziosamente sbagliato ad ogni `deleteRow` su `visite`
fatto per ALTRI job (archiviazione/cestino/ripristino spostano righe di
job diversi da quello cercato, facendo scivolare gli indici di riga
sottostanti) — rischio reale, non teorico, dato che `moveJobToSheet_`
cancella righe `visite` di continuo. **Approccio scelto**: `TextFinder`
(ricerca server-side sulla colonna `job_id`, `matchEntireCell(true)`),
mai una posizione cacheata — la ricerca resta sempre dal vivo, ma il
costo passa da "proporzionale al numero totale di visite di tutto il
sistema" a "proporzionale a quante volte il job cercato compare" (1-3
righe tipiche, mai l'intera tabella).

**Codice** (`findOpenVisitRow_`, Kanban.gs): `sheet.getRange(2,
headers.job_id, lastRow-1, 1).createTextFinder(String(jobId))
.matchEntireCell(true).findAll()` individua le righe con quel job_id;
`rientro_ts` viene letto **solo** per quelle righe trovate (non piu'
l'intera colonna, come faceva ancora O2). Nessun'altra funzione toccata:
stesso contratto di input/output.

**Harness Node esteso** (`gas-harness.js`): mock minimale della vera API
`Range.createTextFinder`/`TextFinder` (`matchEntireCell`/`findAll`,
restituisce `Range[]` con `getRow()`) — nessuna funzione precedente la
usava, aggiunta da zero per questa sotto-fase.

**Verifica caso limite** (piu' visite con lo stesso `job_id`, una chiusa
e una aperta): coperto dal test gia' esistente
`testAutomaticReworkFromStandBy` (rientro da stand_by, visita 1 chiusa +
visita 2 aperta) — passato senza modifiche, confermando che `TextFinder`
+ filtro su `rientro_ts` sceglie sempre la riga giusta anche con righe
duplicate per job_id. Nessun test nuovo scritto apposta (il caso era
gia' coperto).

**136/136 test passati nell'harness Node** (nessuna regressione). Push
su TEST verificato: 16/16 file identici.

**Programma Fase O (performance backend) — completo.** O1, O2, O3 tutti
DONE, nessuna sotto-fase residua in `docs/DESIGN_performance.md` §4.
Tutti i criteri di accettazione §6 verificati TRUE.

## Feature — la Cronologia diventa fonte di verita' anche per lo stato derivato (2026-08-25)

Chiude il "buco" documentato il 2026-08-19 (vedi sezione storica sotto):
Marco ha corretto a mano, in Cronologia, la colonna dell'ultimo evento
di una card ("Attesa enti" → "Attesa clienti") e la card e' rimasta
ferma in "Attesa enti" — comportamento confermato come bug (non
voluto), con decisione esplicita di Marco su come correggerlo:
**"aggiorna anche la card"**, replicando le stesse regole di `moveJob`
(incluso il divieto di rientro diretto in WIP), non limitarsi a
correggere il testo del form o lasciare la Cronologia come solo
racconto storico.

**Backend** (Kanban.gs): due nuove funzioni pure/separate —
`computeStatusTransitionFromLog_(job, log)` (nessuna scrittura: solo
lettura di `readColumns_()`) determina se l'evento 'move' PIU' RECENTE
del log (per posizione nell'array, che e' gia' ordinato per ts con sort
stabile — **non** un confronto diretto sui ts, vedi bug trovato sotto)
dichiara una colonna diversa da `job.status`, e se si', calcola la
transizione (sourceColumn = colonna ATTUALE della card, targetColumn =
quella dichiarata dall'evento, closesVisit secondo la stessa regola di
moveJob) o restituisce `{ hardError: 'RIENTRO_DIRETTO_VIETATO' }` se
implicherebbe un rientro diretto in WIP da stand_by/done, stessa regola
gia' in vigore per gli spostamenti reali. `applyStatusTransition_(job,
log, transition)` applica la transizione gia' calcolata (status +
status_since_ts + `updateVisiteForMove_`, la stessa funzione che
`moveJob` usa per aprire/chiudere le visite) — separata dal calcolo
apposta, cosi' il chiamante puo' verificare un eventuale hardError e
rifiutare l'intera richiesta **prima** di qualunque scrittura (compresa
quella che `applyStructuralAlignment_` fa su `visite` per l'allineamento
dei campi data — altrimenti resterebbe non annullabile anche quando il
resto della richiesta viene respinto).

Collegate in `addActivityEvent`/`updateActivityEvent` (bloccanti: un
hardError rifiuta l'intero salvataggio, stesso pattern gia' in uso per
`validateSequence_`) e in `deleteActivityEvent` (**asimmetrico apposta**:
non blocca mai la cancellazione, gia' confermata dall'utente con una
conferma pesante in UI — se lo stato implicito violerebbe la regola,
la transizione semplicemente non si applica, il log resta comunque
cancellato). Le tre funzioni ora restituiscono anche `job` nella
risposta (`attachVisitSummaryForResponse_`, stessi campi di rientro
ricalcolati che `moveJob` gia' restituisce da M0-A2) — necessario perche'
il client possa aggiornare la card senza un reload completo.

**Bug trovato scrivendo i test, corretto nello stesso passaggio**: la
prima versione di `computeStatusTransitionFromLog_` cercava l'evento
"piu' recente" con un `reduce` che confrontava i ts (`compareTs_(...) >
0`) — a parita' ESATTA di timestamp (facile con la precisione al
secondo di `Utilities.formatDate`, es. due `moveJob` ravvicinati nello
stesso secondo, come capita spesso nei test ma anche in uso reale),
questo confronto non aggiornava mai il candidato a parita', restituendo
l'evento SBAGLIATO come "piu' recente". Il resto del codice (
`computeFromForCandidate_`, `recalculateMoveFrom_`, e il `lastMove` gia'
calcolato in `deleteActivityEvent` prima di questa sessione) risolve
questo esatto caso con una convenzione diversa e gia' corretta: il log
arriva sempre gia' ordinato con un sort STABILE, quindi l'ultimo
elemento dell'array (`moves[moves.length - 1]`) e' per costruzione il
piu' recente anche a parita' di ts. Corretto allineando
`computeStatusTransitionFromLog_` alla stessa convenzione.

**Frontend** (client.html): `HARD_ERROR_MESSAGES_` esteso con
`RIENTRO_DIRETTO_VIETATO` (messaggio leggibile, stesso meccanismo gia'
in uso per gli altri hardErrors). Nuova funzione `applyJobUpdateFromServer_(job)`
(fattorizzata da tre punti che la ripetevano identica): aggiorna
`state`/`state.activeJob`, il bottone Archivia, lo storico rientri nel
modale, e riposiziona la card sulla board (`placeCardInColumn_`,
**riusa il fix del bug precedente** — cerca e rimuove il nodo esistente
OVUNQUE si trovi, non solo nella colonna di destinazione) — chiamata da
`submitActivityPayload_` (add/update evento) e `confirmActivityDelete_`
(cancellazione evento), entrambe ora leggono `data.job` dalla risposta.

**Test aggiunti** (`Tests.gs`, harness Node), 5 nuovi + 1 helper di
test: `testBackdateCreationEventTs_` (backdata l'evento di creazione per
rendere deterministico "qual e' il piu' recente" nei test, evitando la
precisione al secondo dei timestamp), `testUpdateActivityEventMovesCardWhenCorrectingMostRecentMoveDestination`
(lo scenario esatto di Marco: Attesa enti → Attesa clienti, nessuna
nuova visita essendo stand_by→stand_by), `testUpdateActivityEventRejectsWhenCorrectionImpliesDirectReentryToWip`
(hardError, nessuna scrittura parziale — ne' su jobs ne' sul log),
`testUpdateActivityEventOpensNewVisitOnRealReentryCorrection` (un vero
rientro corretto in Cronologia apre una nuova visita esattamente come
moveJob — questo test ha scoperto il bug del reduce sopra),
`testAddActivityEventDoesNotMoveCardWhenNewEventIsNotMostRecent` (caso
negativo: un evento backdatato non sposta la card),
`testDeleteActivityEventRevertsCardStatusToNewMostRecentMove`
(cancellare l'evento piu' recente riporta la card alla colonna
dell'evento rimasto piu' recente). **136/136 test passati nell'harness
Node** (131 preesistenti + 5 nuovi, nessuna regressione).

**Verificato end-to-end nel Browser pane**, non solo nell'harness:
stesso server locale gia' usato per il bugfix precedente, seed con una
card creata direttamente in "Attesa enti". Riprodotto esattamente lo
scenario di Marco attraverso la UI reale (click sulla card → tab
Cronologia → "Modifica evento" → cambiato il menu a tendina da "ATTESA
ENTI" a "ATTESA CLIENTE" → "Salva evento"): `state.activeJob.status`
diventa `wait_client` subito dopo il salvataggio, nessun errore nel
form; chiuso il modale, la card sulla board compare **una sola volta**,
nella colonna "ATTESA CLIENTE" — comportamento corretto, non piu' quello
segnalato da Marco.

**Push su TEST verificato**: 16/16 file identici.

## Bugfix — card "duplicata" sulla board dopo uno spostamento (2026-08-25)

Segnalato da Marco subito dopo il collaudo di O1/O2 su TEST: la card
spostata appariva **anche** nella colonna di provenienza, finche' un
refresh completo della board non la faceva sparire — "disorienta
fortemente l'utente, non capisce se ha fatto un guaio". **Non e' una
regressione di Fase O**: Fase O tocca solo il backend (Kanban.gs/
Utils.gs), mai `client.html` — bug preesistente da M0-B (2026-08-17,
introduzione dell'aggiornamento parziale del DOM dopo una mossa), mai
notato prima.

**Causa reale, confermata riproducendo il bug** (non solo letta dal
codice — vedi sotto): `placeCardInColumn_` (client.html) cercava il
nodo DOM esistente della card **solo dentro la colonna di
destinazione** (`job.status`, gia' quello nuovo quando la funzione
viene chiamata, sia nella mossa ottimistica sia dopo la risposta
server) — il nodo nella colonna di **provenienza** non veniva mai
cercato ne' rimosso, restando visibile finche' un `renderBoard()`
completo (poll a 45s o refresh manuale) non ricostruiva tutto il DOM da
zero coerentemente con lo stato interno (che invece era sempre corretto
— il bug era solo visivo/DOM, mai un dato scritto male).

**Riprodotto concretamente** prima di correggere: server HTTP locale
temporaneo (`/tmp/sf-scratch/repro-server.js`, rimosso a fine sessione)
che serve `index.html` reale con gli `include()` risolti e uno shim di
`google.script.run` che inoltra `.api(action, payload)` a `routeAction_`
via l'harness Node — stessa tecnica delle sessioni N4/N5, adattata da
zero (non esisteva ancora per questo progetto). Chiamata diretta a
`moveJob('JOB-...', 'wait_client')` nella console del Browser pane
(stessa funzione che il drag-and-drop invoca): confermato che la card
compariva contemporaneamente in **due** colonne
(`document.querySelectorAll('.card[data-job-id=...]')` restituiva 2
nodi, uno per colonna), anche dopo che la risposta del server era
tornata.

**Corretto**: `placeCardInColumn_` ora chiama `removeCardEl_(job.job_id)`
in testa (la stessa funzione, gia' esistente, che cerca il nodo in
**tutta** la board — `document.querySelector('#kanban-board .cards
.card[data-job-id=...]')` — usata finora solo da `deleteJob`), prima di
decidere se e dove reinserire il nodo nuovo. Nessuna altra modifica al
comportamento: se la card non deve comparire (colonna nascosta o filtro
attivo) resta comunque rimossa, come da comportamento gia' documentato.

**Verificato di nuovo con lo stesso server locale, dopo il fix**: stessa
sequenza (mossa reale, self-move, mossa che chiude una visita
`wait_client`→`backlog`) — **nessun doppio nodo in nessun caso**, la
card compare sempre e solo nella colonna corretta, la card non toccata
resta ferma. 131/131 test nell'harness Node (nessuna regressione — il
bug era solo DOM, non coperto dai test esistenti che non ispezionano il
markup). Push su TEST verificato: 16/16 file identici.

## Fase O (performance backend) — O1+O2 codice/test pronti, push su TEST bloccato da token clasp scaduto (2026-08-25)

Sessione autonoma (runbook `docs/RUNBOOK_esecuzione_autonoma.md`), su
`docs/DESIGN_performance.md`. Nessuna sotto-fase precedente segnata DONE
per questo documento — prima esecuzione del programma, sotto-fase O1
seguita da O2 (nessun gate tra le due, come da tabella §4).

**O1 (punti A, C, D di `docs/DESIGN_performance.md`)** — Kanban.gs/Utils.gs:
- `moveJob`: eliminata la doppia lettura/scrittura di `activity_log_json`
  (punto A) — `log` ora costruito da `job.activity_log_json` (gia' in
  mano da `readJobFromRow_`, non piu' riletto con un `getRange` dedicato)
  e `job.activity_log_json` riassegnato prima di un **unico**
  `writeJobToRow_` finale (status/status_since_ts/activity_log_json
  insieme), non piu' una scrittura della riga intera seguita da una
  seconda scrittura mirata sulla stessa cella.
- `moveJob`: `readColumns_()` chiamato una sola volta (punto C) —
  `validateColumnId_` (Utils.gs) accetta ora un secondo parametro
  opzionale `columns` (default `readColumns_()` se assente, invariato
  per ogni altro chiamante: `addJob`/`updateColumnLabel`/`moveColumn`
  continuano a non passarlo); `moveJob` legge le colonne una volta sola
  e le riusa sia per la validazione sia per `sourceColumn`/`targetColumn`.
- `writeJobToRow_` (Kanban.gs) accetta un terzo parametro opzionale
  `originalJob` (punto D): se passato, scrive solo le celle il cui
  valore e' davvero cambiato rispetto all'originale (confronto per
  header), non piu' l'intera riga da 22 colonne. `addActivityEvent`/
  `updateActivityEvent`/`deleteActivityEvent`/`correctJobTimestamps`
  ora clonano il job appena letto (`Object.assign({}, job)`) prima di
  mutarlo e lo passano come `originalJob`. Nessun chiamante esistente
  che non lo passa (`addJob` non lo usa, `updateJob`/`moveJob` restano a
  scrittura piena, fuori scope di questo punto) e' stato toccato.

**O2 (punti B, E, G)** — Kanban.gs:
- `findOpenVisitRow_`: legge solo le colonne da 1 a
  `max(headers.job_id, headers.rientro_ts)` (8 colonne su 13 nello
  schema corrente — verificato in `Schema.gs`, `VISITE_HEADERS`) invece
  di tutte le colonne di ogni riga scansionata. Larghezza derivata dalla
  mappa reale degli header, non un valore fisso, per restare corretta
  anche se l'ordine cambiasse.
- `updateVisiteForMove_`: il campo gate (`incarico_ts`/`prep_ts`/
  `start_ts`/`consegna_ts`) da valorizzare e' ora calcolato una sola
  volta da `targetColumn.role`, PRIMA di sapere se andra' sulla visita
  corrente o su quella nuova aperta da un rientro — quando una mossa
  chiude una visita, la nuova riga nasce gia' completa e viene scritta
  con un solo `appendVisitRow_`, eliminando la terza scrittura
  (`writeVisitToRow_` successiva) che il codice precedente faceva sulla
  riga appena creata.

**Verifica, non solo lettura del codice**: oltre ai 131/131 test
dell'harness Node (nessuna regressione), ogni criterio di accettazione
§6 e' stato verificato empiricamente con uno script strumentato
temporaneo (`/tmp/sf-scratch/perf-verify.js`, rimosso a fine sessione)
che intercetta `getRange`/`getValue(s)`/`setValue(s)`/`appendRow` sui
fogli mock e conta le chiamate reali durante `moveJob`/
`addActivityEvent`:
- Mossa reale (non self-move): **1** lettura + **1** scrittura della
  riga `jobs` (22 colonne, `activity_log_json` incluso in entrambe, mai
  una seconda chiamata dedicata a quella cella) — punto A confermato.
- `readColumns_()`: **1** chiamata per `moveJob` (non 2) — punto C
  confermato.
- `addActivityEvent` con un evento 'note' (nessun allineamento
  strutturale): **1** sola cella scritta su `jobs` (colonna 20,
  `activity_log_json`), non le 22 della riga intera — punto D
  confermato.
- `findOpenVisitRow_`: lettura a larghezza **8** colonne (non 13) per
  ogni riga scansionata di `visite` — punto B/E confermato.
- Mossa che chiude una visita (`wait_client` → `backlog`): **2**
  operazioni di scrittura totali su `visite` (1 `setValues` per chiudere
  la vecchia riga + 1 `appendRow` per la nuova, gia' completa), non piu'
  3 — punto G confermato.

Nessun cambio di risultato rilevato su nessun test esistente (stessi
131/131 verdi prima e dopo).

**Push su TEST — inizialmente bloccato, poi risolto nella stessa
sessione**: primo tentativo fallito con `invalid_grant`/`invalid_rapt`
(token OAuth clasp scaduto) — stesso blocco gia' capitato in N1. Su
richiesta esplicita di Marco ("clasp login, fai tu il comando") ho
eseguito `clasp login` dalla cartella `apps-script/`: ha riconosciuto
una sessione gia' valida e prodotto l'URL di riautorizzazione, che Marco
ha completato lui stesso nel browser ("fatto, login completato").
Rilanciato `bash apps-script/test-harness/push-and-verify.sh`: **16/16
file identici tra TEST e `apps-script/src`, 0 differenze.**

**O1/O2 — DONE, tutti e quattro i punti della Definition of Done
soddisfatti**: criteri di accettazione §6 verificati TRUE uno per uno
(non "il codice sembra corretto" — verificati empiricamente con lo
script strumentato, vedi sopra), 131/131 test nell'harness Node senza
regressioni, push su TEST verificato (16/16 file identici), questo
aggiornamento. **O3** (indice vero per la visita aperta) resta dietro il
proprio gate 🔴 esplicito — non e' una sotto-fase da eseguire ora: il
documento stesso la subordina all'aver visto l'effetto di O1+O2 in uso
reale, quindi nessun lavoro ulteriore qui. **Programma Fase O in pausa
al gate di O3**, in attesa di uso reale e di una decisione di Marco.

## Collaudo pre-deploy su copia di PROD — due gap trovati da Marco, non bug di questa sessione (2026-08-20)

Marco ha fatto una copia esatta dello spreadsheet PROD e l'ha puntata
come database TEST (`SIGMAFLOW_TEST_SPREADSHEET_ID`), per collaudare il
deploy prima di eseguirlo davvero su PROD. Due gap trovati, **entrambi
preesistenti a questa sessione**, non causati da M1-M9 né dai fix di
Cronologia:

1. **La copia non ha i fogli archivio/cestino** — mai eseguito
   l'allineamento schema lì (atteso, stessa causa di fondo di M1).
   **Aggiunta** `setupSigmaFlowOnTest()` (Schema.gs): stesso pattern di
   `migrateActivityLogOnTest`/`migrateVisiteFromHistoryOnTest`
   (ActivityLog.gs, già esistenti) — risolve sempre e solo lo
   spreadsheet in `SIGMAFLOW_TEST_SPREADSHEET_ID`, mai la property
   condivisa `SIGMAFLOW_SPREADSHEET_ID` (stesso rischio già documentato
   più volte in questo file). Eseguibile dall'editor Apps Script, menu
   Esegui.

2. **`visite` non riflette l'intera storia di `activity_log_json`** per
   almeno un caso reale mostrato da Marco (`JOB-20260707-NZFQ`, 12
   eventi manuali nel log su 7 mesi, almeno 2 rientri reali visibili —
   `wait_authority→todo` il 26/06, `wait_client→todo` il 22/07 — ma una
   sola riga in `visite`, con campi che sembrano un ibrido parziale, non
   3 righe come atteso). **Non è un bug dei fix di stasera** (che
   toccano solo il percorso *live*, `addActivityEvent`/`moveJob`) — è
   la materializzazione storica autorevole (Fase L5,
   `migrateVisiteFromHistory_`, `DESIGN_modello_caso_visita.md` §7) che
   non risulta mai stata eseguita per intero su questi dati reali, o
   eseguita prima che gran parte di questa storia fosse accumulata.
   **Funzione già esistente per correggerlo**: `migrateVisiteFromHistoryOnTest()`
   (ActivityLog.gs) — ricostruisce **tutta** la tabella `visite` da
   zero, rileggendo `activity_log_json` di ogni caso, sullo spreadsheet
   TEST configurato. **Distruttiva su `visite`** (la svuota e la
   riscrive per intero) — sicura sulla copia di Marco, mai da eseguire
   su PROD vero senza una decisione e un gate dedicati (non esiste oggi
   un equivalente "SuProd" per questa funzione, a differenza di
   `allineaSchemaSuProd()`).

**Sequenza consigliata per Marco sulla copia**: prima
`setupSigmaFlowOnTest()` (crea i fogli mancanti), poi
`migrateVisiteFromHistoryOnTest()` (ricostruisce `visite`), entrambe
dall'editor Apps Script.

**Implicazione da verificare, non confermata**: se questo gap in
`visite` è presente anche su altri casi reali di PROD (non solo quello
mostrato), le metriche di dashboard che leggono da `visite` (flusso,
rework, tempi, capacità — quasi tutte, calcolate su `visite`, mai su
`jobs`) potrebbero essere state sottostimate su PROD per tutto questo
tempo per i casi con una storia simile. **Non ancora quantificato** —
richiede di eseguire `migrateVisiteFromHistoryOnTest()` sulla copia e
confrontare i numeri prima/dopo, o un controllo mirato di quanti casi
reali hanno questo pattern.

**Nessun codice applicativo cambiato per questi due punti** (solo la
nuova `setupSigmaFlowOnTest()`, di sola comodità) — push su TEST
verificato, 16/16 file identici. Commit: `74b15cf`.

## M2 — "Cronologia lenta" diagnosticata e corretta: causa reale trovata (2026-08-20)

Seguito diretto della sezione precedente: Marco ha confermato che il
rallentamento è **all'apertura della tab Cronologia**, 7-10 secondi.

**Causa reale trovata**: `withEnvironment_` (Utils.gs) prende un lock
**globale di script** (`LockService.getScriptLock()`) per **ogni**
chiamata `api()`, anche di sola lettura come `getActivityLog` — non
solo per le scritture. Il fix del ritardo di 1-2 minuti sulla board
(sezione precedente, stessa sessione) aveva introdotto un
`loadBoard(true)` dopo ogni salvataggio in Cronologia: un giro in più
di lock, e per di più il più pesante (`getBoard()` rilegge `jobs` +
`visite` per intero), proprio nel percorso più battuto durante un
collaudo — capace di mettere in coda dietro di sé anche le letture più
leggere come `getActivityLog`, spiegando perché il sintomo è comparso
proprio nella stessa sessione in cui quel fix è stato introdotto.

**Corretto** (Kanban.gs): `addActivityEvent`/`updateActivityEvent`/
`deleteActivityEvent` restituiscono ora il job già aggiornato (status +
campi di rientro ricalcolati, nuovo helper `attachOpenVisitSummary_`) —
stesso contratto di risposta già usato da `moveJob` (M0-A2). Il client
(`applyActivityJobUpdate_` in `client.html`, sostituisce
`refreshBoardAfterActivityChange_`) aggiorna la card in stato locale
con il job ricevuto nella stessa risposta, **senza una seconda chiamata
al server** — niente più giro di lock aggiuntivo, la card si sposta
comunque subito sulla board (stesso risultato del fix precedente, senza
il suo costo).

**Test aggiunti** (`Tests.gs`), 3 nuovi:
`testAddActivityEventReturnsUpdatedJobInResponse`,
`testUpdateActivityEventReturnsUpdatedJobInResponse`,
`testDeleteActivityEventReturnsUpdatedJobInResponse` — verificano che
la risposta includa il job aggiornato (status + `visit_number`).
**152/152 test passati nell'harness Node** (149 preesistenti + 3
nuovi, nessuna regressione).

**Verificato nel Browser pane** (stesso server locale di riproduzione,
network instrumentato per contare le chiamate `/api`): la sequenza
reale via form Cronologia genera ora **2 chiamate `api()` invece di 3**
(`addActivityEvent` + `getActivityLog`, non più anche `getBoard`) — la
card si sposta comunque sulla board reale (contatori di colonna
corretti), nessun errore in console.

**Push su TEST verificato**: 16/16 file identici.

**Commit**: `1629133` (dopo `475f4b4`/`5298645`).

**Non ancora confermato da Marco**: se il rallentamento reale (7-10s su
GAS vero, non riproducibile nell'harness Node senza latenza di rete) è
sceso in modo percepibile dopo questo fix — richiede un nuovo test su
TEST da parte sua, non verificabile da questa sessione.

## M2 — bug trovato da Marco in collaudo, corretto: fix del 19/08 incompleto (2026-08-20)

Marco ha segnalato in chat che il fix di M2 (19/08) non era completo,
con un caso reale riprodotto a mano: card in "ATTESA ENTI", una
correzione manuale in Cronologia la riporta a "TO DO" (rientro
corretto), poi un secondo evento manuale "TO DO → WIP" — la card
restava ferma su TO DO invece di seguire anche il secondo spostamento.
Marco ha segnalato anche un ritardo di 1-2 minuti nell'aggiornamento
della board dopo una correzione, e che il render della Cronologia resta
percepito come lento (quest'ultimo **non ancora indagato**, vedi nota
in fondo).

**Causa reale**: il fix del 19/08 aggiornava `job.status` **solo** per
il pattern di rientro (provenienza stand_by/done, destinazione
backlog/prep, `applyManualReentryIfNeeded_`) — un evento 'move' manuale
che non fosse un rientro (es. TO DO → WIP, provenienza non stand_by/
done) non toccava mai `job.status`, lasciando la card ferma
sull'ultimo rientro anche se l'utente aveva registrato esplicitamente
uno spostamento successivo.

**Corretto** (Kanban.gs): `applyManualReentryIfNeeded_` rinominata
`applyManualMoveEffects_` — ora aggiorna sempre `job.status`/
`status_since_ts` per **qualunque** evento 'move' manuale
(`addActivityEvent`/`updateActivityEvent`), non solo i rientri. Lo
split di visita (chiusura + nuova apertura) resta condizionato al vero
pattern di rientro, invariato. `alignOpenVisitFields_` ora chiamata
sempre dopo (mai più condizionata da un `if`), dato che
`ensureOpenVisit_` trova comunque sempre la visita giusta (quella senza
`rientro_ts`, che dopo uno split è sempre la nuova, mai quella appena
chiusa — il timore iniziale che giustificava la condizione era
infondato). `deleteActivityEvent` continua **deliberatamente** a non
passare `candidate` (comportamento invariato, già documentato nel
codice): la riallineatura dopo una cancellazione non correlata non deve
né spostare la card né duplicare una visita.

**Corretto anche il ritardo di 1-2 minuti**: dopo una correzione
manuale che ora può davvero spostare la card, la board aspettava il
prossimo giro di polling (fino a 45s, `bindVisibilityPolling_`) per
accorgersene. `submitActivityPayload_`/`confirmActivityDelete_`
(`client.html`) ora richiamano subito `loadBoard(true)` dopo un
salvataggio riuscito in Cronologia — `loadBoard` modificata per
restituire la propria Promise, cosi' si puo' anche aggiornare
`state.activeJob` con il job appena rifresh, per la tab Informazioni
nella stessa sessione del modale.

**Test aggiunti** (`Tests.gs`), 2 nuovi:
`testAddActivityEventPlainManualMoveUpdatesStatus` (move manuale non di
rientro sposta comunque la card),
`testAddActivityEventManualMoveAfterReentryContinuesUpdatingStatus`
(riproduce esattamente lo scenario di Marco: rientro + move successivo
— la card finisce nella colonna dell'ultimo evento, un solo split di
visita, non due). **149/149 test passati nell'harness Node** (147
preesistenti + 2 nuovi, nessuna regressione).

**Verificato nel Browser pane** (server locale di riproduzione,
`/tmp/sf-scratch/repro-server.js`): sequenza reale via il form
Cronologia (non solo chiamate dirette all'API) — card creata, spostata
in ATTESA ENTI, poi un evento manuale verso TO DO inserito dal vero
form UI. `state.board`/DOM aggiornati entro <1s dal salvataggio (non ai
prossimi 45s di polling), card visibile in TO DO sulla board reale,
nessun errore in console.

**Push su TEST — inizialmente bloccato da token OAuth clasp scaduto**
(`invalid_grant`/`invalid_rapt`, stesso tipo di blocco già capitato in
altre sessioni), risolto con `clasp login` su richiesta esplicita di
Marco in chat. Verificato dopo: 16/16 file identici.

**Nota aperta, non indagata in questa sessione**: "il render della
cronologia è ancora molto lento" — segnalazione di Marco, senza numeri
o passi di riproduzione specifici. Una causa simile era già stata
trovata e risolta in una sessione precedente (M0-A2, doppio round-trip
tra anteprima Informazioni e tab Cronologia) — non è chiaro se questa è
una recidiva, una causa diversa, o un effetto collaterale dei
salvataggi ora più pesanti (`applyManualMoveEffects_` legge l'intero
foglio `visite` per l'idempotenza quando l'evento è un vero rientro).
**Da chiedere a Marco**: quanti secondi, e se il rallentamento è
all'apertura della tab Cronologia o al salvataggio di un evento —
prima di intervenire alla cieca su un problema già indagato una volta.

**Commit** su `fix/m1-null-sheet-archivio` (locale, non unito a
`main`): `475f4b4`.

## M4-M9 (dashboard) — DONE, programma Fase M completo salvo merge (2026-08-19)

Eseguite in sequenza subito dopo la conferma del gate M3 (nessun gate
intermedio tra una sotto-fase e la successiva, come da runbook).
Riferimento: [docs/DESIGN_dashboard.md](docs/DESIGN_dashboard.md) §4.2.

**M4 — Margine di stabilità (Cap. 15)**: `stabilityMetrics_`
(`Model.gs`) era già calcolata in `calculateMetrics_` ma mai passata a
`systemState` (trovato in M3). Ora collegata dentro `buildSystemState_`
con gli stessi ingredienti già in scope (rho grezzo = newRate/
effectiveCapacity, rho effettivo = effectiveLoad, variabilità =
stats.cs2) — zero nuovo dato raccolto. Nuovo pannello "Margine di
stabilità" (`dashboard.html`/`client.html`). Null sotto la soglia
minima di campioni (stessa soglia >=5 di `enoughCompleted`).

**M5 — Dove si blocca il lavoro (T_cliente/T_ente/T_interno)**: somma
di `t_cliente_d`/`t_ente_d`/`t_interno_d` (già accumulati per visita da
`accumulateWaitTime_`, Kanban.gs, mai sommati) sulla stessa finestra
"observed" di flowMetrics/reworkMetrics. Nuovo helper `sumVisitField_`
(Model.gs), nuovo pannello "Dove si blocca il lavoro".

**M6 — Esposizione futura a rientri (B_lat(t))**: conta le visite con
`consegna_ts` nella finestra osservata, mai rientrate (`rientro_ts`
vuoto — "ultima visita del caso") il cui job non è formalmente chiuso
(`incarico_chiuso_ts` vuoto). Un caso archiviato non può mai comparire
(`archiveJob_` richiede `incarico_chiuso_ts` valorizzato per
costruzione). Nuovo pannello "Esposizione futura a rientri".

**M7 — Profilo di ritardo, α e kernel k[m] (Cap. 13)**: letto il
capitolo della dispensa FSC (`docs/fsc.md`) per implementare
correttamente la definizione, non inventata. $D_i$ = `rientro_ts` −
`consegna_ts` per ogni visita consegnata e poi rientrata (**su tutta la
storia disponibile**, non solo la finestra di osservazione — una stima
statistica beneficia di più campioni, scelta deliberata diversa dalle
altre metriche di questa fase). α = rientri osservati / consegne
osservate. k[m] = istogramma discretizzato di {D_i} su bin di 7 giorni
(l'esempio esplicito del capitolo), normalizzato a somma 1, coda
raccolta nell'ultimo bin. **Nessuna correzione per censura a destra**
(raffinamento del capitolo, non requisito minimo) — limite noto,
documentato nel codice (`delayProfile_`, Model.gs). Null sotto soglia
(5 campioni). Nuovo pannello "Profilo di rientro" (tabella dei bin +
α).

**M8 — Ottimizzazioni frontend (salta il ridisegno del polling)**:
`loadBoard()` (`client.html`) confronta un'istantanea testuale dello
stato che guida il disegno (columns/jobs/columnMeta/priorityClasses)
con quella del giro precedente — se identica e non è un refresh
esplicito (`force`), salta `renderBoard()`/`renderToolbarFilters()`,
non l'aggiornamento dell'orario. Il percorso drag-and-drop
(`moveJob`/`deleteJob`) evitava già un `renderBoard()` completo dal M0-B
precedente; questo completa lo stesso principio sul polling periodico
(45s), l'unico rimasto a ridisegnare incondizionatamente. **Verificato
nel Browser pane** con un server locale di riproduzione (markup reale +
`routeAction_` via l'harness Node, `/tmp/sf-scratch/repro-server.js`,
rimosso a fine verifica): un marcatore su un nodo DOM di card sopravvive
a un poll con dati invariati (nessun ridisegno) e sparisce dopo un poll
successivo a una modifica reale sul server (ridisegno avvenuto, nuova
card visibile) — nessun errore in console in nessuno dei due casi.
**Deliberatamente fuori scope**: caching lato server delle letture
`getDataRange().getValues()` — stessa classe di rischio (stato
condiviso che può disallinearsi) dei due incidenti già documentati in
questo file (`PROP_SCHEMA_VERSION`, `SIGMAFLOW_SPREADSHEET_ID`) su un
tool in produzione con scritture concorrenti reali — da riprendere solo
se una latenza misurata lo giustifica.

**M9 — Pannello "quadro avanzato" (Cap. 3-9)**: espone λ/μ/ρ/E[S]/Cv²,
M/M/1 e M/G/1 (Wq/W/Lq/L), rework (p1/r/E[K]/lambda_effective/
rho_effective) — tutti già calcolati in `calculateMetrics_` ma mai
renderizzati (`client.html` leggeva solo `metrics.systemState`, mai i
campi top-level — confermato in M3). **Corretto un errore della
ricognizione M3**: E[S0]/E[S1] (tempo medio di servizio di prima visita
vs rework, Cap. 6) erano stati classificati per sbaglio come "già
calcolati" insieme a E[K] — in realtà mai implementati. Aggiunta la
separazione mancante in `calculateMetrics_` (GROUP BY `numero_visita` =
1 vs > 1 sullo stesso campione già usato per E_S/E_S2/Cs2).

**Test aggiunti attraverso M4-M9** (`Tests.gs`, harness Node), 13
nuovi: `testBuildSystemStateExposesStabilityMetrics`,
`testBuildSystemStateStabilityMetricsNullWhenInsufficientData`,
`testBuildSystemStateSumsWaitTimeByType`,
`testBuildSystemStateCountsLatentBacklogFromRecentUnclosedDeliveries`,
`testDelayProfileNullBelowMinimumSamples`,
`testDelayProfileComputesAlphaAndKernelFromDeliveredThenReentered`,
`testDelayProfileAlphaCountsAllDeliveriesNotOnlyReentered`,
`testBuildSystemStateExposesDelayProfileInSystemState`,
`testCalculateMetricsComputesE_S0AndE_S1SeparatelyByReworkStatus`,
`testCalculateMetricsE_S0E_S1NullWhenNoSamples` (M8 non ha test
nell'harness — cambia solo comportamento client, verificato nel
Browser pane come sopra). **147/147 test passati nell'harness Node**
(134 dopo M2 + 13 nuovi, nessuna regressione), verificati ad ogni
sotto-fase, non solo alla fine.

**Push su TEST verificato ad ogni sotto-fase**:
`bash apps-script/test-harness/push-and-verify.sh` (16/16 file
identici, sempre).

**Verifica UI reale**: server locale di riproduzione (stessa tecnica di
N4/N5/N6/N-B2), seed con due card attive. Tutti i nuovi pannelli (M4,
M5, M6, M7, M9) renderizzati correttamente con placeholder "Dato non
ancora stimabile" sotto soglia dati, nessun errore in console.

**Criteri di accettazione**: nessun elenco dedicato in
`DESIGN_dashboard.md` per M4-M9 (proposte durante M3, non nella
struttura a caselle di M1/M2) — verificati per via del Definition of
Done del runbook (test, push, questo aggiornamento) invece che da una
lista di spunta nel documento di design.

**Commit** su `fix/m1-null-sheet-archivio` (locale, non unito a
`main`): `dd27edf` (M4-M6), `d9f2a96` (M7), `93cd790` (M9), `b155e37`
(M8) — dopo `f9b2a05` (M3).

**Programma Fase M — completo salvo un solo passo**: tutte le
sotto-fasi M1-M9 di `docs/DESIGN_dashboard.md` sono DONE. **Unico gate
rimasto**: §6 del design doc, "fusione del fix in `main`" — prassi
ordinaria (mai push diretto su `main`), riservata a Marco tramite pull
request, non un gate di design. Nessuna sotto-fase residua da eseguire
in autonomia.

## M3 (dashboard) — Ricognizione completata, GATE 🔴 UMANO in attesa (2026-08-19)

Riferimento: [docs/DESIGN_dashboard.md](docs/DESIGN_dashboard.md) §4.
Nessun codice toccato — solo lettura/inventario, come da contenuto
previsto per M3.

**Risultato** (dettaglio completo in §4.1 del design doc): tutto
quanto oggi in `systemState` (`Model.gs`/`dashboard.html`) è
effettivamente renderizzato, nessun campo morto lì — a differenza dei
campi legacy top-level di `calculateMetrics_` (`MM1`/`MG1`/`lambda`/
`rework`/`stability`/`distributions`), mai passati a `systemState`,
quindi mai mostrati (già noto da N6, riconfermato). Confrontato con
`DESIGN_modello_caso_visita.md` §10 (Cap. 11-15): mancano ancora
$T_{cliente}$/$T_{ente}$/$T_{interno}$ (mai sommati/esposti),
$B_{lat}(t)$ (mai calcolato), $\alpha$/kernel Cap. 13 (mai stimato);
il margine di stabilità (Cap. 15) è invece **già calcolato**
(`stabilityMetrics_`) ma mai collegato a `systemState` — solo da
esporre, non da ricalcolare.

**Piano proposto** (§4.2 del design doc), in attesa di conferma:
- **M4**: collegare `stability` (già calcolato) a `systemState` +
  pannello dedicato — zero nuovo calcolo.
- **M5**: $T_{cliente}$/$T_{ente}$/$T_{interno}$ — somma di un campo
  già raccolto per ogni visita, mai aggregato.
- **M6**: $B_{lat}(t)$ — stessa categoria di M5, dato già presente,
  solo mai aggregato in questo modo.
- **M7**: $\alpha$/kernel (Cap. 13) — **raccomandato fuori scope**,
  richiede una vera stima statistica, non solo un aggregato; da
  riprendere con un documento dedicato quando serve davvero.
- **M8**: ottimizzazioni frontend residue (`renderBoard()` DOM
  completo, letture integrali dei fogli) — confermate ancora presenti
  nel codice, nessuna misura reale raccolta in questa sessione (nessun
  accesso al deployment). Inclusione **non raccomandata di default**,
  decisione esplicita di Marco.
- Non deciso dalla ricognizione: se aggiungere un pannello "quadro
  avanzato" per le metriche di Cap. 3-9 già calcolate ma mai esposte
  ($\lambda$/$\mu$/$\rho$/$C_v^2$/Pollaczek-Khinchine/
  $E[S_0]$/$E[S_1]$/$E[K]$).

**GATE 🔴 UMANO (§3 e §6 del design doc) — IN ATTESA**: come da
runbook, questa sessione si ferma qui. Serve una conferma esplicita di
Marco su: (1) includere M4-M6 come proposto, (2) lasciare M7 fuori
scope come raccomandato, (3) includere o no M8, (4) aggiungere o no un
pannello "quadro avanzato" per Cap. 3-9. Nessuna sotto-fase M4+
iniziata.

## M2 (dashboard) — DONE, gate confermato da Marco (2026-08-19)

Proseguita subito dopo la conferma del gate (nessuna nuova richiesta di
Marco necessaria per procedere all'implementazione, come da CLAUDE.md).
Riferimento: [docs/DESIGN_dashboard.md](docs/DESIGN_dashboard.md) §3.

**Decisione presa da Marco: opzione 2** — un evento 'move' inserito a
mano in Cronologia che rappresenta un vero rientro deve ricalcolare
`job.status` e creare la visita mancante, rispettando le stesse regole
di validazione del drag-and-drop reale.

**Codice**:
- `ActivityLog.gs` (`validateSequence_`): nuovo hard error
  `RIENTRO_DIRETTO_WIP_NON_CONSENTITO` — un evento 'move' manuale la cui
  provenienza (`candidate.from`, già calcolato da
  `computeFromForCandidate_`) è un'attesa/completato e la cui
  destinazione è WIP viene rifiutato, **anche con `force: true`** (è un
  hard error, non un warning superabile) — stessa regola già applicata
  al drag-and-drop reale in `moveJob` (Kanban.gs), ora estesa alla
  Cronologia manuale: prima non c'era, la Cronologia poteva registrare
  uno stato che l'interfaccia normale non avrebbe mai permesso di
  raggiungere.
- `Kanban.gs`: nuova `applyManualReentryIfNeeded_(job, candidate)`,
  chiamata da `applyStructuralAlignment_` (ora con un terzo parametro
  `candidate`) **solo** dai percorsi `addActivityEvent`/
  `updateActivityEvent` — quando il candidato rappresenta un rientro
  vero (provenienza stand_by/done, destinazione backlog/prep, stessa
  regola di `moveJob`), aggiorna `job.status`/`status_since_ts`,
  azzera `incarico_chiuso_ts` se valorizzato (stessa regola N2, §8c),
  chiude la visita aperta (`rientro_ts`/`rientro_da`) e ne apre una
  nuova — stesso meccanismo di `updateVisiteForMove_`, applicato "live"
  sulla visita attualmente aperta (non alla posizione storica
  dell'evento corretto, stessa convenzione già in uso per gli altri
  campi strutturali). **Idempotente**: `reentryAlreadyApplied_` verifica
  se questo stesso rientro (job + `rientro_ts` + `rientro_da`) è già
  stato registrato, per non duplicare la visita se lo stesso evento
  viene risalvato (es. solo per correggere la nota).
  **Deliberatamente non applicata** a `deleteActivityEvent` (la
  riallineatura dell'ultimo move rimasto dopo una cancellazione non
  correlata duplicherebbe una visita già aperta) né alla migrazione
  storica Fase F (`migrateSingleJobActivityLog_`, già autorevole via la
  materializzazione L5) — entrambe continuano a chiamare
  `applyStructuralAlignment_` senza il terzo parametro, comportamento
  invariato.
- `client.html`: messaggio utente per il nuovo hard error
  (`HARD_ERROR_MESSAGES_`).

**Test aggiunti** (`Tests.gs`, harness Node), 3 nuovi:
`testAddActivityEventManualReentryUpdatesStatusAndOpensVisit`
(riproduce lo scenario esatto del 19/08: caso in attesa, correzione
manuale verso backlog — `job.status` diventa `backlog`, 2 visite,
`rientro_ts`/`rientro_da`/`rework_cause` corretti),
`testAddActivityEventManualReentryDirectToWipBlocked` (stesso divieto
di `moveJob`, anche con `force: true`),
`testUpdateActivityEventReentrySameEventDoesNotDuplicateVisit`
(risalvare lo stesso evento senza cambiare data/colonne non duplica la
visita). **137/137 test passati nell'harness Node** (134 preesistenti
+ 3 nuovi, nessuna regressione) — **due test preesistenti aggiustati**
(`testDeleteActivityEventRealignsOpenVisit`,
`testDeleteActivityEventManual`): usavano un rientro diretto a WIP via
Cronologia manuale solo come sequenza di comodo per testare la
cancellazione, ora vietato per lo stesso motivo — cambiata la colonna
intermedia da un'attesa a una colonna neutrale, nessun cambiamento
all'intento originale dei due test.

**Push su TEST verificato**: `bash apps-script/test-harness/push-and-verify.sh`
(16/16 file identici).

**Criteri di accettazione §3 di `docs/DESIGN_dashboard.md` — tutti
[x]**, aggiornati direttamente nel documento di design.

**Commit** su `fix/m1-null-sheet-archivio` (locale, non unito a
`main`): `be41198` (dopo `b5f4b60`/`e3a908b` di M1).

**Prossima sotto-fase**: M3 (Ricognizione — inventario di quanto esiste
in dashboard oggi, confronto con la dispensa FSC), §4 di
`docs/DESIGN_dashboard.md`. Nessun gate su M3 stessa, ma produce le
sotto-fasi M4..Mn che **hanno** un gate 🔴 Umano (conferma del piano
prima di iniziare M4) — quindi M3 può procedere in autonomia, la
sessione si fermerà solo dopo aver prodotto il piano M4..Mn, per la
conferma di Marco.

## M1 (dashboard) — DONE, nessun gate di design (2026-08-19)

Sessione autonoma (`docs/RUNBOOK_esecuzione_autonoma.md`), prima
sotto-fase di [docs/DESIGN_dashboard.md](docs/DESIGN_dashboard.md) §2 —
lo stesso bug null su PROD già registrato sul branch (non unito)
`docs/nota-bug-archivio-prod-null`, ora risolto qui invece che solo
documentato.

**Codice** (`apps-script/src/Utils.gs`): `readTable_(sheet)` ricade su
`[]` quando `sheet` è `null`, un solo punto — nessun controllo
aggiuntivo necessario nei due chiamanti (`readArchivedList_` in
Kanban.gs dietro `getArchivio`/`getCestino`,
`loadJobsWithVisitSummaryFrom_` dietro
`loadArchivedJobsWithVisitSummary_`/`getMetrics`): entrambi passano
sempre `ss.getSheetByName(...)` a `readTable_`, quindi il fallback a
monte li copre già senza modifiche loro.

**Test aggiunti** (`Tests.gs`, harness Node), 3 nuovi — ognuno cancella
i fogli archivio/cestino dopo un `setupSigmaFlow()` altrimenti normale,
per simulare lo schema reale di PROD (mai allineato lì):
`testGetArchivioReturnsEmptyWhenSheetsMissing`,
`testGetCestinoReturnsEmptyWhenSheetsMissing`,
`testGetMetricsReturnsEmptyArchivedDataWhenSheetsMissing` (un caso
attivo resta leggibile nei punti aperti anche senza i fogli archivio).
**134/134 test passati nell'harness Node** (131 preesistenti + 3
nuovi, nessuna regressione).

**Push su TEST verificato**: `bash apps-script/test-harness/push-and-verify.sh`
(16/16 file identici).

**Criteri di accettazione §2 di `docs/DESIGN_dashboard.md` — tutti
[x]**, aggiornati direttamente nel documento di design.

**Commit** su `fix/m1-null-sheet-archivio` (locale, non unito a
`main`): `b5f4b60`. Nessun gate di design su M1 stessa (§6: il solo
"gate" elencato è la prassi ordinaria di unire tramite PR, mai push
diretto su `main` — non un gate di design da confermare). Nota
separata dal design (non richiesta per chiudere M1): l'allineamento
schema vero e proprio su PROD, per creare davvero i quattro fogli lì,
resta una decisione di Marco, riservata a lui, quando vorrà — M1 rende
PROD stabile anche senza quel passo (niente più errore, solo viste
vuote).

**Prossima sotto-fase, al momento della chiusura di M1**: M2
(Cronologia — chiudere il buco "correzione manuale non aggiorna lo
stato derivato"), §3 di `docs/DESIGN_dashboard.md` — gate 🔴 Umano
confermato da Marco nella stessa sessione, vedi sezione M2 sopra
(opzione 2 scelta, implementazione completata subito dopo).

## Incidente — property ambientale bloccata su TEST, PROD mostrava dati di TEST (2026-08-19)

Marco ha segnalato che in qualche momento la webapp PROD ha mostrato
dati di TEST. Indagato subito dopo la chiusura di N6 (vedi sotto),
prima di qualunque altro lavoro.

**Causa confermata da Marco stesso, non solo ipotizzata**: la Script
Property condivisa `SIGMAFLOW_SPREADSHEET_ID` (l'unica variabile che
dice al codice "quale spreadsheet è PROD in questo momento", condivisa
su **tutto** il progetto Apps Script — TEST e PROD sono lo stesso
progetto, deploy separati) è rimasta bloccata sul valore di TEST dopo
che un'esecuzione di test si è interrotta a metà, prima di raggiungere
il proprio blocco `finally` di ripristino. Stessa classe di rischio già
documentata per `PROP_SCHEMA_VERSION` (vedi sessione M0-C/bugfix più
sotto in questo file) — qui la seconda occorrenza reale, non la prima.
**Nessun dato perso o alterato**: `SpreadsheetApp.copy()` non esiste
in questa storia, si trattava solo di lettura scambiata. Marco ha
risolto riscrivendo a mano il valore corretto nella property, dall'
editor Apps Script (Impostazioni progetto → Proprietà script).

**Bug collegato, trovato investigando (non lo stesso incidente, stessa
causa di fondo) e corretto in questa sessione**: `archiveEligibleJobs_()`
(dietro al trigger N3, `eseguiArchiviazioneAutomaticaGiornaliera`, che
scatta ogni notte alle 3:00 senza nessuno presente) risolveva lo
spreadsheet in modo "ambientale" (`getSpreadsheet_()`, la stessa
funzione che legge `SIGMAFLOW_SPREADSHEET_ID`) invece di fissare
esplicitamente TEST — se quella property fosse rimasta sporca nel
momento sbagliato, il trigger avrebbe scansionato/archiviato sul foglio
sbagliato, nel caso peggiore PROD vero. Verificato il log Esecuzioni
dell'editor: il trigger è scattato regolarmente stanotte (19 ago,
03:28:53, 0% errori) — e PROD non ha nemmeno il foglio `jobs_archivio`
(mai eseguito l'allineamento schema lì, correttamente, essendo
riservato a un gate umano separato), quindi non ha comunque scritto
niente su PROD questa notte. **Corretto** (Kanban.gs): il trigger ora
fissa esplicitamente TEST per tutta la propria esecuzione tramite
`withEnvironment_('test', ...)` — lo stesso meccanismo con lock già
usato da `api()` per le richieste web — invece di affidarsi allo stato
lasciato da chiunque altro. Un nuovo test
(`testEseguiArchiviazioneAutomaticaGiornalieraIgnoresDirtyAmbientSpreadsheetProperty`)
riproduce esattamente l'incidente (property sporcata deliberatamente
prima di far scattare il trigger) e verifica che il trigger archivi
comunque sul vero TEST, e che la property sporca preesistente resti
intatta dopo l'esecuzione. **122/122 test passati nell'harness Node**
(121 preesistenti + 1 nuovo). Push su TEST verificato (15/15 file
identici) — bloccato una prima volta da un token OAuth clasp scaduto
(`invalid_grant`/`invalid_rapt`, stesso tipo di blocco già capitato in
N1), risolto con `clasp login` su richiesta esplicita di Marco.

**Deciso in conseguenza**: progettato un backup giornaliero di PROD,
sotto-programma separato — vedi
[docs/DESIGN_backup.md](docs/DESIGN_backup.md), N-B1 costruita nella
stessa sessione (vedi sezione sotto). Nessuna scrittura correttiva
ulteriore necessaria su PROD: Marco conferma "non c'è niente di
bloccato o perso".

## N-B1/N-B2/N-B3 (backup PROD) — DONE, programma completo (2026-08-19)

Riferimento: [docs/DESIGN_backup.md](docs/DESIGN_backup.md), §3/§4/§8
(N-B1). Su richiesta esplicita di Marco, subito dopo aver progettato il
programma (vedi incidente sopra) — non una sessione autonoma separata.

**Codice** (nuovo file `apps-script/src/Backup.gs`):
- `ensureBackupFolder_(ss)` — cartella dedicata ("SigmaFlow — Backup
  PROD"), creata solo se assente, idempotente. **Dove vive, deciso da
  Marco durante questa stessa sessione** (non un id fisso proposto
  inizialmente): dentro la **stessa cartella Drive del foglio PROD
  reale** — `prodParentFolder_(ss)` risale al genitore del file
  (`DriveApp.getFileById(ss.getId()).getParents()`), così se il foglio
  PROD viene spostato il backup lo segue automaticamente, senza una
  costante da tenere sincronizzata a mano.
- `backupRetentionDays_(ss)` — legge `backup_retention_giorni` da un
  foglio config passato esplicitamente (mai ambientale — stesso motivo
  del bugfix sopra), ricade sul default (14) se assente.
- `backupProd_()` — apre `SIGMAFLOW.DEFAULT_SPREADSHEET_ID` (id reale,
  mai `getSpreadsheet_()` ambientale), verifica
  `ss.getName() === 'SigmaFlow Database'` (stesso pattern di
  `allineaSchemaSuProd()`, Schema.gs), `ss.copy(...)` + sposta il file
  nella cartella dedicata. Non tocca mai il foglio sorgente.
- `pruneOldBackups_(retentionDays, ss)` — elimina dalla cartella i file
  più vecchi della soglia, confrontando `getDateCreated()` (mai il nome).
- `eseguiBackupGiornalieroProd()` — handler del trigger: backup e
  pulizia restano due passi indipendenti, un fallimento della pulizia
  non invalida un backup appena creato con successo.
- `installaBackupGiornalieroProd()` — **scritta ma non invocata da
  nessun altro codice** (esattamente come
  `installaTriggerArchiviazioneAutomatica` in N3): il passo che rende
  il backup un'automazione non presidiata resta riservato a Marco
  (N-B3), dopo N-B2.
- `readConfig_()` (Utils.gs) esteso con un parametro `ss` opzionale
  (invariato per ogni chiamante esistente) — necessario perché
  `backupRetentionDays_` non dipenda dalla stessa risoluzione
  ambientale che ha causato l'incidente.
- Nuovo scope OAuth in `appsscript.json` — **stessa sorpresa già vista
  in N3**, ma anche peggio del previsto: lo scope proposto in fase di
  design (`drive.file`) si è rivelato insufficiente al primo tentativo
  reale su TEST (N-B2, vedi sotto) — `drive.file` copre solo i file
  creati/aperti dallo script stesso, non un file preesistente aperto
  per id come il vero foglio PROD, e `prodParentFolder_()` fa proprio
  questo. Corretto ampliando lo scope a
  `https://www.googleapis.com/auth/drive` (accesso completo — non
  esiste una via di mezzo). Marco dovrà aspettarsi una **nuova**
  richiesta di consenso Google al prossimo tentativo (la seconda per
  questo programma).

**Harness Node esteso** (`apps-script/test-harness/gas-harness.js`):
mock minimale di `DriveApp` (file/cartelle **annidate** — `Folder.
getFoldersByName`/`createFolder`/`getParents`, oltre ai metodi globali
di `DriveApp` — iteratori `hasNext`/`next`, `getDateCreated`/
`setTrashed`) e `Spreadsheet.copy()` — puramente in memoria, nessuna
chiamata di rete. Ogni `SpreadsheetApp.openById(id)` registra anche un
file Drive corrispondente (di default nella radice), necessario perché
`prodParentFolder_` possa risalire al genitore anche nei test.
`Backup.gs` aggiunto all'elenco dei file caricati.

**Test aggiunti** (`Tests.gs`), 9 nuovi — **mai contro il vero PROD**:
`SIGMAFLOW.DEFAULT_SPREADSHEET_ID` nell'harness apre solo un
`MockSpreadsheet` in memoria (`resetProdMock_`, nuovo helper, ricostruisce
uno stato pulito a ogni test — stesso principio già corretto per
`jobs_archivio`/`jobs_cestino` in N6, applicato qui da subito):
`testBackupRetentionDaysFallsBackToDefaultWhenConfigMissing`,
`testBackupRetentionDaysReadsConfiguredValue`,
`testBackupProdRejectsWrongSpreadsheetName`,
`testBackupProdCreatesFullCopyInDedicatedFolder`,
`testBackupFolderLivesInSameFolderAsProdSpreadsheet` (sposta il file
mock di PROD in una cartella di prova, verifica che la cartella di
backup compaia lì e non nella radice),
`testBackupProdNeverModifiesSourceSheet`,
`testPruneOldBackupsDeletesOnlyFilesOlderThanRetention`,
`testEseguiBackupGiornalieroProdReturnsBackupAndPruneResult`,
`testEseguiBackupGiornalieroProdKeepsBackupWhenPruneFails` (quest'ultima
sostituisce temporaneamente `ensureBackupFolder_` per simulare un
fallimento solo nella fase di pulizia, verificando che il backup
appena creato resti comunque valido). **131/131 test passati
nell'harness Node** (122 preesistenti + 9 nuovi, nessuna regressione).

**Push su TEST verificato**: `bash apps-script/test-harness/push-and-verify.sh`.

**N-B2 — CONFERMATA da Marco il 2026-08-19** ("tutto perfetto"), dopo
due correzioni trovate proprio in questo primo tentativo reale (non
rilevabili dall'harness Node): il bugfix della cartella di backup
(vedi sopra) e lo scope OAuth `drive.file` → `drive` (vedi sotto). Il
primo backup reale di PROD esiste, nella cartella "SigmaFlow — Backup
PROD" accanto al foglio PROD vero.

**N-B3 — CONFERMATA da Marco il 2026-08-19** ("tutto ok"):
`installaBackupGiornalieroProd()` eseguita dall'editor Apps Script sul
progetto reale, trigger giornaliero (`eseguiBackupGiornalieroProd`,
ore 2) attivo. **Tutti i criteri di accettazione §9 di
`docs/DESIGN_backup.md` sono ora [x].**

**Programma di backup PROD (N-B1-N-B3) — completo.** Nessuna
sotto-fase residua in `docs/DESIGN_backup.md` §8. Come per
l'archiviazione, tutto il lavoro è su `feat/n1-archiviazione-schema`,
non ancora unito a `main`.

## N6 (archiviazione) — DONE, programma completo (2026-08-18)

Sessione autonoma (scheduled task, `docs/RUNBOOK_esecuzione_autonoma.md`),
proseguita automaticamente dopo N5 (nessun gate). Riferimento:
[docs/DESIGN_archiviazione.md](docs/DESIGN_archiviazione.md), §8, §9
(N6). **Ultima sotto-fase del programma di archiviazione** — con N6
chiusa, tutte le sotto-fasi N1-N6 di §9 sono DONE.

**Ricognizione preliminare (necessaria, non assumibile)**: il
frontend (`client.html`, `renderMetrics`) legge **solo**
`metrics.systemState.*` — i campi legacy in cima a `calculateMetrics_`
(`MM1`/`MG1`/`lambda`/`distributions`/...) non sono mai renderizzati
(verificato via grep), quindi **volutamente non estesi** all'archivio:
nessun beneficio visibile, solo rischio aggiunto. Tutto il lavoro di
N6 è su `buildSystemState_` (Model.gs), l'unica funzione che produce
ciò che la dashboard mostra davvero.

**Backend** (Kanban.gs): `loadJobsWithVisitSummary_` fattorizzata in
`loadJobsWithVisitSummaryFrom_(jobsSheetName, visiteSheetName)` — nuovo
`loadArchivedJobsWithVisitSummary_()` la riusa puntata su
`jobs_archivio`/`visite_archivio`, stesso ricalcolo di `done_ts`/
`visit_number` che i casi attivi hanno già (nessuna implementazione
parallela).

**Backend** (Model.gs): `getMetrics()` legge anche `archivedJobs`/
`visiteArchivio` e li passa a `calculateMetrics_`/`buildSystemState_`
(parametri opzionali, default `[]` — le chiamate dirette già esistenti
nei test restano valide invariate). Dentro `buildSystemState_`:
`visite` diventa `visite.concat(visiteArchivio)` per Flusso/Rientri/
Tempi/Capacità (calcolati da `visite`, mai da `jobs` — tutti e quattro
ora vedono anche l'archivio quando la finestra osservata lo tocca).
`pointsStatistics_` riceve **sia** `jobs` (attivi) **sia**
`archivedJobs`, con una separazione esplicita: `openJobs` (→ punti
aperti, card aperte, "per taglia", "per assegnatario") resta derivato
**solo** da `jobs` attivi, mai dall'unione — cablaggio deliberato
dell'unico vincolo esplicito del design (§8: "lavoro presente" non è
mai archivio né cestino). `allJobs = jobs.concat(archivedJobs)` alimenta
invece "punti completati"/"punti aggiunti"/`monthBuckets_` ("Andamento
del carico" + "Carico mensile")/`pointsByColumn_` ("Punti per
colonna") — tutte storiche su finestra temporale o già non filtrate a
solo `openJobs` prima di N6. Il Cestino non entra in nessun punto di
questa funzione (nessun `loadCestino...` equivalente creato).

**Bug di harness trovato e corretto, non nel codice di produzione**:
`resetTestDatabase_` (Tests.gs) puliva solo `jobs`/`visite`/`config`
tra un test e l'altro — mai `jobs_archivio`/`jobs_cestino` (nota già
presente in questo file da N2, allora non bloccante perché nulla
leggeva l'archivio per intero). Con `getMetrics()` che ora unisce
l'intero contenuto di `jobs_archivio`/`visite_archivio`, i residui
lasciati da **tutti** i test precedenti nello stesso spreadsheet
condiviso della suite si sono messi a inquinare silenziosamente
`testMetrics` (qualità dati passata da "bassa" a "media" per
iniziative osservate mai pulite) — non un test che parla
esplicitamente di archivio, un effetto collaterale trasversale.
Corretto svuotando anche `jobs_archivio`/`jobs_cestino`/
`visite_archivio`/`visite_cestino` a ogni `resetTestDatabase_`.
**Secondo bug di harness**, trovato scrivendo i test nuovi:
`gas-harness.js` (mock di `Utilities.formatDate`) non gestiva i
pattern `'yyyy-MM'`/`'MM/yyyy'` usati da `monthBuckets_` per le chiavi
mensili — cadeva nel formato di default (timestamp completo con
ora/minuti), producendo chiavi diverse per date nello stesso mese.
Nessun test precedente confrontava le chiavi di `timeline` con un
valore atteso (solo `.length === 6`), quindi il gap è rimasto
invisibile fino al primo test che lo ha fatto. Corretto aggiungendo
entrambi i pattern al mock.

**Test aggiunti** (`Tests.gs`, harness Node), 7 nuovi:
`testBuildSystemStateIncludesArchivedJobsInHistoricPoints` (punti
aggiunti/completati includono l'archivio),
`testBuildSystemStateOpenPointsNeverIncludeArchivedJobs` (caso limite:
anche con uno status archiviato che mapperebbe su una colonna non-done,
punti aperti/card aperte/lavoro pronto restano solo sugli attivi),
`testBuildSystemStateTimelineIncludesArchivedJobs` ("Andamento del
carico"), `testBuildSystemStatePointsByColumnIncludesArchivedJobs`
("Punti per colonna"), `testBuildSystemStateFlowMetricsIncludeArchivedVisite`
(Flusso legge anche `visite_archivio`), `testGetMetricsIncludesArchivedCaseInHistoricPoints`
(end-to-end via `archiveJob_` + `getMetrics()` reale, non solo
`buildSystemState_` diretta), `testGetMetricsNeverReadsCestino`
(un job cestinato non sposta di un punto nessuna metrica, prima/dopo
confrontati). **121/121 test passati nell'harness Node** (114
preesistenti + 7 nuovi, nessuna regressione).

**Verifica UI reale**: stessa tecnica di N4/N5 — server HTTP locale
temporaneo (rimosso a fine verifica) con `routeAction_` reale via
l'harness Node. Seed: un caso attivo in WIP (M, 8pt) + un caso chiuso
e archiviato (L, 13pt, invoiced). Tab Dashboard, nessun errore in
console. Numeri osservati, tutti corretti: **Punti aperti 8pt** (solo
l'attivo — l'archiviato, pur da 13pt, non compare), **Punti aggiunti
21pt** e **Punti completati 13pt** (entrambi includono l'archiviato),
**Punti per colonna**: "WIP 8pt/1 card" (attivo) + "DA INVIARE / DA
FATTURARE 13pt/1 card" (l'archiviato, sotto lo status conservato al
momento dell'archiviazione), **Carico mensile** (riga 08/2026): 2 card
entrate, 1 completata, 21/13/8 punti entrati/completati/aperti —
combina correttamente attivo+archiviato nello stesso mese,
**Distribuzione per taglia**/**Punti per assegnatario**: solo "M 8pt/1
card"/"Non assegnato 8pt/1 card" — **l'archiviato correttamente
escluso**, confermando che questi due restano ancorati a "lavoro
presente" come gli altri due esplicitamente esclusi dal design.
Comportamento verificato end-to-end, non solo letto dal codice.

**Push su TEST verificato**: `bash apps-script/test-harness/push-and-verify.sh`
(15/15 file identici).

**Criteri di accettazione §10 chiusi da N6**: "Cestino mai letto da
nessuna metrica" e "'Lavoro presente'/punti aperti invariati (mai
archivio né cestino); 'Andamento del carico' e quadro di dettaglio
verificati che includano l'archivio (unione diretta, senza filtri)
quando pertinente" — entrambi verificati TRUE. **Con N6, tutti i
criteri di accettazione di §10 sono ora [x]** (aggiornati direttamente
nel documento di design, non solo qui).

**Programma di archiviazione (N1-N6) — completo.** Nessuna sotto-fase
residua in `docs/DESIGN_archiviazione.md` §9. Tutto il lavoro è su
`feat/n1-archiviazione-schema`, mai unito a `main` in questa sessione
(nessuna richiesta di merge ricevuta) — resta a Marco decidere quando
aprire la pull request verso `main`.

## N5 (archiviazione) — DONE, nessun gate (2026-08-18)

Sessione autonoma (scheduled task, `docs/RUNBOOK_esecuzione_autonoma.md`),
proseguita automaticamente dopo N4 (nessun gate). Riferimento:
[docs/DESIGN_archiviazione.md](docs/DESIGN_archiviazione.md), §7, §9
(N5).

**Backend** (Kanban.gs): `duplicaJob_(jobId)` legge il caso da
`jobs_archivio` (`findRowById_`/`readJobFromRow_`, stesso pattern usato
da `archiveJob_` per il controllo di eleggibilità) e **riusa `addJob`**
per crearne uno nuovo — non una funzione di copia riga parallela: cosi'
`arrival_ts`/`status_since_ts`/visita 1/log di creazione nascono da zero
esattamente come per un caso creato a mano, senza doverli azzerare uno
per uno. Copia solo i campi che il design elenca come punto di partenza
(§7: titolo/cliente/tag/assegnatario/ambasciatore/taglia) — priorità,
descrizione, colore, ecc. ripartono dai default di `addJob`. Lancia
errore esplicito se il `job_id` non è presente in Archivio. `duplicaJob(params)`
è il thin wrapper esposto via `routeAction_` (bottone "Duplica").

**Frontend** (`archivio.html`/`client.html`): colonna "Azioni" aggiunta
alla vista Archivio (era sola lettura in N4, §6 non lo escludeva per
N5), un bottone "Duplica" per riga, stesso pattern di
`row-actions`/conferma di Cestino (N4) ma conferma **leggera** — non è
un'azione distruttiva, né sul caso archiviato (resta invariato) né
altrove. Nessuna azione sul Cestino (§7: "non applicabile al Cestino,
che ha Ripristina invece").

**Test aggiunti** (`Tests.gs`, harness Node), 4 nuovi:
`testDuplicaJobCreatesNewActiveJobCopyingAnagrafica` (titolo/cliente/tag/
assegnatario/taglia copiati, nuovo `job_id`, attivo su `jobs`),
`testDuplicaJobDoesNotCopyClosureStatusOrVisitHistory` (`incarico_chiuso_ts`
vuoto, status riparte dalla colonna iniziale — non da quello archiviato,
un solo evento nel log, una sola visita — nessuno storico riportato),
`testDuplicaJobThrowsWhenJobNotInArchivio`,
`testDuplicaJobApiActionWrapsDuplicaJob`. **114/114 test passati
nell'harness Node** (110 preesistenti + 4 nuovi, nessuna regressione).

**Verifica UI reale**: stessa tecnica di N4 — server HTTP locale
temporaneo (rimosso a fine verifica) che serve il markup vero
(`index`/`archivio`/`client`/`style` .html) con `google.script.run.api(...)`
inoltrato a un endpoint locale che esegue `routeAction_` reale via
l'harness Node, `window.confirm` auto-accettato e loggato in console per
restare verificabile. Seed: un caso archiviato (`Bonifica sito Rossi`,
Rossi Srl, tag "urgente", assegnatario Mario, taglia L). Click su
"Duplica" in Archivio → conferma catturata in console → riga Archivio
invariata dopo il click (il caso archiviato non viene toccato) → nuova
card comparsa in colonna BACKLOG sulla Board con la stessa anagrafica
copiata (cliente, tag, assegnatario, 13 pt = taglia L) e nessun dato
storico (non in DONE, nessuna chiusura). Comportamento verificato end-to-end,
non solo letto dal codice.

**Criteri di accettazione §10 chiusi da N5**: "'Duplica' (solo da
Archivio) crea un caso nuovo, nessun dato storico riportato" —
verificato TRUE.

**Fuori scope di N5, per §9**: N6 (metriche estese all'archivio) resta
aperta. Nessun gate dopo N5 — si procede a N6.

## N4 (archiviazione) — DONE, nessun gate (2026-08-18)

Proseguita automaticamente dopo la conferma del gate N3 (nessuna nuova
richiesta di Marco necessaria tra una sotto-fase e l'altra, come
chiarito nella sezione "Nessuna conferma in chat" di CLAUDE.md, scritta
in questa stessa sessione). Riferimento:
[docs/DESIGN_archiviazione.md](docs/DESIGN_archiviazione.md), §6, §6b,
§9 (N4).

**Backend** (Kanban.gs):
- `getArchivio()`/`getCestino()` — liste sola lettura, lette
  direttamente da `jobs_archivio`/`visite_archivio` o
  `jobs_cestino`/`visite_cestino` (§6: "nessuna ricostruzione dal log
  necessaria"). Fattorizzate in un solo helper `readArchivedList_`
  (§6b: "stessa forma della vista Archivio"), non due implementazioni
  parallele. Ogni riga: anagrafica (titolo, cliente, assegnatario, tag,
  descrizione), stato al momento dello spostamento, `arrival_ts`,
  `incarico_chiuso_ts`, il timestamp specifico al percorso
  (`archiviato_ts` o `cestinato_ts`), numero totale di visite (contato
  da `visite_archivio`/`visite_cestino`, non ricostruito dal log).
- `ripristinaJob(params)` — wrapper sottile su `ripristinaJob_` (già
  scritta in N2), stesso pattern di `archiveJob(params)`.
- `eliminaJobDefinitivamente(params)` — cancellazione vera di una
  singola riga dal Cestino (job + tutte le sue visite), mai
  dall'Archivio (il design non la prevede lì, solo Duplica in N5).
- `svuotaCestino()` — azione di gruppo, azzera `jobs_cestino`/
  `visite_cestino` in un colpo solo. Insieme a
  `eliminaJobDefinitivamente`, l'unico punto di reale perdita di dati
  in tutto il programma (§4.3) — sotto lock, come le altre funzioni di
  spostamento/cancellazione.
- `clearDataRows_` spostata da Tests.gs a Utils.gs: `svuotaCestino()` è
  codice di produzione, non doveva dipendere da un helper vissuto solo
  nei test.
- Tutte e cinque registrate in `routeAction_`.

**Frontend** (`index.html`/`client.html` + due file nuovi
`archivio.html`/`cestino.html`): due voci di navigazione "Archivio"/
"Cestino" accanto a Board/Dashboard, caricamento pigro con cache (stesso
pattern di `loadMetrics`, §6: "consultata molto raramente" — non
ricaricare ad ogni apertura del tab). Vista Archivio: tabella sola
lettura, nessuna azione (Duplica resta N5). Vista Cestino: stessa
tabella + colonna Azioni per riga ("Ripristina", conferma leggera
essendo reversibile; "Elimina definitivamente", conferma pesante) e
bottone di gruppo "Svuota cestino" (stessa conferma pesante) — entrambe
le conferme pesanti nominano esplicitamente l'irreversibilità
dell'azione, come da design (§6b, §4.3).

**Test aggiunti** (`Tests.gs`, harness Node), 6 nuovi:
`testGetArchivioReturnsAnagraficaAndVisitCount`,
`testGetCestinoReturnsAnagraficaAndVisitCount`,
`testRipristinaJobApiActionRestoresJob`,
`testEliminaJobDefinitivamenteRemovesJobAndVisiteFromCestino`,
`testEliminaJobDefinitivamenteThrowsWhenJobNotInCestino`,
`testSvuotaCestinoRemovesAllRowsFromCestino`. **110/110 test passati
nell'harness Node** (104 preesistenti + 6 nuovi, nessuna regressione).

**Verifica UI reale, non solo lettura del codice**: essendo una sessione
senza accesso al deployment TEST reale (richiede login del dominio
sigmapiu.it), stessa tecnica già usata nella sessione M0-C — server
HTTP locale temporaneo (sotto `/tmp/sf-scratch/`, rimosso a fine
verifica) che serve il markup vero (`index`/`archivio`/`cestino`/
`client`/`style` .html) con `google.script.run.api(...)` inoltrato a un
endpoint locale che esegue la logica reale (`routeAction_`) via
l'harness Node — non dati finti. Le cinque azioni verificate end-to-end
via richieste dirette all'endpoint reale: `getArchivio`/`getCestino`
(anagrafica e riepilogo corretti), `ripristinaJob` (torna su `jobs`,
sparisce dal Cestino), `eliminaJobDefinitivamente` (riga e visite
cancellate, Cestino torna coerente), `svuotaCestino` (`deleted_count`
corretto, Cestino azzerato). Un bug reale trovato e corretto proprio in
questa verifica — non nel codice di produzione, nello script di
riproduzione stesso: il seed iniziale chiamava `setupSigmaFlow()`/
`addJob()` fuori da `withEnvironment_('test', ...)`, scrivendo su uno
spreadsheet mock diverso da quello letto dalle chiamate `/api` reali
(stesso genere di rischio già documentato per `PROP_SCHEMA_VERSION`
condivisa, §"Bugfix" più sotto in questo file) — corretto avvolgendo il
seed nello stesso wrapper che il codice reale usa sempre.

**Push su TEST verificato**: `bash apps-script/test-harness/push-and-verify.sh`
(15/15 file, inclusi i due nuovi `archivio.html`/`cestino.html`).
**Bug trovato nello script stesso durante questa verifica**: l'elenco
file di `verify-test-push.sh` era cablato (13 nomi fissi, scritto prima
che N4 aggiungesse i due file nuovi) — avrebbe dichiarato "13/13
identici" ignorando in silenzio gli unici due file che questa
sotto-fase ha aggiunto. Corretto: lo script ora scopre i file da
verificare leggendo `apps-script/src/` invece di un elenco fisso, cosa
che l'avrebbe reso corretto automaticamente anche stavolta.

**Criteri di accettazione §10 chiusi da N4**: "Vista Archivio e vista
Cestino mostrano anagrafica + riepilogo cronologia, nessuna board
Kanban" — verificato TRUE.

**Fuori scope di N4, per §9**: N5 (Duplica, solo da Archivio) e N6
(metriche estese all'archivio) restano aperte, come da tabella. Nessun
gate dopo N4 — si procede a N5.

## N3 (archiviazione) — CHIUSA, gate confermato da Marco (2026-08-18)

Dopo il fix dello scope OAuth (sotto), Marco ha rieseguito
`installaTriggerArchiviazioneAutomatica` su TEST: **"ho riprovato, ha
funzionato — trigger installato"**. Trigger giornaliero
(`eseguiArchiviazioneAutomaticaGiornaliera`, ore 3:00) attivo sul
progetto TEST. **Gate 🔴 Umano di §9, dopo N3 — CONFERMATO.** N3 è
chiusa a tutti gli effetti; N4 (vista Archivio/Cestino) è la prossima
sotto-fase, senza gate.

## N3 (archiviazione) — bug trovato al gate: scope OAuth mancante, corretto (2026-08-18)

Marco ha eseguito `installaTriggerArchiviazioneAutomatica` (Kanban.gs)
dall'editor Apps Script su TEST, come previsto dal gate sotto — fallita
con:

```
Exception: Specified permissions are not sufficient to call ScriptApp.getProjectTriggers.
Required permissions: https://www.googleapis.com/auth/script.scriptapp
```

**Causa, implementazione non design**: il manifest
(`apps-script/src/appsscript.json`) dichiarava solo
`spreadsheets`/`script.container.ui` in `oauthScopes` — nessun codice
precedente a N3 aveva mai chiamato `ScriptApp.getProjectTriggers()`/
`ScriptApp.newTrigger()`, quindi lo scope non era mai stato necessario
finora. Non rilevabile dall'harness Node (mocka `ScriptApp` senza
simulare gli scope OAuth reali) né dai 104/104 test — un gap tra
verifica automatica e ambiente GAS reale, stesso tipo di caso già
capitato in N1 (bug trovato solo su GAS reale, vedi sezione N1 sotto).

**Corretto**: aggiunto `https://www.googleapis.com/auth/script.scriptapp`
a `oauthScopes`. 104/104 test invariati (il fix non tocca logica, solo
manifest). Push su TEST verificato di nuovo (`clasp push --force` poi
`clasp pull` isolato in `/tmp/sf-scratch/` + diff, 13/13 file
identici).

**Nota per Marco**: cambiare gli scope OAuth del manifest tipicamente
richiede una nuova autorizzazione — al prossimo tentativo di eseguire
`installaTriggerArchiviazioneAutomatica` (o qualunque funzione) da
editor Apps Script, aspettati la richiesta di consenso su Google a
rivedere/accettare i permessi aggiornati prima che la funzione giri.

**GATE 🔴 UMANO ancora in attesa**: il trigger resta da installare.
Riprovare `installaTriggerArchiviazioneAutomatica` (Kanban.gs) su TEST.

## N3 (archiviazione) — codice e test pronti, primo tentativo del gate (2026-08-18, poi fallito su scope OAuth, vedi sopra)

Sessione autonoma (scheduled task, `docs/RUNBOOK_esecuzione_autonoma.md`),
proseguita automaticamente da N2 (nessun gate su N2). Riferimento:
[docs/DESIGN_archiviazione.md](docs/DESIGN_archiviazione.md), §4.1, §9
(N3). **Su istruzione esplicita della sessione**: scritto e testato
tutto il codice del trigger, ma **non eseguito il passo che lo attiva
per davvero** — fermo qui per la conferma di Marco, esattamente come
la tabella delle sotto-fasi richiede.

**Codice** (Kanban.gs):
- `archiveEligibleJobs_()` — scansiona `jobs`, seleziona i casi con
  `incarico_chiuso_ts` valorizzato e `oggi - incarico_chiuso_ts >=`
  soglia (config `archiviazione_giorni_default`, default 30 se il
  valore in config e' vuoto/invalido), li archivia uno per uno
  **riusando `archiveJob_`** (N2) — stessa regola di eleggibilita' del
  bottone manuale, un solo punto in cui vive, non duplicata. Un errore
  su un singolo job (es. concorrenza) non interrompe la scansione degli
  altri: raccolto in `errors`, non rilanciato. **Non tocca mai il
  Cestino** — solo archiviazione, come da §4.2/§9 ("il cestino resta
  sempre manuale, nessuna scadenza automatica").
- `eseguiArchiviazioneAutomaticaGiornaliera()` — handler pensato per il
  trigger a tempo, loggato con `Logger.log` (un trigger non ha un
  chiamante interattivo che legga il valore di ritorno). Non
  raggiungibile da nessuna azione UI/API.
- `installaTriggerArchiviazioneAutomatica()` — **contiene**
  `ScriptApp.newTrigger(...).create()` ma **non e' chiamata da nessun
  altro codice di questa sessione**: e' la funzione che Marco dovra'
  eseguire lui stesso dall'editor Apps Script (menu Esegui) per
  attivare davvero il trigger, dopo aver verificato su TEST il
  comportamento di `eseguiArchiviazioneAutomaticaGiornaliera`/
  `archiveEligibleJobs_`. Idempotente: rimuove un trigger preesistente
  con lo stesso handler prima di crearne uno nuovo (nessun duplicato se
  eseguita per errore piu' volte).

**Test aggiunti** (`Tests.gs`, harness Node), 6 nuovi:
`testArchiveEligibleJobsArchivesCasesPastThreshold` (soglia superata),
`testArchiveEligibleJobsSkipsCasesBelowThreshold` (soglia non
raggiunta), `testArchiveEligibleJobsSkipsCasesNeverClosed` (mai chiuso),
`testArchiveEligibleJobsUsesConfiguredThreshold` (soglia diversa dal
default, letta da config), `testArchiveEligibleJobsNeverTouchesCestino`
(un job cestinato non e' piu' in `jobs`, quindi la scansione non lo
tocca — verificato esplicitamente), `testEseguiArchiviazioneAutomaticaGiornalieraReturnsScanResult`
(l'handler del trigger produce lo stesso risultato dello scan diretto).
**104/104 test passati nell'harness Node** (98 preesistenti + 6 nuovi,
nessuna regressione). `installaTriggerArchiviazioneAutomatica` **non e'
testata** (chiama `ScriptApp`, non mockato nell'harness, e non e'
comunque il codice da verificare prima del gate — il gate riguarda
proprio la sua esecuzione, non la sua correttezza sintattica).

**Push su TEST verificato**: `clasp push --force` (13/13 file), poi
`clasp pull` isolato in `/tmp/sf-scratch/clasp-verify/` + diff contro
`apps-script/src/` — 13/13 file identici, 0 differenze. Cartella
temporanea rimossa a fine verifica.

**GATE 🔴 UMANO (§9, dopo N3) — IN ATTESA**: il codice e' pronto e
verificato su TEST (test automatici + push confermato), ma il trigger
**non e' installato**. Prossimo passo per Marco, quando vuole
procedere: eseguire `installaTriggerArchiviazioneAutomatica` (Kanban.gs)
dall'editor Apps Script **sul progetto TEST**, poi verificare che scatti
come previsto prima di considerare l'idea di replicarlo anche altrove.
Questa sessione autonoma si ferma qui: N4/N5/N6 (vista Archivio/Cestino,
Duplica, metriche estese all'archivio) restano bloccate dietro questo
gate, come da runbook — nessuna sotto-fase successiva iniziata.

## N2 (archiviazione) — DONE, nessun gate (2026-08-18)

Sessione autonoma (scheduled task, `docs/RUNBOOK_esecuzione_autonoma.md`),
proseguita da dove N1 si era fermata. Riferimento:
[docs/DESIGN_archiviazione.md](docs/DESIGN_archiviazione.md), §4, §6b,
§8c, §9 (N2), §10.

**Codice**:
- `moveJobToSheet_(jobId, sourceJobsSheetName, sourceVisiteSheetName, destJobsSheetName, destVisiteSheetName, destJobHeaders, extraFields, transformJobFn)`
  (Kanban.gs) — unica funzione di spostamento riga, sotto
  `LockService`, che sposta job + tutte le sue righe `visite` da un
  foglio sorgente a uno di destinazione, valorizza i campi extra
  richiesti (`archiviato_ts`/`cestinato_ts`) e applica un'eventuale
  trasformazione del job prima di scriverlo (usata solo dal fallback di
  colonna in `ripristinaJob_`). Idempotente: se il job non e' piu' nella
  sorgente ma e' gia' nella destinazione, restituisce
  `{ already_moved: true }` invece di un errore — copre sia il doppio
  click sia una chiamata concorrente nella stessa finestra di lock.
  `deleteVisiteRowsForJob_` elimina le righe `visite` del job dal basso
  verso l'alto (evita lo slittamento degli indici durante il ciclo).
- `archiveJob_(jobId)` — wrapper verso `jobs_archivio`/`visite_archivio`,
  **rifiuta** (throw) un job senza `incarico_chiuso_ts` valorizzato: e'
  l'unico punto in cui vive la regola di eleggibilita' (§4.1), riusata
  sia dal bottone manuale sia — in N3 — dal trigger automatico.
  `archiveJob(params)` e' il thin wrapper esposto via `routeAction_`.
- `cestinaJob_(jobId)` — wrapper verso `jobs_cestino`/`visite_cestino`,
  nessuna eleggibilita' richiesta (§4.2).
- `ripristinaJob_(jobId)` — simmetrico inverso (da Cestino a
  `jobs`/`visite`, §6b): se lo `status` conservato non corrisponde piu'
  a nessuna colonna esistente, ricade sulla prima colonna di ruolo
  `backlog` (`transformJobFn`).
- `deleteJob(params)` (Kanban.gs) **cambia comportamento**: non elimina
  piu' la riga, chiama `cestinaJob_` — stessa azione API (`deleteJob` in
  `routeAction_`), nessuna rottura del contratto client/server.
- §8c: `moveJob` svuota `incarico_chiuso_ts` quando la mossa apre una
  nuova visita (`closesVisit`) su un caso gia' marcato "Chiuso" — un
  rientro reale annulla una chiusura ormai superata. Tocca solo quel
  campo, non `invoiced` (rimasto di competenza esclusiva di `updateJob`,
  §1) — scelta letta cosi' dal design, non estesa di iniziativa.
- Frontend (`board.html`/`client.html`): bottone "Archivia" nel modale
  (`modal-archive-button`) abilitato solo quando il job aperto ha
  `incarico_chiuso_ts` valorizzato (`updateArchiveButtonState_`,
  richiamata da `openCardModal`/`openNewJobModal`); click ->
  `archiveJobFromModal` (conferma, `callApi('archiveJob', ...)`,
  rimozione ottimistica della card, rollback su errore — stesso pattern
  di `deleteJob`/`moveJob` lato client). Bottone "x" sulla card e la sua
  conferma aggiornati per riflettere lo spostamento nel Cestino (non
  piu' "Eliminare?", ma "La card verra' spostata nel Cestino. Potrai
  ripristinarla o eliminarla definitivamente in seguito.") — nessun
  cambio di comportamento server oltre a quello di `deleteJob` sopra.

**Test aggiunti** (`Tests.gs`, harness Node), 11 nuovi:
`testArchiveJobMovesJobAndVisiteToArchivio`,
`testArchiveJobRejectsCaseNotClosed`,
`testArchiveJobIsIdempotentOnSecondCall`,
`testArchiveJobApiActionRejectsCaseNotClosed`,
`testCestinaJobMovesJobAndVisiteRegardlessOfClosure`,
`testDeleteJobMovesToCestinoInsteadOfDeleting`,
`testRipristinaJobRestoresJobAndVisiteToOriginalStatus`,
`testRipristinaJobFallsBackToBacklogColumnWhenStatusNoLongerExists`,
`testMoveJobToSheetIsIdempotentWhenCalledTwice`,
`testMoveJobClearsIncaricoChiusoTsOnRealReentryFromDone`,
`testMoveJobDoesNotClearIncaricoChiusoTsWhenNoNewVisitOpens`.
**98/98 test passati nell'harness Node** (87 preesistenti + 11 nuovi,
nessuna regressione). Nota tecnica per chi tocca ancora questi test:
`resetTestDatabase_` svuota solo `jobs`/`visite`/`config` tra un test e
l'altro, non `jobs_archivio`/`jobs_cestino` (fuori dal suo scopo,
precedente a N2) — lo spreadsheet di test e' condiviso da tutta la
suite, quindi le asserzioni su quei due fogli filtrano sempre per
`job_id` invece di assumere la lunghezza assoluta della tabella (due
asserzioni non filtrate sono state trovate e corrette in questa stessa
sessione, prima del giro verde).

**Push su TEST verificato**: `clasp push --force` (13/13 file), poi
`clasp pull` isolato in `/tmp/sf-scratch/clasp-verify-n2/` + diff contro
`apps-script/src/` — 13/13 file identici, 0 differenze. Cartella
temporanea rimossa a fine verifica (nessuna credenziale o dato
persistito fuori da `/tmp/sf-scratch/`).

**Punti di §8d toccati in N2, non esaustivamente**:
- *Concorrenza*: non affrontata con un messaggio dedicato — ma
  `moveJobToSheet_` throw "Job non trovato: X" se il job non e' ne' in
  sorgente ne' in destinazione, che e' il caso reale di un job
  archiviato/cestinato nel frattempo da un altro utente mentre il primo
  aveva ancora il modale aperto con dati non aggiornati. Messaggio
  funzionale ma generico, non la frase dedicata ipotizzata dal design —
  da rivedere in una sessione UI se Marco lo giudica insufficiente in
  uso reale.
- Vista Archivio/Cestino, ricerca/filtro, quadro Cap.13-15: non in scope
  di N2, rimangono N4/N6 come da tabella §9.

**Criteri di accettazione §10 chiusi da N2** (verificati TRUE uno per
uno, non "il codice sembra corretto"): righe 2-6 della lista (svuotamento
automatico di `incarico_chiuso_ts`, eleggibilita' del bottone Archivia,
bottone Cestino su qualunque card con conferma leggera, `moveJobToSheet_`
sotto lock/idempotente, Ripristina con fallback backlog). Le righe
restanti (cancellazione vera solo con Elimina definitivamente/Svuota
cestino, Cestino mai letto da metriche, trigger, viste, Duplica,
"lavoro presente" + Andamento del carico estesi all'archivio) restano
aperte per N3-N6, come da tabella §9 — nessuna sorpresa, previsto dal
piano.

## N1 (archiviazione) — CHIUSA, gate confermato da Marco (2026-08-18)

Sessione autonoma (scheduled task, RUNBOOK_esecuzione_autonoma.md) su
`feat/n1-archiviazione-schema`, a partire da lavoro di sotto-fase N1
già presente non committato nel working tree. Riferimento:
[docs/DESIGN_archiviazione.md](docs/DESIGN_archiviazione.md), §9 (N1),
§10 (criteri), §8b.

**Codice N1 (già presente + completato in questa sessione)**:
- Schema additivo (Schema.gs/Constants.gs): fogli `jobs_archivio`
  (`JOB_HEADERS` + `archiviato_ts`), `visite_archivio`
  (`VISITE_HEADERS` invariata), `jobs_cestino` (`JOB_HEADERS` +
  `cestinato_ts`), `visite_cestino` (`VISITE_HEADERS` invariata),
  creati da `setupSigmaFlow()`. Config: `archiviazione_giorni_default`
  (default 30). `SCHEMA_VERSION` 12→13.
- §8b — `incarico_chiuso_ts` correggibile via Cronologia: ricognizione
  confermata che il tipo evento `correction` esisteva già
  strutturalmente (richiede `reason`) ma il menu tipo-evento in UI era
  stato ridotto a "Spostamento"/"Nota" — opzione "Correzione"
  ripristinata in `board.html`. Whitelist esplicita
  `SIGMAFLOW.CORRECTABLE_FIELDS = ['arrival_ts', 'incarico_chiuso_ts']`
  (Constants.gs); `validateSequence_`/`checkStructuralAlignment_`
  (ActivityLog.gs) validano campo+data (`CAMPO_NON_CORREGGIBILE`/
  `DATA_NON_VALIDA`) e applicano la correzione a `jobs` tramite lo
  stesso percorso `applyStructuralAlignment_` già usato dai warning dei
  `move` — nessuna via di scrittura parallela. Form di Cronologia
  (`client.html`) esteso con i campi Campo/Nuovo valore/Motivo.

**Test aggiunti** (`Tests.gs`, harness Node): `testSetupSchemaCreaFogliArchivioECestino`,
`testSetupSchemaSeedaArchiviazioneGiorniDefault`,
`testAddActivityEventCorrectionArrivalTsValida`,
`testAddActivityEventCorrectionIncaricoChiusoTsValida`,
`testAddActivityEventCorrectionCampoNonCorreggibile`,
`testAddActivityEventCorrectionDataNonValida`. **87/87 test passati
nell'harness Node** (81 preesistenti + 6 nuovi, nessuna regressione).

**Push su TEST — inizialmente bloccato, poi risolto nella stessa
sessione**: il primo `clasp push` era fallito con
`invalid_grant`/`invalid_rapt` (token OAuth scaduto). Su richiesta
esplicita di Marco ("run clasp login") ho eseguito `clasp login`: ha
riconosciuto una sessione già valida (`You are logged in as
marco@sigmapiu.it`) e rigenerato il token — nessuna credenziale
gestita da me, solo l'esecuzione del comando. Push riuscito da quel
momento in poi. **Ogni push di questa sessione è stato verificato con
`clasp pull` isolato in `/tmp/sf-scratch/clasp-verify/` + diff contro
`apps-script/src/`: sempre 13/13 file identici, 0 differenze.**

**Collaudo reale su GAS (Marco) — due problemi trovati e corretti,
non solo cosmetici**:

1. **UI poco chiara**: l'opzione "Correzione" nel menu tipo-evento non
   spiegava cosa correggesse. Marco l'aveva scambiata per un residuo
   da rimuovere. Corretto: etichette senza nomi tecnici
   (`arrival_ts`/`incarico_chiuso_ts`) e una riga esplicativa nel form
   (`board.html`) — "corregge solo data di creazione o chiusura
   incarico, non sposta la card".
2. **Bug reale trovato da Marco durante `runAllTestsAndLog` su GAS
   reale**, non riproducibile nell'harness Node (sincrono per
   costruzione): `testEseguiMigrazioneCompletaEndToEndOnOldSchemaData`
   falliva con `Sheet <gid> not found`. Causa vera, non un hiccup di
   servizio come ipotizzato al primo tentativo: `setupSigmaFlow()` apre
   un proprio riferimento indipendente allo spreadsheet
   (`getSpreadsheet_()`), separato da qualunque riferimento `ss` che il
   chiamante teneva già in mano da prima. Finché `setupSigmaFlow`
   toccava poco lo schema il riferimento vecchio del chiamante restava
   comunque valido; con N1 (cancella `cases` e crea cinque fogli nuovi
   nella stessa chiamata) il riferimento vecchio può restare agganciato
   a una struttura non più valida. Corretto in due punti — dentro
   `eseguiMigrazioneCompleta_` (ActivityLog.gs) e nei tre test che
   tengono un `ss` esterno da riusare dopo aver chiamato
   `setupSigmaFlow()`/`eseguiMigrazioneCompleta_()` (Tests.gs) —
   riaprendo esplicitamente `ss = SpreadsheetApp.openById(ss.getId())`
   dopo la chiamata. Aggiunto anche `SpreadsheetApp.flush()` in
   `setupSigmaFlow` subito dopo la cancellazione di `cases`, difesa
   aggiuntiva sullo stesso tipo di rischio ma sul riferimento interno.
   **Verificato da Marco**: il test rilanciato singolarmente su GAS
   reale ora passa pulito, due volte di seguito.
3. **Fix minore collegato**: `runAllTestsAndLog` scriveva un solo
   `Logger.log` con l'intero risultato JSON — superava il limite di
   dimensione di un log nell'editor e troncava proprio a metà dei
   falliti (il problema che ha reso necessari più giri per isolare il
   bug sopra). Ora tre log separati (riepilogo, falliti in dettaglio,
   nomi dei passati), nessuno rischia più il troncamento.

**Nota per le sessioni future**: Marco non rilancia l'intera suite
`runAllTestsAndLog` su GAS reale come verifica di routine (20+ minuti,
latenza fissa delle chiamate Sheets per ciascuno degli 87 test) — lo fa
solo su richiesta mirata a un singolo test o a un numero ridotto.
L'harness Node resta la verifica di routine (sub-secondo, 87/87 ad ogni
fix di questa sessione). Salvato in memoria
(`feedback_gas_test_suite_time.md`) per non richiederlo di nuovo per
abitudine.

Commit su `feat/n1-archiviazione-schema` (locale, non unito a `main`):
`aa8f486`, `5eda886`, `0d519a1`, `3dd33a3`, `d448ebc`, `d13f8e0`,
`4886929`.

**I quattro punti della Definition of Done (RUNBOOK) sono soddisfatti**:
criteri di accettazione N1 verificati (incluso il giudizio esplicito di
Marco sullo schema, "ok"), 87/87 test nell'harness senza regressioni +
il test problematico su GAS reale confermato pulito da Marco dopo il
fix, push TEST verificato 0 differenze ad ogni commit, questo
aggiornamento.

**Fuori scope di N1, per §9 del design**: §8c (svuotamento automatico
di `incarico_chiuso_ts` su rientro reale) è N2, non N1 — non toccato
qui nonostante compaia nello stesso documento.

**Aperto, non bloccante, da riprendere eventualmente in una sessione
UI dedicata**: se dare a "Correzione" un punto di ingresso dedicato
(icona accanto alla spunta "Chiuso" e alla data di creazione) invece
del menu generico attuale — proposto a Marco durante il collaudo N1,
nessuna decisione presa. Non è un criterio di accettazione di N1 (§10
non lo richiede) e non blocca N2+: `moveJobToSheet_`/`archiveJob_`/
`cestinaJob_` non toccano questo form.

**Gate 🔴 Umano di §9, dopo N1 — CONFERMATO da Marco il 2026-08-18**
("per me lo sviluppo è ok, N1 lo dichiaro chiuso"). N1 è chiusa a
tutti gli effetti.

## Prossima esecuzione — nessun programma attivo

Sia il programma di archiviazione (N1-N6, `docs/DESIGN_archiviazione.md`)
sia quello di backup PROD (N-B1-N-B3, `docs/DESIGN_backup.md`) sono
**completi**: tutte le sotto-fasi DONE, tutti i criteri di accettazione
verificati TRUE (vedi sezioni sopra), tutti i gate umani confermati da
Marco. Il lavoro vive su `feat/n1-archiviazione-schema`, non ancora
unito a `main` — decisione di Marco quando/se aprire la pull request.
Il trigger di backup (ore 2) e quello di archiviazione (ore 3) sono
entrambi attivi su TEST, indipendenti l'uno dall'altro.

Una prossima sessione riparte da una richiesta esplicita di Marco
(manutenzione ordinaria) o da un nuovo documento `DESIGN_*.md`, come da
`CLAUDE.md`.

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
- **Buco trovato da Marco il 2026-08-19, non affrontato (esplicitamente
  fuori scope della sessione archiviazione/backup)**: modificare la
  Cronologia a mano (tab Cronologia, `addActivityEvent`/
  `updateActivityEvent`, Kanban.gs) non aggiorna lo stato derivato
  del caso. Verificato nel codice, non solo osservato: `checkStructuralAlignment_`/
  `applyStructuralAlignment_`/`alignOpenVisitFields_` allineano **solo**
  i campi di data (`start_ts`/`done_ts`/`incarico_ts`/`prep_ts`/
  `arrival_ts`) sulla **visita già aperta** (`ensureOpenVisit_`) — mai
  `job.status` (la card non cambia colonna sulla board) e mai la
  creazione di una **nuova** riga `visite` per un vero rientro (quello
  — nuova visita, `numero_visita` incrementato — vive solo dentro
  `moveJob()`/`updateVisiteForMove_`, il percorso reale del
  drag-and-drop, mai richiamato da qui). Conseguenza pratica: un
  rientro (o un cambio di colonna) registrato a mano in Cronologia
  resta visibile solo in `activity_log_json` — non sposta la card, non
  crea la visita corrispondente, e sparisce da tutte le metriche che
  leggono `visite` (rientri, tempi, capacità — quasi tutta la
  dashboard). Da decidere in una sessione dedicata: se questo è il
  comportamento voluto (Cronologia = solo racconto della storia, non
  fonte di verità per lo stato derivato) o se serve un meccanismo che,
  quando un evento 'move' in Cronologia rappresenta un rientro reale,
  ricalcoli anche `status` e crei la visita mancante — non banale,
  perché "rientro" non è "qualunque move" (regole di validazione come
  il divieto di rientro diretto in `wip` andrebbero rispettate anche
  fuori da un'interazione reale sulla board).

## Riferimenti tecnici correnti

- Design del modello caso/visita: [docs/DESIGN_modello_caso_visita.md](docs/DESIGN_modello_caso_visita.md)
- Architettura (schema fogli, backend, frontend): [docs/architecture.md](docs/architecture.md)
- Metriche dashboard: [docs/dashboard-metrics.md](docs/dashboard-metrics.md)
- Testing e sicurezza: [docs/testing-and-security.md](docs/testing-and-security.md)
- Setup Google Workspace: [docs/google-workspace-setup.md](docs/google-workspace-setup.md)
