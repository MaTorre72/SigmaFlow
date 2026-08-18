# Architettura SigmaFlow

## Principi

- Il dato canonico vive in Google Sheets.
- Apps Script espone funzioni backend e serve l'interfaccia HTML.
- Il frontend non conserva stato persistente nel browser.
- Le formule del modello sono isolate in funzioni pure dove possibile.
- Gli errori backend restituiscono sempre oggetti JSON coerenti.
- Modello caso/visita (design completo: [DESIGN_modello_caso_visita.md](DESIGN_modello_caso_visita.md)):
  un job rappresenta un caso, `job_id` è l'unico identificativo. Ogni
  ciclo di lavorazione (dall'ingresso in backlog/prep fino a un
  eventuale rientro) è una riga separata nel foglio `visite`.

## Fogli database

### `jobs`

| Campo | Note |
| --- | --- |
| `job_id` | ID univoco del job (= caso, 1:1) |
| `title` | Titolo operativo |
| `client` | Cliente visibile sulla card |
| `ambassador` | Referente/ambasciatore |
| `status` | ID della colonna board in cui si trova il job |
| `assignee` | Nome o email |
| `tag` | Etichetta libera |
| `size_class` | `XS`, `S`, `M`, `L`, `XL` |
| `size_points` | Valore derivato dalla taglia: `3`, `5`, `8`, `13`, `20` |
| `priority_class` | Classe priorita': `p4_assess`, `p1_plan`, `p2_urgent`, `p3_critical` |
| `priority_class_manual` | Booleano: priorita' scelta manualmente |
| `impact` | Impatto 1.0-5.0 |
| `manageability` | Gestibilita' 1.0-5.0 |
| `priority_score` | `sqrt(impact * manageability)`, arrotondato a 2 decimali |
| `description` | Descrizione operativa |
| `due_date` | Scadenza operativa in formato `yyyy-mm-dd` |
| `arrival_ts` | Primo arrivo del caso (apertura della visita 1) |
| `invoiced` | Booleano, casella "Chiuso" sulla card |
| `card_color` | Colore opzionale della fascia superiore della card (`#RRGGBB`) |
| `activity_log_json` | Cronologia eventi (move/correction), fonte per il ricalcolo di `from` |
| `incarico_chiuso_ts` | Chiusura manuale e definitiva dell'incarico, indipendente dai movimenti board |

### `visite`

Identità di riga: `job_id` + `numero_visita` (composta).

| Campo | Note |
| --- | --- |
| `job_id` | Riferimento al job/caso |
| `numero_visita` | 1 per la prima visita, incrementa a ogni rientro |
| `apertura_ts` | Apertura della visita |
| `incarico_ts` | Ingresso in una colonna di ruolo `backlog` |
| `prep_ts` | Ingresso in una colonna di ruolo `prep` |
| `start_ts` | Ingresso in una colonna di ruolo `wip` |
| `consegna_ts` | Primo ingresso in una colonna di ruolo `done`, entro questa visita (non la chiude) |
| `rientro_ts` | Chiusura della visita: rientro da `stand_by`/`done` verso `backlog`/`prep` |
| `rientro_da` | ID della colonna di provenienza al rientro |
| `t_cliente_d`, `t_ente_d`, `t_interno_d` | Accumulatori di giorni per tipo di attesa (`wait_client`/`wait_authority`/`wait_internal`), sommati a ogni uscita dalla colonna corrispondente |
| `rework_cause` | ID della colonna di provenienza del rientro che ha aperto QUESTA visita (vuoto sulla visita 1) |

`getBoard()`/`getMetrics()` non leggono `visite` riga per riga sul
frontend: `loadJobsWithVisitSummary_()` (Kanban.gs) ricalcola al volo,
dalla visita più recente di ogni job, i campi che il frontend si
aspetta ancora su `jobs` (`visit_number`, `is_rework`, `rework_cause`,
`start_ts`, `done_ts`) — nessuna scrittura duplicata, `visite` resta
l'unica fonte.

### `config`

