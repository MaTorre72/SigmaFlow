# Preparazione del merge e del passaggio a PROD — SigmaFlow

Data: 1 novembre 2026. Documento per Marco: nessun comando di questa procedura è stato eseguito su main o su PROD. Lettura PROD limitata al foglio config. La pull request, il merge e il deployment pubblico spettano a Marco.

## 1. Stato del branch e perimetro

Branch: codex/riga-flusso-attivo. Main locale: 74afcda, obsoleto rispetto a origin/main e10344c (PR #23). È stato aggiornato solo origin/main con fetch; main non è stato modificato.

I commit 3eea235 e ca1bcb8 sono già antenati del branch e di origin/main, insieme alla successiva precisazione c030da0: nessun cherry-pick e nessun conflitto.

La simulazione git merge-tree --write-tree --messages origin/main HEAD non segnala conflitti. Con main locale il branch ne contiene tutta la storia. Il controllo va ripetuto se origin/main cambia.

Commit rispetto a origin/main, prima del commit B che contiene questo documento:

~~~text
cd101df Mostra flusso attivo e consegne nello Stato del flusso
38ab29d Chiarisce le spiegazioni dello Stato del flusso
5a48b1e Uniforma il vocabolario visibile della dashboard
2f76049 Completa il vocabolario approvato di diagnostica e vista legacy
75ff5fb Allinea le metriche documentate al vocabolario della dashboard
~~~

A questi si aggiunge il commit «Rinomina la spunta Fatturato e prepara il merge», che contiene questo documento, la parte B e l'aggiornamento di PROGRAMMA_STATO.md. Il suo hash si legge con git log -1; non viene incorporato nel file che lo genera.

Commit rispetto al main locale, inclusa la storia già pubblicata con le PR #22 e #23:

~~~text
476f8ba docs: archivia documenti di fasi chiuse in docs/storico/
8fb4116 feat: completa baseline dashboard V5 fino alla fase 4
655e351 feat: separa WIP nuovo e rework nel CFD
501d43a feat: aggiunge periodi e risoluzioni al CFD
6ebc5fe feat: aggiunge zoom pan e sottointervalli al CFD
f00070e feat: aggiunge focus visivo alle serie CFD
cf770ac feat: aggiunge misura orizzontale al CFD
45b5eb1 feat: aggiunge rate lines al CFD
21e2c48 feat: aggiunge confronti sincronizzati al CFD
008ff21 refactor: rimuove istogrammi legacy dal CFD
aa460b8 test: valida riconciliazione V2 finale
75c4256 test: valida stato e taratura V5
1e6f049 test: valida tempi osservati V5
a3597df test: valida requisiti CFD integrati
a9be68b test: completa collaudo finale desktop e mobile
5d08ebc fix: chiarisce ritmo e alleggerisce interazioni CFD
322255c test: impedisce finestra recente hardcoded
05c97ef docs: registra collaudo correzioni stato e CFD
cc12f09 fix: consente quota libera nella misura CFD
6a8e9d4 feat: usa settimane ISO complete per metriche recenti
5eca994 feat: espone turnover episodi WIP nel backend
eca8fe0 feat: suggerisce taratura su storico affidabile
45fc118 feat: suggerisce WIP via Little su episodi chiusi
7b612d8 feat: organizza diagnostica e taratura Fase 7
36ca99b feat: semplifica stato del flusso e chiarisce riferimento consegne
2c76363 test: chiude gate Fase 7 sul TEST
0dd2c71 feat(v5): harden calibration and record TEST approval
3eea235 docs: riorganizza le metriche e separa definizioni correnti e legacy
ca1bcb8 docs: chiarisce le metriche e rinomina gli incarichi fatturati
c030da0 docs: allinea gli incarichi chiusi alla spunta dell'interfaccia
cd101df Mostra flusso attivo e consegne nello Stato del flusso
38ab29d Chiarisce le spiegazioni dello Stato del flusso
5a48b1e Uniforma il vocabolario visibile della dashboard
2f76049 Completa il vocabolario approvato di diagnostica e vista legacy
75ff5fb Allinea le metriche documentate al vocabolario della dashboard
~~~

Diff finale preparato rispetto a main locale (equivalente al diff main...HEAD dopo il commit B, perché main è antenato):

~~~text
CLAUDE.md                                          |    9 +
 .../PREPARAZIONE_MERGE_FLUSSO_ATTIVO_2026-11-01.md |  329 ++++
 PROGRAMMA_STATO.md                                 | 1092 ++++++++++-
 apps-script/src/ActivityLog.gs                     |   99 +-
 apps-script/src/Constants.gs                       |   18 +-
 apps-script/src/DashboardV2.gs                     | 1626 ++++++++++++++++
 apps-script/src/Kanban.gs                          |   53 +
 apps-script/src/Model.gs                           |   35 +-
 apps-script/src/Schema.gs                          |   12 +
 apps-script/src/Tests.gs                           | 1110 ++++++++++-
 apps-script/src/Utils.gs                           |    6 +-
 apps-script/src/archivio.html                      |    2 +-
 apps-script/src/board.html                         |    8 +-
 apps-script/src/client.html                        | 1056 ++++++++++-
 apps-script/src/dashboard.html                     |  198 +-
 apps-script/src/index.html                         |    4 +-
 apps-script/src/style.html                         |  247 +++
 apps-script/test-harness/gas-harness.js            |   11 +-
 apps-script/test-harness/run-tests.js              |    9 +
 .../test-harness/verify-dashboard-vocabulary.js    |   55 +
 apps-script/test-harness/verify-flow-card.js       |   53 +
 .../test-harness/verify-invoiced-vocabulary.js     |   24 +
 apps-script/test-harness/verify-v2-snapshot.js     |  161 ++
 apps-script/test-harness/verify-v3-ui.js           |  184 ++
 docs/DESIGN_V5_revisione_nuova_dashboard.md        | 1956 ++++++++++++++++++++
 docs/architecture.md                               |   18 +
 docs/dashboard-metrics.md                          |  234 ++-
 docs/google-workspace-setup.md                     |    1 +
 docs/{ => storico}/DESIGN_dashboard.md             |    0
 docs/storico/DESIGN_faseV2_nuova_dashboard.md      | 1557 ++++++++++++++++
 docs/storico/DESIGN_faseV3_nuova_dashboard.md      | 1382 ++++++++++++++
 docs/storico/DESIGN_faseV4_fix_dashboard.md        |  159 ++
 docs/{ => storico}/DESIGN_fase_U.md                |    0
 docs/storico/NOTE_V2_diagnostica.md                |   55 +
 docs/storico/NOTE_V2_episodi_WIP.md                |   86 +
 docs/storico/NOTE_V2_flussi_CFD.md                 |   86 +
 docs/storico/NOTE_V2_storico.md                    |   61 +
 .../RICOGNIZIONE_tecnica_dashboard_Fase_V1.md      |  269 +++
 docs/storico/VALIDAZIONE_finale_V2.md              |   72 +
 ...VERIFICA_indipendente_dashboard_V3_confronto.md |  220 +++
 docs/testing-and-security.md                       |    7 +-
 41 files changed, 12500 insertions(+), 64 deletions(-)
~~~

Diff finale preparato rispetto a origin/main aggiornato (perimetro effettivo della PR):

~~~text
.../PREPARAZIONE_MERGE_FLUSSO_ATTIVO_2026-11-01.md | 329 +++++++++++++++++++++
 PROGRAMMA_STATO.md                                 |  32 +-
 apps-script/src/DashboardV2.gs                     |  64 +++-
 apps-script/src/Model.gs                           |   4 +-
 apps-script/src/Tests.gs                           |  54 ++++
 apps-script/src/archivio.html                      |   2 +-
 apps-script/src/board.html                         |   8 +-
 apps-script/src/client.html                        |  91 ++++--
 apps-script/src/dashboard.html                     |  34 +--
 apps-script/src/style.html                         |   3 +
 .../test-harness/verify-dashboard-vocabulary.js    |  55 ++++
 apps-script/test-harness/verify-flow-card.js       |  53 ++++
 .../test-harness/verify-invoiced-vocabulary.js     |  24 ++
 apps-script/test-harness/verify-v3-ui.js           |  14 +-
 docs/dashboard-metrics.md                          |  50 +++-
 15 files changed, 739 insertions(+), 78 deletions(-)
~~~

Per aggiornare l'evidenza dopo la chiusura:

~~~powershell
git log --oneline origin/main..HEAD
git diff --stat main...HEAD
git diff --stat origin/main...HEAD
git merge-tree --write-tree --messages origin/main HEAD
~~~

Il branch contiene le dipendenze della card Stato del flusso: flusso attivo e componenti dal backend, stato basato sulle uscite WIP, riferimento mediano già ricostruito, consegne separate, soglia accanto alla riga giusta, testi e test. Le funzioni operative sono incluse; non dipendono dalle modifiche locali escluse. La suite viene eseguita su una copia del solo contenuto committabile.

Restano fuori di proposito: dashboardV8Conclusions_, stima delle conclusioni definitive e card v8-conclusions, nuovi drill-down delle conclusioni, modifica locale del CFD, min_samples_final_closures nelle costanti e nello schema, aggiunte locali al documento DESIGN_V5_revisione_nuova_dashboard.md e la nota locale V8 del 5 ottobre in PROGRAMMA_STATO.md. Il CFD V5 e i parametri già presenti in origin/main non vengono rimossi: sono esclusi soltanto i delta locali non committati.

### Parte B: inventario delle diciture

| File:riga nel branch di partenza | Prima | Dopo / decisione |
|---|---|---|
| board.html:129 | Chiuso, spunta modal-invoiced | Fatturato |
| board.html:148 | Correzione data (creazione o chiusura) | Correzione data (creazione o fatturazione) |
| board.html:165 | data di creazione o di chiusura dell'incarico | data di creazione o di fatturazione dell'incarico |
| board.html:169 | Data chiusura incarico | Data fatturazione incarico |
| client.html:1233 | Chiusura incarico (incarico_chiuso_ts) | Fatturazione incarico (incarico_chiuso_ts) |
| archivio.html:13 | Chiusura incarico, colonna del campo incarico_chiuso_ts | Fatturazione incarico |
| client.html:3366 | Consegne non ancora chiuse, conteggio senza incarico_chiuso_ts | Consegne non ancora fatturate: applicazione della nuova decisione ai risultati della spunta |
| dashboard.html/client.html del branch | Card Incarichi conclusi e bottone Apri incarichi conclusi della finestra | Assenti: non si importano le versioni locali non committate e non si inventa una card |

### Dubbi e diciture lasciate invariate

- board.html:248 e client.html:42, «Concluso»: nome del ruolo done nelle impostazioni delle colonne, non della spunta. Non è stato rinominato Fatturato, perché equiparerebbe consegna e fatturazione.
- client.html:3285, «Concluso, non ancora fatturato», e Model.gs:858, «Lavori conclusi ma non ancora fatturati»: descrivono il ruolo done con invoiced falso; il primo termine non significa chiusura definitiva. Restano fuori da questa rinomina.
- archivio.html:3, «Casi chiusi e archiviati», e cestino.html:3, «Card senza una chiusura vera»: le azioni manuali non garantiscono da sole lo stato della spunta; non si sostituisce il testo con Fatturato senza una decisione esplicita.
- La documentazione conserva la proiezione di regime e min_samples_final_closures della revisione locale, dichiarata come tale. Questa funzionalità e la sua card non entrano nel merge: il nuovo nome della misura non ne introduce il calcolo.
- Il Tasso di consegna usa visite con consegna_ts: non ogni transizione ripetuta verso done genera una nuova consegna nella stessa visita. La nota tecnica conserva questa definizione; il conteggio non è stato modificato.

### Verifica della parte A e riferimenti documentali

119 elementi tra apici inversi prima/dopo, stesse occorrenze; 81 numeri prima/dopo, stesse occorrenze. Insiemi aggiunti e rimossi: vuoti. La tabella dei termini non introduce identificatori o numeri.

Ricerca di citazioni con numeri di riga verso dashboard-metrics.md: nessuna trovata nel branch o nei file locali ispezionati. Riferimenti generici, non modificati:

~~~text
HEAD:CLAUDE.md:195:   `DESIGN_backup.md`, `dashboard-metrics.md`, `testing-and-security.md`)
HEAD:CLAUDE.md:217:- Metriche dashboard: `docs/dashboard-metrics.md`
HEAD:PROGRAMMA_STATO.md:5664:- Metriche dashboard: [docs/dashboard-metrics.md](docs/dashboard-metrics.md)
HEAD:README.md:34:    dashboard-metrics.md
HEAD:docs/DESIGN_R_S.md:46:**In chiusura**: `docs/dashboard-metrics.md` (Area 6) e una nota
HEAD:docs/DESIGN_R_S.md:516:`docs/dashboard-metrics.md` è fermo a prima della Fase M e non
HEAD:docs/DESIGN_R_S.md:637:| Chiusura | `docs/dashboard-metrics.md` aggiornato | 6 | Da fare |
HEAD:docs/DESIGN_R_S.md:685:- [ ] Chiusura: `docs/dashboard-metrics.md` aggiornato con tutte le
HEAD:docs/DESIGN_archiviazione.md:237:  `dashboard-metrics.md` — e l'intero quadro di dettaglio Cap. 13-15,
HEAD:docs/architecture.md:184:`visite`, non da campi su `jobs` — vedi [dashboard-metrics.md](dashboard-metrics.md).
HEAD:docs/storico/DESIGN_faseV4_fix_dashboard.md:108:1. Confermare se `visite` viene ricalcolato ad ogni `moveJob`/evento, oppure solo in occasioni specifiche (migrazione, trigger periodico). Se il comportamento è per design (`visite` come snapshot periodico, non live), documentarlo esplicitamente da qualche parte visibile (`docs/architecture.md` o `docs/dashboard-metrics.md`) così non genera più falsi allarmi in verifiche future.
~~~

