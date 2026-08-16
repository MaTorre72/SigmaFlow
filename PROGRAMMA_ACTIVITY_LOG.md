# PROGRAMMA: SigmaFlow — Activity Log
# Versione 1.0 — 2026

## Riferimenti tecnici
- Specifica backend: `docs/codex_sigmaflow_activity_log_backend.md`
- Specifica frontend: `docs/codex_sigmaflow_activity_log_frontend.md`
- Stato corrente: `PROGRAMMA_STATO.md`

## Regole operative
- Eseguire una sola fase per sessione
- Aggiornare `PROGRAMMA_STATO.md` all'inizio e alla fine di ogni fase
- Mai modificare `main` direttamente
- Mai procedere alla fase successiva se il gate non è superato
- In caso di errore non risolvibile: impostare stato `BLOCCATA` e fermarsi

## Schema fasi

| Fase | Titolo                              | Gate    |
|------|-------------------------------------|---------|
| A    | Ricognizione                        | 🔴 Umano |
| B    | Schema e helpers                    | 🟢 Auto  |
| C    | addActivityEvent + getActivityLog   | 🟢 Auto  |
| D    | updateActivityEvent + delete        | 🟢 Auto  |
| E    | moveJob — eventi automatici         | 🟢 Auto  |
| F    | migrateToActivityLog                | 🔴 Umano |
| G    | Suite test completa                 | 🟢 Auto  |
| H    | Frontend — struttura base           | 🟢 Auto  |
| I    | Frontend — form e warning           | 🟢 Auto  |
| J    | Deploy e chiusura                   | 🔴 Umano |
| L    | Modello caso/visita — ricostruzione backend gate/rework  | 🔴 Umano |

---

## FASE A — Ricognizione
**Branch:** nessuno — solo lettura
**Durata stimata:** 20-30 minuti di sessione

### Obiettivo
Produrre una mappa precisa dello stato attuale del codice prima
di scrivere una sola riga. Tutto il codice successivo dipende
da questa fase.

### Cosa leggere
1. `apps-script/Constants.gs`
   - posizione e contenuto di `JOB_HEADERS`
   - presenza di `checklist_json`, `correction_log_json`, `activity_log_json`
2. `apps-script/Kanban.gs`
   - firma completa di `moveJob` — sezione che scrive `is_rework`
   - struttura di `routeAction_`
   - presenza di `correctJobTimestamps` nel router
3. `apps-script/Tests.gs`
   - struttura di ogni test (setup, esecuzione, verifica)
   - presenza di test su `correctJobTimestamps`
4. `apps-script/board.html`
   - struttura del modal card
   - sezione checklist (se presente)
5. `apps-script/client.html`
   - funzione `api()` o equivalente
   - funzione di rendering del modal
6. `apps-script/style.html` (o equivalente CSS)
   - variabili CSS disponibili

### Output obbligatorio
Creare `RICOGNIZIONE.md` nella root del repo con:
- elenco file letti con numero righe
- posizione esatta di `JOB_HEADERS` (file + riga)
- campi `checklist_json` e `correction_log_json`: presenti? posizione nell'array?
- `correctJobTimestamps`: presente nel router? presente come funzione?
- struttura del modal card: tab? sezioni? nome delle classi CSS principali
- funzione `api()`: firma, dove è definita
- variabili CSS disponibili per colori e spacing
- eventuali file non trovati o struttura diversa dall'attesa

### Criteri di accettazione (tutti e 5 devono essere TRUE)
- [ ] `RICOGNIZIONE.md` creato e committato nel branch corrente
- [ ] Posizione di `JOB_HEADERS` documentata con file e riga
- [ ] Struttura modal card documentata
- [ ] Funzione `api()` identificata
- [ ] Nessun file atteso risulta mancante (o la mancanza è documentata)

### Gate 🔴 UMANO
Fermarsi. Inviare `RICOGNIZIONE.md` a Marco per revisione.
Attendere risposta esplicita "procedi con fase B" prima di continuare.

---

## FASE B — Schema e helpers
**Branch:** `codex/activity-log-backend`
**Dipende da:** Fase A completata e approvata
**Durata stimata:** 20-30 minuti di sessione

### Obiettivo
Aggiungere il campo `activity_log_json` allo schema e creare
tutte le funzioni helper che le fasi successive useranno.
Nessuna nuova action esposta al router in questa fase.

### Cosa fare

#### B1 — `Constants.gs`
Aggiungere `'activity_log_json'` in fondo a `JOB_HEADERS`,
dopo l'ultimo campo esistente. Non rimuovere né spostare nessun
campo esistente.

#### B2 — `ActivityLog.gs` (nuovo file)
Creare il file con queste cinque funzioni, nell'ordine:

1. `generateId_()`
   ```javascript
   return Utilities.getUuid();
   ```

