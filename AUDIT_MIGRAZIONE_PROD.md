# Audit — Migrazione PROD del modello caso/visita

> Documento di sola pianificazione. Nessuna azione su PROD è stata
> eseguita per produrlo. Scritto il 2026-08-16, a valle della chiusura
> della Fase L (L1-L5) su TEST, su richiesta di Marco ("fammi un audit
> per preparare la migrazione dei dati in PROD").
>
> Fonti usate: l'export reale del foglio `jobs`/`cases` di PROD
> incollato da Marco in sessione il 2026-08-16; lettura diretta del
> codice sorgente (branch `codex/case-visit-model`); cronologia git.
> **Nessun accesso diretto è stato fatto al progetto Apps Script o al
> foglio Google di PROD** — questa sessione non ha credenziali/config
> `clasp` per PROD (solo per TEST, vedi §1).

---

## 0. Rischio critico da chiarire per primo (blocca la pianificazione)

Prima di poter sequenziare qualunque passo, serve una risposta certa a
questa domanda, che il solo codice non permette di dedurre con
sicurezza al 100%:

> **PROD e TEST sono serviti dalla stessa identica Web App Apps
> Script (stesso script ID), distinta solo dal parametro `env` nella
> URL, oppure sono due progetti/deployment Apps Script separati?**

Indizi trovati nel codice che fanno propendere per "stessa Web App":

- `Constants.gs` definisce **nello stesso file** sia
  `DEFAULT_SPREADSHEET_ID` (presumibilmente PROD) sia
  `DEFAULT_TEST_SPREADSHEET_ID` (TEST) — con un'unica funzione
  `getSpreadsheetForEnv_(env)` che sceglie quale usare a runtime.
- `normalizeEnv_(env)` restituisce `'prod'` per **qualunque valore
  diverso da `'test'`**, incluso `undefined`/assente — cioè
  **l'ambiente di default, se il parametro manca, è PROD**.
- `doGet(e)` legge `env` dalla query string della richiesta HTTP: la
  stessa URL pubblica, con `?env=test` o senza, decide quale
  spreadsheet leggere/scrivere.

Se questa lettura è corretta, **ogni `clasp push` fatto in questa
sessione (branch `codex/case-visit-model`) è già il codice live anche
per chi usa PROD**, con la sola differenza che i *dati* di PROD non
sono ancora stati toccati/aggiornati di schema — non per isolamento
architetturale, ma perché nessuno ha ancora eseguito un'azione con
`env=prod` che triggeri `ensureCurrentSchema_()` da quando lo schema è
cambiato.

### 0.1 — Rischio concreto collegato: `PROP_SCHEMA_VERSION` è globale al progetto, non per foglio

`ensureCurrentSchema_()` confronta `SIGMAFLOW.SCHEMA_VERSION` (una
costante nel codice) con una Script Property
(`PropertiesService.getScriptProperties()`) — che in Apps Script è
**condivisa da tutto il progetto**, non separata per spreadsheet. Se
PROD e TEST condividono lo stesso progetto Apps Script (vedi sopra),
condividono anche questa property.

Conseguenza pratica: ogni volta che Marco ha caricato la board di TEST
in questa sessione, `setupSigmaFlow()` è girato **su TEST** ma ha
aggiornato la property **globale** a `SCHEMA_VERSION` corrente (oggi
`'7'`). La prossima volta che qualcuno apre PROD (con `env=prod` o
senza `env`), `ensureCurrentSchema_()` troverà la property già
allineata a `'7'` e **salterà `setupSigmaFlow()`** — quindi **non
allineerà mai lo schema di PROD automaticamente**, anche se in teoria
dovrebbe. Il meccanismo di auto-upgrade dello schema, così com'è
scritto oggi, **non è affidabile tra due ambienti che condividono la
Script Property**.

**Per questo motivo, prima di qualunque passo della migrazione reale,
serve una correzione di codice**: chiavi di property separate per
ambiente (es. `SIGMAFLOW_SCHEMA_VERSION_TEST` /
`SIGMAFLOW_SCHEMA_VERSION_PROD`), oppure un controllo che tenga conto
dell'`env` nella verifica. Non è stata fatta in questa sessione (fuori
scope: nessuna scrittura su PROD, e la modifica del meccanismo di
schema-check tocca comunque un percorso condiviso, da trattare con
cautela a parte).

