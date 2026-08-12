# Claude Code — SigmaFlow: Activity Log — Prompt 1/2 (Backend)

## Contesto

Stai lavorando su **SigmaFlow**, sistema Kanban su Google Apps Script.
Questo prompt copre **solo il backend**. Il frontend viene in un prompt separato.

File rilevanti per questo task:
- `apps-script/Constants.gs` — `SIGMAFLOW`, `JOB_HEADERS`, costanti globali
- `apps-script/Kanban.gs` — `addJob`, `moveJob`, `routeAction_`, CRUD job
- `apps-script/Model.gs` — **non toccare in questo task**
- `apps-script/Tests.gs` — suite test (17 test esistenti, da estendere)

---

## Ricognizione obbligatoria prima di scrivere codice

1. Leggi `Constants.gs`:
   - dove è definito `JOB_HEADERS` — array con tutte le colonne del foglio `jobs`
   - se `checklist_json`, `correction_log_json`, `activity_log_json` sono già presenti
   - posizione corrente di `correction_log_json` nell'array (se presente)

2. Leggi `Kanban.gs`:
   - firma completa di `moveJob` — in particolare dove scrive `is_rework`,
     `visit_number`, `rework_cause`
   - dove è definito `routeAction_` — per aggiungere le nuove route
   - se `correctJobTimestamps` è già nel router

3. Leggi `Tests.gs`:
   - struttura dei test esistenti (funzione di setup, formato risultato)
   - se esistono già test su `correctJobTimestamps`

4. Cerca in tutta la cartella `apps-script/` se esiste un file
   `ActivityLog.gs` o simile già creato.

**Non scrivere codice prima di completare la ricognizione.
Mostrami l'output della ricognizione e attendi conferma.**

---

## Obiettivo

Introdurre `activity_log_json` come registro cronologico degli eventi di una card,
sostituendo `correctJobTimestamps` come meccanismo di correzione timestamp
e integrando i dati di `checklist_json` e `correction_log_json` esistenti.

Il backend deve esporre sei nuove action e modificare `moveJob`.
Il foglio `jobs` non perde colonne — solo ne acquisisce una nuova.

---

## Schema evento

Ogni entry dell'activity log è un oggetto JSON con questi campi:

```json
{
  "id": "uuid-v4-string",
  "ts": "ISO 8601 con timezone",
  "type": "move | note | correction",
  "source": "auto | manual",
  "to": "colonna_id (solo per type=move)",
  "from": "colonna_id calcolato dal sistema (solo per type=move)",
  "note": "testo opzionale (tutti i tipi)",
  "field": "nome campo (solo type=correction)",
  "old": "valore precedente (solo type=correction)",
  "new": "valore nuovo (solo type=correction)",
  "reason": "testo obbligatorio (solo type=correction)"
}
```

Regole invarianti:
- `id` generato sempre dal backend — mai dall'utente
- `from` calcolato sempre dal backend — mai accettato dall'utente
- eventi `source: auto` sono immutabili — non modificabili né eliminabili
- il log è sempre ordinato per `ts` crescente

---

## Modifica 1 — `JOB_HEADERS` in `Constants.gs`

Aggiungere `activity_log_json` **in fondo** all'array `JOB_HEADERS`,
dopo `correction_log_json` (se presente) o dopo l'ultimo campo esistente.

**Non rimuovere** `checklist_json` né `correction_log_json` dall'array.
Questi campi restano nel foglio e vengono ignorati dall'applicazione,
ma i dati esistenti devono poter essere migrati in sicurezza.

Valore default per righe esistenti: `'[]'`

---

## Modifica 2 — `ActivityLog.gs` (nuovo file)

Creare un nuovo file `apps-script/ActivityLog.gs` con le funzioni helper
usate da tutte le action del log. Non esporre queste funzioni nel router.

### `parseActivityLog_(rawValue)`
Legge il valore grezzo dalla cella del foglio.
- Se vuoto o non stringa → restituisce `[]`
- Se JSON non valido → restituisce `[]` (mai errore fatale)
- Altrimenti → restituisce l'array parsato e ordinato per `ts` crescente

### `serializeActivityLog_(events)`
Restituisce la stringa JSON dell'array da scrivere nella cella.