2. `parseActivityLog_(rawValue)`
   - Se vuoto, null, non stringa → restituisce `[]`
   - Se JSON non valido → restituisce `[]` (try/catch, mai errore fatale)
   - Altrimenti → array parsato, riordinato per `ts` crescente

3. `serializeActivityLog_(events)`
   - Restituisce `JSON.stringify(events)`

4. `computeFrom_(events, insertedTs)`
   - Filtra gli eventi di tipo `move` con `ts < insertedTs`
   - Prende l'evento `move` con `ts` più recente
   - Restituisce il suo `to`, oppure `null` se non esiste

5. `validateSequence_(events, candidate)`
   - Restituisce `{ hardErrors: [], sequenceWarnings: [] }`
   - Hard errors (non superabili):
     * `ts` del candidato è nel futuro → `'TS_IN_FUTURO'`
     * `to` non esiste tra le colonne configurate (solo `type: move`) → `'COLONNA_NON_TROVATA'`
     * `reason` vuota (solo `type: correction`) → `'REASON_OBBLIGATORIA'`
   - Sequence warnings (superabili con `force: true`):
     * Il `from` dell'evento `move` immediatamente successivo cambia →
       `{ code: 'SEQUENZA_MODIFICATA', eventTs, oldFrom, newFrom }`
     * Due eventi `move` consecutivi con lo stesso `to` →
       `{ code: 'COLONNA_DOPPIA', ts1, ts2, colonna }`
     * Ingresso in colonna `stand_by` senza uscita prima del successivo
       ingresso nella stessa colonna →
       `{ code: 'ATTESA_SENZA_USCITA', colonna, ts }`

6. `checkStructuralAlignment_(job, candidate)`
   - Restituisce `[]` se nessuna incoerenza
   - Per `move` verso colonna con `role: wip`:
     se `job.start_ts` è vuoto o diverso da `candidate.ts` →
     `{ field: 'start_ts', currentValue: job.start_ts, suggestedValue: candidate.ts }`
   - Per `move` verso colonna con `role: done`:
     se `job.done_ts` è vuoto o diverso da `candidate.ts` →
     `{ field: 'done_ts', currentValue: job.done_ts, suggestedValue: candidate.ts }`
   - Se `candidate.ts < job.arrival_ts`:
     `{ field: 'arrival_ts', currentValue: job.arrival_ts, suggestedValue: candidate.ts }`

### Criteri di accettazione
- [ ] `JOB_HEADERS` aggiornato, `activity_log_json` in fondo all'array
- [ ] `ActivityLog.gs` creato con tutte e sei le funzioni
- [ ] `clasp push` restituisce successo senza errori
- [ ] `parseActivityLog_('')` restituisce `[]` senza eccezioni
- [ ] `parseActivityLog_('json-non-valido')` restituisce `[]` senza eccezioni

### Gate 🟢 AUTO
Se tutti i criteri sono TRUE → aggiornare `PROGRAMMA_STATO.md`
e procedere alla Fase C nella stessa sessione o nella successiva.

---

## FASE C — addActivityEvent + getActivityLog
**Branch:** `codex/activity-log-backend`
**Dipende da:** Fase B completata
**Durata stimata:** 30-40 minuti di sessione

### Obiettivo
Esporre le due action principali in lettura e scrittura.
Queste sono le action più usate dal frontend — devono essere solide.

### Cosa fare

#### C1 — `addActivityEvent(params)` in `Kanban.gs`
Params richiesti: `job_id`, `type`, `ts`
Params condizionali: `to` (se `type: move`), `reason` (se `type: correction`)
Params opzionali: `note`, `field`, `old`, `new`
Params di controllo: `force` (default `false`), `align_fields` (oggetto)

Logica in ordine:
1. Leggere il job. Errore se non trovato.
2. Parsare log con `parseActivityLog_`.
3. Costruire candidato: `id = generateId_()`, `source: 'manual'`,
   `from = computeFrom_(log, params.ts)`.
4. `validateSequence_`. Se `hardErrors` → errore immediato.
5. Se `sequenceWarnings` e `force !== true` →
   restituire `{ ok: false, requiresForce: true, warnings: [...] }`.
6. `checkStructuralAlignment_`. Se warnings e `align_fields` non li
   copre tutti → restituire
   `{ ok: false, alignmentRequired: true, structuralWarnings: [...] }`.
7. Aggiungere candidato al log, riordinare per `ts`.
8. Se `align_fields`: aggiornare i campi strutturati sul job.
9. Scrivere log + job in una sola operazione sul foglio.
10. Restituire `ok_({ job_id, event: candidato })`.

#### C2 — `getActivityLog(params)` in `Kanban.gs`
Params: `job_id`
Logica:
1. Leggere il job. Errore se non trovato.
2. Parsare log.
3. Ricalcolare `from` per ogni evento `move` al momento della lettura
   (garantisce coerenza anche su dati migrati senza `from`).
4. Restituire `ok_({ job_id, log: [...] })`.