**Prossimo passo su questo punto**: confermare con certezza
l'architettura (un solo script ID o due) prima di procedere oltre in
questo documento — cambia la sequenza dei passi sotto.

---

## 1. Cosa è stato verificato in questa sessione, e come

- **Accesso**: questa sessione ha un `.clasp.json` configurato solo per
  il progetto Apps Script usato come TEST (`scriptId`
  `1RFY5lPPaDGoNjAvFximVqzMnihCP5Nso1nzsq70nDkMqiqikB7N1mDtq`). Nessuna
  configurazione per un secondo progetto PROD è presente nel repository.
- **Dati PROD**: conosciuti solo tramite l'export copiato/incollato da
  Marco in chat (fogli `jobs` e `cases`, oggi 2026-08-16). Non è stato
  possibile leggerli in autonomia né verificarne l'aggiornamento in
  tempo reale.
- **Codice**: letto direttamente dal branch `codex/case-visit-model`
  (35 commit avanti a `main`, **non mai unito**) e confrontato con
  `main` (35 commit indietro, `SCHEMA_VERSION: '3'`, ha gia'
  `activity_log_json` in `JOB_HEADERS` ma non `incarico_ts`/`prep_ts`).

## 2. Stato osservato di PROD (dall'export del 2026-08-16)

Intestazioni del foglio `jobs` osservate:

```
job_id, case_id, visit_number, title, client, ambassador, status,
assignee, tag, size_class, size_points, priority_class,
priority_class_manual, impact, manageability, priority_score,
description, due_date, arrival_ts, start_ts, done_ts, invoiced,
service_time_d, lead_time_d, wait_time_d, is_rework, rework_cause,
notes, card_color, checklist_json, correction_log_json
```

**Non c'è `activity_log_json`** — quindi lo schema live di PROD è
**precedente persino a `main`** (main ha già quel campo, con
`SCHEMA_VERSION: '3'`). Non ci sono `incarico_ts`, `prep_ts`,
`incarico_chiuso_ts`, né un foglio `visite`. In pratica PROD non ha mai
ricevuto **nessuna** delle fasi di questo programma (G, K, L1-L5).

Foglio `cases`: struttura invariata (`case_id`, `title`, `client`,
`total_visits`, `is_open`, `created_ts`, `closed_ts`) — stessa forma di
oggi, nessuna migrazione necessaria per questo foglio di per sé.

### 2.1 — Osservazioni sulla qualità dei dati reali (non bloccanti, ma da sapere)

- Diversi case con `total_visits: 0`, `is_open: FALSE`, chiusi pochi
  secondi dopo la creazione — sembrano creazioni doppie accidentali
  (es. `CASE-20260707-ZFRY`/`CASE-20260707-3RT9`, stesso
  cliente/titolo di `CASE-20260707-5AF4`). Preesistenti, non introdotte
  da questo lavoro.
- Alcuni job hanno `status: notes` con `arrival_ts` vuoto — card create
  e mai davvero avviate. La ricostruzione storica (§4) le tratterà
  come "senza log" se anche `activity_log_json` risultasse vuoto dopo
  il backfill di Fase F.
- Diversi `title` segnaposto (`??`) nel foglio `cases` — dato
  preesistente, non tecnico.

## 3. Divario tra PROD e lo stato attuale di TEST (branch `codex/case-visit-model`)

PROD dovrebbe ricevere, **in sequenza**, tutte le fasi seguenti — non
è possibile "saltare" direttamente a L5:

| Fase | Cosa introduce | Punto critico per PROD |
|---|---|---|
| **Fase G** | `activity_log_json`; migrazione `migrateToActivityLog` (backfill da `correction_log_json`/`checklist_json`) | La funzione di migrazione è **bloccata a `env==='test'`** nel codice — va eseguita con un meccanismo dedicato (§5) |
| **Fase K** | `incarico_ts`, `prep_ts`; ruolo colonna `prep` per TO DO | Il `columns_json` **live** di PROD (dato in `config`, indipendente dal codice) potrebbe non avere il ruolo `prep` sulla colonna giusta — da verificare prima, non da assumere uguale a TEST |
| **L1** | Foglio `visite` nuovo, `incarico_chiuso_ts` su `jobs` | Additivo, basso rischio se eseguito da codice aggiornato |
| **L2** | `moveJob` riscritto: guardia estesa a `done`, regola apertura/chiusura visita, accumulatori attesa | Cambia comportamento **osservabile** della board (blocco di rientri diretti oggi non bloccati) — utenti PROD vanno avvisati |
| **L3** | Le correzioni manuali in Cronologia allineano anche la visita aperta | Nessun impatto visibile diverso da L2 |
| **L4** | Le metriche di governo (`getMetrics`) leggono da `visite` invece che da `jobs` | Il cruscotto mostrerà numeri **parziali/bassi** finché la storia non è materializzata (stesso comportamento accettato consapevolmente su TEST) |
| **L5 parte 1** | Migrazione storica: materializza `visite` per ogni caso dal log | Funzione di migrazione **bloccata a `env==='test'`** — stesso problema di Fase G (§5) |
| **L5 parte 2** | Rimozione campi duplicati da `JOB_HEADERS` (`visit_number`, `start_ts`, `done_ts`, `service_time_d`, `lead_time_d`, `wait_time_d`, `is_rework`, `rework_cause`, `incarico_ts`, `prep_ts`) | **Irreversibile**. Va fatta solo dopo verifica completa della L5 parte 1 |
| Fix di sessione | Bug `computeFrom_` su timestamp identici; guardia self-move; rinomina `rientro_ts`/`rientro_da`; checkbox "Chiuso" → `incarico_chiuso_ts` | Inclusi automaticamente deployando il codice attuale, nessun passo a parte |

## 4. Cosa manca nel codice per poter migrare PROD in sicurezza (da scrivere prima di iniziare)

Le due funzioni di migrazione esistenti sono **deliberatamente**
bloccate a TEST:

```js
// ActivityLog.gs
if (normalizeEnv_(params.env) !== 'test') {
  throw new Error("La migrazione dell'activity log e' consentita solo in ambiente TEST.");
}
// stesso identico blocco in migrateVisiteFromHistory
```

Questo è corretto com'è oggi — è il guardrail che ha impedito scritture
accidentali su PROD durante tutte le sessioni TEST di questo
programma. **Per PROD serve un meccanismo nuovo, non semplicemente
togliere il blocco**, ad esempio:

- una versione `*_OnProd()` eseguibile solo dall'editor Apps Script
  (stesso pattern di `migrateActivityLogOnTest`/
  `migrateVisiteFromHistoryOnTest`, che forzano esplicitamente lo
  spreadsheet invece di fidarsi della property condivisa — vedi §0.1),
  così che l'esecuzione sia un atto deliberato di chi ha accesso
  all'editor (Marco), non un'azione raggiungibile dalla web app;
- oppure un parametro aggiuntivo di conferma esplicita
  (es. `confirm_prod: true`) più un log dell'esecuzione.

**Nessuna di queste due funzioni esiste ancora.** È un prerequisito di
codice, da scrivere e testare su TEST (con dati sintetici che imitano
lo schema-precedente osservato in PROD) prima di usarla su PROD.

## 5. Sequenza di migrazione proposta (bozza, da confermare passo per passo)

Ricalca lo stesso schema incrementale con gate già usato per L1-L5 su
TEST, non un deploy unico:

0. **Chiarire il punto §0** (stesso progetto Apps Script o due
   separati) e **correggere la Script Property condivisa** (§0.1) —
   bloccante, va fatto per primo.
1. **Backup**: copia completa del foglio Google di PROD (File → Crea
   una copia) prima di qualunque azione. Verificare anche di poter
   ripristinare una versione precedente da Cronologia foglio Google,
   come rete di sicurezza aggiuntiva.
2. **Congelamento operativo**: concordare una finestra a basso
   traffico con il team che usa PROD; durante la migrazione la board
   non va usata (rischio di scritture concorrenti durante il replay).
3. **Verifica preliminare del `config` di PROD**: leggere
   `columns_json` reale (non assumerlo uguale a TEST) — in particolare
   il ruolo della colonna TO DO/preparazione, necessario perché la
   regola di apertura/chiusura visita (L2) dipende dai ruoli
   `backlog`/`prep`/`wip`/`stand_by`/`done` configurati.
4. Scrivere e testare su TEST i due wrapper `*_OnProd()` (§4).
5. Deploy del codice (`clasp push`) — se §0 conferma che è lo stesso
   progetto di TEST, questo passo è **già fatto** ad ogni push di
   questa sessione; da verificare cosa significhi esattamente per la
   sicurezza di PROD nel frattempo.
