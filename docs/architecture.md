# Architettura SigmaFlow

## Principi

- Il dato canonico vive in Google Sheets.
- Apps Script espone funzioni backend e serve l'interfaccia HTML.
- Il frontend non conserva stato persistente nel browser.
- Le formule del modello sono isolate in funzioni pure dove possibile.
- Gli errori backend restituiscono sempre oggetti JSON coerenti.

## Fogli database

### `jobs`

| Campo | Note |
| --- | --- |
| `job_id` | ID univoco del job |
| `case_id` | Caso o iniziativa collegata |
| `visit_number` | 1 per prima visita, maggiore di 1 per rework |
| `title` | Titolo operativo |
| `client` | Cliente visibile sulla card |
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
| `arrival_ts` | Ingresso nel sistema |
| `start_ts` | Inizio lavorazione |
| `done_ts` | Completamento |
| `invoiced` | Booleano, rilevante sui job conclusi |
| `service_time_d` | Giorni di lavorazione |
| `lead_time_d` | Giorni da arrivo a completamento |
| `wait_time_d` | Giorni da arrivo a inizio |
| `is_rework` | Booleano |
| `rework_cause` | Causa del rientro |
| `notes` | Note |

### `cases`

| Campo | Note |
| --- | --- |
| `case_id` | ID univoco caso |
| `title` | Titolo iniziativa |
| `client` | Cliente |
| `total_visits` | Numero visite collegate |
| `is_open` | Caso aperto |
| `created_ts` | Apertura |
| `closed_ts` | Chiusura |

### `config`

| Chiave | Default |
| --- | --- |
| `team_size` | `4` |
| `observation_window_days` | `30` |
| `size_XS_days` | `0.5` |
| `size_S_days` | `1` |
| `size_M_days` | `2` |
| `size_L_days` | `4` |
| `size_XL_days` | `8` |
| `columns_json` | Configurazione dinamica colonne: `id`, `label`, `role`, `order`, `color` |
| `assignees_json` | Assegnatari suggeriti per dropdown |
| `tags_json` | Tag suggeriti per dropdown, default `AIA`, `ADR`, `VIA`, `rifiuti`, `acque`, `aria`, `suolo`, `rumore` |

Le colonne sono configurabili dalla Web App. Il campo `role` determina il comportamento modellistico:

- `backlog`: ingresso del flusso;
- `wip`: lavoro attivo;
- `stand_by`: attesa, anche multipla;
- `done`: completamento;
- `neutral`: colonna senza ruolo modellistico speciale.

Configurazione colonne default:

| ID | Label | Ruolo |
| --- | --- | --- |
| `notes` | `NOTE` | `neutral` |
| `backlog` | `BACKLOG` | `backlog` |
| `todo` | `TO DO` | `wip` |
| `wip` | `WIP` | `wip` |
| `wait_client` | `ATTESA CLIENTE` | `stand_by` |
| `wait_authority` | `ATTESA ENTI` | `stand_by` |
| `wait_internal` | `ATTESA MT/GC` | `stand_by` |
| `done` | `DA INVIARE / DA FATTURARE` | `done` |

## Backend

`Kanban.gs` contiene routing, setup e operazioni CRUD. `Model.gs` contiene calcolo metriche e funzioni matematiche pure.

Azioni `doPost` previste:

- `getBoard`
- `addCase`
- `addJob`
- `moveJob`
- `updateJob`
- `deleteJob`
- `updateColumnLabel`
- `addColumn`
- `updateColumn`
- `moveColumn`
- `markRework`
- `getMetrics`

Il rework automatico viene marcato quando un job esce da una colonna con ruolo `stand_by` verso una colonna `wip` o `backlog`: `visit_number` aumenta, `is_rework` diventa `TRUE`, `rework_cause` diventa l'ID della colonna sorgente e `start_ts` riparte dal momento del rientro.

## Frontend

`index.html` carica la shell. `board.html` e `dashboard.html` sono inclusi tramite template Apps Script. `client.html` contiene JS vanilla che usa `google.script.run`.