Nella copia locale esistono inoltre riferimenti non committati in DESIGN_V5_revisione_nuova_dashboard.md:1967 e i prompt in Claude outputs; anch'essi non sono stati modificati.

## 2. Configurazione PROD e comportamento dei default

Sono stati letti in sola lettura i valori correnti del foglio config di SigmaFlow Database, ID 15XQwfbTLH4wv8IOzhzIyhpATZY-9KmXoorhD4mpZk4g, il 01/11/2026. Tutte le 32 chiavi previste da DEFAULT_CONFIG sono già presenti. Chiavi obbligatorie da aggiungere prima del deployment: nessuna, nello stato letto. Le letture dirette config.* non individuano altre chiavi prive di default. Sono coperti anche gli accessi dinamici size_<taglia>_days e column_<id>, più gli oggetti delle colonne.

readConfig_ copia i default solo quando la riga manca. Una riga presente ma vuota rimane vuota: non equivale all'assenza. I default non sono un'autorizzazione a cambiare la configurazione già approvata.

| Chiave letta | Default se manca la riga | Valore PROD letto il 01/11/2026 | Se manca |
|---|---|---|---|
| team_size | 4 | 3 | Il codice usa il default indicato; nessuna aggiunta obbligatoria. |
| observation_window_days | 30 | 90 | Il codice usa il default indicato; nessuna aggiunta obbligatoria. |
| wip_trend_weeks | 26 | 52 | Sì: default operativo; deve coprire almeno capacity_window_weeks. |
| capacity_window_weeks | 8 | 8 | Sì: default operativo; deve essere intero positivo. |
| history_reliable_from | vuoto | 04/05/2026 | Il codice gira e considera la prima evidenza disponibile, senza limite affidabile esplicito. Una data invalida esclude le finestre di taratura. |
| min_samples_capacity | 5 | 3 | Sì: default operativo, minimo campionario delle consegne; non nasconde zero uscite WIP. |
| wip_target_min_jobs | vuoto | 3 | Il codice gira con Dati insufficienti: fascia non configurata. |
| wip_target_max_jobs | vuoto | 6 | Il codice gira con Dati insufficienti: fascia non configurata. |
| flow_reference_points_per_week | vuoto | 6 | Il codice gira: riferimento consegne legacy non configurato; non sostituisce la mediana WIP. |
| flow_reference_completions_per_week | vuoto | 0,7 | Il codice gira: riferimento consegne legacy non configurato. |
| flow_slow_ratio | vuoto | 0,4 | Il codice gira, ma il confronto operativo manca: nessuna soglia inventata. |
| calibration_date | vuoto | 16/09/2026 | Il codice usa il default indicato; nessuna aggiunta obbligatoria. |
| calibration_version | vuoto | 2 | Il codice usa il default indicato; nessuna aggiunta obbligatoria. |
| calibration_note | vuoto | Taratura provvisoria sui dati di consegna | Il codice usa il default indicato; nessuna aggiunta obbligatoria. |
| archiviazione_giorni_default | 30 | 30 | Il codice usa il default indicato; nessuna aggiunta obbligatoria. |
| backup_retention_giorni | 14 | 14 | Il codice usa il default indicato; nessuna aggiunta obbligatoria. |
| theoretical_capacity_per_day | vuoto | vuoto | Capacità teorica non configurata; non blocca il resto. |
| size_XS_days | 0.5 | 7 | Il codice usa il default indicato; nessuna aggiunta obbligatoria. |
| size_S_days | 1 | 14 | Il codice usa il default indicato; nessuna aggiunta obbligatoria. |
| size_M_days | 2 | 30 | Il codice usa il default indicato; nessuna aggiunta obbligatoria. |
| size_L_days | 4 | 60 | Il codice usa il default indicato; nessuna aggiunta obbligatoria. |
| size_XL_days | 8 | 120 | Il codice usa il default indicato; nessuna aggiunta obbligatoria. |
| columns_json | vuoto | presente: 8 colonne; WIP unico, done «DA INVIARE / DA FATTURARE» | Il codice usa DEFAULT_COLUMNS; nessun nome personalizzato viene inventato. |
| assignees_json | "[\"Alessandra\",\"Giovanni D\",\"Marco\",\"Altro\"]" | ["Alessandra","Giovanni D","Marco","Esterno","Luca G.","Sabrina"] | Il codice usa il default indicato; nessuna aggiunta obbligatoria. |
| ambassadors_json | "[]" | ["Giovanni","Marco","Sabrina","Ilaria"] | Il codice usa il default indicato; nessuna aggiunta obbligatoria. |
| tags_json | "[\"AIA\",\"ADR\",\"VIA\",\"rifiuti\",\"acque\",\"aria\",\"suolo\",\"rumore\"]" | ["AIA","ADR","VIA","rifiuti","acque","aria","suolo","rumore","TRS","RAEE","AUA"] | Il codice usa il default indicato; nessuna aggiunta obbligatoria. |
| scenarios_json | vuoto | JSON presente nel foglio | Il codice usa gli scenari predefiniti. |
| column_backlog | "Backlog" | Backlog | Il codice usa il default indicato; nessuna aggiunta obbligatoria. |
| column_in_progress | "In corso" | In corso | Il codice usa il default indicato; nessuna aggiunta obbligatoria. |
| column_stand_by | "Stand-by" | Stand-by | Il codice usa il default indicato; nessuna aggiunta obbligatoria. |
| column_in_review | "In review" | In review | Il codice usa il default indicato; nessuna aggiunta obbligatoria. |
| column_done | "Fatto" | Fatto | Il codice usa il default indicato; nessuna aggiunta obbligatoria. |