| Chiave | Default |
| --- | --- |
| `team_size` | `4` |
| `observation_window_days` | `30` |
| `theoretical_capacity_per_day` | (vuoto) |
| `size_XS_days` | `0.5` |
| `size_S_days` | `1` |
| `size_M_days` | `2` |
| `size_L_days` | `4` |
| `size_XL_days` | `8` |
| `columns_json` | Configurazione dinamica colonne: `id`, `label`, `role`, `order`, `color`, `hidden` |
| `assignees_json` | Assegnatari dei menu, default `Alessandra`, `Giovanni D`, `Marco`, `Altro` |
| `ambassadors_json` | Ambasciatori dei menu |
| `tags_json` | Tag suggeriti per dropdown |
| `scenarios_json` | Scenari ottimistico/medio/pessimistico, predisposti ma non ancora usati per traiettorie future |
| `archiviazione_giorni_default` | Giorni dopo `incarico_chiuso_ts` oltre cui un caso è eleggibile all'archiviazione automatica (default `30`) — [DESIGN_archiviazione.md](DESIGN_archiviazione.md) |

Le colonne sono configurabili dalla Web App. Il campo `role` determina il comportamento modellistico:

- `backlog`: ingresso del flusso, apre `incarico_ts` sulla visita;
- `prep`: preparazione, apre `prep_ts`;
- `wip`: lavoro attivo, apre `start_ts`;
- `stand_by`: attesa, anche multipla — alimenta l'accumulatore di tipo e, se la si lascia verso `backlog`/`prep`, chiude la visita aprendone una nuova;
- `done`: completamento, apre `consegna_ts` senza chiudere la visita (un job "done" può ancora rientrare);
- `neutral`: colonna senza ruolo modellistico speciale (es. `NOTE`).

Il rientro diretto da `stand_by`/`done` alla colonna con ruolo `wip` è
vietato: deve passare prima da una colonna `prep`/`backlog` (dove si
apre la nuova visita).

La scala della priorita' automatica e' divisa uniformemente sull'intervallo 1-5: `1 <= valore < 2` non urgente, `2 <= valore < 3` da pianificare, `3 <= valore < 4` urgente con margine, `4 <= valore <= 5` urgente. Il menu segue sempre questo ordine crescente.

### `jobs_archivio` / `visite_archivio` / `jobs_cestino` / `visite_cestino`

Fogli additivi (N1, [DESIGN_archiviazione.md](DESIGN_archiviazione.md)
§3): destinazione fisica di un job + tutte le sue visite quando esce da
`jobs`/`visite`. Solo lo schema esiste ad oggi (creato da
`setupSigmaFlow()`) — nessuna funzione di spostamento riga ancora
scritta, arriva in N2.

