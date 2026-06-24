# Testing e sicurezza

## Obiettivo

Validare SigmaFlow senza mettere a rischio il database operativo. Ogni test distruttivo deve usare un database TEST separato.

## Ambienti

### Produzione

- Spreadsheet: `SigmaFlow Database`
- ID: `1OSVDfy7fOWSBNfoFUNLNHxB5AcdR-q6U59BuJjWaR-Q`
- Web App corrente: <https://script.google.com/a/macros/sigmapiu.it/s/AKfycbxKZMfSDbFMI7vCQ1IaQ0wQdgrwBWE_FByTgPY6_2TxFlpmf1jXBzDb1M2ndSgDY4Db/exec?env=prod>

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

1. Aprire la Web App in modalita' TEST: <https://script.google.com/a/macros/sigmapiu.it/s/AKfycbxKZMfSDbFMI7vCQ1IaQ0wQdgrwBWE_FByTgPY6_2TxFlpmf1jXBzDb1M2ndSgDY4Db/exec?env=test>
2. Verificare che la board carichi senza alert.
3. Verificare che il badge ambiente mostri `TEST`.
4. Creare un job di prova in `backlog`.
5. Trascinare il job in `wip`.
6. Trascinare il job in `wait_client`, poi di nuovo in `todo`.
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
15. Aprire Dashboard e verificare che le metriche renderizzino senza valori `NaN` e senza zero fittizi per i dati non stimabili.
16. Aprire una card, modificare piu' campi e premere `Salva`: verificare che titolo, cliente, descrizione, assegnatario, tag, taglia, priorita', scadenza e fatturato siano aggiornati con una sola operazione.
17. Verificare che i filtri rendano opache le card non corrispondenti senza rimuoverle dalla board.
18. Verificare che impatto e gestibilita' aggiornino punteggio e classe quando la priorita' e' `Automatico`.
19. Verificare l'ordinamento per priorita' e per scadenza.
20. Verificare date `gg/mm/aaaa`, primo rientro `R1` e blocco del rientro diretto da attesa a `WIP`.

## Test backend

I primi test automatici coprono:

- setup schema test
- `addJob`
- `moveJob` verso `wip`
- `moveJob` verso `done`
- rework automatico da `wait_client` verso una colonna `wip`
- blocco del rientro diretto da una colonna di attesa a `wip`
- priorita' automatica e manuale
- colonne dinamiche, ruoli e opzioni dropdown
- `markRework`
- `getMetrics`
- stato unificato della dashboard con campione insufficiente
- separazione tra lavori conclusi e campioni validi per i tempi
- carico presente, capacita' e rientri nello stato unificato
- validazione errori per parametri mancanti

La suite corrente contiene 17 test. Dopo la sincronizzazione eseguire `setupSigmaFlow`, quindi `runAllTestsAndLog`, e verificare `passed: 17`, `failed: 0`.

## Smoke test dashboard

1. Con database TEST quasi vuoto, verificare `DATI INSUFFICIENTI` e la dicitura `Dato non ancora stimabile` per tempi, capacita' e carico.
2. Verificare che siano visibili i tre contenitori `Lavoro pronto`, `Lavoro in corso` e `Lavoro che puo' rientrare`.
3. Verificare i blocchi flusso, rientri, tempi, capacita' e affidabilita' dei dati.
4. Verificare che la qualita' sia `BASSA` sotto 10 iniziative, `MEDIA` da 10 a 30 e `BUONA` oltre 30.
5. Verificare che gli scenari siano indicati come predisposti e che nessuna simulazione futura sia mostrata come attiva.
6. Verificare i tre indicatori grafici e controllare che un valore assente sia mostrato come `Dato non stimabile`.
7. Verificare punti aperti, aggiunti, completati e il grafico `Andamento del carico`.

## Dataset dimostrativo TEST

Dal deployment con `?env=test`, aprire Dashboard e usare `Genera dati TEST`. L'operazione richiede conferma, ripristina il solo database TEST e genera 60 pratiche distribuite sugli ultimi sei mesi.

In alternativa, dall'editor Apps Script eseguire `generateTestDataset()`. La funzione usa esclusivamente `SIGMAFLOW_TEST_SPREADSHEET_ID`; l'azione Web App `seedTestData` rifiuta l'ambiente PROD.

## Verifiche UI aggiuntive

- Priorita': verificare `1x1 = 1`, `2x2 = 2`, `3x4 = 3,46`, `4x4 = 4` e le quattro classi previste.
- Card: verificare `Salva` sia in creazione sia in modifica e la fascia colore personalizzata.
- Colonne: verificare titolo centrato, card a sinistra, punti a destra, controlli sotto e pulsante `+`.
- Colonne: in creazione scegliere la posizione; in modifica riposizionare direttamente senza spostamenti ripetuti.
- Scorrimento: verificare intestazioni sempre visibili, scroll verticale limitato alle card e frecce laterali sempre presenti nello schermo.
- Touch: verificare swipe orizzontale senza trascinamento involontario; il drag parte dopo pressione prolungata.
- Menu: aggiungere un valore da `Aggiungi...` o `Altro`, riordinarlo e verificare il blocco della rimozione quando e' usato.

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