Per la card sono particolarmente rilevanti: capacity_window_weeks=8; wip_trend_weeks=52; min_samples_capacity=3; flow_slow_ratio=0,4; fascia 3–6; history_reliable_from=04/05/2026. Tutti già presenti. Il codice richiede che i primi tre siano interi validi e che la profondità operativa copra la finestra. Senza fascia non inventa limiti; senza riferimento positivo mostra In osservazione. La data affidabile vuota non impone un limite storico, una data invalida esclude le finestre affidabili.

min_samples_final_closures non è un prerequisito di questo branch: è una modifica locale esclusa. Non aggiungerlo in PROD per questo merge. Le vecchie flow_reference_* restano parametri delle consegne e non vengono convertite in riferimento WIP.

## 3. Pubblicazione PROD: procedura documentata e limite

Fonti lette: CLAUDE.md; docs/google-workspace-setup.md, sezione 4; docs/testing-and-security.md, Ambienti e Go/no-go; README.md; apps-script/test-harness/push-and-verify.sh e verify-test-push.sh; configurazione locale .clasp.json.

Il progetto Apps Script configurato è 1RFY5lPPaDGoNjAvFximVqzMnihCP5Nso1nzsq70nDkMqiqikB7N1mDtq. Il repo documenta il deployment pubblico AKfycbxKZMfSDbFMI7vCQ1IaQ0wQdgrwBWE_FByTgPY6_2TxFlpmf1jXBzDb1M2ndSgDY4Db, annotato come @19: tale numero è un'annotazione del repo, non una verifica della versione attualmente pubblicata.