- `jobs_archivio` — `jobs` (stesso `JOB_HEADERS`) + `archiviato_ts`.
  Solo chiusure vere (`incarico_chiuso_ts` valorizzato al momento
  dell'archiviazione).
- `visite_archivio` — stessa intestazione di `visite`, invariata.
- `jobs_cestino` — `jobs` (stesso `JOB_HEADERS`) + `cestinato_ts`.
  Qualunque card lasci la board senza una conclusione vera (compresa
  l'attuale `deleteJob`, che N2 riconverte a "sposta nel cestino").
- `visite_cestino` — stessa intestazione di `visite`, invariata.

Nessuna metrica legge mai il cestino. Le metriche storiche (non lo
stato corrente) leggono anche l'archivio quando la finestra osservata
può includerlo — dettaglio in [DESIGN_archiviazione.md](DESIGN_archiviazione.md) §8.

**Nota per chi tocca `setupSigmaFlow()` o scrive `moveJobToSheet_`
(N2)**: `setupSigmaFlow()` chiama `getSpreadsheet_()` internamente,
aprendo un riferimento allo spreadsheet indipendente da qualunque `ss`
che il chiamante tenga già in mano da prima. Con più cancellazioni/
creazioni di fogli nella stessa chiamata (com'è oggi, con
`jobs_archivio`/`visite_archivio`/`jobs_cestino`/`visite_cestino`), un
riferimento `ss` tenuto dal chiamante *da prima* della chiamata può
restare agganciato a una struttura non più valida — errore reale
`Sheet <gid> not found`, trovato in collaudo N1, non un semplice hiccup
del servizio. Rimedio: se il chiamante deve riusare `ss` *dopo* aver
chiamato `setupSigmaFlow()`, va riaperto esplicitamente
(`ss = SpreadsheetApp.openById(ss.getId())`) — vedi
`eseguiMigrazioneCompleta_` (ActivityLog.gs) per il pattern.
`moveJobToSheet_` (N2) sposterà righe fra `jobs`/`jobs_archivio`/
`jobs_cestino` nella stessa chiamata: stesso rischio, stesso rimedio se
tiene un riferimento allo spreadsheet attraverso una chiamata che
potrebbe restrutturare i fogli.

Configurazione colonne default:

| ID | Label | Ruolo |
| --- | --- | --- |
| `notes` | `NOTE` | `neutral` |
| `backlog` | `BACKLOG` | `backlog` |
| `todo` | `TO DO` | `prep` |
| `wip` | `WIP` | `wip` |
| `wait_client` | `ATTESA CLIENTE` | `stand_by` |
| `wait_authority` | `ATTESA ENTI` | `stand_by` |
| `wait_internal` | `ATTESA MT/GC` | `stand_by` |
| `done` | `DA INVIARE / DA FATTURARE` | `done` |

## Backend

`Kanban.gs` contiene routing, setup e operazioni CRUD sui job e sulle
visite. `Model.gs` contiene calcolo metriche e funzioni matematiche
pure. `ActivityLog.gs` contiene la Cronologia (eventi move/correction)
e le funzioni di migrazione storica.

`getMetrics` restituisce un oggetto `systemState`, articolato in:

- `dataQuality`
- `systemStatus`
- `flowMetrics`
- `reworkMetrics`
- `workloadMetrics`
- `timeMetrics`
- `capacityMetrics`
- `scenarioReadiness`

Le metriche di governo (tempi, rientri, capacità) sono calcolate da
`visite`, non da campi su `jobs` — vedi [dashboard-metrics.md](dashboard-metrics.md).
Il backend restituisce `null` quando un indicatore non e' stimabile. Il
frontend traduce il valore in una spiegazione leggibile e non lo
presenta come zero. Gli scenari ottimistico, medio e pessimistico sono
configurabili in `scenarios_json`, ma la simulazione resta disattivata
in questa fase.

Azioni `doPost`/`api()` previste (vedi `routeAction_` in Kanban.gs):

- `getBoard`
- `addJob`
- `moveJob`
- `updateJob`
- `deleteJob`
- `addActivityEvent`
- `getActivityLog`
- `updateActivityEvent`
- `deleteActivityEvent`
- `migrateToActivityLog` (solo ambiente TEST)
- `migrateVisiteFromHistory`
- `updateColumnLabel`
- `addColumn`
- `updateColumn`
- `moveColumn`
- `updateOptionList`
- `seedTestData` (solo ambiente TEST)
- `getMetrics`

## Frontend

`index.html` carica la shell. `board.html` e `dashboard.html` sono inclusi tramite template Apps Script. `client.html` contiene JS vanilla che usa `google.script.run`.

La scheda card salva tutti i campi con un'unica chiamata esplicita. Dopo la risposta del backend, la Board aggiorna il proprio stato locale senza eseguire un secondo caricamento completo.

Assegnatari e tag mantengono l'ordine salvato nel foglio `config`. Possono essere aggiunti e riordinati; una voce puo' essere eliminata soltanto quando nessuna card la usa. Taglie e classi di priorita' restano domini controllati per preservare la corrispondenza punti e le soglie del modello. Gli stati restano configurabili attraverso le colonne e i relativi ruoli.

La dashboard espone una vista rapida con indicatori di carico, capacita', rientri, stato e affidabilita'. La vista dettagliata mantiene tutte le metriche precedenti e aggiunge `pointsMetrics`: punti aperti, entrati e completati, serie mensile, distribuzione per taglia, colonna e assegnatario.

La Cronologia (tab card) mostra gli eventi di `activity_log_json`
(`from` ricalcolato a ogni lettura, mai fidandosi del valore salvato) e
permette correzioni manuali senza toccare direttamente `visite`: i
campi strutturati si riallineano in automatico alla visita aperta
corrente.
