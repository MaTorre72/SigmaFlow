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