#### C3 — Router
Aggiungere al `routeAction_`:
```javascript
addActivityEvent: addActivityEvent,
getActivityLog:   getActivityLog,
```

### Criteri di accettazione
- [ ] `addActivityEvent` con params validi restituisce `ok: true`
- [ ] `addActivityEvent` con `ts` nel futuro restituisce `hardErrors`
- [ ] `addActivityEvent` con `sequenceWarnings` e `force: false`
  restituisce `requiresForce: true` senza scrivere nulla
- [ ] `addActivityEvent` con `force: true` scrive l'evento nel foglio
- [ ] `getActivityLog` restituisce il log ordinato per `ts`

### Gate 🟢 AUTO
Se tutti i criteri sono TRUE → aggiornare `PROGRAMMA_STATO.md`
e procedere alla Fase D.

---

## FASE D — updateActivityEvent + deleteActivityEvent
**Branch:** `codex/activity-log-backend`
**Dipende da:** Fase C completata
**Durata stimata:** 20-30 minuti di sessione

### Obiettivo
Completare il CRUD del log con modifica e cancellazione.

### Cosa fare

#### D1 — `updateActivityEvent(params)` in `Kanban.gs`
Params: `job_id`, `event_id` (obbligatori) + campi modificabili
+ `force`, `align_fields`

Logica:
1. Trovare evento per `event_id`. Errore se non trovato.
2. Blocco immediato se `source: 'auto'` →
   errore `'EVENTO_AUTO_NON_MODIFICABILE'`.
3. Rimuovere temporaneamente l'evento dal log.
4. Costruire versione aggiornata con nuovo `from` calcolato.
5. Stesso flusso di validazione di `addActivityEvent` (passi 4-9).

#### D2 — `deleteActivityEvent(params)` in `Kanban.gs`
Params: `job_id`, `event_id`

Logica:
1. Trovare evento per `event_id`. Errore se non trovato.
2. Blocco immediato se `source: 'auto'` →
   errore `'EVENTO_AUTO_NON_ELIMINABILE'`.
3. Rimuovere evento dal log.
4. Ricalcolare `from` dell'evento successivo.
5. `checkStructuralAlignment_` sul log risultante →
   includere eventuali warning informativi nella risposta
   (non bloccanti per la cancellazione).
6. Scrivere log aggiornato.
7. Restituire `ok_({ job_id, event_id, structuralWarnings: [...] })`.

#### D3 — Router
```javascript
updateActivityEvent: updateActivityEvent,
deleteActivityEvent: deleteActivityEvent,
```

### Criteri di accettazione
- [ ] `updateActivityEvent` su evento `manual` aggiorna correttamente
- [ ] `updateActivityEvent` su evento `auto` restituisce errore
- [ ] `deleteActivityEvent` su evento `manual` rimuove e ricalcola `from`
- [ ] `deleteActivityEvent` su evento `auto` restituisce errore
- [ ] Router aggiornato con entrambe le nuove action

### Gate 🟢 AUTO
Se tutti i criteri sono TRUE → aggiornare `PROGRAMMA_STATO.md`
e procedere alla Fase E.

---

## FASE E — moveJob: eventi automatici
**Branch:** `codex/activity-log-backend`
**Dipende da:** Fase D completata
**Durata stimata:** 15-20 minuti di sessione

### Obiettivo
Ogni drag & drop scrive automaticamente un evento nel log.
Intervento chirurgico su `moveJob` — nessuna altra funzione tocca.

### Cosa fare
In `moveJob`, subito dopo la scrittura del job aggiornato sul foglio,
aggiungere la scrittura dell'evento nel log della card:

```javascript
// Costruzione evento automatico per il log
var autoEvent = {
  id: generateId_(),
  ts: now,          // già disponibile in moveJob
  type: 'move',
  source: 'auto',
  to: targetColumn.id,
  from: sourceColumn.id,
  note: ''
};
if (job.is_rework) {
  autoEvent.is_rework = true;
}

// Lettura, aggiunta e scrittura del log nella stessa operazione
var rawLog = sheet.getRange(row, headers.activity_log_json).getValue();
var log = parseActivityLog_(rawLog);
log.push(autoEvent);
log.sort(function(a, b) {
  return a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0;
});
sheet.getRange(row, headers.activity_log_json)
  .setValue(serializeActivityLog_(log));
```

**Non chiamare** `addActivityEvent` da `moveJob` — scrittura diretta
per evitare doppia validazione.

### Criteri di accettazione
- [ ] Dopo `moveJob`, il log della card contiene un evento `auto`
- [ ] L'evento ha `source: 'auto'`, `from` e `to` corretti
- [ ] Il job `is_rework: true` produce evento con `is_rework: true`
- [ ] La scrittura è atomica con la scrittura del job
- [ ] I 17 test backend esistenti passano ancora tutti (nessuna regressione)

### Gate 🟢 AUTO
Se tutti i criteri sono TRUE → aggiornare `PROGRAMMA_STATO.md`
e procedere alla Fase F.

