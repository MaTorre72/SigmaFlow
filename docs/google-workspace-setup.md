# Setup Google Workspace

Questa guida porta SigmaFlow da repository locale a Web App Apps Script.

## Stato ambiente

Spreadsheet database creato e verificato:

- Nome: `SigmaFlow Database`
- ID: `1OSVDfy7fOWSBNfoFUNLNHxB5AcdR-q6U59BuJjWaR-Q`
- URL: <https://docs.google.com/spreadsheets/d/1OSVDfy7fOWSBNfoFUNLNHxB5AcdR-q6U59BuJjWaR-Q>
- Timezone: `Europe/Rome`
- Tab verificati: `jobs`, `cases`, `config`
- Apps Script ID: `1RFY5lPPaDGoNjAvFximVqzMnihCP5Nso1nzsq70nDkMqiqikB7N1mDtq`
- Web App URL: <https://script.google.com/a/macros/sigmapiu.it/s/AKfycbxtYtSfkixtAclS2gLXF1EttOF2zxn_V7WjyVbN2C3932srB64tR0DiqMg5uW-HoqP-/exec>
- Deployment corrente: `AKfycbxtYtSfkixtAclS2gLXF1EttOF2zxn_V7WjyVbN2C3932srB64tR0DiqMg5uW-HoqP-` (`@3`)

Nota: `clasp create --type sheets` ha creato un nuovo contenitore Google Sheets per il progetto Apps Script. Il codice SigmaFlow usa comunque il database canonico tramite `SIGMAFLOW.DEFAULT_SPREADSHEET_ID`.

Nota operativa: `clasp run setupSigmaFlow` puo' restituire un errore di permessi anche dopo il deploy se il progetto non e' eseguibile via Apps Script API per l'utente corrente. In quel caso eseguire `setupSigmaFlow` una volta dall'editor Apps Script e autorizzare gli scope Google.

## 1. Spreadsheet database

Opzione automatica:

1. Riconnetti il connettore Google Drive in Codex concedendo i permessi di creazione/upload file.
2. Importa `outputs/sigmaflow/SigmaFlow Database.xlsx` come Google Sheets nativo.
3. Verifica che siano presenti i tab `jobs`, `cases`, `config`.

Opzione manuale:

1. Apri Google Drive con l'account Workspace.
2. Crea un nuovo Google Sheet chiamato `SigmaFlow Database`.
3. Crea tre tab: `jobs`, `cases`, `config`.
4. Copia le intestazioni dagli array `JOB_HEADERS`, `CASE_HEADERS` e `CONFIG_HEADERS` in `apps-script/src/Schema.gs`.
5. In `config`, aggiungi le righe default definite in `SIGMAFLOW.DEFAULT_CONFIG`.

## 2. Progetto Apps Script

### Opzione automatica con clasp

`clasp` e' installato localmente nella workspace e si lancia con:

```powershell
.\tools\clasp.cmd --version
```

Login:

```powershell
.\tools\clasp.cmd login
```

Dopo il login, crea o collega il progetto Apps Script e sincronizza i file:

```powershell
cd apps-script
..\tools\clasp.cmd create --type sheets --title SigmaFlow --parentId 1OSVDfy7fOWSBNfoFUNLNHxB5AcdR-q6U59BuJjWaR-Q --rootDir ./src
..\tools\clasp.cmd push
```

### Opzione manuale

1. Dal Google Sheet, apri `Extensions > Apps Script`.
2. Copia `apps-script/src/appsscript.json` nel manifest del progetto.
3. Crea i file `.gs`:
   - `Constants.gs`
   - `Schema.gs`
   - `Utils.gs`
   - `Kanban.gs`
   - `Model.gs`
4. Crea i file `.html`:
   - `index.html`
   - `board.html`
   - `dashboard.html`
   - `style.html`
   - `client.html`
5. Incolla in ogni file il contenuto del corrispondente file in `apps-script/src`.

## 3. Setup iniziale

1. Nell'editor Apps Script seleziona la funzione `setupSigmaFlow`.
2. Premi `Run`.
3. Accetta le autorizzazioni richieste.
4. Torna allo Spreadsheet e verifica che i fogli siano presenti e popolati.

## 4. Deploy Web App

1. In Apps Script apri `Deploy > New deployment`.
2. Tipo deployment: `Web app`.
3. Execute as: `Me`.
4. Who has access: utenti del dominio Workspace, oppure la policy equivalente disponibile nel tenant.
5. Crea il deployment e conserva la Web App URL.

## 5. Smoke test

1. Apri la Web App URL.
2. Verifica che la board mostri le colonne: Backlog, In corso, In review, Fatto, Bloccato.
3. Crea un job di prova.
4. Trascinalo in `In corso`, poi in `Fatto`.
5. Verifica nello Sheet che `start_ts`, `done_ts`, `service_time_h`, `lead_time_h`, `wait_time_h` siano valorizzati.
6. Apri la tab Dashboard e verifica che le metriche vengano renderizzate senza errori.