URL pubblico documentato:

https://script.google.com/a/macros/sigmapiu.it/s/AKfycbxKZMfSDbFMI7vCQ1IaQ0wQdgrwBWE_FByTgPY6_2TxFlpmf1jXBzDb1M2ndSgDY4Db/exec?env=prod

Il progetto contiene HEAD e deployment versionati. env=test seleziona il database TEST; env=prod seleziona PROD. Il push eseguito per questo lavoro aggiorna soltanto il codice HEAD usato dall'anteprima; non è stata pubblicata una versione del deployment pubblico.

Passi attestati dal repo per Marco:

1. Approvare il controllo TEST e la PR, poi eseguire personalmente il merge in GitHub. Nessuna di queste azioni è stata eseguita dall'agente.
2. Mettere al sicuro le modifiche locali come al punto 5 prima di aggiornare il checkout. Usare solo i sorgenti puliti del main risultante, non il workspace con le modifiche escluse.
3. Il repo fornisce node apps-script/test-harness/run-tests.js e bash apps-script/test-harness/push-and-verify.sh per test e verifica del codice HEAD. Non è documentato uno script di pubblicazione PROD. La copia locale di .clasp.json non è tracciata: Marco deve verificare il progetto prima di qualsiasi invio.
4. docs/google-workspace-setup.md documenta soltanto Deploy > New deployment, tipo Web app, esecuzione come Me, accesso al dominio Workspace, creazione e conservazione dell'URL. Questa è una creazione, non una procedura documentata per aggiornare il deployment esistente mantenendo lo stesso indirizzo.
5. Per mantenere lo stesso URL serve una procedura verificata per il deployment pubblico esistente. Non è descritta nei file del repo: questo documento non inventa comandi clasp deploy, ID di versione, opzioni della console o passaggi mancanti. Il punto resta da completare da Marco prima della pubblicazione. Non usare New deployment come se garantisse il mantenimento dell'indirizzo.