6. Eseguire il backfill di Fase F (`migrateActivityLogOnProd` o
   equivalente) — crea `activity_log_json` per ogni card storica.
7. **Verifica**: campionare alcune card reali (5-10, scelte da Marco)
   e confrontare il log ricostruito con quanto Marco ricorda della
   storia reale di quei casi.
8. Lasciar allineare lo schema (foglio `visite`, `incarico_chiuso_ts`,
   `incarico_ts`/`prep_ts`) — additivo, stesso meccanismo verificato su
   TEST in L1.
9. Eseguire la migrazione storica L5 parte 1
   (`migrateVisiteFromHistoryOnProd` o equivalente).
10. **Gate umano esplicito**: Marco verifica il risultato (foglio
    `visite`, `coherence_warnings`, confronto prima/dopo sui casi
    campione) — **stesso identico controllo già fatto su TEST**, questa
    volta su dati reali di clienti.
11. Solo dopo conferma esplicita: L5 parte 2 (rimozione campi
    duplicati) — irreversibile, ultimo passo.
12. Avviso al team: dal quel momento la board applica le nuove regole
    (guardia esteso a `done`, apertura/chiusura visita) — comportamento
    diverso da quello a cui sono abituati.

## 6. Rischi principali, in ordine di gravità

1. **Property di schema condivisa tra ambienti** (§0.1) — può lasciare
   PROD silenziosamente non allineato, o innescare un allineamento
   inatteso mentre qualcuno sta lavorando. Da risolvere per primo.
2. **Dati reali, non demo**: ogni bug non ancora scoperto ha
   conseguenze su casi reali di clienti Sigma+, non su dati sintetici.
   Durante il collaudo TEST sono emersi diversi bug reali (numerazione
   bootstrap, timestamp identici, self-move) — è ragionevole aspettarsi
   che dati PROD più "sporchi" (più vecchi, più eterogenei, con
   interventi manuali storici) ne facciano emergere altri.
3. **`columns_json` di PROD sconosciuto**: la logica di L2 dipende dai
   ruoli colonna configurati — se PROD ha una configurazione diversa da
   TEST (colonne rinominate, ruoli diversi), il comportamento potrebbe
   differire da quanto verificato.
4. **Branch non uniti a `main`**: tutto il lavoro (Fase G in poi) vive
   su branch mai uniti — prima di un deploy definitivo va deciso se e
   quando fare il merge, e come si allinea questo con l'eventuale
   deploy diretto via `clasp push` (che non richiede il merge git per
   funzionare, ma lascia `main` non rappresentativo di ciò che gira
   davvero).
5. **Irreversibilità della rimozione campi (L5 parte 2)**: unico passo
   senza possibilità di rollback "soft" — il backup del punto 1 è
   l'unica rete di sicurezza.
6. **Comportamento osservabile cambiato per gli utenti**: il guardia
   esteso a `done` blocca rientri diretti oggi permessi — comunicazione
   preventiva al team necessaria per evitare ticket di "bug" che sono
   in realtà comportamento nuovo intenzionale.

## 7. Checklist pre-migrazione (da completare prima di iniziare §5)

- [ ] Confermata l'architettura del punto §0 (uno o due progetti Apps
      Script)
- [ ] Risolto il problema della Script Property condivisa (§0.1)
- [ ] Backup completo del foglio PROD effettuato e verificato
      (riapribile)
- [ ] `columns_json` reale di PROD letto e confrontato con quello di
      TEST
- [ ] Finestra di congelamento operativo concordata con il team
- [ ] Wrapper `*_OnProd()` scritti, testati su TEST con dati che
      imitano lo schema-precedente osservato in PROD
- [ ] Comunicazione al team sul cambio di comportamento della board
      pianificata

## 8. Cosa NON è incluso in questo audit

- Non è stata presa nessuna decisione sul merge dei branch a `main`.
- Non sono stati scritti i wrapper `*_OnProd()` (§4) — richiede una
  sessione dedicata, con lo stesso rigore (test su TEST prima) già
  applicato a tutte le fasi precedenti.
- Non è stata toccata né letta direttamente nessuna risorsa PROD.
- Non è stata presa nessuna decisione sulla dismissione del foglio
  `cases`/`refreshCaseVisitCount_` (rimandata esplicitamente da L1).