---

## FASE F — migrateToActivityLog
**Branch:** `codex/activity-log-backend`
**Dipende da:** Fase E completata
**Durata stimata:** 20-30 minuti di sessione

### Obiettivo
Migrare i dati esistenti da `correction_log_json` e `checklist_json`
verso i nuovi campi. Funzione da eseguire manualmente una volta sola.

### Cosa fare in `ActivityLog.gs`

```
migrateToActivityLog()
```

Logica card per card:

**Migrazione `correction_log_json` → `activity_log_json`**
Per ogni record in `correction_log_json`:
- Creare evento `{ type: 'correction', source: 'manual', ... }`
- `ts`: campo `ts` del record se presente, altrimenti `arrival_ts`,
  altrimenti timestamp di migrazione
- `id`: `generateId_()`
- Non duplicare se esiste già evento con stessi `field`, `old`, `new`, `ts`

**Migrazione `checklist_json` → `description`**
Per ogni item della checklist:
- Riga markdown: `[x] testo` o `[ ] testo`
- Appendere in fondo a `description` con separatore:
  ```
  \n\n--- Checklist migrata ---\n
  ```
- Mai sovrascrivere il testo `description` esistente

**Output**
```json
{
  "cards_processed": 0,
  "corrections_migrated": 0,
  "checklist_items_migrated": 0,
  "cards_skipped": 0,
  "errors": []
}
```
Loggare con `console.log`. Come action Web App: rifiutare se `env: 'prod'`.
Aggiungere al router: `migrateToActivityLog: migrateToActivityLog`.

### Criteri di accettazione
- [ ] `clasp push` riuscito
- [ ] Funzione eseguita su TEST: `errors: []`
- [ ] Su 2 card campione in TEST: `correction_log_json` migrato senza duplicati
- [ ] Su 2 card campione in TEST: `description` ha checklist appesa, testo originale intatto
- [ ] `checklist_json` e `correction_log_json` invariati nel foglio

### Gate 🔴 UMANO
Fermarsi. Marco esegue `migrateToActivityLog()` su TEST dall'editor GAS,
verifica il riepilogo e 2-3 card campione nel foglio.
Risposta esplicita "procedi con fase G" prima di continuare.

---

## FASE G — Suite test completa
**Branch:** `codex/activity-log-backend`
**Dipende da:** Fase F approvata
**Durata stimata:** 40-50 minuti di sessione

### Obiettivo
Portare la suite a ≥ 34 test, tutti passanti. Nessuna regressione
sui 17 test esistenti.

### Nuovi test da scrivere (17 test aggiuntivi)

1. `addActivityEvent` — evento `move` valido aggiunto correttamente
2. `addActivityEvent` — blocco `ts` nel futuro
3. `addActivityEvent` — blocco colonna `to` non esistente
4. `addActivityEvent` — blocco `reason` vuota per `correction`
5. `addActivityEvent` — `sequenceWarnings` senza `force` →
   `requiresForce: true`, nessuna scrittura
6. `addActivityEvent` — `sequenceWarnings` con `force: true` → successo
7. `addActivityEvent` — `structuralWarnings` senza `align_fields` →
   `alignmentRequired: true`, nessuna scrittura
8. `addActivityEvent` — `structuralWarnings` con `align_fields` →
   campo strutturato aggiornato atomicamente
9. `addActivityEvent` — evento `note` valido
10. `updateActivityEvent` — modifica evento `manual` → successo
11. `updateActivityEvent` — blocco su evento `auto`
12. `deleteActivityEvent` — elimina evento `manual`, ricalcola `from` successivo
13. `deleteActivityEvent` — blocco su evento `auto`
14. `getActivityLog` — log ordinato per `ts`
15. `getActivityLog` — `from` ricalcolato al momento della lettura
16. `moveJob` — scrive evento `auto` nel log dopo spostamento
17. `migrateToActivityLog` — append checklist senza sovrascrivere `description`

### Criteri di accettazione
- [ ] `runAllTestsAndLog` → `passed: ≥ 34, failed: 0`
- [ ] Nessun test precedente in regressione
- [ ] Tutti i 17 nuovi test documentati con nome descrittivo in italiano
- [ ] `clasp push` riuscito prima di eseguire i test
- [ ] Output di `runAllTestsAndLog` loggato in `PROGRAMMA_STATO.md`

### Gate 🟢 AUTO
Se tutti i criteri sono TRUE → aggiornare `PROGRAMMA_STATO.md`
e procedere alla Fase H. Se `failed > 0`: stato `BLOCCATA`, fermarsi.

---

## FASE H — Frontend: struttura base
**Branch:** `codex/activity-log-frontend`
**Dipende da:** Fase G completata
**Durata stimata:** 30-40 minuti di sessione

### Obiettivo
Modificare il modal della card: rimuovere la checklist UI, aggiungere
il pannello Cronologia con la sola lista eventi (senza form ancora).