## 4. Controlli prima/dopo e rollback

Prima della pubblicazione Marco registra il deployment e la versione attualmente in uso; salva una lettura della card e della configurazione PROD senza modificare i dati. I valori cambiano con i lavori e con le settimane: non usare come numeri attesi quelli degli screenshot o del 28 ottobre.

Dopo la pubblicazione, sulla stessa URL pubblica:

- controllare lavori attivi e fascia configurata rispetto al foglio config;
- leggere la finestra dalle ultime N settimane ISO complete, con N=capacity_window_weeks; non includere la settimana in corso;
- riconciliare uscite WIP e punti con lo storico delle uscite, includendo attese e rientri; ogni uscita pesa con i punti dell'incarico;
- verificare prima lavorazione più rientri uguale al totale nei dati non arrotondati; eventuali differenze al centesimo nei valori mostrati restano dichiarate dal tooltip;
- confrontare lo stato con il solo flusso attivo in punti e con la soglia già esposta, non con la riga Tasso di consegna; fuori fascia ha precedenza; copertura assente e zero sono diversi;
- verificare consegne e punti sulla stessa finestra, campione minimo e distinzione dalla fatturazione; nessun numero delle consegne viene convertito in soglia WIP;
- controllare la nuova spunta Fatturato e le date di fatturazione su dati esistenti, senza creare fatture o cambiare spunte soltanto per il collaudo PROD;
- verificare che la card Incarichi fatturati non sia attesa in questo merge e che CFD, board e dettagli continuino a caricarsi.

