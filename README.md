# SigmaFlow

SigmaFlow e' un sistema Kanban leggero per team tecnico-ambientali, pensato per girare interamente su Google Workspace:

- Google Sheets come database.
- Google Apps Script come backend.
- HTML, CSS e JavaScript vanilla come frontend.
- Nessuna infrastruttura esterna e nessuna dipendenza runtime di terze parti.

## Struttura

```text
SigmaFlow/
  apps-script/
    src/
      appsscript.json
      Constants.gs
      Schema.gs
      Utils.gs
      Kanban.gs
      Model.gs
      ActivityLog.gs
      Tests.gs
      index.html
      board.html
      dashboard.html
      style.html
      client.html
    test-harness/
      gas-harness.js
  docs/
    architecture.md
    DESIGN_modello_caso_visita.md
    dashboard-metrics.md
    testing-and-security.md
    google-workspace-setup.md
    storico/
```

## Avvio del progetto Google

Segui la guida operativa in [`docs/google-workspace-setup.md`](docs/google-workspace-setup.md).

In sintesi:

1. Crea o importa il Google Sheet database.
2. Apri `Extensions > Apps Script`.
3. Copia i file in `apps-script/src` dentro il progetto Apps Script.
4. Copia il contenuto di `apps-script/src/appsscript.json` nel manifest del progetto.
5. Esegui `setupSigmaFlow()` una prima volta dall'editor Apps Script.
6. Pubblica come Web App limitata agli utenti del dominio Workspace.

Per generare il template `.xlsx` del database:

```powershell
& 'C:\Users\Marco\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\tools\build_database_template.mjs
```

Per usare `clasp` locale:

```powershell
.\tools\clasp.cmd --version
.\tools\clasp.cmd login
```

## Stato

Database e CRUD backend, Kanban UI con drag & drop e filtri, dashboard
a due livelli, modello caso/visita con rientri automatici (vedi
[`docs/DESIGN_modello_caso_visita.md`](docs/DESIGN_modello_caso_visita.md))
sono completi e in produzione. Stato corrente e prossimi passi noti in
[`PROGRAMMA_STATO.md`](PROGRAMMA_STATO.md).

## Test e sicurezza

La strategia di verifica e' descritta in [`docs/testing-and-security.md`](docs/testing-and-security.md). I test Apps Script sono in `apps-script/src/Tests.gs` e richiedono uno Spreadsheet TEST configurato tramite Script Property `SIGMAFLOW_TEST_SPREADSHEET_ID`.
