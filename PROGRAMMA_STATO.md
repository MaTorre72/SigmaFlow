# Stato programma: SigmaFlow — Activity Log / Modello caso-visita
Aggiornato: 2026-08-15 12:30

Fase corrente: L1
Titolo: Modello caso/visita — Ricognizione + schema additivo
Branch: `codex/case-visit-model` (da `codex/activity-log-prep-role`, commit da56212)
Documento di riferimento: `DESIGN_modello_caso_visita.md` (sezione 11, sotto-fasi L1-L6)

Stato: IN_ATTESA_GATE_UMANO

Fase J e Fase K: chiuse per decisione di Marco. Nota tecnica: nessuna
delle due e' stata mersa su `main` (12 commit di differenza,
verificato) — resta una decisione/azione separata ed esplicita di
Marco, non presa da Claude Code in questa sessione.

## Audit obbligatorio pre-L1 (eseguito, riportato, confermato da Marco)

1. Nomi/ruoli colonna (`Constants.gs`): `COLUMN_ROLES` include `prep`
   (Fase K); `DEFAULT_COLUMNS` con `todo` su ruolo `prep`. Confermato.
2. `JOB_HEADERS`/`CASE_HEADERS` (`Schema.gs`): contenuto esatto riportato
   e confermato — `incarico_ts`/`prep_ts` gia' presenti da Fase K,
   `CASE_HEADERS` a 7 campi invariato dalla ricognizione originale.
3. Guardia anti-reingresso-WIP e ramo rework in `moveJob`
   ([Kanban.gs:225-236](apps-script/src/Kanban.gs:225)): confermati nella
   forma attuale. Divergenza segnalata (non bloccante per L1, rilevante
   per L2): il guardia copre solo provenienza `stand_by`, il documento
   (par. 2) vuole l'estensione anche a `done` — verra' gestita in L2.
4. `markRework`: ancora in `routeAction_`, confermato **non richiamata**
   da `client.html` (nessun match). `refreshCaseVisitCount_`: non e' una
   route API, e' un helper interno chiamato da `moveJob`/`addJob` ad ogni
   spostamento/creazione — attivo, non "scollegato dal frontend" nello
   stesso senso di `markRework` (il frontend lo attiva indirettamente).

**Correzione di Marco al piano originale**: NON ridefinire `CASE_HEADERS`
sul foglio `cases` esistente — `refreshCaseVisitCount_` gira ad ogni
`moveJob`/`addJob` e scriverebbe su colonne inesistenti nel momento
stesso del cambio intestazione, rompendo ogni spostamento sulla board.
Creato invece un foglio **nuovo e separato** `visite`. `cases`,
`CASE_HEADERS` e `refreshCaseVisitCount_` restano completamente
invariati e funzionanti — ignorati, non rotti. La dismissione di
`cases` e delle funzioni collegate sara' un passo separato, successivo,
quando `visite` sara' comprovata (non prima di L5+).

## Lavoro svolto in L1 (additivo, verificato)

- `Constants.gs`: `SIGMAFLOW.SHEETS.VISITE = 'visite'`,
  `SCHEMA_VERSION` 4 -> 5.
- `Schema.gs`: nuovo `VISITE_HEADERS` secondo la sezione 9.2 del
  documento di design — `job_id`, `numero_visita` (identita' composta,
  nessun id sintetico aggiunto), `apertura_ts`, `incarico_ts`,
  `prep_ts`, `start_ts`, `consegna_ts`, `chiusura_ts`, `chiusura_tipo`,
  `t_cliente_d`, `t_ente_d`, `t_interno_d`, `rework_cause`. Registrato in
  `setupSigmaFlow` con lo stesso pattern di jobs/cases/config
  (`ensureSheet_`).
- `Schema.gs`: aggiunto `incarico_chiuso_ts` in coda a `JOB_HEADERS`
  (chiusura definitiva manuale del caso, indipendente dalla board).
  **Nessun campo rimosso** da `JOB_HEADERS` — la rimozione dei campi
  duplicati (`incarico_ts`, `prep_ts`, `start_ts`, `done_ts`,
  `service_time_d`, `lead_time_d`, `wait_time_d`, `is_rework`,
  `rework_cause`, `visit_number`) e' prevista solo in L5, dopo che
  L2-L4 avranno dimostrato che la lettura da `visite` funziona.

## Verifica

- Harness offline: creato un foglio TEST sintetico via `setupSigmaFlow()`
  — foglio `visite` creato con le 13 intestazioni esatte attese; foglio
  `cases` verificato bit-per-bit invariato (le 7 colonne originali,
  nessuna modifica); `jobs` verificato con `incarico_chiuso_ts`
  presente.
- Suite test completa: **41/41 passati**, nessuna regressione.
- Push su TEST: **eseguito con successo** (dopo che Marco ha rifatto il
  login `clasp`). Verificato con `clasp pull` in directory isolata +
  diff riga per riga contro i sorgenti locali per tutti i 13 file
  (`ActivityLog.gs`, `Constants.gs`, `Kanban.gs`, `Model.gs`,
  `Schema.gs`, `Utils.gs`, `Tests.gs`, `appsscript.json`, `board.html`,
  `client.html`, `dashboard.html`, `index.html`, `style.html`) —
  **identici**, nessuna divergenza. Lo schema v5 con il foglio `visite`
  e `incarico_chiuso_ts` e' ora live sul progetto Apps Script TEST.

## Prossimo passo

1. **Gate umano**: Marco verifica sul foglio Google TEST che
   `setupSigmaFlow()` (o il primo caricamento della board, che triggera
   `ensureCurrentSchema_`) abbia creato il foglio `visite` con le
   intestazioni corrette e che `cases` sia rimasto intatto, poi conferma
   esplicitamente prima di procedere a L2 (`moveJob`: regola di
   apertura/chiusura visita) — L2 e' una sessione Claude Code separata,
   non questa.

Nessuna scrittura su PROD. Nessuna modifica a `moveJob`, `ActivityLog.gs`
o `Model.gs` in questa sessione, come richiesto.