Rollback: la procedura di ripubblicazione della versione precedente sullo stesso deployment non è documentata nel repo. Va verificata e predisposta da Marco prima del passaggio pubblico, insieme al numero della versione da ripristinare; non è stato inventato un comando operativo. Un semplice nuovo push HEAD non viene considerato un rollback della versione pubblicata. Le modifiche sono di codice/testo, non una migrazione dei dati; un eventuale ripristino di codice non implica ripristinare o sovrascrivere il database PROD.

## 5. Modifiche locali di Marco: salvataggio e riapplicazione

Non sono stati eseguiti stash, reset, pulizie o riapplicazioni sulla copia di Marco. Restano le modifiche non committate a PROGRAMMA_STATO.md, Constants.gs, DashboardV2.gs, Schema.gs, Tests.gs, client.html, dashboard.html, verify-v3-ui.js, DESIGN_V5_revisione_nuova_dashboard.md e gli altri file già non tracciati di Claude outputs. Il nuovo documento di questa sessione viene tracciato singolarmente; non si aggiunge tutta la cartella.

Comandi PowerShell per Marco, dal repository, PRIMA di qualsiasi pull o cambio di branch:

~~~powershell
Set-Location -LiteralPath 'C:/Users/Marco/Documents/SigmaFlow'
git status --short
git stash push --include-untracked -m "Marco: conclusioni CFD e documenti locali prima del merge flusso attivo"
$sigmaflowStash = git rev-parse "stash@{0}"
$sigmaflowStash
git stash show --stat --include-untracked $sigmaflowStash
git status --short
~~~

