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
    appsscript.json
    src/
      Constants.gs
      Schema.gs
      Utils.gs
      Kanban.gs
      Model.gs
      index.html
      board.html
      dashboard.html
      style.html
      client.html
  docs/
    architecture.md
```

## Avvio del progetto Google

1. Crea un nuovo Google Sheet che fara' da database.
2. Apri `Extensions > Apps Script`.
3. Copia i file in `apps-script/src` dentro il progetto Apps Script.
4. Copia il contenuto di `apps-script/appsscript.json` nel manifest del progetto.
5. Esegui `setupSigmaFlow()` una prima volta dall'editor Apps Script.
6. Pubblica come Web App limitata agli utenti del dominio Workspace.

## Roadmap iniziale

1. Database e CRUD backend.
2. Kanban UI con drag & drop e filtri.
3. Modello dinamico M/M/1, M/G/1 e rework.
4. Dashboard metriche.
5. Flusso rework completo.
