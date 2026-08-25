# Testing e sicurezza

## Obiettivo

Validare SigmaFlow senza mettere a rischio il database operativo. Ogni test distruttivo deve usare un database TEST separato.

## Ambienti

### Produzione

- Spreadsheet: `SigmaFlow Database`
- ID: `15XQwfbTLH4wv8IOzhzIyhpATZY-9KmXoorhD4mpZk4g` (`DEFAULT_SPREADSHEET_ID` in Constants.gs)
- Web App corrente: <https://script.google.com/a/macros/sigmapiu.it/s/AKfycbxKZMfSDbFMI7vCQ1IaQ0wQdgrwBWE_FByTgPY6_2TxFlpmf1jXBzDb1M2ndSgDY4Db/exec?env=prod>

### Test

Uno Spreadsheet separato, stessi tab creati automaticamente da `setupSigmaFlow()`:

- `jobs`
- `visite`
- `config`

ID di default (`DEFAULT_TEST_SPREADSHEET_ID` in Constants.gs): `1kzoVGcIqcYIuGWgmRQbeuyK-37cmSaUQye3d36rhDRU`.

**[Aggiornato 2026-08-25]** La Script Property `SIGMAFLOW_TEST_SPREADSHEET_ID`
non è più necessaria — `withTestSpreadsheet_` (Tests.gs) ricade
sull'id fisso sopra se assente, stesso principio del fix su
`getSpreadsheetForEnv_`/PROD (vedi `PROGRAMMA_STATO.md`, incidente
2026-08-25). Resta comunque disponibile come **override facoltativo**,
se un giorno serve puntare test/migrazioni a uno spreadsheet TEST
diverso da quello di default:

```text
SIGMAFLOW_TEST_SPREADSHEET_ID = <id spreadsheet test alternativo>
```

`configureTestEnvironment` (che scrive questa property, oggi puntandola
comunque al default) non è più un passo obbligatorio prima di
`runAllTestsAndLog` — resta utile solo se si vuole davvero puntare a
uno spreadsheet diverso da quello di default.

### Harness Node (senza editor Apps Script)

`apps-script/test-harness/gas-harness.js` mocka `SpreadsheetApp`/
`PropertiesService`/`Utilities` e carica i `.gs` reali via `vm`. Utile
per verificare la logica senza clasp run:

```js
const { createHarness } = require('./apps-script/test-harness/gas-harness.js');
const h = createHarness();
h.scriptProperties['SIGMAFLOW_TEST_SPREADSHEET_ID'] = 'test-ss';
const result = h.context.runAllTests();
```

Non sostituisce `runAllTestsAndLog` nel vero ambiente GAS, ma è il modo
più rapido per verificare un cambiamento prima di `clasp push`.

## Smoke test Web App

Eseguire dopo ogni deploy:

1. Aprire la Web App in modalita' TEST: `<url-deployment>?env=test`.
2. Verificare che la board carichi senza alert.
3. Verificare che il badge ambiente mostri `TEST`.
4. Creare un job di prova in `backlog`.
5. Trascinare il job in `wip`: verificare nel foglio `visite` che la
   visita aperta abbia `start_ts` valorizzato.
6. Trascinare il job in `wait_client`, poi di nuovo in `todo`.
7. Verificare nel foglio `visite` il rientro automatico:
   - la visita 1 ha `rientro_ts` valorizzato e `rientro_da` = `wait_client`
   - esiste una visita 2 con `rework_cause` = `wait_client`
   - sulla board, il badge rientro mostra `R1`
8. Trascinare il job in `done`.
9. Verificare nel foglio `visite` che la visita aperta abbia
   `consegna_ts` valorizzato (senza chiudere la visita: `rientro_ts`
   resta vuoto, il job può ancora rientrare).
10. Verificare che ogni colonna mostri conteggio job e somma punti.
11. Crea una nuova colonna con ruolo `stand_by`.
12. Sposta la nuova colonna a sinistra/destra e verifica che l'ordine resti salvato dopo reload.
13. Rinomina una colonna, ricarica la pagina e verifica che il nome resti salvato.
14. Cambia il ruolo di una colonna a `WIP` o `Concluso` e verifica che la dashboard continui a renderizzare.
15. Aprire Dashboard e verificare che le metriche renderizzino senza valori `NaN` e senza zero fittizi per i dati non stimabili.
16. Aprire una card, modificare piu' campi e premere `Salva`: verificare che titolo, cliente, descrizione, assegnatario, tag, taglia, priorita', scadenza e la casella `Chiuso` siano aggiornati con una sola operazione.
17. Verificare che i filtri rendano opache le card non corrispondenti senza rimuoverle dalla board.
18. Verificare che impatto e gestibilita' aggiornino punteggio e classe quando la priorita' e' `Automatico`.
19. Verificare l'ordinamento per priorita' e per scadenza.
20. Verificare date `gg/mm/aaaa`, primo rientro `R1` e blocco del rientro diretto da attesa/completato a `WIP`.

## Test backend

La suite copre, tra l'altro:

- setup/allineamento schema (jobs, visite, config, dismissione `cases`)
- `addJob`/`moveJob`/`updateJob`/`deleteJob`
- apertura/chiusura visita su rientro da stand_by/done verso backlog/prep
- accumulatori di attesa per tipo (`t_cliente_d`/`t_ente_d`/`t_interno_d`)
- blocco del rientro diretto da una colonna di attesa/completato a wip
- Cronologia (`addActivityEvent`/`updateActivityEvent`/`deleteActivityEvent`), ricalcolo di `from`
- migrazione storica `visite` da `activity_log_json`
- migrazione completa PROD (`eseguiMigrazioneCompleta_`, backfill + correzione columns_json + allineamento schema + migrazione visite)
- priorita' automatica e manuale
- colonne dinamiche, ruoli e opzioni dropdown
- `getMetrics` (stato unificato dashboard, campione insufficiente, tempi/capacita'/rientri)
- validazione errori per parametri mancanti
- schema additivo archiviazione/cestino (`jobs_archivio`/`visite_archivio`/`jobs_cestino`/`visite_cestino`, N1)
- Cronologia, evento `correction` su campi whitelisted (`arrival_ts`/`incarico_chiuso_ts`, N1)

La suite corrente contiene 87 test. Dopo la sincronizzazione eseguire `setupSigmaFlow`, quindi `runAllTestsAndLog`, e verificare `passed: 87`, `failed: 0`.

**Tempo di esecuzione su GAS reale**: ogni test paga la latenza fissa
delle chiamate a Sheets API (1-3s a chiamata) — l'intera suite su GAS
reale richiede 20+ minuti. Per la verifica di routine ad ogni modifica
usare l'harness Node (sub-secondo per l'intera suite, vedi sotto);
riservare `runAllTestsAndLog` su GAS reale a conferme mirate (un
singolo test, o un numero ridotto rilevante per il cambiamento in
corso) — non è la stessa cosa dell'harness: gira sulla vera API Sheets,
può rivelare problemi di consistenza (es. riferimenti allo spreadsheet
tenuti attraverso operazioni che ne cambiano la struttura, trovato in
collaudo N1) che un mock sincrono non riproduce.

`runAllTestsAndLog` scrive tre righe di log separate (riepilogo,
falliti in dettaglio, nomi dei passati) proprio per evitare che
l'editor tronchi l'output — con un solo `Logger.log` sull'intero
risultato, il limite di dimensione di un log si supera facilmente con
80+ test e tronca proprio a metà dei falliti.

## Smoke test dashboard

1. Con database TEST quasi vuoto, verificare `DATI INSUFFICIENTI` e la dicitura `Dato non ancora stimabile` per tempi, capacita' e carico.
2. Verificare che siano visibili i contenitori `Lavoro pronto`, `Lavoro in preparazione`, `Lavoro in corso` e `Lavoro che puo' rientrare`.
3. Verificare i blocchi flusso, rientri, tempi, capacita' e affidabilita' dei dati.
4. Verificare che la qualita' sia `BASSA` sotto 10 iniziative, `MEDIA` da 10 a 30 e `BUONA` oltre 30.
5. Verificare che gli scenari siano indicati come predisposti e che nessuna simulazione futura sia mostrata come attiva.
6. Verificare i tre indicatori grafici e controllare che un valore assente sia mostrato come `Dato non stimabile`.
7. Verificare punti aperti, aggiunti, completati e il grafico `Andamento del carico`.

## Dataset dimostrativo TEST

Dal deployment con `?env=test`, aprire Dashboard e usare `Genera dati TEST`. L'operazione richiede conferma, ripristina il solo database TEST e genera 60 pratiche distribuite sugli ultimi sei mesi — nello schema corrente (nessun `case_id`), con vere righe `visite` per ognuna (incluse ~8 pratiche con un rientro simulato).

In alternativa, dall'editor Apps Script eseguire `generateTestDataset()`. La funzione usa esclusivamente `SIGMAFLOW_TEST_SPREADSHEET_ID`; l'azione Web App `seedTestData` rifiuta l'ambiente PROD.

## Verifiche UI aggiuntive

- Priorita': verificare `1x1 = 1`, `2x2 = 2`, `3x4 = 3,46`, `4x4 = 4` e le quattro classi previste.
- Card: verificare `Salva` sia in creazione sia in modifica e la fascia colore personalizzata.
- Colonne: verificare titolo centrato, card a sinistra, punti a destra, controlli sotto e pulsante `+`.
- Colonne: in creazione scegliere la posizione; in modifica riposizionare direttamente senza spostamenti ripetuti.
- Scorrimento: verificare intestazioni sempre visibili, scroll verticale limitato alle card e frecce laterali sempre presenti nello schermo.
- Touch: verificare swipe orizzontale senza trascinamento involontario; il drag parte dopo pressione prolungata.
- Menu: aggiungere un valore da `Aggiungi...` o `Altro`, riordinarlo e verificare il blocco della rimozione quando e' usato.

Ogni test backend deve:

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
