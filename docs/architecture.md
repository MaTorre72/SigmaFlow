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
| `status` | `backlog`, `in_progress`, `in_review`, `done`, `blocked` |
| `assignee` | Nome o email |
| `tag` | Etichetta libera |
| `size_class` | `S`, `M`, `L`, `XL` |
| `size_points` | Valore derivato dalla taglia |
| `arrival_ts` | Ingresso nel sistema |
| `start_ts` | Inizio lavorazione |
| `done_ts` | Completamento |
| `service_time_h` | Ore di lavorazione |
| `lead_time_h` | Ore da arrivo a completamento |
| `wait_time_h` | Ore da arrivo a inizio |
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
| `capacity_hours_day` | `6` |
| `team_size` | `4` |
| `observation_window_days` | `30` |
| `size_S_hours` | `2` |
| `size_M_hours` | `6` |
| `size_L_hours` | `16` |
| `size_XL_hours` | `40` |

## Backend

`Kanban.gs` contiene routing, setup e operazioni CRUD. `Model.gs` contiene calcolo metriche e funzioni matematiche pure.

Azioni `doPost` previste:

- `getBoard`
- `addCase`
- `addJob`
- `moveJob`
- `updateJob`
- `deleteJob`
- `markRework`
- `getMetrics`

## Frontend

`index.html` carica la shell. `board.html` e `dashboard.html` sono inclusi tramite template Apps Script. `client.html` contiene JS vanilla che usa `google.script.run`.
