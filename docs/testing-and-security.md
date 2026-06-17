# Testing e sicurezza

## Obiettivo

Validare SigmaFlow senza mettere a rischio il database operativo. Ogni test distruttivo deve usare un database TEST separato.

## Ambienti

### Produzione

- Spreadsheet: `SigmaFlow Database`
- ID: `1OSVDfy7fOWSBNfoFUNLNHxB5AcdR-q6U59BuJjWaR-Q`
- Web App corrente: <https://script.google.com/a/macros/sigmapiu.it/s/AKfycbwHaOY08-hWERZ66PGTXCeXCBQGNV38kzkpPFCk7GBETzh2FadgDT1ogSK-e3YOMBFo/exec>

### Test

Creare uno Spreadsheet separato chiamato `SigmaFlow Database - TEST` con gli stessi tab:

- `jobs`
- `cases`
- `config`

Poi impostare la Script Property:

```text
SIGMAFLOW_TEST_SPREADSHEET_ID = <id spreadsheet test>
```

I test in `Tests.gs` usano solo questo ID. Se la property manca, i test devono fermarsi.

Ambiente TEST corrente:

- Spreadsheet: `SigmaFlow Database - TEST`
- ID: `15XQwfbTLH4wv8IOzhzIyhpATZY-9KmXoorhD4mpZk4g`
- URL: <https://docs.google.com/spreadsheets/d/15XQwfbTLH4wv8IOzhzIyhpATZY-9KmXoorhD4mpZk4g>

Per configurare la Script Property dall'editor Apps Script, eseguire:

```text
configureTestEnvironment
```

Poi eseguire:

```text
runAllTests
```

## Smoke test Web App

Eseguire dopo ogni deploy:

1. Aprire la Web App in modalita' TEST: <https://script.google.com/a/macros/sigmapiu.it/s/AKfycbxsN5tFeqLMJy94UHm0YbjYXCBqV0VI1vxE2h8GwuKLhPOuRUHW0XzphabKj3_hjJ7J/exec?env=test>
2. Verificare che la board carichi senza alert.
3. Verificare che il badge ambiente mostri `TEST`.
4. Creare un job di prova in `backlog`.
5. Trascinare il job in `in_progress`.
6. Trascinare il job in `done`.
7. Verificare nello Sheet TEST:
   - `arrival_ts` valorizzato
   - `start_ts` valorizzato
   - `done_ts` valorizzato
   - `service_time_h`, `lead_time_h`, `wait_time_h` numerici
8. Aprire Dashboard e verificare che le metriche renderizzino senza valori `NaN`.

## Test backend

I primi test automatici coprono:

- setup schema test
- `addJob`
- `moveJob` verso `in_progress`
- `moveJob` verso `done`
- `markRework`
- `getMetrics`
- validazione errori per parametri mancanti

Ogni test deve:

1. pulire i fogli TEST;
2. preparare dati minimi;
3. chiamare le funzioni reali;
4. verificare output e righe scritte;
5. restituire `{ passed: true }` oppure un errore chiaro.

## Sicurezza

Checklist minima:

- Web App limitata al dominio Workspace.
- Nessun uso di `localStorage` o `sessionStorage`.
- Input utente renderizzato con escaping HTML.
- `api/doPost` valida `action` e parametri obbligatori.
- Nessun dato sensibile nei log.
- Delete e operazioni distruttive vanno confermate lato UI prima di essere esposte agli utenti.
- Il database TEST non deve contenere dati reali di clienti.

## Go/no-go

Si puo' promuovere un deploy solo se:

- tutti i test backend passano;
- smoke test Web App completato su database TEST;
- Dashboard non mostra errori;
- nessun errore critico nei log Apps Script;
- deployment e URL sono annotati in `docs/google-workspace-setup.md`.