Conservare l'hash stampato anche fuori dal terminale. --include-untracked salva i file non tracciati, inclusi i vecchi prompt di Claude outputs. I file ignorati, come .clasp.json e le credenziali clasp, non vengono inclusi; non vengono spostati da questi comandi e non devono essere aggiunti al repository. Se occorrono altre copie di file ignorati, Marco le prepara separatamente in una cartella privata.

Prima di aprire la PR, se il branch remoto non è già stato pubblicato, Marco può pubblicare i soli commit:

~~~powershell
git push -u origin codex/riga-flusso-attivo
~~~

Dopo il merge eseguito da Marco, con la copia locale pulita:

~~~powershell
git switch main
git pull --ff-only origin main
git switch -c codex/ripresa-modifiche-locali
git stash apply $sigmaflowStash
git status --short
~~~

Il nome del nuovo branch è un esempio: se esiste già, sceglierne uno libero. Si usa apply, non pop, per conservare la copia nello stash finché la riapplicazione non è stata controllata. Se compaiono conflitti, l'hash dello stash resta recuperabile: esaminare git status e git diff --name-only --diff-filter=U, risolvere i file uno per volta e non usare reset --hard o clean. Dopo la suite e il controllo dei file non tracciati, Marco potrà rimuovere lo stash solo quando non serve più.

## 6. Bozza di pull request — pronta da incollare

Titolo: Mostra il flusso attivo e uniforma consegne e fatturazione nella dashboard

Descrizione:

La card Stato del flusso mostrava le consegne senza distinguere il ritmo delle uscite dal WIP e le sue componenti. Ora presenta Flusso attivo osservato, Prima lavorazione, Rientri e Tasso di consegna nella stessa finestra backend, con la soglia accanto ai punti del flusso attivo. La classificazione operativa usa il flusso WIP e il riferimento mediano; il contratto storico delle consegne rimane separato. Zero con copertura rimane zero.

Le spiegazioni leggono nomi delle colonne, finestre, percentuale e soglia dai dati. Il vocabolario usa consegne, rientri e lavori. La chiusura definitiva registrata dalla spunta si chiama Fatturato; campi e identificatori esistenti restano invariati. docs/dashboard-metrics.md include glossario e tabella dei termini precedenti, preservando tutti gli identificatori e i numeri.

Non sono incluse la card e la proiezione degli Incarichi fatturati, né le modifiche locali non committate a CFD, parametri, schema e design. Nessuna migrazione dati, cambio dei default, pubblicazione PROD o apertura automatica di PR. La preparazione del merge esplicita i limiti della procedura di deployment e rollback documentata nel repo.

Validazione: 261/261 test Apps Script e 57/57 controlli UI su copia isolata del contenuto committabile, con TZ=UTC per evitare due fixture legacy sensibili al cambio ora. Push TEST e pull isolato: esito riportato nella chiusura del documento. Verifica documentale: 119 elementi tra apici inversi e 81 numeri, stesse occorrenze prima/dopo. Le stringhe della spunta sono coperte da un nuovo test.

Come verificare: aprire il link HEAD TEST, leggere la tabella e le spiegazioni, aprire un lavoro e verificare Fatturato e le date collegate; verificare il dettaglio e l'archivio. I nomi Concluso del ruolo done e le diciture dubbie sono elencati sopra, non rinominati alla cieca. La card delle conclusioni non è parte del collaudo di questo merge.

Link TEST:

https://script.google.com/a/macros/sigmapiu.it/s/AKfycbzxoi0-mZWD4rRdcQ7fmEI241507eEa6bqJqvOrugg/dev?env=test

## Esito di chiusura

Test: 261/261; UI: 57/57. Push TEST e pull isolato: 17/17 file identici. Nessuna PR aperta, nessun merge eseguito, nessun deployment pubblico e nessuna scrittura dei dati PROD.