### `computeFrom_(events, insertedTs)`
Dato il log corrente e il timestamp del nuovo evento da inserire,
calcola il `from` per quell'evento:
- Trova l'evento `move` con `ts` immediatamente precedente a `insertedTs`
- Restituisce il suo `to`, oppure `null` se non esiste

### `validateSequence_(events, candidate)`
Riceve il log corrente (senza il candidato) e il candidato da inserire.
Restituisce un oggetto `{ hardErrors: [], warnings: [] }`.

**Hard errors (bloccanti immediati — non superabili con `force`):**
- `ts` del candidato è nel futuro
- `to` del candidato non esiste tra le colonne configurate (solo per `type: move`)
- `reason` vuota o assente (solo per `type: correction`)

**Warnings bloccanti (superabili con `force: true` — richiedono conferma utente):**
- Il `from` calcolato per l'evento successivo nella sequenza cambia rispetto
  a quello attuale: riportare quale evento è impattato, vecchio `from`, nuovo `from`
- Due eventi `move` consecutivi con lo stesso `to` (probabile duplicato)
- Ingresso in colonna `stand_by` senza uscita corrispondente prima del prossimo
  ingresso nella stessa colonna (T_attesa non calcolabile per quel periodo)

### `checkStructuralAlignment_(job, candidate)`
Riceve il job completo e il candidato da inserire.
Restituisce un array `structuralWarnings` — campi strutturati incoerenti
con l'evento candidato.

Mappatura eventi → campi strutturati:
- `move` verso colonna con `role: wip`, e `job.start_ts` è vuoto
  o diverso dal `ts` del candidato → segnala `start_ts`
- `move` verso colonna con `role: done`, e `job.done_ts` è vuoto
  o diverso dal `ts` del candidato → segnala `done_ts`
- `ts` del candidato è precedente a `job.arrival_ts` → segnala `arrival_ts`

Per ogni warning strutturale restituire:
```json
{
  "field": "start_ts",
  "currentValue": "2026-07-24T09:21:00+02:00",
  "suggestedValue": "2026-07-20T10:00:00+02:00",
  "message": "Questo evento impatta 'Data inizio lavorazione' (start_ts),
              attualmente [valore]. Vuoi allineare il campo a [suggerito]?"
}
```

### `generateId_()`
Genera un id univoco per l'evento. Usare:
```javascript
return Utilities.getUuid();
```

---

## Modifica 3 — Nuove action in `Kanban.gs`

### `addActivityEvent(params)`

Params richiesti:
- `job_id` — obbligatorio
- `type` — `move | note | correction` — obbligatorio
- `ts` — ISO 8601 — obbligatorio
- `to` — obbligatorio se `type: move`
- `note` — opzionale per tutti i tipi
- `field`, `old`, `new`, `reason` — obbligatori se `type: correction`

Params opzionali di controllo:
- `force` — boolean, default `false`
  Se `true`, supera i warnings bloccanti di sequenza (non gli hard error)
- `align_fields` — oggetto con i campi strutturati da aggiornare insieme
  all'evento, esempio: `{ "start_ts": "2026-07-20T10:00:00+02:00" }`
  Aggiornare i campi strutturati nella stessa scrittura atomica sul foglio.

**Logica:**

1. Leggere il job dal foglio. Errore se non trovato.
2. Parsare `activity_log_json` con `parseActivityLog_`.
3. Costruire il candidato con `id` generato, `source: manual`,
   `from` calcolato con `computeFrom_`.
4. Chiamare `validateSequence_`. Se ci sono `hardErrors` → errore immediato.
5. Se ci sono `warnings` e `force` non è `true` →
   restituire `{ requiresForce: true, warnings: [...] }` senza scrivere nulla.
6. Chiamare `checkStructuralAlignment_`. Se ci sono `structuralWarnings`
   e `align_fields` non li copre tutti →
   restituire `{ alignmentRequired: true, structuralWarnings: [...] }`
   senza scrivere nulla.
7. Aggiungere il candidato al log, riordinare per `ts`.
8. Se `align_fields` è presente, aggiornare i campi strutturati sul job.
9. Scrivere tutto in una singola operazione sul foglio.
10. Restituire `ok_({ job_id, event: candidato, log: log aggiornato })`.

### `updateActivityEvent(params)`

Params: `job_id`, `event_id` (obbligatori), più i campi modificabili:
`ts`, `to`, `note`, `field`, `old`, `new`, `reason`, `force`, `align_fields`.