### Cosa fare

#### H1 — Rimozione checklist UI
In `board.html`: rimuovere sezione, pulsanti e logica relativi
a `checklist_json`. In `client.html`: rimuovere le funzioni
`renderChecklist` o equivalenti.
Non rimuovere `checklist_json` dalle chiamate `updateJob`.

#### H2 — Modal a due pannelli
Aggiungere navigazione tab al modal card:
- Tab 1: "Informazioni" — tutti i campi esistenti invariati
- Tab 2: "Cronologia" — nuovo pannello

Su desktop: tab orizzontali in cima al modal.
Usare classi CSS esistenti nel progetto — non introdurre nuovi sistemi.

#### H3 — Pannello Cronologia (solo lista)
- Caricamento lazy: `getActivityLog` chiamato solo all'apertura del tab
- Stato di caricamento: "Caricamento cronologia..."
- Lista vuota: "Nessun evento registrato."
- Ogni evento mostra: timestamp `gg/mm/aaaa HH:MM`, badge tipo,
  badge `AUTO`/`MANUALE`, contenuto descrittivo
- Icone modifica/cancellazione visibili solo su eventi `source: manual`
  (non ancora funzionanti in questa fase — solo visibili)

### Criteri di accettazione
- [ ] Modal card si apre senza errori JavaScript
- [ ] Tab "Informazioni" mostra tutti i campi esistenti invariati
- [ ] Tab "Cronologia" carica e mostra eventi dal log
- [ ] Badge `AUTO`/`MANUALE` visibili e corretti
- [ ] Checklist non più visibile nell'UI
- [ ] `clasp push` e smoke test: card si apre, tab funzionano

### Gate 🟢 AUTO
Se tutti i criteri sono TRUE → aggiornare `PROGRAMMA_STATO.md`
e procedere alla Fase I.

---

## FASE I — Frontend: form e warning
**Branch:** `codex/activity-log-frontend`
**Dipende da:** Fase H completata
**Durata stimata:** 50-60 minuti di sessione

### Obiettivo
Completare il pannello Cronologia con il form di inserimento,
la modifica/cancellazione eventi e tutti i dialog di warning.

### Cosa fare

#### I1 — Form inserimento evento
Pulsante "Aggiungi evento" sotto la lista.
Form inline (non nuovo modal) con:
- Input datetime-local (precompilato con adesso, non accetta futuro)
- Select tipo: `Spostamento` / `Nota` / `Correzione timestamp`
- Campi condizionali per tipo (vedi specifica frontend)
- Pulsanti "Salva evento" e "Annulla"

#### I2 — Flusso salvataggio in tre fasi
Fase 1 → risposta → gestione:
- Successo: ricaricare log, chiudere form
- `hardErrors`: errore inline, form resta aperto
- `requiresForce: true`: dialog di conferma sequenza
- `alignmentRequired: true`: dialog di allineamento campi strutturati
Fase 3 (se necessario): chiamata con `force: true` e/o `align_fields`

I dialog devono essere HTML custom (non `window.confirm`).

#### I3 — Modifica evento manuale
Click icona matita → stesso form precompilato → chiama `updateActivityEvent`.
Stesso flusso warning di I2.

#### I4 — Eliminazione evento manuale
Click icona cestino → dialog minimale di conferma → chiama `deleteActivityEvent`.
Warning informativi (non bloccanti) mostrati come banner nel pannello.

### Criteri di accettazione
- [ ] Inserimento evento `move` valido → appare nel log con badge `MANUALE`
- [ ] Data futura → blocco inline immediato
- [ ] Warning sequenza → dialog con descrizione chiara → conferma → evento salvato
- [ ] Warning allineamento → dialog con valori corretti → scelta utente rispettata
- [ ] Modifica evento manuale → valori precompilati correttamente
- [ ] Eliminazione evento manuale → scompare dal log
- [ ] Evento `auto` → nessuna icona modifica/cancellazione

### Gate 🟢 AUTO
Se tutti i criteri sono TRUE → aggiornare `PROGRAMMA_STATO.md`
e procedere alla Fase J.

---

## FASE J — Deploy e chiusura
**Branch:** entrambi i branch
**Dipende da:** Fase I completata
**Durata stimata:** 20 minuti di sessione

### Obiettivo
Smoke test finale, deploy, commit, push. Marco decide su PROD.

### Cosa fare

#### J1 — Smoke test completo su TEST
Eseguire i 12 punti dello smoke test frontend della specifica.
Eseguire `runAllTestsAndLog` → `passed ≥ 34, failed: 0`.

#### J2 — Deploy
```
clasp deploy --description "activity-log-complete"
```

#### J3 — Commit e push
```
git add -A
git commit -m "feat(sigmaflow): activity log completo — backend e frontend"
git push origin codex/activity-log-backend
git push origin codex/activity-log-frontend
```

