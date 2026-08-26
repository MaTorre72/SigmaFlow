# SigmaFlow — Ambiente e lock globale (design)

> Prosegue la numerazione a lettere del progetto — **P**, la fase
> successiva a O (Performance backend, completa e unita a `main` il
> 2026-08-25, commit `32e6d43`/PR #11). Nasce da una domanda diretta di
> Marco dopo la chiusura di O — "perché non si può togliere il lock
> globale sulle sole letture?" — e da un'analisi approfondita, funzione
> per funzione, del meccanismo di risoluzione dell'ambiente
> (TEST/PROD) e del lock che lo avvolge, richiesta esplicitamente con
> attenzione al fatto che il codice porta i segni di più patch
> successivi non del tutto organici sullo stesso meccanismo (il fix del
> 2026-08-19 e la sua recidiva del 2026-08-25, entrambi su
> `PROP_SPREADSHEET_ID`). Analisi statica di tutto `apps-script/src/`
> (ogni `LockService.getScriptLock()` e ogni lettura/scrittura di
> `PROP_SPREADSHEET_ID` censiti singolarmente, non a campione),
> verificata contro `main` aggiornato al 2026-08-26 — nessuna modifica
> ancora fatta. Il meccanismo di isolamento delle variabili globali tra
> esecuzioni separate di Apps Script (§2, punto P1) è verificato anche
> con una fonte esterna, non solo per lettura del codice — vedi nota a
> fondo pagina.

---

## 1. Cosa si tocca, e cosa no

- **`getSpreadsheet_()` e `withEnvironment_()`** (Utils.gs) — unico
  punto in cui l'ambiente (TEST/PROD) viene risolto e reso disponibile
  al resto del codice durante una chiamata `api()`.
- **Le funzioni admin che oggi scambiano `PROP_SPREADSHEET_ID` a mano**
  attorno a un'orchestrazione più ampia: `eseguiMigrazioneCompleta_`
  (ActivityLog.gs) e `allineaSchemaSuProd` (Schema.gs) — stesso
  meccanismo di `withEnvironment_`, va aggiornato allo stesso modo per
  restare coerente.
- **`api()`/`routeAction_()`** (Kanban.gs) — punto in cui si decide se
  un'azione richiede il lock globale o può farne a meno.
- **Non tocca** i 27+ punti che chiamano `getSpreadsheet_()`
  ambientalmente (in `Kanban.gs`, `ActivityLog.gs`, `Model.gs`,
  `Backup.gs`) — continuano a chiamarla esattamente come oggi, cambia
  solo cosa c'è dentro quella funzione. Nessuna firma di funzione
  cambia in tutto il programma.
- **Non tocca** il fallback di bootstrap in `setupSigmaFlow()`
  (Schema.gs, righe 178-179): se `PROP_SPREADSHEET_ID` non è ancora
  configurata, viene impostata come valore di default al primo avvio.
  Quello è un uso legittimo e volutamente persistente tra esecuzioni
  (un default, non un dato di instradamento per una singola chiamata) —
  resta com'è.
- **Non tocca** i lock indipendenti già esistenti su
  `moveJobToSheet_`/`eliminaJobDefinitivamente`/`svuotaCestino`
  (Kanban.gs) e sulle funzioni admin di migrazione — proteggono la
  concorrenza sulle scritture di archiviazione/cestino/migrazione, non
  la risoluzione dell'ambiente. Restano necessari a prescindere da
  questo programma.

## 2. Cosa è stato trovato

### 2.1 — P1: una Script Property condivisa usata per un dato che vive una sola chiamata

`PROP_SPREADSHEET_ID` è una Script Property: per progettazione di Apps
Script, un valore **persistente e condiviso tra esecuzioni separate**.
`withEnvironment_` la usa però per un dato che dovrebbe vivere **solo
dentro la singola chiamata `api()`** — la scrive all'inizio, la
ripristina alla fine nel proprio `finally`. Se un'esecuzione si
interrompe prima di raggiungere quel `finally` (un'esecuzione lanciata
a mano dall'editor, un timeout), il valore sporco sopravvive e viene
ereditato dalla richiesta successiva — di un utente diverso, in un
momento diverso. Questa è la causa di fondo, non solo il sintomo,
degli incidenti del 2026-08-19 e della recidiva del 2026-08-25 (fix
parziale già fatto: `getSpreadsheetForEnv_('prod')` ora risolve sempre
l'id fisso invece di delegare a `getSpreadsheet_()` — chiude
l'instradamento verso PROD, ma la property resta scritta e letta
ambientalmente ovunque nel resto del codice).

Verificato esternamente (non solo per lettura del codice, vedi nota a
fondo pagina): ogni esecuzione di uno script Apps Script — ogni
chiamata `api()` inclusa — parte in un'isolate V8 **nuova**, scartata
per intero alla fine. Non c'è memoria condivisa tra esecuzioni
separate: una variabile globale JavaScript dichiarata in cima a un
file è isolata per costruzione a quella singola esecuzione, senza
bisogno di nessun lock per proteggerla dal rischio di essere letta da
un'altra chiamata in corso. Sostituire la Script Property con una
variabile globale per l'uso "di instradamento dentro una chiamata"
chiude quindi l'intera classe di bug alla radice — non solo
l'instradamento verso PROD già corretto il 25/08, ma anche verso TEST,
e in ogni punto del codice che oggi legge `PROP_SPREADSHEET_ID`
ambientalmente.

### 2.2 — P2: il lock globale è preso una volta per ogni chiamata `api()`, letture comprese

Censimento completo (tutti i file `.gs`, non solo Kanban.gs/Utils.gs):
otto punti nel codice prendono `LockService.getScriptLock()`. Uno solo
è quello rilevante qui — `withEnvironment_`, l'unico varco per **ogni**
richiesta web (letture e scritture indistintamente: `api()` lo chiama
sempre, per ogni azione). Gli altri sette sono lock indipendenti già
mirati a scritture specifiche (archiviazione, cestino, funzioni admin
di migrazione — vedi §1) e restano fuori da questo intervento.

Questo combacia con la diagnosi già fatta da Marco il 2026-08-20
(`PROGRAMMA_STATO.md`, fix "elimina il giro di lock extra dopo un
salvataggio"): quel fix ha rimosso un giro di lock *aggiuntivo*
introdotto per errore, ma non ha toccato la caratteristica di fondo —
ogni singola lettura (`getBoard`, `getActivityLog`, `getArchivio`,
`getCestino`, `getMetrics`) si mette comunque in coda dietro **tutte**
le altre richieste in corso su tutto lo script, esattamente come una
scrittura. È la causa che resta da chiudere.

Punto di attenzione trovato durante il censimento, decisivo per capire
il rischio di questo intervento: **`moveJob`, `addActivityEvent`,
`updateActivityEvent` e `deleteActivityEvent` — le azioni di scrittura
più usate in assoluto — non hanno nessun lock proprio**. Dipendono al
100% dal lock globale di `withEnvironment_` per la loro sicurezza in
concorrenza (due utenti che spostano la stessa card, o modificano lo
stesso evento, nello stesso istante). Una separazione letture/scritture
deve quindi mantenere il lock su **tutte** le azioni che scrivono,
senza eccezioni — non solo su quelle che oggi "sembrano" più delicate.

### 2.3 — Nota, non gated: `doPost` bypassa interamente il meccanismo

`doPost` (Kanban.gs) chiama `routeAction_` **direttamente**, senza
passare da `api()`/`withEnvironment_` — nessun lock, nessuna
risoluzione d'ambiente. Verificato che il frontend (`client.html`) usa
solo `google.script.run` (quindi passa sempre da `api()`): `doPost`
sembra oggi non raggiunto da nessun percorso dell'app reale, ma resta
codice vivo, raggiungibile da chiunque faccia una POST diretta
all'URL pubblicato — e con P1 applicato risolverebbe silenziosamente
sul foglio di default (PROD), senza nessuna selezione d'ambiente. Non
è né O né N né un problema misurato in uso reale: segnalato qui per
tracciabilità, tenuto fuori scope (§5), non blocca P1/P2.

## 3. Approccio

Due interventi in sequenza, non paralleli: P2 dipende da P1 (senza P1,
liberare le letture dal lock lascerebbe comunque in giro il rischio
della property sporca). Nessuna riprogettazione dello schema o del
modello caso/visita — stesso contratto di input/output verso client e
test in entrambi.

- **P1 — variabile per-esecuzione al posto della Script Property.**
  Rischio basso: cambia solo l'interno di `getSpreadsheet_()`/
  `withEnvironment_()` (Utils.gs) e delle due funzioni admin che oggi
  fanno lo stesso scambio a mano (§1) — nessuna firma di funzione
  cambia, nessuno dei 27+ punti che chiamano `getSpreadsheet_()` va
  toccato. Test interessati: i blocchi in `Tests.gs` che oggi
  manipolano `PROP_SPREADSHEET_ID` direttamente per verificare questo
  meccanismo (property sporca preesistente, ripristino nel `finally`)
  vanno riscritti per verificare la variabile al suo posto — stesso
  numero di casi, stesso principio.
- **P2 — lock solo sulle azioni che scrivono.** Rischio moderato:
  tocca `api()`/`routeAction_()`, non i 27+ punti a valle. Il rischio
  vero non è "dove" ma "quali azioni restano sotto lock" — la lista
  deve includere ogni azione che scrive (§2.2), verificata esplicitamente
  una per una contro `routeAction_`, non dedotta per intuito. Da
  accompagnare con un test di concorrenza dedicato (due scritture
  simulate sullo stesso job in rapida sequenza), non solo con i test di
  comportamento in singola esecuzione già esistenti.

## 4. Piano di esecuzione — sotto-fasi atomiche

| Sotto-fase | Contenuto | Gate |
|---|---|---|
| **P1** | `getSpreadsheet_()`/`withEnvironment_()` (Utils.gs): sostituire lettura/scrittura di `PROP_SPREADSHEET_ID` con una variabile globale valorizzata a inizio chiamata, mai persistita. Stesso trattamento in `eseguiMigrazioneCompleta_` (ActivityLog.gs) e `allineaSchemaSuProd` (Schema.gs). Il fallback di bootstrap in `setupSigmaFlow()` resta sulla Script Property (§1). Aggiornare i test in `Tests.gs` che verificano oggi il comportamento della property. Nessun cambio di comportamento osservabile per l'utente. | — |
| **P2** | `api()`/`routeAction_()` (Kanban.gs): classificare esplicitamente ogni azione come lettura (`getBoard`, `getActivityLog`, `getArchivio`, `getCestino`, `getMetrics`) o scrittura (tutte le altre — elenco completo da `routeAction_`); solo le azioni di scrittura prendono il lock globale di `withEnvironment_`. Nuovo test di concorrenza dedicato (due scritture simulate sullo stesso job in rapida sequenza, verificare che nessuna vada persa). | 🔴 **Umano** — Marco conferma la classificazione letture/scritture proposta (elenco esplicito da allegare al PR) **prima** dell'implementazione, non dopo — è il punto in cui un errore di classificazione avrebbe conseguenze reali su dati concorrenti. |

P1 è prerequisito di P2 — non indipendenti, vanno fatte in quest'ordine
nella stessa sessione o in sessioni successive, mai P2 prima di P1.

## 5. Fuori scope, per ora

- `doPost` che bypassa `api()`/`withEnvironment_` (§2.3) — segnalazione
  tracciata, non misurata in uso reale, nessuna azione richiesta qui.
  Riconsiderabile come fix a sé, minimo, se Marco lo vuole chiudere.
- Un vero indice per `findOpenVisitRow_` — già scartato in O3 per
  fragilità sugli spostamenti riga di archiviazione/cestino (vedi
  `DESIGN_performance.md`, §4/§5).
- Qualunque cambiamento allo schema dati o al modello caso/visita.

## 6. Criteri di accettazione

- [ ] `getSpreadsheet_()`/`withEnvironment_()` non leggono né scrivono
      più `PROP_SPREADSHEET_ID` per la risoluzione dell'ambiente
      durante una chiamata `api()` — solo una variabile locale
      all'esecuzione (P1)
- [ ] `eseguiMigrazioneCompleta_`/`allineaSchemaSuProd` aggiornate allo
      stesso meccanismo, stesso comportamento osservabile (P1)
- [ ] Il fallback di bootstrap in `setupSigmaFlow()` continua a
      funzionare come oggi, invariato (P1)
- [ ] Tutti i test esistenti nell'harness Node restano verdi; i test
      che manipolavano `PROP_SPREADSHEET_ID` direttamente sono
      riscritti per il nuovo meccanismo, stessa copertura (P1)
- [ ] Elenco esplicito delle azioni classificate lettura/scrittura in
      `routeAction_`, confermato da Marco prima di scrivere codice
      (P2, gate)
- [ ] `moveJob`, `addActivityEvent`, `updateActivityEvent`,
      `deleteActivityEvent` (e ogni altra azione che scrive) restano
      sotto lock globale — nessuna eccezione (P2)
- [ ] `getBoard`, `getActivityLog`, `getArchivio`, `getCestino`,
      `getMetrics` non prendono più il lock globale (P2)
- [ ] Nuovo test di concorrenza: due scritture simulate sullo stesso
      job in rapida sequenza non perdono nessuna delle due modifiche
      (P2)
- [ ] Nessun cambio di risultato osservabile per nessuna azione,
      lettura o scrittura, su nessun caso di test esistente (P1, P2)

---

**Nota sulla fonte esterna (§2.1)**: la caratteristica "ogni esecuzione
Apps Script parte in un'isolate V8 nuova, senza memoria condivisa tra
esecuzioni separate" è confermata da fonti indipendenti sul runtime V8
di Apps Script, oltre che dalla lettura diretta del codice — non è
un'assunzione. Riferimenti raccolti nella sessione di analisi
(2026-08-26): documentazione ufficiale del runtime V8 di Apps Script,
e articoli tecnici indipendenti sull'uso di `PropertiesService` per
stato che deve sopravvivere tra esecuzioni separate (a contrasto con
le variabili globali, che non lo fanno).
