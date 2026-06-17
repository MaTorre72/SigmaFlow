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
| `status` | `backlog`, `in_progress`, `stand_by`, `in_review`, `done` |
| `assignee` | Nome o email |
| `tag` | Etichetta libera |
| `size_class` | `XS`, `S`, `M`, `L`, `XL` |
| `size_points` | Valore derivato dalla taglia: `3`, `5`, `8`, `13`, `20` |
| `arrival_ts` | Ingresso nel sistema |
| `start_ts` | Inizio lavorazione |
| `done_ts` | Completamento |
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
| `column_backlog` | `Backlog` |
| `column_in_progress` | `In corso` |
| `column_stand_by` | `Stand-by` |
| `column_in_review` | `In review` |
| `column_done` | `Fatto` |

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
- `markRework`
- `getMetrics`

Il rework automatico viene marcato quando un job gia' iniziato esce da `stand_by`: `visit_number` aumenta, `is_rework` diventa `TRUE` e `rework_cause` viene impostata a `stand_by_return` se non era gia' presente.

## Frontend

`index.html` carica la shell. `board.html` e `dashboard.html` sono inclusi tramite template Apps Script. `client.html` contiene JS vanilla che usa `google.script.run`.