### Criteri di accettazione
- [ ] Tutti i 12 smoke test UI superati
- [ ] `passed ≥ 34, failed: 0`
- [ ] Deploy riuscito su TEST
- [ ] Entrambi i branch pushati su GitHub
- [ ] `PROGRAMMA_STATO.md` aggiornato con esito finale

### Gate 🔴 UMANO
Fermarsi. Marco verifica la Web App in TEST, decide se fare merge
e se eseguire `migrateToActivityLog()` su PROD.
Il programma è completato lato Claude Code.

---

## Note finali
- La migrazione PROD (`migrateToActivityLog()`) non fa parte di questo programma
- Il merge su `main` è decisione di Marco, fuori da questo programma
- I file di specifica (`codex_sigmaflow_activity_log_backend.md` e
  `codex_sigmaflow_activity_log_frontend.md`) sono il riferimento tecnico
  di dettaglio per ogni fase — Claude Code li consulta quando serve






# Addendum a PROGRAMMA_ACTIVITY_LOG.md — Fase K

> v2 — verificata direttamente sul codice reale (Constants.gs, Schema.gs,
> Kanban.gs, Model.gs, ActivityLog.gs, Tests.gs caricati da Marco).
> Da incollare in `PROGRAMMA_ACTIVITY_LOG.md`: la riga nella tabella
> "Schema fasi" e la sezione "FASE K" in fondo al documento, dopo la
> sezione "FASE J — Deploy e chiusura".

---

## Coordinamento con la Fase J (obbligatorio, non modificabile)

**Stato reale al momento di scrivere questo addendum** (da
`PROGRAMMA_STATO.md`): fase corrente = **I**, smoke test eseguito
(11/12 punti confermati). La Fase J non è ancora stata avviata — è in
attesa del comando "procedi con fase J" da parte di Marco.

**La Fase K non può iniziare prima che la Fase J sia completata e
approvata.** K modifica la tassonomia dei ruoli colonna e lo schema
`JOB_HEADERS` sullo stesso impianto che J porta in produzione. Se
`PROGRAMMA_STATO.md` non riporta Fase J con stato `COMPLETATA`, Claude
Code deve **rifiutarsi di avviare la Fase K** e segnalarlo.

---

## Riga da aggiungere alla tabella "Schema fasi"

```
| K    | Ruolo `prep` per TO DO — gate incarico/prep/lavorazione | 🔴 Umano |
```

---

## FASE K — Ruolo `prep` per TO DO, gate `incarico_ts` / `prep_ts` / `lavorazione_ts` distinti

**Branch:** `codex/activity-log-prep-role` (da `main`, dopo merge di J)
**Dipende da:** Fase J completata, approvata, deploy in PROD verificato
**Durata stimata:** 40-50 minuti di sessione

### Riferimento di design

`sigmaflow_stati_eventi_dispensa_cap11-15.md` (v2): `TO DO` in produzione
non è un buffer vuoto ma una fase di preparazione tecnica a bassa
intensità (raccolta dati, strategia) successiva all'incarico (`BACKLOG`)
e precedente alla lavorazione piena (`WIP`). Oggi `TO DO` condivide
`role: 'wip'` con `WIP` in `Constants.gs` (`DEFAULT_COLUMNS`, riga
`{ id: 'todo', ... role: 'wip' }`), il che fa scattare `start_ts` già
all'ingresso in preparazione, non alla lavorazione reale.

### Obiettivo

Introdurre il ruolo `prep`, separare i gate `incarico_ts` (ingresso in
BACKLOG), `prep_ts` (ingresso in TO DO) e `lavorazione_ts`/`start_ts`
(ingresso in WIP reale), in modo **puramente additivo**, senza rompere
il comportamento di rework già esistente sul rientro da stand-by.

### Cosa fare

#### K1 — `Constants.gs`: bump `SCHEMA_VERSION` e nuovo ruolo

- `SCHEMA_VERSION` passa da `'3'` a `'4'`.
- **Aggiungere `'prep'` all'array `COLUMN_ROLES`.** Attenzione: è
  obbligatorio, non opzionale — `normalizeColumnRole_()` in `Utils.gs`
  scarta silenziosamente qualunque ruolo non presente in questo array,
  riportandolo a `'neutral'`. Senza questa modifica, riassegnare
  `role: 'prep'` a TO DO in `DEFAULT_COLUMNS` verrebbe annullato ad ogni
  lettura via `readColumns_()`.
  ```javascript
  COLUMN_ROLES: ['backlog', 'wip', 'stand_by', 'done', 'neutral', 'prep'],
  ```
- In `DEFAULT_COLUMNS`, cambiare la colonna `todo` da `role: 'wip'` a
  `role: 'prep'`. Non toccare nessun'altra colonna (in particolare non
  toccare `id: 'wip'`, che resta `role: 'wip'`).