Logica:
1. Trovare l'evento per `event_id`. Errore se non trovato.
2. Blocco immediato se `source: auto` — gli eventi automatici non si modificano.
3. Costruire la versione aggiornata dell'evento.
4. Rimuovere temporaneamente l'evento dal log, ricalcolare `from`
   con `computeFrom_` sulla sequenza senza di esso, reinserire.
5. Stesso flusso di validazione di `addActivityEvent` (passi 4-9).

### `deleteActivityEvent(params)`

Params: `job_id`, `event_id` (obbligatori).

Logica:
1. Trovare l'evento per `event_id`. Errore se non trovato.
2. Blocco immediato se `source: auto`.
3. Rimuovere l'evento dal log.
4. Ricalcolare `from` dell'evento successivo (se esiste) con `computeFrom_`.
5. Verificare che la sequenza risultante non generi incoerenze con i campi
   strutturati → warning informativo (non bloccante per la cancellazione).
6. Scrivere il log aggiornato.
7. Restituire `ok_({ job_id, event_id, log: log aggiornato })`.

### `getActivityLog(params)`

Params: `job_id` (obbligatorio).

Restituisce `ok_({ job_id, log: [...] })` con il log ordinato per `ts` crescente.
Arricchire ogni evento con `from` ricalcolato al momento della lettura
(per garantire coerenza anche su dati migrati con `from` assente).

---

## Modifica 4 — `moveJob` in `Kanban.gs`

Dopo ogni spostamento riuscito, aggiungere automaticamente un evento
nel log della card con:
- `id`: `generateId_()`
- `ts`: il timestamp della mossa (già disponibile in `moveJob`)
- `type`: `move`
- `source`: `auto`
- `to`: `targetColumn.id`
- `from`: `sourceColumn.id` (già disponibile in `moveJob`)
- `note`: `''`

Se il movimento è un rework (`is_rework: true`), aggiungere anche
`is_rework: true` all'evento per distinguerlo nella UI.

La scrittura dell'evento deve essere atomica con la scrittura del job
(stessa operazione `setValues` sul foglio).

**Non chiamare** `addActivityEvent` da `moveJob` — implementare
la scrittura diretta per evitare doppia validazione su dati già validati
da `moveJob` stesso.

---

## Modifica 5 — Router in `Kanban.gs`

Aggiungere al `routeAction_`:
```javascript
addActivityEvent:    addActivityEvent,
updateActivityEvent: updateActivityEvent,
deleteActivityEvent: deleteActivityEvent,
getActivityLog:      getActivityLog,
migrateToActivityLog: migrateToActivityLog,
```

Rimuovere dal router:
```javascript
correctJobTimestamps: correctJobTimestamps,
```

La funzione `correctJobTimestamps` può restare nel file commentata
con nota `// sostituita da addActivityEvent (type: correction)`.

---

## Modifica 6 — `migrateToActivityLog()` in `ActivityLog.gs`

Funzione da eseguire **manualmente** dall'editor GAS, una sola volta,
prima del deploy. Accessibile anche come action Web App
(solo in ambiente TEST — rifiutare se `env === 'prod'`).

**Logica card per card:**

### Migrazione `correction_log_json` → `activity_log_json`
Per ogni record in `correction_log_json`:
- Creare un evento `type: correction`, `source: manual`
- Copiare `field`, `old`, `new`, `reason`
- `ts`: usare il campo `ts` del record se presente, altrimenti `arrival_ts`
  della card, altrimenti timestamp di migrazione
- `id`: `generateId_()`
- Non duplicare se un evento con stessi `field`, `old`, `new`, `ts`
  esiste già nel log

### Migrazione `checklist_json` → `description`
Per ogni item della checklist:
- Convertire in riga markdown:
  `[x] testo` se completato, `[ ] testo` se non completato
- Appendere **in fondo** al campo `description` esistente,
  preceduti da un separatore se `description` non è vuota:
  ```
  \n\n--- Checklist migrata ---\n
  [ ] task non completato\n
  [x] task completato\n
  ```
- Non modificare il testo `description` esistente

### Scrittura
Aggiornare ogni card in batch (non riga per riga) per limitare
le chiamate all'API Sheets.

