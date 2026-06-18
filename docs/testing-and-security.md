# Testing e sicurezza

## Obiettivo

Validare SigmaFlow senza mettere a rischio il database operativo. Ogni test distruttivo deve usare un database TEST separato.

## Ambienti

### Produzione

- Spreadsheet: `SigmaFlow Database`
- ID: `1OSVDfy7fOWSBNfoFUNLNHxB5AcdR-q6U59BuJjWaR-Q`
- Web App corrente: <https://script.google.com/a/macros/sigmapiu.it/s/AKfycbzuGXBg4gqqyLH00D6BjgpLehYep2c8hNKrD9DN0V_xcUOERUuxnqEMILF4WI6Io37p/exec?env=prod>

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

1. Aprire la Web App in modalita' TEST: <https://script.google.com/a/macros/sigmapiu.it/s/AKfycbzuGXBg4gqqyLH00D6BjgpLehYep2c8hNKrD9DN0V_xcUOERUuxnqEMILF4WI6Io37p/exec?env=test>
2. Verificare che la board carichi senza alert.
3. Verificare che il badge ambiente mostri `TEST`.
4. Creare un job di prova in `backlog`.
5. Trascinare il job in `wip`.
6. Trascinare il job in `wait_client`, poi di nuovo in `todo` o `wip`.
7. Verificare nello Sheet TEST che il job sia marcato come rework automatico:
   - `visit_number` maggiore di `1`
   - `is_rework` `TRUE`
   - `rework_cause` `wait_client`
8. Trascinare il job in `done`.
9. Verificare nello Sheet TEST:
   - `arrival_ts` valorizzato
   - `start_ts` valorizzato
   - `done_ts` valorizzato
   - `service_time_d`, `lead_time_d`, `wait_time_d` numerici
10. Verificare che ogni colonna mostri conteggio job e somma punti.
11. Crea una nuova colonna con ruolo `stand_by`.
12. Sposta la nuova colonna a sinistra/destra e verifica che l'ordine resti salvato dopo reload.
13. Rinomina una colonna, ricarica la pagina e verifica che il nome resti salvato.
14. Cambia il ruolo di una colonna a `WIP` o `Concluso` e verifica che la dashboard continui a renderizzare.
15. Aprire Dashboard e verificare che le metriche renderizzino senza valori `NaN`.
16. Aprire una card e verificare che titolo, cliente, descrizione, assegnatario, tag, taglia, priorita', scadenza e fatturato salvino automaticamente.
17. Verificare che i filtri rendano opache le card non corrispondenti senza rimuoverle dalla board.

## Test backend

I primi test automatici coprono:

- setup schema test
- `addJob`
- `moveJob` verso `wip`
- `moveJob` verso `done`
- rework automatico da `wait_client` verso una colonna `wip`
- colonne dinamiche, ruoli e opzioni dropdown
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