- Se in TEST/PROD la configurazione colonne è salvata in
  `columns_json` dentro il foglio `config` (non nel default — verificare
  in ricognizione se `config.columns_json` è popolato), la modifica a
  `DEFAULT_COLUMNS` **non basta**: serve anche un aggiornamento del
  valore salvato. Non farlo automaticamente da codice su TEST/PROD senza
  verifica — documentare in `PROGRAMMA_STATO.md` il valore trovato e
  proporre il comando/chiamata `updateColumn` da eseguire manualmente.

#### K2 — `Schema.gs`: nuovi campi (additivi)

Aggiungere in fondo a `JOB_HEADERS`, dopo `activity_log_json`, senza
spostare alcun campo esistente:

```javascript
'incarico_ts',
'prep_ts'
```

Non toccare `start_ts`: una volta applicato K1, il suo comportamento al
primo ingresso si corregge da solo (vedi `moveJob`, riga
`if (targetColumn.role === 'wip' && !job.start_ts)`, K3 non lo modifica).

#### K3 — `Kanban.gs`: correggere `moveJob` (necessario, non opzionale)

Nel blocco di rientro da stand-by (righe 228-233 nel codice attuale):

```javascript
if (sourceColumn.role === 'stand_by' && (targetColumn.role === 'wip' || targetColumn.role === 'backlog')) {
  job.visit_number = Number(job.visit_number || 1) + 1;
  job.is_rework = true;
  job.rework_cause = sourceColumn.id;
  job.start_ts = now;
}
```

Sostituire con:

```javascript
if (sourceColumn.role === 'stand_by' && (targetColumn.role === 'wip' || targetColumn.role === 'backlog' || targetColumn.role === 'prep')) {
  job.visit_number = Number(job.visit_number || 1) + 1;
  job.is_rework = true;
  job.rework_cause = sourceColumn.id;
  if (targetColumn.role === 'wip') {
    job.start_ts = now;
  }
}
```

**Motivo**: senza questa modifica, il test esistente
`testAutomaticReworkFromStandBy` (che rientra in `todo`) smette di
passare, perché `todo` non avrebbe più `role: 'wip'` e uscirebbe dalla
condizione. Con la sola aggiunta di `|| targetColumn.role === 'prep'`
senza la guardia sul `start_ts`, il rientro in TO DO continuerebbe a
resettare `start_ts = now` — esattamente il comportamento che la Fase K
vuole correggere (la lavorazione piena non è ancora iniziata quando si
rientra solo in preparazione). Entrambe le parti della modifica sono
necessarie.

Poi, aggiungere due nuovi blocchi (stesso pattern già usato per
`arrival_ts` alla riga `if (targetColumn.role === 'backlog' && !job.arrival_ts)`):

```javascript
if (targetColumn.role === 'backlog' && !job.incarico_ts) {
  job.incarico_ts = now;
}

if (targetColumn.role === 'prep' && !job.prep_ts) {
  job.prep_ts = now;
}
```

**Non toccare** la guardia esistente `sourceColumn.role === 'stand_by' &&
targetColumn.id === 'wip'` (righe 224-225, divieto di rientro diretto in
WIP): è ancorata all'id colonna, non al ruolo, resta corretta e invariata
dopo K1. Verificarla in ricognizione, non modificarla.

In `addJob`, per coerenza (creazione diretta di una card già in BACKLOG o
TO DO, es. da `seedTestData` o import): dove oggi c'è
`start_ts: targetColumn.role === 'wip' ? now : ''`, aggiungere gli
equivalenti per `incarico_ts` e `prep_ts` seguendo lo stesso pattern
condizionale sul `role` della colonna di destinazione.

#### K4 — `ActivityLog.gs`: estendere `checkStructuralAlignment_`

Nella funzione esistente, accanto ai due controlli già presenti
(`role === 'wip'` → warning su `start_ts`; `role === 'done'` → warning su
`done_ts`), aggiungere:

```javascript
if (column && column.role === 'backlog' && (!job.incarico_ts || compareTs_(job.incarico_ts, candidate.ts) !== 0)) {
  warnings.push({ field: 'incarico_ts', currentValue: job.incarico_ts || '', suggestedValue: candidate.ts });
}

if (column && column.role === 'prep' && (!job.prep_ts || compareTs_(job.prep_ts, candidate.ts) !== 0)) {
  warnings.push({ field: 'prep_ts', currentValue: job.prep_ts || '', suggestedValue: candidate.ts });
}
```