### Output
Restituire un riepilogo:
```json
{
  "cards_processed": 42,
  "corrections_migrated": 8,
  "checklist_items_migrated": 15,
  "cards_skipped": 0,
  "errors": []
}
```

Loggare il riepilogo in `console.log` per visibilità nell'editor GAS.

---

## Modifica 7 — Suite test in `Tests.gs`

Aggiungere questi test alla suite esistente (i 17 test attuali
devono continuare a passare tutti — nessuna regressione):

1. `addActivityEvent` — evento `move` valido aggiunto correttamente
2. `addActivityEvent` — blocco hard: `ts` nel futuro
3. `addActivityEvent` — blocco hard: colonna `to` non esistente
4. `addActivityEvent` — warning sequenza senza `force` →
   restituisce `requiresForce: true`
5. `addActivityEvent` — warning sequenza con `force: true` → successo
6. `addActivityEvent` — warning strutturale senza `align_fields` →
   restituisce `alignmentRequired: true`
7. `addActivityEvent` — warning strutturale con `align_fields` →
   aggiorna campo strutturato e log in modo atomico
8. `addActivityEvent` — evento `note` valido
9. `addActivityEvent` — evento `correction` con `reason` vuota → blocco
10. `updateActivityEvent` — modifica evento `manual` → successo
11. `updateActivityEvent` — blocco su evento `auto`
12. `deleteActivityEvent` — elimina evento `manual` → successo
13. `deleteActivityEvent` — blocco su evento `auto`
14. `getActivityLog` — restituisce log ordinato per `ts`
15. `moveJob` — scrive automaticamente evento `auto` nel log
16. `migrateToActivityLog` — migra `correction_log_json` senza duplicati
17. `migrateToActivityLog` — appende checklist a `description`
    senza sovrascrivere testo esistente

Totale atteso dopo: **passed ≥ 34, failed: 0**

---

## Sequenza di esecuzione

Seguire in ordine. Fermarsi se un passo fallisce.

1. Ricognizione — mostrami output e attendi conferma prima di procedere
2. `git checkout -b codex/activity-log-backend`
3. Implementare Modifica 1 (`JOB_HEADERS`)
4. Creare `ActivityLog.gs` con tutte le funzioni helper (Modifica 2)
5. Implementare le nuove action in `Kanban.gs` (Modifica 3)
6. Modificare `moveJob` (Modifica 4)
7. Aggiornare il router (Modifica 5)
8. Implementare `migrateToActivityLog()` (Modifica 6)
9. Aggiornare `Tests.gs` (Modifica 7)
10. `clasp push`
11. Dall'editor GAS su ambiente TEST: eseguire `setupSigmaFlow`
    per aggiornare lo schema del foglio TEST con la nuova colonna
12. Dall'editor GAS su ambiente TEST: eseguire `migrateToActivityLog()`
    Verificare il riepilogo — `errors: []`
13. Aprire il foglio TEST e verificare manualmente su 2-3 card:
    - `description` ha la checklist appesa in fondo se presente
    - `activity_log_json` ha i record di `correction_log_json` migrati
    - `checklist_json` e `correction_log_json` sono invariati
14. Eseguire `runAllTestsAndLog` → atteso: **passed ≥ 34, failed: 0**
15. Se tutti i test passano:
    `clasp deploy --description "activity-log-backend"`
16. `git add -A`
17. `git commit -m "feat(jobs): activity_log_json + migrazione checklist e correction"`
18. `git push origin codex/activity-log-backend`

**Non fare merge su `main`.
Non eseguire `migrateToActivityLog()` su PROD in questo prompt —
solo dopo che il frontend è pronto e testato.**

---

## Vincoli

- Commenti in italiano, variabili in inglese
- `parseActivityLog_` non deve mai lanciare eccezioni — fallback silenzioso a `[]`
- `generateId_()` usa `Utilities.getUuid()` — nessuna dipendenza esterna
- Ogni scrittura su foglio deve essere atomica: log + campi strutturati
  nella stessa operazione `setValues`
- Nessuna modifica a `Model.gs`
- Nessuna modifica ai campi `is_rework`, `visit_number`, `rework_cause`
  (restano come summary index per `getMetrics`)
- Il database TEST non deve contenere dati reali di clienti
- `migrateToActivityLog()` come action Web App: rifiutare esplicitamente
  se `env === 'prod'`