Non serve toccare `addActivityEvent`: scrive già qualunque campo passato
in `align_fields` purché presente in `JOB_HEADERS` (verificato — riga
`if (JOB_HEADERS.indexOf(field) !== -1) { job[field] = alignFields[field]; }`).
Con K2 fatto, `incarico_ts` e `prep_ts` sono già scrivibili da questo
meccanismo senza altro codice. Il frontend (dialog "Allinea i campi
strutturati", già implementato in Fase I) mostrerà questi nuovi campi
automaticamente se la label è gestita in modo generico — verificare in
ricognizione se `client.html` ha una mappa `field → etichetta leggibile`
da estendere con `incarico_ts` → "Data incarico" e `prep_ts` → "Data
inizio preparazione".

#### K5 — `Model.gs`: correggere `currentWorkload_` (necessario, non opzionale)

Il conteggio dashboard attuale:

```javascript
if (column.role === 'backlog') { result.ready++; }
if (column.role === 'wip') { result.in_progress++; }
if (column.role === 'stand_by') { result.blocked++; }
if (column.role === 'done' && !coerceBoolean_(job.invoiced)) { result.can_return++; }
```

Senza modifica, dopo K1 le card in TO DO (`role: 'prep'`) non
incrementano più nessun contatore — **spariscono silenziosamente** da
`workloadMetrics`. Aggiungere:

```javascript
if (column.role === 'prep') { result.preparing++; }
```

e il campo `preparing: 0` nell'inizializzazione di `result` in cima alla
funzione. Verificare in ricognizione se `dashboard.html`/`client.html`
espone già `workloadMetrics.*` in modo enumerabile (ciclo su chiavi) o
con campi cablati uno a uno — nel secondo caso serve anche una riga UI
per mostrare `preparing`, altrimenti il dato esiste ma non è visibile
(accettabile per questa fase, da segnalare come nota per Marco).

#### K6 — Test (`Tests.gs`)

Verificati e **da non modificare** (robusti al cambio, controllati
esplicitamente sul codice):
- `testStandByCannotReturnDirectlyToWip` — usa l'id `'wip'`, invariato.
- `testDeleteActivityEventManual`, `testGetActivityLogOrdinato` — usano
  `columns.filter(c => c.role === 'wip')[0]`, che dopo K1 risolve
  semplicemente alla colonna WIP reale invece che a TO DO: comportamento
  ancora corretto per lo scopo del test.

Da aggiungere:
- ingresso in TO DO → `prep_ts` valorizzato, `start_ts` **non**
  valorizzato;
- ingresso in WIP → `start_ts` valorizzato (non-regressione);
- ingresso in BACKLOG → `incarico_ts` valorizzato;
- rientro da stand-by verso TO DO → `visit_number` +1, `is_rework` true,
  `rework_cause` = colonna di provenienza, **`start_ts` invariato**
  rispetto al valore precedente (assert esplicito, oggi mancante in
  `testAutomaticReworkFromStandBy` — va aggiunto lì o in un test dedicato);
- rientro da stand-by verso BACKLOG → stessa marcatura rework,
  `start_ts` invariato;
- `workloadMetrics.preparing` conta correttamente le card in TO DO
  (oggi non c'è nessun test che copre questo caso: il fixture di
  `testSystemStateWorkload` non include card in `todo`).

### Output obbligatorio

Aggiornare `PROGRAMMA_STATO.md` con: `SCHEMA_VERSION` precedente/nuovo,
campi aggiunti, esito test nuovi ed esistenti, conferma che
`config.columns_json` in TEST è stato verificato/aggiornato se
necessario, conferma esplicita che il divieto di reingresso diretto in
WIP resta funzionante (non introdotto, verificato).

### Criteri di accettazione (tutti e 5 devono essere TRUE)

- [ ] `SCHEMA_VERSION` = `'4'`, `'prep'` presente in `COLUMN_ROLES`,
      `TO DO` con `role: 'prep'` in `DEFAULT_COLUMNS` (e in
      `config.columns_json` se popolato separatamente)
- [ ] Campi `incarico_ts`, `prep_ts` aggiunti a `JOB_HEADERS` senza
      rimuovere o spostare alcun campo esistente
- [ ] `testAutomaticReworkFromStandBy` passa **con** l'assert aggiuntivo
      che `start_ts` non viene resettato su rientro in TO DO; rientro in
      WIP diretto da stand-by resta bloccato (`testStandByCannotReturnDirectlyToWip`
      invariato e verde)
- [ ] `workloadMetrics.preparing` riflette correttamente le card in TO DO
      in un test dedicato
- [ ] Suite test completa (esistente + nuova) passa senza regressioni

### Gate 🔴 UMANO

Fermarsi dopo la migrazione/verifica su TEST. Marco verifica manualmente:
- una card che entra in TO DO riceve `prep_ts`, non `start_ts`;
- una card che entra in WIP riceve `start_ts` normalmente;
- una card riaperta da attesa verso TO DO mantiene il vecchio `start_ts`
  (non viene "ringiovanito");
- il tentativo di riaprire una card direttamente in WIP resta bloccato
  dall'interfaccia (come oggi);
- la dashboard TEST mostra il nuovo conteggio "in preparazione" (o
  quantomeno il dato è presente in `getMetrics`, anche se non ancora
  in UI).

Solo dopo conferma esplicita ("verificato, procedi") si valuta se e
quando applicare la stessa migrazione a PROD.
